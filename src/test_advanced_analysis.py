import pandas as pd
from graph_builder import GraphBuilder
from advanced_graph_analysis import AdvancedGraphAnalysis

print("Loading data...")
df = pd.read_csv('data/raw/transactions.csv', nrows=1000000)  # Smaller for speed

print("Building graph...")
builder = GraphBuilder()
graph = builder.build_from_transactions(df)

print("\n" + "="*60)
print("ADVANCED GRAPH ANALYSIS")
print("="*60 + "\n")

analyzer = AdvancedGraphAnalysis(graph)
analyzer.calculate_pagerank()
analyzer.detect_communities()
analyzer.detect_cycles()

print("\n✅ Analysis Complete!")