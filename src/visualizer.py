import pandas as pd
import plotly.express as px

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
fig.write_html('fraud_distribution.html')
print("✓ Visualization saved to fraud_distribution.html")

# Transaction types
fig2 = px.bar(
    df['type'].value_counts(),
    title='Transactions by Type'
)
fig2.write_html('transaction_types.html')
print("✓ Visualization saved to transaction_types.html")