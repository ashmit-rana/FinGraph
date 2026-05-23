import pandas as pd

# Load the data
df = pd.read_csv('data/raw/transactions.csv')

print("✓ Data loaded successfully!")
print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")

# Fraud statistics
fraud_count = df['isFraud'].sum()
fraud_percentage = (fraud_count / len(df)) * 100

print(f"\n📊 Fraud Statistics:")
print(f"Total fraud cases: {fraud_count}")
print(f"Fraud percentage: {fraud_percentage:.2f}%")
print(f"\nTransaction types: {df['type'].unique()}")