import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getRiskLevel, getRiskLabel, formatCurrency, formatPercent } from '../App';

function computeSignals(txn) {
  if (!txn) return [];
  return [
    {
      label: 'Origin Account Emptied',
      triggered: txn.origin_account_emptied === 1,
    },
    {
      label: 'High-Risk Transaction Type',
      triggered: txn.type === 'TRANSFER' || txn.type === 'CASH_OUT',
    },
    {
      label: 'Origin Balance Mismatch',
      triggered: txn.origin_balance_error > 0.01,
    },
    {
      label: 'Destination Balance Mismatch',
      triggered: txn.destination_balance_error > 0.01,
    },
    {
      label: 'High Model Probability',
      triggered: txn.fraud_probability >= 0.7,
    },
  ];
}

function getRecommendedAction(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return 'Immediate block recommended — this transaction shows multiple high-risk indicators.';
    case 'high':
      return 'Manual review strongly advised — elevated fraud probability detected.';
    case 'medium':
      return 'Flag for secondary review — some risk signals are present.';
    case 'low':
    default:
      return 'Transaction appears safe — approve unless additional context warrants investigation.';
  }
}

export default function TransactionDetail({ transaction, onClose, onAction }) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setNotes('');
  }, [transaction]);

  const isOpen = transaction !== null;
  const prob = transaction?.fraud_probability ?? 0;
  const riskLevel = transaction ? getRiskLevel(prob) : 'low';
  const riskLabel = transaction ? getRiskLabel(prob) : '';
  const signals = computeSignals(transaction);
  const gaugeRotation = prob * 180;

  const handleAction = (decision) => {
    if (onAction) onAction(decision, notes);
    if (onClose) onClose();
  };

  return (
    <>
      <div
        className={isOpen ? 'detail-overlay open' : 'detail-overlay'}
        onClick={onClose}
      />
      <div className={isOpen ? 'detail-panel open' : 'detail-panel'}>
        {transaction && (
          <>
            {/* Header */}
            <div className="detail-header">
              <h3>Transaction Detail</h3>
              <button className="close-btn" onClick={onClose} aria-label="Close panel">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="detail-body">
              {/* Risk Gauge */}
              <div className="risk-gauge">
                <div className="gauge-track">
                  <div
                    className="gauge-fill"
                    style={{ transform: `rotate(${gaugeRotation}deg)` }}
                  />
                  <div className="gauge-center">
                    {formatPercent(prob)}
                  </div>
                </div>
                <span className={`risk-badge ${riskLevel}`}>{riskLabel}</span>
              </div>

              {/* Transaction Summary */}
              <div className="detail-section">
                <h4>Transaction Summary</h4>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className={`type-badge ${transaction.type?.toLowerCase()}`}>
                    {transaction.type}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value">{formatCurrency(transaction.amount)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Step</span>
                  <span className="detail-value">{transaction.step}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Origin Account</span>
                  <span className="detail-value mono">{transaction.nameOrig}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Destination Account</span>
                  <span className="detail-value mono">{transaction.nameDest}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Model Used</span>
                  <span className="detail-value">{transaction.model_used}</span>
                </div>
              </div>

              {/* Balance Flow */}
              <div className="detail-section">
                <h4>Balance Flow</h4>
                <div className="balance-flow">
                  <div className="balance-card">
                    <span className="balance-label">Origin Before</span>
                    <span className="balance-value">
                      {formatCurrency(transaction.oldbalanceOrg)}
                    </span>
                  </div>
                  <div className="balance-card">
                    <span className="balance-label">Origin After</span>
                    <span className="balance-value">
                      {formatCurrency(transaction.newbalanceOrig)}
                    </span>
                  </div>
                  <div className="balance-card">
                    <span className="balance-label">Destination Before</span>
                    <span className="balance-value">
                      {formatCurrency(transaction.oldbalanceDest)}
                    </span>
                  </div>
                  <div className="balance-card">
                    <span className="balance-label">Destination After</span>
                    <span className="balance-value">
                      {formatCurrency(transaction.newbalanceDest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Triggered Signals */}
              <div className="detail-section">
                <h4>Triggered Signals</h4>
                <div className="signal-list">
                  {signals.map((signal) => (
                    <div
                      key={signal.label}
                      className={`signal-item ${signal.triggered ? 'triggered' : 'safe'}`}
                    >
                      {signal.triggered ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>{signal.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="detail-section">
                <h4>Recommended Action</h4>
                <p className="recommendation-text">{getRecommendedAction(riskLevel)}</p>
              </div>

              {/* Analyst Notes */}
              <div className="detail-section">
                <h4>Analyst Notes</h4>
                <textarea
                  className="notes-input"
                  placeholder="Add investigation notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="detail-actions">
                <button
                  className="primary-btn"
                  onClick={() => handleAction('approved')}
                >
                  Mark Safe
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => handleAction('review')}
                >
                  Send to Review
                </button>
                <button
                  className="danger-btn"
                  onClick={() => handleAction('blocked')}
                >
                  Block Transaction
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
