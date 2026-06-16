from typing import List, Optional

from pydantic import BaseModel, Field


class TransactionInput(BaseModel):
    step: int = Field(..., ge=0, description="Transaction time step")
    type: str = Field(..., description="Transaction type, e.g. TRANSFER or CASH_OUT")
    amount: float = Field(..., ge=0, description="Transaction amount")
    oldbalanceOrg: float = Field(..., ge=0, description="Origin balance before transaction")
    newbalanceOrig: float = Field(..., ge=0, description="Origin balance after transaction")
    oldbalanceDest: float = Field(..., ge=0, description="Destination balance before transaction")
    newbalanceDest: float = Field(..., ge=0, description="Destination balance after transaction")
    nameOrig: Optional[str] = Field(None, description="Optional origin account ID")
    nameDest: Optional[str] = Field(None, description="Optional destination account ID")


class PredictionResponse(BaseModel):
    fraud_probability: float
    predicted_is_fraud: int
    risk_level: str
    model_used: str
    top_reasons: List[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    metrics_available: bool
    predictions_available: bool
    feature_importance_available: bool


class SummaryResponse(BaseModel):
    project: str
    current_week: str
    backend_status: str
    best_model: Optional[str]
    sample_rows: Optional[int]
    fraud_cases_in_sample: Optional[int]
