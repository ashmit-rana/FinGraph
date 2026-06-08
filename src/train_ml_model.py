import argparse
import json
import os
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


warnings.filterwarnings("ignore", category=RuntimeWarning, module="sklearn")

DATA_PATH = "data/raw/transactions.csv"
DEFAULT_NROWS = 200000
RANDOM_STATE = 42


def make_one_hot_encoder():
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def load_transactions(path, nrows):
    print("Loading transaction data...")
    df = pd.read_csv(path, nrows=nrows)
    print(f"Loaded {len(df):,} transactions")
    print(f"Fraud cases in sample: {int(df['isFraud'].sum()):,}")
    return df


def prepare_features(df):
    data = df.copy()

    data["origin_balance_error"] = (
        data["oldbalanceOrg"] - data["amount"] - data["newbalanceOrig"]
    ).abs()
    data["destination_balance_error"] = (
        data["oldbalanceDest"] + data["amount"] - data["newbalanceDest"]
    ).abs()
    data["origin_account_emptied"] = (
        (data["oldbalanceOrg"] > 0)
        & (data["newbalanceOrig"] == 0)
        & (data["amount"] >= data["oldbalanceOrg"] * 0.9)
    ).astype(int)
    data["is_transfer_or_cashout"] = data["type"].isin(["TRANSFER", "CASH_OUT"]).astype(int)
    data["amount_to_oldbalance_ratio"] = (
        data["amount"] / (data["oldbalanceOrg"] + 1)
    ).clip(upper=1000000)

    numeric_features = [
        "step",
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "origin_balance_error",
        "destination_balance_error",
        "origin_account_emptied",
        "is_transfer_or_cashout",
        "amount_to_oldbalance_ratio",
    ]
    categorical_features = ["type"]

    X = data[numeric_features + categorical_features]
    y = data["isFraud"].astype(int)
    return X, y, data, numeric_features, categorical_features


def build_preprocessor(numeric_features, categorical_features):
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", make_one_hot_encoder(), categorical_features),
        ]
    )


def build_models(preprocessor):
    return {
        "logistic_regression": Pipeline(
            steps=[
                ("preprocess", preprocessor),
                (
                    "model",
                    LogisticRegression(
                        class_weight="balanced",
                        max_iter=1000,
                        solver="liblinear",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            steps=[
                ("preprocess", preprocessor),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=80,
                        max_depth=14,
                        min_samples_leaf=3,
                        class_weight="balanced_subsample",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }


def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)

    if hasattr(model, "predict_proba"):
        fraud_probability = model.predict_proba(X_test)[:, 1]
    else:
        fraud_probability = y_pred

    metrics = {
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1_score": f1_score(y_test, y_pred, zero_division=0),
        "average_precision": average_precision_score(y_test, fraud_probability),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(
            y_test,
            y_pred,
            zero_division=0,
            output_dict=True,
        ),
    }

    try:
        metrics["roc_auc"] = roc_auc_score(y_test, fraud_probability)
    except ValueError:
        metrics["roc_auc"] = None

    return metrics, y_pred, fraud_probability


def train_and_evaluate(df):
    X, y, prepared_data, numeric_features, categorical_features = prepare_features(df)

    split = train_test_split(
        X,
        y,
        prepared_data,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    X_train, X_test, y_train, y_test, raw_train, raw_test = split

    preprocessor = build_preprocessor(numeric_features, categorical_features)
    models = build_models(preprocessor)

    all_metrics = {}
    trained_models = {}
    prediction_outputs = {}

    for model_name, model in models.items():
        print(f"\nTraining {model_name}...")
        model.fit(X_train, y_train)
        metrics, y_pred, fraud_probability = evaluate_model(model, X_test, y_test)

        all_metrics[model_name] = metrics
        trained_models[model_name] = model
        prediction_outputs[model_name] = {
            "predicted_label": y_pred,
            "fraud_probability": fraud_probability,
        }

        print(
            f"{model_name}: "
            f"precision={metrics['precision']:.4f}, "
            f"recall={metrics['recall']:.4f}, "
            f"f1={metrics['f1_score']:.4f}, "
            f"avg_precision={metrics['average_precision']:.4f}"
        )

    best_model_name = max(
        all_metrics,
        key=lambda name: (
            all_metrics[name]["f1_score"],
            all_metrics[name]["recall"],
            all_metrics[name]["average_precision"],
        ),
    )

    best_predictions = prediction_outputs[best_model_name]
    prediction_table = raw_test.copy()
    prediction_table["actual_isFraud"] = y_test.values
    prediction_table["predicted_isFraud"] = best_predictions["predicted_label"]
    prediction_table["fraud_probability"] = best_predictions["fraud_probability"]
    prediction_table["model_used"] = best_model_name
    prediction_table = prediction_table.sort_values("fraud_probability", ascending=False)

    summary = {
        "sample_rows": int(len(df)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "fraud_cases_in_sample": int(y.sum()),
        "fraud_rate_in_sample": float(y.mean()),
        "features_used": numeric_features + categorical_features,
        "target_column": "isFraud",
        "models_trained": list(models.keys()),
        "best_model": best_model_name,
        "metrics": all_metrics,
    }

    return summary, trained_models[best_model_name], prediction_table


def get_feature_importance(model):
    classifier = model.named_steps["model"]
    if not hasattr(classifier, "feature_importances_"):
        return pd.DataFrame(columns=["feature", "importance"])

    preprocessor = model.named_steps["preprocess"]
    feature_names = preprocessor.get_feature_names_out()
    feature_names = [name.split("__", 1)[-1] for name in feature_names]

    return (
        pd.DataFrame(
            {
                "feature": feature_names,
                "importance": classifier.feature_importances_,
            }
        )
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )


def save_outputs(summary, best_model, prediction_table, output_dir, model_dir):
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(model_dir, exist_ok=True)

    metrics_path = os.path.join(output_dir, "week5_model_metrics.json")
    predictions_path = os.path.join(output_dir, "week5_top_predictions.csv")
    importance_path = os.path.join(output_dir, "week5_feature_importance.csv")
    model_path = os.path.join(model_dir, "week5_fraud_model.pkl")

    with open(metrics_path, "w") as metrics_file:
        json.dump(summary, metrics_file, indent=2)

    prediction_table.head(200).to_csv(predictions_path, index=False)
    get_feature_importance(best_model).to_csv(importance_path, index=False)

    with open(model_path, "wb") as model_file:
        pickle.dump(best_model, model_file)

    return {
        "metrics": metrics_path,
        "predictions": predictions_path,
        "feature_importance": importance_path,
        "model": model_path,
    }


def main():
    parser = argparse.ArgumentParser(description="Train Week 5 fraud detection ML models.")
    parser.add_argument("--data-path", default=DATA_PATH)
    parser.add_argument("--nrows", type=int, default=DEFAULT_NROWS)
    parser.add_argument("--output-dir", default="data/processed")
    parser.add_argument("--model-dir", default="models")
    args = parser.parse_args()

    df = load_transactions(args.data_path, args.nrows)
    summary, best_model, prediction_table = train_and_evaluate(df)
    output_paths = save_outputs(summary, best_model, prediction_table, args.output_dir, args.model_dir)

    print("\nBest model:", summary["best_model"])
    print("Saved Week 5 outputs:")
    for label, path in output_paths.items():
        print(f"- {label}: {path}")


if __name__ == "__main__":
    main()
