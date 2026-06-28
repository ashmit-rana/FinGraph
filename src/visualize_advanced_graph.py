import pandas as pd
import os
import plotly.graph_objects as go
import networkx as nx
from pathlib import Path
from graph_builder import GraphBuilder
from advanced_graph_analysis import AdvancedGraphAnalysis
import random

ROW_LIMIT = int(os.getenv("FINGRAPH_ROW_LIMIT", "200000"))

print("Loading data...")
df = pd.read_csv('data/raw/transactions.csv', nrows=ROW_LIMIT)
print(f"Loaded {len(df):,} rows")

print("Building graph...")
builder = GraphBuilder()
graph = builder.build_from_transactions(df)

print("Running advanced analysis...")
analyzer = AdvancedGraphAnalysis(graph)
pagerank = analyzer.calculate_pagerank()
communities = analyzer.detect_communities()
cycles = analyzer.detect_cycles()

print("\nCreating visualization...")

# Get top communities (most suspicious)
from collections import Counter
community_counts = Counter(communities.values())
top_communities = [c[0] for c in community_counts.most_common(10)]

# Filter graph to top communities + key accounts
top_accounts = set()
for node, comm in communities.items():
    if comm in top_communities:
        top_accounts.add(node)

# Keep top PageRank nodes too
top_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[:50]
for node, _ in top_pr:
    top_accounts.add(node)

subgraph = graph.subgraph(top_accounts).copy()

# Layout
print("Computing layout...")
pos = nx.spring_layout(subgraph, k=2, iterations=100, seed=42)

# Create edges
edge_x = []
edge_y = []
edge_colors = []

for edge in subgraph.edges():
    x0, y0 = pos[edge[0]]
    x1, y1 = pos[edge[1]]
    edge_x.extend([x0, x1, None])
    edge_y.extend([y0, y1, None])
    
    # Color by community
    comm1 = communities.get(edge[0], -1)
    comm2 = communities.get(edge[1], -1)
    if comm1 == comm2:
        edge_colors.append('rgba(200, 50, 50, 0.5)')  # Red for same community
    else:
        edge_colors.append('rgba(100, 100, 100, 0.2)')  # Gray for cross-community

edge_trace = go.Scatter(
    x=edge_x, y=edge_y,
    mode='lines',
    line=dict(width=1, color='rgba(100,100,100,0.2)'),
    hoverinfo='none',
    showlegend=False
)

# Create nodes
node_x = []
node_y = []
node_color = []
node_size = []
node_text = []
node_symbol = []

color_map = {}
colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'gray', 'olive', 'cyan']

for node in subgraph.nodes():
    x, y = pos[node]
    node_x.append(x)
    node_y.append(y)
    
    # Color by community
    comm = communities.get(node, -1)
    if comm not in color_map:
        color_map[comm] = colors[len(color_map) % len(colors)]
    node_color.append(color_map[comm])
    
    # Size by PageRank
    pr_score = pagerank.get(node, 0)
    size = 10 + (pr_score * 500)
    node_size.append(size)
    
    # Symbol = diamond if in cycle
    if node in cycles:
        node_symbol.append('diamond')
    else:
        node_symbol.append('circle')
    
    # Hover text
    pr = pagerank.get(node, 0)
    is_cycle = "Yes (Money Laundering 🚨)" if node in cycles else "No"
    node_text.append(
        f"<b>Account: {node}</b><br>" +
        f"PageRank: {pr:.6f}<br>" +
        f"Community: {comm}<br>" +
        f"In Cycle: {is_cycle}<br>" +
        f"Connections: {subgraph.degree(node)}"
    )

node_trace = go.Scatter(
    x=node_x, y=node_y,
    mode='markers',
    text=node_text,
    hoverinfo='text',
    marker=dict(
        size=node_size,
        color=node_color,
        line=dict(width=2, color='white'),
        opacity=0.9,
        symbol=node_symbol
    ),
    showlegend=False
)

# Create figure
fig = go.Figure(data=[edge_trace, node_trace])

fig.update_layout(
    title={
        'text': '<b>FinGraph: Fraud Network Analysis</b><br>' +
                '<sub>Communities (colored), Size = Importance (PageRank), Diamond = Circular Transactions</sub>',
        'x': 0.5,
        'xanchor': 'center',
        'font': {'size': 20}
    },
    showlegend=False,
    hovermode='closest',
    margin=dict(b=20,l=5,r=5,t=80),
    xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
    yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
    plot_bgcolor='rgba(240, 240, 240, 1)',
    width=1400,
    height=900,
    font=dict(size=12, family="Arial, sans-serif")
)

# Save
output_dir = Path('outputs/visualizations')
output_dir.mkdir(parents=True, exist_ok=True)
output_file = output_dir / 'advanced_fraud_network.html'
fig.write_html(output_file)
print(f"\n✅ Visualization saved to {output_file}")
print(f"\n📊 KEY INSIGHTS:")
print(f"   • {len(top_communities)} major fraud communities detected")
print(f"   • {len(cycles)} accounts involved in circular transactions")
print(f"   • Network density: {nx.density(subgraph):.4f}")
