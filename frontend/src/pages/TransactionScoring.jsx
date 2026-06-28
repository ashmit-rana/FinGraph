import React, { useState, useCallback } from 'react';
import { Search, Activity, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  useAppContext,
  formatPercent,
  formatCurrency,
  getRiskLevel,
  getRiskLabel,
} from '../App';

const PRESETS = [
  {
    label: 'Normal Payment',
    data: {
      step: 2,
      type: 'PAYMENT',
      amount: 500,
      oldbalanceOrg: 45000,
      newbalanceOrig: 44500,
      oldbalanceDest: 12000,
      newbalanceDest: 12500,
      nameOrig: 'C100200300',
      nameDest: 'M400500600',
    },
  },
  {
    label: 'Suspicious Transfer',
    data: {
      step: 5,
      type: 'TRANSFER',
      amount: 45000,
      oldbalanceOrg: 45000,
      newbalanceOrig: 0,
      oldbalanceDest: 0,
      newbalanceDest: 0,
      nameOrig: 'C111222333',
      nameDest: 'C444555666',
    },
  },
  {
    label: 'Account Emptied',
    data: {
      step: 3,
      type: 'CASH_OUT',
      amount: 98000,
      oldbalanceOrg: 98000,
      newbalanceOrig: 0,
      oldbalanceDest: 25000,
      newbalanceDest: 123000,
      nameOrig: 'C777888999',
      nameDest: 'C101112131',
    },
  },
  {
    label: 'Cash-out Pattern',
    data: {
      step: 8,
      type: 'CASH_OUT',
      amount: 180000,
      oldbalanceOrg: 180000,
      newbalanceOrig: 0,
      oldbalanceDest: 0,
      newbalanceDest: 0,
      nameOrig: 'C141516171',
      nameDest: 'C181920212',
    },
  },
];

const DEFAULT_FORM = {
  step: 7,
  type: 'TRANSFER',
  amount: 21571,
  oldbalanceOrg: 21571,
  newbalanceOrig: 0,
  oldbalanceDest: 0,
  newbalanceDest: 0,
  nameOrig: 'C786114805',
  nameDest: 'C1666314150',
};

export default function TransactionScoring() {
  const { health, API_BASE_URL } = useAppContext();

  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activePreset, setActivePreset] = useState(null);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((preset, index) => {
    setForm({ ...preset.data });
    setActivePreset(index);
    setResult(null);
    setError('');
  }, []);

  const buildPayload = useCallback(() => {
    return {
      step: Number(form.step),
      type: form.type,
      amount: Number(form.amount),
      oldbalanceOrg: Number(form.oldbalanceOrg),
      newbalanceOrig: Number(form.newbalanceOrig),
      oldbalanceDest: Number(form.oldbalanceDest),
      newbalanceDest: Number(form.newbalanceDest),
      nameOrig: form.nameOrig,
      nameDest: form.nameDest,
    };
  }, [form]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError('');
      setResult(null);

      const payload = buildPayload();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch(`${API_BASE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setResult({ ...data, _payload: payload });
      } catch (err) {
        clearTimeout(timeout);
        const msg =
          err.name === 'AbortError'
            ? 'Request timed out (8s). Using fallback scoring.'
            : `API error: ${err.message}. Using fallback scoring.`;
        setError(msg);

        /* Fallback heuristic result */
        const amt = Number(form.amount);
        const emptied = Number(form.newbalanceOrig) === 0 && Number(form.oldbalanceOrg) > 0;
        const isRisky = (form.type === 'TRANSFER' || form.type === 'CASH_OUT') && emptied;
        const fallbackProb = isRisky ? (amt > 100000 ? 0.92 : 0.74) : 0.12;
        setResult({
          fraud_probability: fallbackProb,
          predicted_isFraud: fallbackProb >= 0.5 ? 1 : 0,
          model_used: 'fallback_heuristic',
          _payload: payload,
          _fallback: true,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [buildPayload, API_BASE_URL, form],
  );

  const getRiskReasons = useCallback(() => {
    if (!result) return [];
    const reasons = [];
    const amt = Number(form.amount);
    const oldOrg = Number(form.oldbalanceOrg);
    const newOrg = Number(form.newbalanceOrig);
    const oldDest = Number(form.oldbalanceDest);
    const newDest = Number(form.newbalanceDest);

    if (newOrg === 0 && oldOrg > 0) reasons.push('Origin account fully emptied');
    if (form.type === 'TRANSFER' || form.type === 'CASH_OUT')
      reasons.push('Transaction type is TRANSFER or CASH_OUT (high-risk category)');
    if (amt > 100000) reasons.push(`High value transaction: ${formatCurrency(amt)}`);
    if (oldOrg > 0 && amt / oldOrg > 0.9)
      reasons.push('Amount exceeds 90% of origin balance');
    if (newDest === 0 && oldDest === 0)
      reasons.push('Destination account had zero balance before and after');
    const destExpected = oldDest + amt;
    if (newDest > 0 && Math.abs(newDest - destExpected) > 0.01 * destExpected)
      reasons.push('Destination balance error detected');
    if (reasons.length === 0) reasons.push('No major risk signals detected');
    return reasons;
  }, [result, form]);

  const getRecommendedAction = useCallback(() => {
    if (!result) return '';
    const p = result.fraud_probability;
    if (p >= 0.8) return '🚨 Immediately block this transaction and escalate to fraud team.';
    if (p >= 0.5) return '⚠️ Flag for manual review. Temporary hold recommended.';
    if (p >= 0.3) return '👀 Monitor this account for further suspicious activity.';
    return '✅ Transaction appears legitimate. No action required.';
  }, [result]);

  const riskLevel = result ? getRiskLevel(result.fraud_probability) : '';
  const riskAngle = result ? Math.min(result.fraud_probability, 1) * 180 : 0;

  return (
    <div className="page-enter">
      <h2 className="section-title">Score New Transaction</h2>

      <div className="model-status">
        <Activity size={14} />
        <span>
          Model status:{' '}
          <strong className={health === 'healthy' ? 'status-ok' : 'status-warn'}>
            {health === 'healthy' ? 'Online' : health || 'Unknown'}
          </strong>
        </span>
      </div>

      {/* Presets */}
      <div className="preset-bar">
        {PRESETS.map((preset, i) => (
          <button
            key={i}
            className={`preset-btn ${activePreset === i ? 'active' : ''}`}
            onClick={() => applyPreset(preset, i)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Type</label>
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
            >
              <option value="TRANSFER">TRANSFER</option>
              <option value="CASH_OUT">CASH_OUT</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="CASH_IN">CASH_IN</option>
              <option value="DEBIT">DEBIT</option>
            </select>
            <span className="form-hint">
              TRANSFER &amp; CASH_OUT are high-risk types
            </span>
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div className="form-group">
            <label>Step / Time</label>
            <input
              type="number"
              value={form.step}
              onChange={(e) => updateField('step', e.target.value)}
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Origin Old Balance</label>
            <input
              type="number"
              value={form.oldbalanceOrg}
              onChange={(e) => updateField('oldbalanceOrg', e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div className="form-group">
            <label>Origin New Balance</label>
            <input
              type="number"
              value={form.newbalanceOrig}
              onChange={(e) => updateField('newbalanceOrig', e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div className="form-group">
            <label>Dest Old Balance</label>
            <input
              type="number"
              value={form.oldbalanceDest}
              onChange={(e) => updateField('oldbalanceDest', e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div className="form-group">
            <label>Dest New Balance</label>
            <input
              type="number"
              value={form.newbalanceDest}
              onChange={(e) => updateField('newbalanceDest', e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div className="form-group">
            <label>Origin Account ID</label>
            <input
              type="text"
              value={form.nameOrig}
              onChange={(e) => updateField('nameOrig', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Dest Account ID</label>
            <input
              type="text"
              value={form.nameDest}
              onChange={(e) => updateField('nameDest', e.target.value)}
            />
          </div>
        </div>

        <button className="submit-btn" type="submit" disabled={submitting}>
          <Search size={16} />
          {submitting ? 'Scoring…' : 'Score Transaction'}
        </button>
      </form>

      {/* Error */}
      {error && <div className="form-error">{error}</div>}

      {/* Result */}
      {result && (
        <div className={`result-panel ${riskLevel}`}>
          {/* Risk gauge */}
          <div className="risk-gauge-container">
            <svg viewBox="0 0 200 110" className="risk-gauge">
              <path
                d="M20,100 A80,80 0 0,1 180,100"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M20,100 A80,80 0 0,1 180,100"
                fill="none"
                stroke={
                  result.fraud_probability >= 0.7
                    ? '#ef4444'
                    : result.fraud_probability >= 0.4
                    ? '#f59e0b'
                    : '#22c55e'
                }
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(riskAngle / 180) * 251.2} 251.2`}
              />
              <text x="100" y="85" textAnchor="middle" className="gauge-value">
                {formatPercent(result.fraud_probability, 1)}
              </text>
              <text x="100" y="105" textAnchor="middle" className="gauge-label">
                Fraud Probability
              </text>
            </svg>
          </div>

          {/* Result grid */}
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">Fraud Probability</span>
              <span className="result-value">
                {formatPercent(result.fraud_probability, 2)}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Risk Level</span>
              <span className={`risk-badge ${riskLevel}`}>
                {getRiskLabel(result.fraud_probability)}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Model Decision</span>
              <span className="result-value">
                {result.predicted_isFraud ? (
                  <span className="bool-badge true">
                    <ShieldAlert size={13} /> Fraud
                  </span>
                ) : (
                  <span className="bool-badge false">
                    <CheckCircle size={13} /> Legit
                  </span>
                )}
              </span>
            </div>
            <div className="result-item">
              <span className="result-label">Model Used</span>
              <span className="result-value">{result.model_used || '—'}</span>
            </div>
          </div>

          {/* Risk signals */}
          <div className="risk-signals">
            <h4>
              <AlertTriangle size={15} /> Triggered Risk Signals
            </h4>
            <ul className="reasons-list">
              {getRiskReasons().map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Recommended action */}
          <div className="recommended-action">
            <strong>Recommended Action:</strong> {getRecommendedAction()}
          </div>

          {/* Payload preview */}
          <div className="payload-preview">
            <h4>Payload Sent</h4>
            <pre className="payload-code">
              {JSON.stringify(result._payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
