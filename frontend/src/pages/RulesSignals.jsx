import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import {
  AlertTriangle,
  ShieldAlert,
  Zap,
  TrendingUp,
  BrainCircuit,
  Settings,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const RULES = [
  {
    id: 'origin_emptied',
    name: 'Origin Account Emptied',
    severity: 'HIGH',
    desc: 'Account balance dropped to zero after transaction with amount >= 90% of original balance',
    condition: 'oldbalanceOrg > 0 && newbalanceOrig == 0 && amount >= oldbalanceOrg * 0.9',
    icon: AlertTriangle,
    bg: 'red-dim',
    evaluate: (v) =>
      v.oldbalanceOrg > 0 && v.newbalanceOrig === 0 && v.amount >= v.oldbalanceOrg * 0.9,
  },
  {
    id: 'origin_mismatch',
    name: 'Origin Balance Mismatch',
    severity: 'HIGH',
    desc: 'The origin balance change does not match the transaction amount',
    condition: '|oldbalanceOrg - amount - newbalanceOrig| > 0.01',
    icon: ShieldAlert,
    bg: 'red-dim',
    evaluate: (v) => Math.abs(v.oldbalanceOrg - v.amount - v.newbalanceOrig) > 0.01,
  },
  {
    id: 'dest_mismatch',
    name: 'Destination Balance Mismatch',
    severity: 'MEDIUM',
    desc: 'The destination balance change does not match the transaction amount',
    condition: '|oldbalanceDest + amount - newbalanceDest| > 0.01',
    icon: AlertTriangle,
    bg: 'amber-dim',
    evaluate: (v) => Math.abs(v.oldbalanceDest + v.amount - v.newbalanceDest) > 0.01,
  },
  {
    id: 'high_risk_type',
    name: 'High-Risk Transaction Type',
    severity: 'MEDIUM',
    desc: 'TRANSFER and CASH_OUT types are historically linked to fraud',
    condition: 'type IN (TRANSFER, CASH_OUT)',
    icon: Zap,
    bg: 'amber-dim',
    evaluate: (v) => v.type === 'TRANSFER' || v.type === 'CASH_OUT',
  },
  {
    id: 'amount_ratio',
    name: 'Amount-to-Balance Ratio',
    severity: 'MEDIUM',
    desc: 'Transaction amount is disproportionately large compared to origin balance',
    condition: 'amount / (oldbalanceOrg + 1) > 0.9',
    icon: TrendingUp,
    bg: 'amber-dim',
    evaluate: (v) => v.amount / (v.oldbalanceOrg + 1) > 0.9,
  },
  {
    id: 'high_probability',
    name: 'High Model Probability',
    severity: 'HIGH',
    desc: 'ML model assigns probability >= 0.7 indicating high fraud likelihood',
    condition: 'fraud_probability >= 0.7',
    icon: BrainCircuit,
    bg: 'red-dim',
    evaluate: () => false, // Cannot evaluate without model — always safe in simulator
  },
];

const INITIAL_VALUES = {
  type: 'TRANSFER',
  amount: 50000,
  oldbalanceOrg: 50000,
  newbalanceOrig: 0,
  oldbalanceDest: 0,
  newbalanceDest: 0,
};

export default function RulesSignals() {
  const { setActivePage } = useAppContext();
  const [form, setForm] = useState(INITIAL_VALUES);

  const handleChange = (field, raw) => {
    const value = field === 'type' ? raw : parseFloat(raw) || 0;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const results = useMemo(
    () =>
      RULES.map((rule) => ({
        ...rule,
        triggered: rule.evaluate(form),
      })),
    [form]
  );

  const triggeredCount = results.filter((r) => r.triggered).length;

  return (
    <div className="page-content">
      <h2 className="section-title">Rules &amp; Signals</h2>

      {/* Rules Grid */}
      <div className="rules-grid">
        {RULES.map((rule) => {
          const Icon = rule.icon;
          return (
            <div className="rule-card" key={rule.id}>
              <div className={`rule-icon ${rule.bg}`}>
                <Icon size={20} />
              </div>
              <div className="rule-name">{rule.name}</div>
              <div className="rule-desc">{rule.desc}</div>
              <code className="rule-condition">{rule.condition}</code>
              <span className={`rule-severity ${rule.severity.toLowerCase()}`}>
                {rule.severity}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rule Simulator */}
      <div className="simulator-panel dash-card">
        <div className="card-header">
          <Settings size={18} />
          <span>Rule Simulator</span>
        </div>

        <div className="simulator-grid">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-input"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="TRANSFER">TRANSFER</option>
              <option value="CASH_OUT">CASH_OUT</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="CASH_IN">CASH_IN</option>
              <option value="DEBIT">DEBIT</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              className="form-input"
              type="number"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Old Balance (Origin)</label>
            <input
              className="form-input"
              type="number"
              value={form.oldbalanceOrg}
              onChange={(e) => handleChange('oldbalanceOrg', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Balance (Origin)</label>
            <input
              className="form-input"
              type="number"
              value={form.newbalanceOrig}
              onChange={(e) => handleChange('newbalanceOrig', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Old Balance (Dest)</label>
            <input
              className="form-input"
              type="number"
              value={form.oldbalanceDest}
              onChange={(e) => handleChange('oldbalanceDest', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Balance (Dest)</label>
            <input
              className="form-input"
              type="number"
              value={form.newbalanceDest}
              onChange={(e) => handleChange('newbalanceDest', e.target.value)}
            />
          </div>
        </div>

        <div className="simulator-results">
          {results.map((r) => (
            <div className={`rule-check ${r.triggered ? 'triggered' : 'safe'}`} key={r.id}>
              {r.triggered ? (
                <XCircle size={16} className="check-icon triggered" />
              ) : (
                <CheckCircle2 size={16} className="check-icon safe" />
              )}
              <span>{r.name}</span>
            </div>
          ))}
          <div className="simulator-summary">
            {triggeredCount} of {RULES.length} rules triggered
          </div>
        </div>

        <button className="submit-btn" onClick={() => setActivePage('transaction-scoring')}>
          Score with Model
        </button>
      </div>
    </div>
  );
}
