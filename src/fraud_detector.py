import networkx as nx
import pandas as pd

class FraudDetector:
    def __init__(self, graph):
        self.graph = graph
        self.fraud_scores = {}
    
    def detect_high_degree_accounts(self):
        """Find accounts with suspicious activity"""
        for node in self.graph.nodes():
            out_degree = self.graph.out_degree(node)
            in_degree = self.graph.in_degree(node)
            
            # High degree = suspicious
            score = (out_degree + in_degree) * 0.1
            self.fraud_scores[node] = score
        
        return self.fraud_scores
    
    def get_top_suspicious(self, n=10):
        """Get top N suspicious accounts"""
        sorted_scores = sorted(self.fraud_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_scores[:n]