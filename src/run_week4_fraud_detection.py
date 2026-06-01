import pandas as pd

from advanced_graph_analysis import AdvancedGraphAnalysis
from fraud_detector import FraudDetector
from graph_builder import GraphBuilder


DATA_PATH = "data/raw/transactions.csv"
NROWS = 100000


def main():
    print("Loading transactions...")
    transactions = pd.read_csv(DATA_PATH, nrows=NROWS)
    print(f"Loaded {len(transactions):,} transactions")

    print("\nBuilding transaction graph...")
    builder = GraphBuilder()
    graph = builder.build_from_transactions(transactions)

    print("\nRunning graph analysis for fraud features...")
    analyzer = AdvancedGraphAnalysis(graph)
    pagerank = analyzer.calculate_pagerank()
    communities = analyzer.detect_communities()
    cycle_accounts = analyzer.detect_cycles()

    print("\nScoring fraud risk with explainable rules...")
    detector = FraudDetector(
        graph=graph,
        transactions=transactions,
        pagerank_scores=pagerank,
        communities=communities,
        cycle_accounts=cycle_accounts,
    )
    transaction_results = detector.score_transactions()
    account_results = detector.rank_suspicious_accounts(top_n=25)
    output_paths = detector.export_case_report()

    print("\nTop suspicious accounts:")
    columns = [
        "account",
        "account_risk_score",
        "risk_level",
        "community_id",
        "in_degree",
        "out_degree",
        "in_circular_pattern",
        "fraud_reasons",
    ]
    print(account_results[columns].head(10).to_string(index=False))

    print("\nTop suspicious transactions:")
    tx_columns = [
        "step",
        "type",
        "amount",
        "nameOrig",
        "nameDest",
        "fraud_risk_score",
        "risk_level",
        "fraud_reasons",
    ]
    print(transaction_results[tx_columns].head(10).to_string(index=False))

    print("\nSaved Week 4 outputs:")
    for label, path in output_paths.items():
        print(f"- {label}: {path}")


if __name__ == "__main__":
    main()
