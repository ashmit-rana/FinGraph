from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router


app = FastAPI(
    title="FinGraph Fraud Detection API",
    description=(
        "Backend API for FinGraph Week 6. Serves Week 5 model metrics, "
        "top predictions, feature importance, and single-transaction fraud prediction."
    ),
    version="0.6.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
