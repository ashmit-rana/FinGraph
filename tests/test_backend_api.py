from fastapi.testclient import TestClient

from backend.app import app


client = TestClient(app)


def test_health_endpoint_reports_artifacts():
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_loaded" in data
    assert "metrics_available" in data


def test_predict_endpoint_returns_fraud_probability():
    payload = {
        "step": 1,
        "type": "TRANSFER",
        "amount": 2806.0,
        "oldbalanceOrg": 2806.0,
        "newbalanceOrig": 0.0,
        "oldbalanceDest": 0.0,
        "newbalanceDest": 0.0,
        "nameOrig": "C1420196421",
        "nameDest": "C972765878",
    }

    response = client.post("/predict", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["fraud_probability"] <= 1
    assert data["risk_level"] in {"Low", "Medium", "High"}
    assert data["model_used"]
    assert data["top_reasons"]
