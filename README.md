# FinGraph

Detecting financial fraud using graph-based analysis and, later, graph neural
networks.

This project uses the Kaggle online payments fraud dataset. Transactions are
treated as a directed graph where accounts are nodes and money transfers are
edges. The current work focuses on cleaning the data, building the transaction
graph, finding important accounts and communities, and developing basic fraud
detection logic.

## Current Progress

Week 1:
- Finalized the project topic, dataset, tools, and folder structure.
- Studied financial fraud patterns and graph neural network basics.

Week 2:
- Cleaned the transaction dataset.
- Built a directed graph from payment transactions.
- Created basic graph visualizations.

Week 3:
- Added PageRank analysis to identify important accounts.
- Added Louvain community detection to find account clusters.
- Added circular transaction pattern detection.
- Created an advanced interactive network visualization.

Week 4:
- Started rule-based fraud detection logic.
- Added transaction risk scoring with clear reasons.
- Added suspicious account ranking.
- Exported suspicious transactions and accounts for later dashboard use.

## Dataset

Dataset used: Online Payment Fraud Detection by Jainil Shah on Kaggle.

Expected raw file path:

```bash
data/raw/transactions.csv
```

The full dataset has around 6.36 million transactions. During development, most
scripts use a smaller sample first so that the logic can be tested quickly.

## How To Run

Create or activate a virtual environment, then install dependencies:

```bash
pip install -r requirements.txt
```

Run the Week 4 fraud detection pipeline:

```bash
python3 src/run_week4_fraud_detection.py
```

This generates:

```text
data/processed/week4_suspicious_accounts.csv
data/processed/week4_suspicious_transactions.csv
data/processed/week4_fraud_case_report.json
```

## Notes

The current system is a batch analysis pipeline. It is not fully real-time yet.
The next steps are to improve the fraud detection logic, build backend APIs,
create a frontend dashboard, and later add machine learning/GNN models.
