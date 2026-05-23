import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class DataCleaner:
    def __init__(self, filepath):
        self.filepath = filepath
        self.df = None
        self.cleaning_report = {}
    
    def load_data(self, nrows=None):
        """Load transaction data"""
        print("📥 Loading data...")
        self.df = pd.read_csv(self.filepath, nrows=nrows)
        print(f"✓ Loaded {len(self.df)} rows, {len(self.df.columns)} columns")
        return self.df
    
    def check_missing_values(self):
        """Check for null values"""
        print("\n🔍 Checking missing values...")
        missing = self.df.isnull().sum()
        missing_pct = (missing / len(self.df)) * 100
        
        self.cleaning_report['missing_values'] = missing[missing > 0].to_dict()
        
        if missing.sum() == 0:
            print("✓ No missing values found")
        else:
            print(f"Found {missing.sum()} missing values")
            print(missing[missing > 0])
        
        return missing
    
    def remove_duplicates(self):
        """Remove duplicate transactions"""
        print("\n🔄 Removing duplicates...")
        before = len(self.df)
        self.df = self.df.drop_duplicates()
        removed = before - len(self.df)
        
        self.cleaning_report['duplicates_removed'] = removed
        print(f"✓ Removed {removed} duplicate rows")
        
        return removed
    
    def handle_outliers(self, column='amount', percentile=99):
        """Remove extreme outliers"""
        print(f"\n📊 Handling outliers in {column}...")
        
        if column not in self.df.columns:
            print(f"⚠️  Column {column} not found")
            return 0
        
        before = len(self.df)
        threshold = self.df[column].quantile(percentile / 100)
        self.df = self.df[self.df[column] <= threshold]
        removed = before - len(self.df)
        
        self.cleaning_report['outliers_removed'] = removed
        print(f"✓ Removed {removed} outliers (threshold: {threshold:.2f})")
        
        return removed
    
    def remove_invalid_transactions(self):
        """Remove transactions with invalid amounts"""
        print("\n✅ Removing invalid transactions...")
        before = len(self.df)
        
        # Remove zero/negative amounts
        self.df = self.df[self.df['amount'] > 0]
        removed = before - len(self.df)
        
        self.cleaning_report['invalid_removed'] = removed
        print(f"✓ Removed {removed} transactions with invalid amounts")
        
        return removed
    
    def normalize_numerical_columns(self, columns_to_normalize=None):
        """Normalize numerical columns"""
        print("\n📈 Normalizing numerical data...")
        
        if columns_to_normalize is None:
            columns_to_normalize = self.df.select_dtypes(include=[np.number]).columns.tolist()
        
        scaler = StandardScaler()
        self.df[columns_to_normalize] = scaler.fit_transform(self.df[columns_to_normalize])
        
        print(f"✓ Normalized {len(columns_to_normalize)} numerical columns")
        self.cleaning_report['normalized_columns'] = columns_to_normalize
        
        return columns_to_normalize
    
    def get_data_quality_report(self):
        """Generate data quality report"""
        print("\n" + "="*60)
        print("DATA QUALITY REPORT")
        print("="*60)
        print(f"Total rows: {len(self.df)}")
        print(f"Total columns: {len(self.df.columns)}")
        print(f"Memory usage: {self.df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
        print(f"\nData types:\n{self.df.dtypes}")
        print(f"\nBasic statistics:\n{self.df.describe()}")
        print("="*60 + "\n")
    
    def clean_all(self, nrows=None):
        """Run complete cleaning pipeline"""
        self.load_data(nrows=nrows)
        self.check_missing_values()
        self.remove_duplicates()
        self.remove_invalid_transactions()
        self.handle_outliers(column='amount', percentile=99.5)
        self.get_data_quality_report()
        
        return self.df
    
    def save_cleaned_data(self, output_path):
        """Save cleaned data"""
        print(f"💾 Saving cleaned data to {output_path}...")
        self.df.to_csv(output_path, index=False)
        print(f"✓ Saved {len(self.df)} rows")


# Usage
if __name__ == "__main__":
    cleaner = DataCleaner('data/raw/transactions.csv')
    cleaned_df = cleaner.clean_all(nrows=100000)
    cleaner.save_cleaned_data('data/processed/transactions_cleaned.csv')