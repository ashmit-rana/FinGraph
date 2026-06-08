import pandas as pd

from src.train_ml_model import prepare_features


def test_prepare_features_adds_ml_columns():
    df = pd.DataFrame(
        [
            {
                "step": 1,
                "type": "TRANSFER",
                "amount": 100.0,
                "nameOrig": "C1",
                "oldbalanceOrg": 100.0,
                "newbalanceOrig": 0.0,
                "nameDest": "C2",
                "oldbalanceDest": 20.0,
                "newbalanceDest": 120.0,
                "isFraud": 1,
                "isFlaggedFraud": 0,
            },
            {
                "step": 2,
                "type": "PAYMENT",
                "amount": 25.0,
                "nameOrig": "C3",
                "oldbalanceOrg": 100.0,
                "newbalanceOrig": 75.0,
                "nameDest": "M1",
                "oldbalanceDest": 0.0,
                "newbalanceDest": 0.0,
                "isFraud": 0,
                "isFlaggedFraud": 0,
            },
        ]
    )

    X, y, prepared_data, numeric_features, categorical_features = prepare_features(df)

    assert "origin_balance_error" in X.columns
    assert "destination_balance_error" in X.columns
    assert "origin_account_emptied" in X.columns
    assert "is_transfer_or_cashout" in X.columns
    assert "amount_to_oldbalance_ratio" in X.columns
    assert categorical_features == ["type"]
    assert "amount" in numeric_features
    assert y.tolist() == [1, 0]
    assert prepared_data.loc[0, "origin_account_emptied"] == 1
