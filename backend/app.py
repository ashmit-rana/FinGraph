from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router
from .services import artifact_store


def preload_model_artifacts():
    """Warm model artifacts so the first dashboard prediction is not delayed."""
    if artifact_store.model_available():
        artifact_store.load_model()
    if artifact_store.metrics_available():
        artifact_store.load_metrics()


@asynccontextmanager
async def lifespan(app: FastAPI):
    preload_model_artifacts()
    yield


app = FastAPI(
    title="FinGraph Fraud Detection API",
    description=(
        "Backend API for FinGraph Week 8 integration testing. Serves Week 5 "
        "model metrics, top predictions, feature importance, and single-transaction "
        "fraud prediction."
    ),
    version="0.8.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
