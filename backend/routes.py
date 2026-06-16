from fastapi import APIRouter, HTTPException, Query

from .schemas import HealthResponse, PredictionResponse, SummaryResponse, TransactionInput
from .services import artifact_store, predict_transaction


router = APIRouter()


@router.get("/", response_model=SummaryResponse)
def get_summary():
    metrics = artifact_store.load_metrics() if artifact_store.metrics_available() else {}
    return {
        "project": "FinGraph",
        "current_week": "Week 6 - Backend Development",
        "backend_status": "FastAPI backend running",
        "best_model": metrics.get("best_model"),
        "sample_rows": metrics.get("sample_rows"),
        "fraud_cases_in_sample": metrics.get("fraud_cases_in_sample"),
    }


@router.get("/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "ok",
        "model_loaded": artifact_store.model_available(),
        "metrics_available": artifact_store.metrics_available(),
        "predictions_available": artifact_store.predictions_available(),
        "feature_importance_available": artifact_store.feature_importance_available(),
    }


@router.get("/metrics")
def get_model_metrics():
    try:
        return artifact_store.load_metrics()
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.get("/predictions/top")
def get_top_predictions(limit: int = Query(20, ge=1, le=200)):
    try:
        return {
            "limit": limit,
            "predictions": artifact_store.load_top_predictions(limit),
        }
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.get("/features/importance")
def get_feature_importance(limit: int = Query(20, ge=1, le=50)):
    try:
        return {
            "limit": limit,
            "features": artifact_store.load_feature_importance(limit),
        }
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))


@router.post("/predict", response_model=PredictionResponse)
def predict(transaction: TransactionInput):
    try:
        return predict_transaction(transaction)
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
