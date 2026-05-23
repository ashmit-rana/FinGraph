import pandas as pd
import plotly.graph_objects as go
import networkx as nx
from graph_builder import GraphBuilder
from fraud_detector import FraudDetector

# Load and build
df = pd.read_csv('data/raw/transactions.csv', nrows=50000)
builder = GraphBuilder()
graph = builder.build_from_transactions(df)

# Detect fraud
detector = FraudDetector(graph)
detector.detect_high_degree_accounts()

# Get top 50 suspicious accounts
top_suspicious = detector.get_top_suspicious(50)
suspicious_nodes = [node for node, score in top_suspicious]

# Create subgraph of suspicious accounts
subgraph = graph.subgraph(suspicious_nodes).copy()

# Layout
pos = nx.spring_layout(subgraph, k=0.5, iterations=50)

# Edges
edge_x, edge_y = [], []
for edge in subgraph.edges():
    x0, y0 = pos[edge[0]]
    x1, y1 = pos[edge[1]]
    edge_x.extend([x0, x1, None])
    edge_y.extend([y0, y1, None])

edge_trace = go.Scatter(x=edge_x, y=edge_y, mode='lines', 
    line=dict(width=0.5, color='#888'), hoverinfo='none')

# Nodes
node_x, node_y, node_text = [], [], []
for node in subgraph.nodes():
    x, y = pos[node]
    node_x.append(x)
    node_y.append(y)
    score = detector.fraud_scores.get(node, 0)
    node_text.append(f"Account: {node}<br>Risk: {score:.1f}")

node_trace = go.Scatter(x=node_x, y=node_y, mode='markers',
    text=node_text, hoverinfo='text',
    marker=dict(size=8, color=[detector.fraud_scores.get(node, 0) for node in subgraph.nodes()],
        colorscale='Reds', showscale=True))

# Figure
fig = go.Figure(data=[edge_trace, node_trace])
fig.update_layout(title='Suspicious Account Network', showlegend=False,
    hovermode='closest', margin=dict(b=20, l=5, r=5, t=40))

fig.write_html('suspicious_network.html')
print("✓ Visualization saved to suspicious_network.html")