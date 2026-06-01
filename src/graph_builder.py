import networkx as nx
import pandas as pd

class GraphBuilder:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.df = None
    
    def build_from_transactions(self, df):
        """Build graph from transactions"""
        self.df = df.copy()
        
        # For each transaction, create an edge
        for idx, row in df.iterrows():
            # Use nameOrig (sender) and nameDest (receiver) if available
            sender = str(row.get('nameOrig', idx))
            receiver = str(row.get('nameDest', idx))
            amount = row.get('amount', 0)
            is_fraud = row.get('isFraud', 0)
            
            # Add edge to graph
            if self.graph.has_edge(sender, receiver):
                self.graph[sender][receiver]['weight'] += amount
                self.graph[sender][receiver]['count'] += 1
                self.graph[sender][receiver]['fraud'] = max(
                    self.graph[sender][receiver].get('fraud', 0),
                    is_fraud
                )
            else:
                self.graph.add_edge(sender, receiver, weight=amount, count=1, fraud=is_fraud)
            
            if idx % 500000 == 0 and idx > 0:
                print(f"Processed {idx} transactions...")
        
        print(f"\n✓ Graph built: {self.graph.number_of_nodes()} accounts")
        print(f"✓ Edges: {self.graph.number_of_edges()} transactions")
        return self.graph
    
    def get_stats(self):
        """Get graph statistics"""
        stats = {
            'nodes': self.graph.number_of_nodes(),
            'edges': self.graph.number_of_edges(),
            'density': nx.density(self.graph)
        }
        return stats
