import pandas as pd
import json
from typing import Dict, Iterable, List, Optional, Set

class FraudDetector:
    """Explainable rule-based fraud detector for transaction graphs."""

    def __init__(
        self,
        graph,
        transactions: Optional[pd.DataFrame] = None,
        pagerank_scores: Optional[Dict[str, float]] = None,
        communities: Optional[Dict[str, int]] = None,
        cycle_accounts: Optional[Iterable[str]] = None,
    ):
        self.graph = graph
        self.transactions = transactions.copy() if transactions is not None else None
        self.pagerank_scores = pagerank_scores or {}
        self.communities = communities or {}
        self.cycle_accounts: Set[str] = set(cycle_accounts or [])
        self.fraud_scores = {}
        self.transaction_results = pd.DataFrame()
        self.account_results = pd.DataFrame()

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

    def score_transactions(self, include_known_labels=True) -> pd.DataFrame:
        """Score each transaction with clear fraud reasons."""
        if self.transactions is None:
            raise ValueError("transactions dataframe is required for transaction scoring")

        df = self.transactions.copy()
        amount_threshold = df["amount"].quantile(0.99) if "amount" in df else 0
        community_fraud_rates = self._get_community_fraud_rates(df)

        scores: List[float] = []
        reasons: List[str] = []

        for _, row in df.iterrows():
            score = 0.0
            row_reasons: List[str] = []

            tx_type = row.get("type", "")
            amount = float(row.get("amount", 0) or 0)
            sender = str(row.get("nameOrig", ""))
            receiver = str(row.get("nameDest", ""))

            if include_known_labels and int(row.get("isFraud", 0) or 0) == 1:
                score += 45
                row_reasons.append("Known fraud label in dataset")

            if int(row.get("isFlaggedFraud", 0) or 0) == 1:
                score += 35
                row_reasons.append("Flagged by source system")

            if amount_threshold and amount >= amount_threshold:
                score += 15
                row_reasons.append("Amount is in top 1 percent")

            if tx_type in {"TRANSFER", "CASH_OUT"}:
                score += 8
                row_reasons.append("High-risk transaction type")

            if self._origin_account_emptied(row):
                score += 12
                row_reasons.append("Origin account emptied after transaction")

            if self._origin_balance_mismatch(row):
                score += 10
                row_reasons.append("Origin balance mismatch")

            if self._destination_balance_mismatch(row):
                score += 8
                row_reasons.append("Destination balance mismatch")

            if sender in self.cycle_accounts or receiver in self.cycle_accounts:
                score += 15
                row_reasons.append("Account participates in circular money movement")

            sender_community = self.communities.get(sender)
            receiver_community = self.communities.get(receiver)
            if self._is_suspicious_community(sender_community, community_fraud_rates):
                score += 10
                row_reasons.append("Origin community has high fraud concentration")
            if self._is_suspicious_community(receiver_community, community_fraud_rates):
                score += 10
                row_reasons.append("Destination community has high fraud concentration")

            scores.append(min(score, 100))
            reasons.append("; ".join(row_reasons) if row_reasons else "No major rule triggered")

        df["fraud_risk_score"] = scores
        df["fraud_reasons"] = reasons
        df["risk_level"] = df["fraud_risk_score"].apply(self._risk_level)
        self.transaction_results = df.sort_values("fraud_risk_score", ascending=False)
        return self.transaction_results

    def rank_suspicious_accounts(self, top_n=25) -> pd.DataFrame:
        """Aggregate transaction and graph evidence into account-level rankings."""
        if self.transaction_results.empty:
            self.score_transactions()

        account_stats: Dict[str, Dict] = {}

        for _, row in self.transaction_results.iterrows():
            for role, account_col in (("sender", "nameOrig"), ("receiver", "nameDest")):
                account = str(row.get(account_col, ""))
                if not account:
                    continue

                stats = account_stats.setdefault(
                    account,
                    {
                        "account": account,
                        "sent_transactions": 0,
                        "received_transactions": 0,
                        "total_sent_amount": 0.0,
                        "total_received_amount": 0.0,
                        "max_transaction_risk": 0.0,
                        "risk_reasons": set(),
                    },
                )

                if role == "sender":
                    stats["sent_transactions"] += 1
                    stats["total_sent_amount"] += float(row.get("amount", 0) or 0)
                else:
                    stats["received_transactions"] += 1
                    stats["total_received_amount"] += float(row.get("amount", 0) or 0)

                stats["max_transaction_risk"] = max(
                    stats["max_transaction_risk"],
                    float(row.get("fraud_risk_score", 0) or 0),
                )
                if row.get("fraud_reasons") != "No major rule triggered":
                    stats["risk_reasons"].update(str(row.get("fraud_reasons", "")).split("; "))

        rows = []
        max_pagerank = max(self.pagerank_scores.values()) if self.pagerank_scores else 0

        for account, stats in account_stats.items():
            in_degree = self.graph.in_degree(account) if account in self.graph else 0
            out_degree = self.graph.out_degree(account) if account in self.graph else 0
            pagerank = self.pagerank_scores.get(account, 0)
            pagerank_score = (pagerank / max_pagerank * 20) if max_pagerank else 0
            degree_score = min((in_degree + out_degree) * 2, 20)
            cycle_score = 20 if account in self.cycle_accounts else 0

            account_score = min(
                100,
                (stats["max_transaction_risk"] * 0.55)
                + pagerank_score
                + degree_score
                + cycle_score,
            )

            rows.append(
                {
                    "account": account,
                    "account_risk_score": round(account_score, 2),
                    "risk_level": self._risk_level(account_score),
                    "community_id": self.communities.get(account, -1),
                    "pagerank": pagerank,
                    "in_degree": in_degree,
                    "out_degree": out_degree,
                    "sent_transactions": stats["sent_transactions"],
                    "received_transactions": stats["received_transactions"],
                    "total_sent_amount": round(stats["total_sent_amount"], 2),
                    "total_received_amount": round(stats["total_received_amount"], 2),
                    "in_circular_pattern": account in self.cycle_accounts,
                    "fraud_reasons": "; ".join(sorted(stats["risk_reasons"]))
                    or "Graph activity only",
                }
            )

        self.account_results = (
            pd.DataFrame(rows)
            .sort_values("account_risk_score", ascending=False)
            .head(top_n)
            .reset_index(drop=True)
        )
        self.fraud_scores = dict(
            zip(self.account_results["account"], self.account_results["account_risk_score"])
        )
        return self.account_results

    def export_case_report(
        self,
        account_path="data/processed/week4_suspicious_accounts.csv",
        transaction_path="data/processed/week4_suspicious_transactions.csv",
        json_path="data/processed/week4_fraud_case_report.json",
        top_transactions=100,
    ) -> Dict[str, str]:
        """Export suspicious accounts and transactions for reports/dashboard use."""
        if self.transaction_results.empty:
            self.score_transactions()
        if self.account_results.empty:
            self.rank_suspicious_accounts()

        suspicious_transactions = self.transaction_results.head(top_transactions)
        self.account_results.to_csv(account_path, index=False)
        suspicious_transactions.to_csv(transaction_path, index=False)

        report = {
            "summary": {
                "transactions_scored": int(len(self.transaction_results)),
                "high_risk_transactions": int(
                    (self.transaction_results["risk_level"] == "High").sum()
                ),
                "accounts_ranked": int(len(self.account_results)),
            },
            "top_accounts": self.account_results.to_dict(orient="records"),
            "top_transactions": suspicious_transactions.to_dict(orient="records"),
        }
        with open(json_path, "w") as report_file:
            json.dump(report, report_file, indent=2)

        return {
            "accounts": account_path,
            "transactions": transaction_path,
            "json": json_path,
        }

    def _get_community_fraud_rates(self, df: pd.DataFrame) -> Dict[int, float]:
        if "isFraud" not in df or not self.communities:
            return {}

        community_counts: Dict[int, Dict[str, int]] = {}
        for _, row in df.iterrows():
            for account_col in ("nameOrig", "nameDest"):
                account = str(row.get(account_col, ""))
                community = self.communities.get(account)
                if community is None:
                    continue
                counts = community_counts.setdefault(community, {"rows": 0, "frauds": 0})
                counts["rows"] += 1
                counts["frauds"] += int(row.get("isFraud", 0) or 0)

        return {
            community: counts["frauds"] / counts["rows"]
            for community, counts in community_counts.items()
            if counts["rows"]
        }

    @staticmethod
    def _is_suspicious_community(community_id, fraud_rates: Dict[int, float]) -> bool:
        return community_id is not None and fraud_rates.get(community_id, 0) >= 0.01

    @staticmethod
    def _origin_account_emptied(row) -> bool:
        amount = float(row.get("amount", 0) or 0)
        old_balance = float(row.get("oldbalanceOrg", 0) or 0)
        new_balance = float(row.get("newbalanceOrig", 0) or 0)
        return old_balance > 0 and new_balance == 0 and amount >= old_balance * 0.9

    @staticmethod
    def _origin_balance_mismatch(row) -> bool:
        tx_type = row.get("type", "")
        if tx_type not in {"PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT"}:
            return False
        amount = float(row.get("amount", 0) or 0)
        old_balance = float(row.get("oldbalanceOrg", 0) or 0)
        new_balance = float(row.get("newbalanceOrig", 0) or 0)
        return abs((old_balance - amount) - new_balance) > 0.01

    @staticmethod
    def _destination_balance_mismatch(row) -> bool:
        tx_type = row.get("type", "")
        receiver = str(row.get("nameDest", ""))
        if tx_type not in {"TRANSFER", "CASH_OUT"} or receiver.startswith("M"):
            return False
        amount = float(row.get("amount", 0) or 0)
        old_balance = float(row.get("oldbalanceDest", 0) or 0)
        new_balance = float(row.get("newbalanceDest", 0) or 0)
        return old_balance > 0 and abs((old_balance + amount) - new_balance) > 0.01

    @staticmethod
    def _risk_level(score: float) -> str:
        if score >= 70:
            return "High"
        if score >= 40:
            return "Medium"
        return "Low"
