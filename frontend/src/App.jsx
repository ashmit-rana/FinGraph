import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Sidebar from "./components/Sidebar";
import TopHeader from "./components/TopHeader";
import Overview from "./pages/Overview";
import RiskQueue from "./pages/RiskQueue";
import TransactionScoring from "./pages/TransactionScoring";
import GraphIntelligence from "./pages/GraphIntelligence";
import ModelPerformance from "./pages/ModelPerformance";
import RulesSignals from "./pages/RulesSignals";
import CaseReview from "./pages/CaseReview";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/* ═══════════════════════════════════════════
   Utility helpers — exported for all pages
   ═══════════════════════════════════════════ */

export const formatNumber = (v) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(v || 0));

export const formatPercent = (v, d = 1) =>
  `${(Number(v || 0) * 100).toFixed(d)}%`;

export const formatCurrency = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export const titleize = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const getRiskLevel = (p) => {
  if (p >= 0.9) return "critical";
  if (p >= 0.7) return "high";
  if (p >= 0.4) return "medium";
  return "low";
};

export const getRiskLabel = (p) => {
  const l = getRiskLevel(p);
  return l.charAt(0).toUpperCase() + l.slice(1);
};

/* ═══════════════════════════════════════════
   Fallback data — shown when API is offline
   ═══════════════════════════════════════════ */

const fallbackMetrics = {
  sample_rows: 200000,
  train_rows: 150000,
  test_rows: 50000,
  fraud_cases_in_sample: 147,
  fraud_rate_in_sample: 0.000735,
  best_model: "random_forest",
  metrics: {
    logistic_regression: {
      precision: 0.009563194623933832,
      recall: 1.0,
      f1_score: 0.01894521249359959,
      average_precision: 0.29088480225877167,
      roc_auc: 0.9953116657678033,
      confusion_matrix: [
        [46131, 3832],
        [0, 37],
      ],
    },
    random_forest: {
      precision: 1.0,
      recall: 0.972972972972973,
      f1_score: 0.9863013698630136,
      average_precision: 0.9947121034077555,
      roc_auc: 0.9999951315324691,
      confusion_matrix: [
        [49963, 0],
        [1, 36],
      ],
    },
  },
};

const fallbackFeatures = [
  { feature: "origin_balance_error", importance: 0.2425599215886519 },
  { feature: "origin_account_emptied", importance: 0.2108390555293332 },
  { feature: "amount_to_oldbalance_ratio", importance: 0.16689829036028708 },
  { feature: "is_transfer_or_cashout", importance: 0.12257634348964294 },
  { feature: "newbalanceOrig", importance: 0.057097976828191906 },
  { feature: "oldbalanceDest", importance: 0.040389870402873486 },
  { feature: "amount", importance: 0.02991243984549912 },
  { feature: "oldbalanceOrg", importance: 0.02990736866919842 },
  { feature: "step", importance: 0.025367900549375037 },
  { feature: "type_PAYMENT", importance: 0.025182831213176524 },
];

const fallbackPredictions = [
  { step: 6, type: "TRANSFER", amount: 25975.86, nameOrig: "C864622150", oldbalanceOrg: 25975.86, newbalanceOrig: 0, nameDest: "C41792607", oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, origin_balance_error: 0, destination_balance_error: 25975.86, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9999, actual_isFraud: 1, predicted_isFraud: 1, fraud_probability: 1.0, model_used: "random_forest" },
  { step: 1, type: "TRANSFER", amount: 2806, nameOrig: "C1420196421", oldbalanceOrg: 2806, newbalanceOrig: 0, nameDest: "C972765878", oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, origin_balance_error: 0, destination_balance_error: 2806, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9996, actual_isFraud: 1, predicted_isFraud: 1, fraud_probability: 1.0, model_used: "random_forest" },
  { step: 8, type: "TRANSFER", amount: 43092, nameOrig: "C1683174795", oldbalanceOrg: 43092, newbalanceOrig: 0, nameDest: "C427998326", oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, origin_balance_error: 0, destination_balance_error: 43092, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9999, actual_isFraud: 1, predicted_isFraud: 1, fraud_probability: 0.9999936, model_used: "random_forest" },
  { step: 1, type: "CASH_OUT", amount: 20128, nameOrig: "C1118430673", oldbalanceOrg: 20128, newbalanceOrig: 0, nameDest: "C339924917", oldbalanceDest: 14250.15, newbalanceDest: 34378.15, isFraud: 1, origin_balance_error: 0, destination_balance_error: 0, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9999, actual_isFraud: 1, predicted_isFraud: 1, fraud_probability: 0.9999953, model_used: "random_forest" },
  { step: 9, type: "CASH_OUT", amount: 1154353.99, nameOrig: "C1034219836", oldbalanceOrg: 1154353.99, newbalanceOrig: 0, nameDest: "C1195589213", oldbalanceDest: 649011.61, newbalanceDest: 1803365.6, isFraud: 0, origin_balance_error: 0, destination_balance_error: 0, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9999, actual_isFraud: 0, predicted_isFraud: 1, fraud_probability: 0.9999718, model_used: "random_forest" },
  { step: 3, type: "TRANSFER", amount: 62927, nameOrig: "C1237762639", oldbalanceOrg: 62927, newbalanceOrig: 0, nameDest: "C981aborr43", oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, origin_balance_error: 0, destination_balance_error: 62927, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9999, actual_isFraud: 1, predicted_isFraud: 1, fraud_probability: 0.9998, model_used: "random_forest" },
  { step: 5, type: "CASH_OUT", amount: 339682.13, nameOrig: "C840554219", oldbalanceOrg: 339682.13, newbalanceOrig: 0, nameDest: "C38997010", oldbalanceDest: 0, newbalanceDest: 339682.13, isFraud: 1, origin_balance_error: 0, destination_balance_error: 0, origin_account_emptied: 1, is_transfer_or_cashout: 1, amount_to_oldbalance_ratio: 0.9999, actual_isFraud: 1, predicted_isFraud: 1, fraud_probability: 0.9997, model_used: "random_forest" },
  { step: 2, type: "PAYMENT", amount: 1250.50, nameOrig: "C556677889", oldbalanceOrg: 45000, newbalanceOrig: 43749.50, nameDest: "M112233445", oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, origin_balance_error: 0, destination_balance_error: 1250.50, origin_account_emptied: 0, is_transfer_or_cashout: 0, amount_to_oldbalance_ratio: 0.0278, actual_isFraud: 0, predicted_isFraud: 0, fraud_probability: 0.02, model_used: "random_forest" },
];

/* ═══════════════════════════════════════════
   React context — shared across all pages
   ═══════════════════════════════════════════ */

const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

/* ═══════════════════════════════════════════
   Data fetching hook
   ═══════════════════════════════════════════ */

function useFinGraphData() {
  const [state, setState] = useState({
    metrics: fallbackMetrics,
    features: fallbackFeatures,
    predictions: fallbackPredictions,
    health: null,
    source: "local artifact",
    loading: true,
    error: "",
    lastRefreshed: new Date(),
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const [mR, fR, pR, hR] = await Promise.all([
        fetch(`${API_BASE_URL}/metrics`),
        fetch(`${API_BASE_URL}/features/importance?limit=10`),
        fetch(`${API_BASE_URL}/predictions/top?limit=50`),
        fetch(`${API_BASE_URL}/health`),
      ]);
      if (!mR.ok || !fR.ok || !pR.ok) throw new Error("API response incomplete");
      const [metrics, fPayload, pPayload, health] = await Promise.all([
        mR.json(),
        fR.json(),
        pR.json(),
        hR.ok ? hR.json() : null,
      ]);
      setState({
        metrics,
        features: fPayload.features || fallbackFeatures,
        predictions: pPayload.predictions || fallbackPredictions,
        health,
        source: "live API",
        loading: false,
        error: "",
        lastRefreshed: new Date(),
      });
    } catch (err) {
      setState({
        metrics: fallbackMetrics,
        features: fallbackFeatures,
        predictions: fallbackPredictions,
        health: null,
        source: "local artifact",
        loading: false,
        error: err.message,
        lastRefreshed: new Date(),
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/* ═══════════════════════════════════════════
   Case store — frontend-only analyst decisions
   ═══════════════════════════════════════════ */

function useCaseStore() {
  const [cases, setCases] = useState([]);

  const addCase = useCallback((txn, decision, notes = "") => {
    setCases((prev) => {
      const id = `CASE-${String(prev.length + 1).padStart(4, "0")}`;
      return [
        ...prev,
        {
          id,
          account: txn.nameOrig || "Unknown",
          destAccount: txn.nameDest || "Unknown",
          riskScore: txn.fraud_probability || 0,
          type: txn.type || "UNKNOWN",
          amount: txn.amount || 0,
          status: decision,
          decision,
          notes,
          createdAt: new Date(),
        },
      ];
    });
  }, []);

  const updateCase = useCallback((id, updates) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const clearCases = useCallback(() => setCases([]), []);

  return { cases, addCase, updateCase, clearCases };
}

/* ═══════════════════════════════════════════
   Root App component
   ═══════════════════════════════════════════ */

const PAGE_MAP = {
  overview: Overview,
  "risk-queue": RiskQueue,
  "transaction-scoring": TransactionScoring,
  "graph-intelligence": GraphIntelligence,
  "model-performance": ModelPerformance,
  "rules-signals": RulesSignals,
  "case-review": CaseReview,
};

function App() {
  const [activePage, setActivePage] = useState("overview");
  const data = useFinGraphData();
  const caseStore = useCaseStore();

  const ctx = {
    ...data,
    ...caseStore,
    activePage,
    setActivePage,
    API_BASE_URL,
  };

  const Page = PAGE_MAP[activePage] || Overview;

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <Sidebar />
        <div className="main-area">
          <TopHeader />
          <main className="page-content">
            {data.error && (
              <div className="notice-banner warning">
                <AlertTriangle size={16} />
                <span>API offline — using sample artifact preview data</span>
              </div>
            )}
            {!data.error && !data.loading && data.source === "live API" && (
              <div className="notice-banner success">
                <CheckCircle2 size={16} />
                <span>Live API connected</span>
              </div>
            )}
            <Page />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

export default App;
