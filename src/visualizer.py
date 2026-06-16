import pandas as pd
import plotly.express as px
from pathlib import Path


output_dir = Path('outputs/visualizations')
output_dir.mkdir(parents=True, exist_ok=True)

# Load data
df = pd.read_csv('data/raw/transactions.csv')

# Fraud distribution
fraud_counts = df['isFraud'].value_counts()
fig = px.bar(
    x=['Legitimate', 'Fraud'],
    y=fraud_counts.values,
    title='Transaction Distribution: Legitimate vs Fraud',
    labels={'x': 'Type', 'y': 'Count'}
)
fraud_distribution_path = output_dir / 'fraud_distribution.html'
fig.write_html(fraud_distribution_path)
print(f"✓ Visualization saved to {fraud_distribution_path}")

# Transaction types
fig2 = px.bar(
    df['type'].value_counts(),
    title='Transactions by Type'
)
transaction_types_path = output_dir / 'transaction_types.html'
fig2.write_html(transaction_types_path)
print(f"✓ Visualization saved to {transaction_types_path}")
