import pandas as pd
from graph_builder import GraphBuilder
from fraud_detector import FraudDetector

# Load data
print("Loading data...")
df = pd.read_csv('data/raw/transactions.csv', nrows=100000)

# Build graph
print("Building graph...")
builder = GraphBuilder()
graph = builder.build_from_transactions(df)

# Detect fraud
print("\nDetecting suspicious accounts...")
detector = FraudDetector(graph)
detector.detect_high_degree_accounts()

# Get top suspicious
top_suspicious = detector.get_top_suspicious(10)
print("\n🚨 Top 10 Suspicious Accounts:")
for account, score in top_suspicious:
    print(f"  {account}: {score:.2f}")