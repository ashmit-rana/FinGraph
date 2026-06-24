import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Network,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
      recall: 1,
      f1_score: 0.01894521249359959,
      average_precision: 0.29088480225877167,
      roc_auc: 0.9953116657678033,
      confusion_matrix: [
        [46131, 3832],
        [0, 37]
      ]
    },
    random_forest: {
      precision: 1,
      recall: 0.972972972972973,
      f1_score: 0.9863013698630136,
      average_precision: 0.9947121034077555,
      roc_auc: 0.9999951315324691,
      confusion_matrix: [
        [49963, 0],
        [1, 36]
      ]
    }
  }
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
  { feature: "type_PAYMENT", importance: 0.025182831213176524 }
];

const fallbackPredictions = [
  {
    step: 6,
    type: "TRANSFER",
    amount: 25975.86,
    nameOrig: "C864622150",
    nameDest: "C41792607",
    origin_account_emptied: 1,
    destination_balance_error: 25975.86,
    fraud_probability: 1,
    model_used: "random_forest"
  },
  {
    step: 1,
    type: "TRANSFER",
    amount: 2806,
    nameOrig: "C1420196421",
    nameDest: "C972765878",
    origin_account_emptied: 1,
    destination_balance_error: 2806,
    fraud_probability: 1,
    model_used: "random_forest"
  },
  {
    step: 8,
    type: "TRANSFER",
    amount: 43092,
    nameOrig: "C1683174795",
    nameDest: "C427998326",
    origin_account_emptied: 1,
    destination_balance_error: 43092,
    fraud_probability: 0.9999936094779777,
    model_used: "random_forest"
  },
  {
    step: 1,
    type: "CASH_OUT",
    amount: 20128,
    nameOrig: "C1118430673",
    nameDest: "C339924917",
    origin_account_emptied: 1,
    destination_balance_error: 14250.15,
    fraud_probability: 0.9999953382633076,
    model_used: "random_forest"
  },
  {
    step: 9,
    type: "CASH_OUT",
    amount: 1154353.99,
    nameOrig: "C1034219836",
    nameDest: "C1195589213",
    origin_account_emptied: 1,
    destination_balance_error: 649011.61,
    fraud_probability: 0.9999718730467373,
    model_used: "random_forest"
  }
];

const initialTransaction = {
  step: 7,
  type: "TRANSFER",
  amount: 21571,
  oldbalanceOrg: 21571,
  newbalanceOrig: 0,
  oldbalanceDest: 0,
  newbalanceDest: 0,
  nameOrig: "C786114805",
  nameDest: "C1666314150"
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const formatPercent = (value, digits = 1) =>
  `${(Number(value || 0) * 100).toFixed(digits)}%`;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const titleize = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function useFinGraphData() {
  const [state, setState] = useState({
    metrics: fallbackMetrics,
    features: fallbackFeatures,
    predictions: fallbackPredictions,
    health: null,
    source: "local artifact",
    loading: true,
    error: ""
  });

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const [metricsResponse, featuresResponse, predictionsResponse, healthResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/metrics`),
          fetch(`${API_BASE_URL}/features/importance?limit=10`),
          fetch(`${API_BASE_URL}/predictions/top?limit=8`),
          fetch(`${API_BASE_URL}/health`)
        ]);

      if (!metricsResponse.ok || !featuresResponse.ok || !predictionsResponse.ok) {
        throw new Error("FinGraph API response was incomplete.");
      }

      const [metrics, featurePayload, predictionPayload, health] = await Promise.all([
        metricsResponse.json(),
        featuresResponse.json(),
        predictionsResponse.json(),
        healthResponse.ok ? healthResponse.json() : Promise.resolve(null)
      ]);

      setState({
        metrics,
        features: featurePayload.features || fallbackFeatures,
        predictions: predictionPayload.predictions || fallbackPredictions,
        health,
        source: "live API",
        loading: false,
        error: ""
      });
    } catch (error) {
      setState({
        metrics: fallbackMetrics,
        features: fallbackFeatures,
        predictions: fallbackPredictions,
        health: null,
        source: "local artifact",
        loading: false,
        error: error.message
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { ...state, reload: load };
}

function App() {
  const { metrics, features, predictions, health, source, loading, error, reload } =
    useFinGraphData();
  const bestModel = metrics.metrics?.[metrics.best_model] || metrics.metrics?.random_forest || {};
  const confusionMatrix = bestModel.confusion_matrix || [
    [0, 0],
    [0, 0]
  ];
  const falsePositives = confusionMatrix[0]?.[1] || 0;
  const falseNegatives = confusionMatrix[1]?.[0] || 0;
  const fraudRate = metrics.fraud_rate_in_sample || 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Network size={26} />
          </div>
          <div>
            <p className="eyebrow">Week 7</p>
            <h1>FinGraph</h1>
          </div>
        </div>

        <nav className="nav-stack" aria-label="Dashboard sections">
          <a href="#overview" className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </a>
          <a href="#model" className="nav-item">
            <BrainCircuit size={18} />
            <span>Model</span>
          </a>
          <a href="#signals" className="nav-item">
            <GitBranch size={18} />
            <span>Signals</span>
          </a>
          <a href="#predict" className="nav-item">
            <ShieldAlert size={18} />
            <span>Predict</span>
          </a>
        </nav>

        <div className="status-panel">
          <span className={`pulse ${source === "live API" ? "online" : ""}`} />
          <div>
            <strong>{source === "live API" ? "API connected" : "Artifact mode"}</strong>
            <p>{source === "live API" ? "FastAPI data loaded" : "Using saved Week 5 data"}</p>
          </div>
        </div>
      </aside>

      <main className="dashboard">
        <header className="hero-panel" id="overview">
          <div className="hero-copy">
            <p className="eyebrow">Graph-Based Financial Fraud Detection</p>
            <h2>Fraud intelligence dashboard</h2>
            <p>
              Monitor model quality, inspect high-risk transaction patterns, and score
              new payments through the Week 6 prediction API.
            </p>
          </div>

          <div className="hero-actions">
            <button className="icon-button" onClick={reload} disabled={loading} title="Refresh data">
              <RefreshCcw size={18} />
            </button>
            <div className="api-chip">
              <Activity size={16} />
              {loading ? "Loading" : source}
            </div>
          </div>
        </header>

        {error ? (
          <div className="notice">
            <AlertTriangle size={18} />
            Backend not detected at {API_BASE_URL}. Dashboard is showing local artifacts.
          </div>
        ) : null}

        <section className="metric-grid" aria-label="Project metrics">
          <MetricCard
            icon={<CircleDollarSign size={22} />}
            label="Transactions"
            value={formatNumber(metrics.sample_rows)}
            detail={`${formatNumber(metrics.test_rows)} held out for testing`}
            tone="green"
          />
          <MetricCard
            icon={<ShieldAlert size={22} />}
            label="Fraud Cases"
            value={formatNumber(metrics.fraud_cases_in_sample)}
            detail={`${formatPercent(fraudRate, 3)} sample fraud rate`}
            tone="amber"
          />
          <MetricCard
            icon={<Target size={22} />}
            label="Precision"
            value={formatPercent(bestModel.precision)}
            detail={`${formatNumber(falsePositives)} false positives`}
            tone="blue"
          />
          <MetricCard
            icon={<Gauge size={22} />}
            label="Recall"
            value={formatPercent(bestModel.recall)}
            detail={`${formatNumber(falseNegatives)} missed fraud case`}
            tone="violet"
          />
        </section>

        <section className="split-layout" id="model">
          <ModelScoreboard metrics={metrics} />
          <ConfusionMatrix matrix={confusionMatrix} />
        </section>

        <section className="split-layout" id="signals">
          <FeatureImportance features={features} />
          <RiskConsole predictions={predictions} />
        </section>

        <PredictionLab health={health} />
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function ModelScoreboard({ metrics }) {
  const rows = Object.entries(metrics.metrics || {}).map(([name, values]) => ({
    name,
    ...values
  }));

  return (
    <article className="dashboard-card score-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Evaluation</p>
          <h3>Model scoreboard</h3>
        </div>
        <div className="section-icon">
          <BarChart3 size={20} />
        </div>
      </div>

      <div className="model-list">
        {rows.map((model) => (
          <div className="model-row" key={model.name}>
            <div>
              <strong>{titleize(model.name)}</strong>
              <span>{model.name === metrics.best_model ? "Selected baseline" : "Comparison model"}</span>
            </div>
            <ScorePill label="F1" value={model.f1_score} />
            <ScorePill label="AP" value={model.average_precision} />
            <ScorePill label="AUC" value={model.roc_auc} />
          </div>
        ))}
      </div>
    </article>
  );
}

function ScorePill({ label, value }) {
  return (
    <div className="score-pill">
      <span>{label}</span>
      <strong>{formatPercent(value, 1)}</strong>
    </div>
  );
}

function ConfusionMatrix({ matrix }) {
  const cells = [
    { label: "True Legit", value: matrix[0]?.[0] || 0, tone: "safe" },
    { label: "False Fraud", value: matrix[0]?.[1] || 0, tone: "warn" },
    { label: "Missed Fraud", value: matrix[1]?.[0] || 0, tone: "danger" },
    { label: "True Fraud", value: matrix[1]?.[1] || 0, tone: "alert" }
  ];

  return (
    <article className="dashboard-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Random Forest</p>
          <h3>Confusion matrix</h3>
        </div>
        <div className="section-icon">
          <Cpu size={20} />
        </div>
      </div>

      <div className="matrix-grid">
        {cells.map((cell) => (
          <div className={`matrix-cell ${cell.tone}`} key={cell.label}>
            <span>{cell.label}</span>
            <strong>{formatNumber(cell.value)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function FeatureImportance({ features }) {
  const maxImportance = Math.max(...features.map((item) => Number(item.importance || 0)), 1);

  return (
    <article className="dashboard-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Signals</p>
          <h3>Feature importance</h3>
        </div>
        <div className="section-icon">
          <Sparkles size={20} />
        </div>
      </div>

      <div className="feature-list">
        {features.map((feature) => (
          <div className="feature-row" key={feature.feature}>
            <div className="feature-label">
              <span>{titleize(feature.feature)}</span>
              <strong>{formatPercent(feature.importance, 1)}</strong>
            </div>
            <div className="feature-track">
              <span
                className="feature-bar"
                style={{
                  width: `${Math.max((feature.importance / maxImportance) * 100, 5)}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function RiskConsole({ predictions }) {
  return (
    <article className="dashboard-card wide-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Top Predictions</p>
          <h3>High-risk transaction queue</h3>
        </div>
        <div className="section-icon">
          <ArrowUpRight size={20} />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {predictions.slice(0, 8).map((transaction, index) => (
              <tr key={`${transaction.nameOrig}-${transaction.nameDest}-${index}`}>
                <td>
                  <span className={`type-badge ${String(transaction.type).toLowerCase()}`}>
                    {transaction.type}
                  </span>
                </td>
                <td>{formatCurrency(transaction.amount)}</td>
                <td>{transaction.nameOrig}</td>
                <td>{transaction.nameDest}</td>
                <td>
                  <strong>{formatPercent(transaction.fraud_probability, 2)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PredictionLab({ health }) {
  const [form, setForm] = useState(initialTransaction);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const numericFields = useMemo(
    () => [
      "step",
      "amount",
      "oldbalanceOrg",
      "newbalanceOrig",
      "oldbalanceDest",
      "newbalanceDest"
    ],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: numericFields.includes(name) ? Number(value) : value
    }));
  };

  const submitPrediction = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Prediction request failed.");
      }

      setResult(await response.json());
    } catch (error) {
      setError(error.name === "AbortError" ? "Prediction request timed out." : error.message);
      setResult({
        fraud_probability: 0.9999,
        predicted_is_fraud: 1,
        risk_level: "High",
        model_used: "random_forest",
        top_reasons: [
          "High-risk transaction type",
          "Origin account emptied after transaction",
          "Destination balance mismatch"
        ]
      });
    } finally {
      window.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  const probability = result?.fraud_probability || 0;

  return (
    <section className="prediction-band" id="predict">
      <div className="prediction-heading">
        <div>
          <p className="eyebrow">Live Scoring</p>
          <h3>Transaction risk lab</h3>
        </div>
        <div className="health-strip">
          {health?.model_loaded ? <CheckCircle2 size={17} /> : <Zap size={17} />}
          {health?.model_loaded ? "Model loaded" : "Ready sample"}
        </div>
      </div>

      <form className="prediction-form" onSubmit={submitPrediction}>
        <label>
          Type
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="TRANSFER">TRANSFER</option>
            <option value="CASH_OUT">CASH_OUT</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="CASH_IN">CASH_IN</option>
            <option value="DEBIT">DEBIT</option>
          </select>
        </label>

        {numericFields.map((field) => (
          <label key={field}>
            {titleize(field)}
            <input name={field} type="number" value={form[field]} onChange={handleChange} min="0" />
          </label>
        ))}

        <label>
          Origin
          <input name="nameOrig" value={form.nameOrig} onChange={handleChange} />
        </label>

        <label>
          Destination
          <input name="nameDest" value={form.nameDest} onChange={handleChange} />
        </label>

        <button className="primary-button" type="submit" disabled={submitting}>
          <Search size={18} />
          {submitting ? "Scoring" : "Score"}
        </button>
      </form>

      <div className="prediction-result">
        <div className="risk-gauge">
          <div
            className="gauge-fill"
            style={{ transform: `rotate(${Math.min(probability * 180, 180)}deg)` }}
          />
          <div className="gauge-center">
            <span>Risk</span>
            <strong>{result ? formatPercent(probability, 1) : "--"}</strong>
          </div>
        </div>

        <div className="result-copy">
          <div className={`risk-level ${String(result?.risk_level || "idle").toLowerCase()}`}>
            {result?.risk_level ? (
              <ShieldAlert size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}
            {result?.risk_level || "Awaiting score"}
          </div>
          {error ? <p className="muted">Showing sample response until the API is running.</p> : null}
          <ul>
            {(result?.top_reasons || ["Submit a transaction to inspect the model response."]).map(
              (reason) => (
                <li key={reason}>{reason}</li>
              )
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default App;
