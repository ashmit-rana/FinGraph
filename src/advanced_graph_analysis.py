import networkx as nx
import community as community_louvain
import pandas as pd
from typing import Dict, List, Tuple

class AdvancedGraphAnalysis:
    def __init__(self, graph):
        self.graph = graph
        self.pagerank_scores = {}
        self.communities = {}
        self.community_map = {}
        self._betweenness = {}
        self._cycles = set()
    
    def calculate_pagerank(self):
        """Calculate PageRank - identifies most important accounts"""
        print("📊 Calculating PageRank...")
        self.pagerank_scores = nx.pagerank(self.graph, alpha=0.85)
        
        # Sort by importance
        sorted_pr = sorted(self.pagerank_scores.items(), key=lambda x: x[1], reverse=True)
        print(f"✓ Top 10 Most Important Accounts (by PageRank):")
        for account, score in sorted_pr[:10]:
            print(f"  {account}: {score:.6f}")
        
        return self.pagerank_scores
    
    def detect_communities(self):
        """Detect fraud communities using Louvain algorithm"""
        print("\n🔍 Detecting account communities...")
        
        # Convert directed to undirected for community detection
        undirected = self.graph.to_undirected()
        
        # Find communities
        self.communities = community_louvain.best_partition(undirected)
        
        # Count communities
        num_communities = len(set(self.communities.values()))
        print(f"✓ Found {num_communities} account communities")
        
        # Show community sizes
        community_sizes = {}
        for node, comm_id in self.communities.items():
            if comm_id not in community_sizes:
                community_sizes[comm_id] = 0
            community_sizes[comm_id] += 1
        
        print(f"\nLargest community sizes:")
        largest_communities = sorted(
            community_sizes.items(),
            key=lambda item: item[1],
            reverse=True
        )[:10]
        for comm_id, size in largest_communities:
            print(f"  Community {comm_id}: {size} accounts")

        remaining = len(community_sizes) - len(largest_communities)
        if remaining > 0:
            print(f"  ... {remaining} smaller communities hidden")
        
        return self.communities
    
    def get_betweenness_centrality(self):
        """Find bridge accounts (most connected across communities)"""
        print("\n🌉 Calculating betweenness centrality...")
        betweenness = nx.betweenness_centrality(self.graph)
        self._betweenness = betweenness
        
        sorted_between = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)
        print(f"✓ Top 10 Bridge Accounts (suspicious intermediaries):")
        for account, score in sorted_between[:10]:
            print(f"  {account}: {score:.6f}")
        
        return betweenness
    
    def detect_cycles(self, max_component_size=25):
        """Detect circular transactions (money laundering pattern)"""
        print("\n♻️  Detecting circular transaction patterns...")

        cycle_accounts = set()
        circular_components = []

        for component in nx.strongly_connected_components(self.graph):
            if len(component) > 1:
                cycle_accounts.update(component)
                if len(component) <= max_component_size:
                    circular_components.append(sorted(component))

        for source, target in nx.selfloop_edges(self.graph):
            cycle_accounts.add(source)

        self._cycles = cycle_accounts
        cycles = sorted(cycle_accounts)

        print(f"✓ Found {len(cycles)} accounts involved in circular patterns")
        print(f"✓ Found {len(circular_components)} small circular components")
        print(f"  (Top 10 accounts): {cycles[:10]}")

        return cycles
    
    def get_fraud_risk_score(self, pagerank_weight=0.3, betweenness_weight=0.3, cycle_weight=0.4):
        """Combine multiple metrics into fraud risk score"""
        print("\n⚠️  Computing comprehensive fraud risk scores...")
        
        betweenness = self._betweenness or self.get_betweenness_centrality()
        cycles = self._cycles or self.detect_cycles()
        
        fraud_scores = {}
        
        for node in self.graph.nodes():
            pr_score = self.pagerank_scores.get(node, 0) * 100  # Normalize
            bet_score = betweenness.get(node, 0) * 100
            cycle_score = 50 if node in cycles else 0  # High score if in cycle
            
            # Weighted combination
            risk = (pr_score * pagerank_weight + 
                   bet_score * betweenness_weight + 
                   cycle_score * cycle_weight)
            
            fraud_scores[node] = risk
        
        # Top risky accounts
        top_risky = sorted(fraud_scores.items(), key=lambda x: x[1], reverse=True)[:10]
        print(f"\n🚨 Top 10 Most Suspicious Accounts:")
        for account, risk in top_risky:
            print(f"  {account}: Risk Score {risk:.2f}")
        
        return fraud_scores
    
    def get_summary(self) -> Dict:
        """Get analysis summary"""
        return {
            'pagerank': self.pagerank_scores,
            'communities': self.communities,
            'num_communities': len(set(self.communities.values())),
            'nodes': self.graph.number_of_nodes(),
            'edges': self.graph.number_of_edges()
        }
