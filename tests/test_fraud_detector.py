import networkx as nx
import pandas as pd

from src.fraud_detector import FraudDetector


def test_score_transactions_adds_explainable_risk_columns():
    graph = nx.DiGraph()
    graph.add_edge("C1", "C2", weight=1000, count=1, fraud=1)

    transactions = pd.DataFrame(
        [
            {
                "step": 1,
                "type": "TRANSFER",
                "amount": 1000.0,
                "nameOrig": "C1",
                "oldbalanceOrg": 1000.0,
                "newbalanceOrig": 0.0,
                "nameDest": "C2",
                "oldbalanceDest": 100.0,
                "newbalanceDest": 100.0,
                "isFraud": 1,
                "isFlaggedFraud": 0,
            }
        ]
    )

    detector = FraudDetector(
        graph=graph,
        transactions=transactions,
        communities={"C1": 1, "C2": 1},
    )

    scored = detector.score_transactions()

    assert scored.loc[0, "fraud_risk_score"] >= 70
    assert scored.loc[0, "risk_level"] == "High"
    assert "Known fraud label" in scored.loc[0, "fraud_reasons"]
    assert "Origin account emptied" in scored.loc[0, "fraud_reasons"]


def test_rank_suspicious_accounts_combines_graph_and_transaction_evidence():
    graph = nx.DiGraph()
    graph.add_edge("C1", "C2", weight=1000, count=1, fraud=1)
    graph.add_edge("C3", "C2", weight=500, count=1, fraud=0)

    transactions = pd.DataFrame(
        [
            {
                "step": 1,
                "type": "CASH_OUT",
                "amount": 1000.0,
                "nameOrig": "C1",
                "oldbalanceOrg": 1000.0,
                "newbalanceOrig": 0.0,
                "nameDest": "C2",
                "oldbalanceDest": 100.0,
                "newbalanceDest": 100.0,
                "isFraud": 1,
                "isFlaggedFraud": 0,
            },
            {
                "step": 2,
                "type": "PAYMENT",
                "amount": 50.0,
                "nameOrig": "C3",
                "oldbalanceOrg": 500.0,
                "newbalanceOrig": 450.0,
                "nameDest": "M1",
                "oldbalanceDest": 0.0,
                "newbalanceDest": 0.0,
                "isFraud": 0,
                "isFlaggedFraud": 0,
            },
        ]
    )

    detector = FraudDetector(
        graph=graph,
        transactions=transactions,
        pagerank_scores={"C1": 0.1, "C2": 0.3, "C3": 0.05},
        communities={"C1": 1, "C2": 1, "C3": 2, "M1": 2},
        cycle_accounts={"C1"},
    )

    accounts = detector.rank_suspicious_accounts(top_n=2)

    assert accounts.iloc[0]["account"] in {"C1", "C2"}
    assert accounts.iloc[0]["account_risk_score"] >= accounts.iloc[1]["account_risk_score"]
    assert "fraud_reasons" in accounts.columns
