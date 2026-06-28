import React, { useState, useMemo, useCallback } from 'react';
import { CheckCircle2, Eye, XCircle } from 'lucide-react';
import {
  useAppContext,
  formatPercent,
  formatCurrency,
  getRiskLevel,
  getRiskLabel,
} from '../App';
import TransactionDetail from '../components/TransactionDetail';

export default function RiskQueue() {
  const { predictions, addCase } = useAppContext();

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortField, setSortField] = useState('fraud_probability');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    },
    [sortField],
  );

  const sorted = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    const list = [...predictions];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [predictions, sortField, sortDirection]);

  const sortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const truncate = (str, len = 14) => {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  };

  const handleAction = useCallback(
    (e, txn, decision) => {
      e.stopPropagation();
      addCase(txn, decision);
    },
    [addCase],
  );

  return (
    <div className="page-enter">
      <h2 className="section-title">Risk Queue</h2>
      <p className="section-subtitle">
        Showing {sorted.length} prediction{sorted.length !== 1 ? 's' : ''}
      </p>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('fraud_probability')} style={{ cursor: 'pointer' }}>
                Risk Score{sortIndicator('fraud_probability')}
              </th>
              <th>Risk Level</th>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                Type{sortIndicator('type')}
              </th>
              <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                Amount{sortIndicator('amount')}
              </th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Balance Error</th>
              <th>Emptied</th>
              <th>Fraud Label</th>
              <th>Model Decision</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((txn, i) => {
              const riskLevel = getRiskLevel(txn.fraud_probability);
              const actualFraud = txn.actual_isFraud ?? txn.isFraud;
              const isSelected =
                selectedTransaction &&
                selectedTransaction.nameOrig === txn.nameOrig &&
                selectedTransaction.nameDest === txn.nameDest &&
                selectedTransaction.amount === txn.amount &&
                selectedTransaction.step === txn.step;

              return (
                <tr
                  key={i}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => setSelectedTransaction(txn)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{formatPercent(txn.fraud_probability, 1)}</td>
                  <td>
                    <span className={`risk-badge ${riskLevel}`}>{getRiskLabel(txn.fraud_probability)}</span>
                  </td>
                  <td>
                    <span className={`type-badge ${txn.type?.toLowerCase()}`}>{txn.type}</span>
                  </td>
                  <td>{formatCurrency(txn.amount)}</td>
                  <td title={txn.nameOrig}>{truncate(txn.nameOrig)}</td>
                  <td title={txn.nameDest}>{truncate(txn.nameDest)}</td>
                  <td>
                    <span
                      className={`bool-badge ${txn.destination_balance_error > 0.01 ? 'true' : 'false'}`}
                    >
                      {txn.destination_balance_error > 0.01 ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className={`bool-badge ${txn.origin_account_emptied ? 'true' : 'false'}`}>
                      {txn.origin_account_emptied ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className={`bool-badge ${actualFraud ? 'true' : 'false'}`}>
                      {actualFraud ? 'Fraud' : 'Legit'}
                    </span>
                  </td>
                  <td>
                    <span className={`bool-badge ${txn.predicted_isFraud ? 'true' : 'false'}`}>
                      {txn.predicted_isFraud ? 'Fraud' : 'Legit'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button
                        className="action-btn approve"
                        title="Approve"
                        onClick={(e) => handleAction(e, txn, 'approved')}
                      >
                        <CheckCircle2 size={15} />
                      </button>
                      <button
                        className="action-btn review"
                        title="Review"
                        onClick={(e) => handleAction(e, txn, 'review')}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="action-btn block"
                        title="Block"
                        onClick={(e) => handleAction(e, txn, 'blocked')}
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTransaction && (
        <TransactionDetail
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onAction={(txn, decision, notes) => addCase(txn, decision, notes)}
        />
      )}
    </div>
  );
}
