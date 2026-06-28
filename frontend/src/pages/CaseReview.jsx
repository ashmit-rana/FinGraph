import React, { useState, useMemo } from 'react';
import { useAppContext, formatCurrency, formatPercent } from '../App';
import { FileText, Trash2 } from 'lucide-react';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'review', label: 'In Review' },
  { key: 'blocked', label: 'Blocked' },
];

export default function CaseReview() {
  const { cases, clearCases } = useAppContext();
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredCases = useMemo(() => {
    if (activeFilter === 'all') return cases;
    return cases.filter((c) => c.status === activeFilter);
  }, [cases, activeFilter]);

  const truncate = (str, len = 30) => {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  };

  return (
    <div className="page-content">
      <h2 className="section-title">Case Review</h2>
      <p className="section-subtitle">{cases.length} total case{cases.length !== 1 ? 's' : ''}</p>

      {/* Header area */}
      <div className="case-header">
        <div className="filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab${activeFilter === tab.key ? ' active' : ''}`}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="case-actions">
          <span className="case-count">{filteredCases.length} shown</span>
          {cases.length > 0 && (
            <button className="clear-btn" onClick={clearCases}>
              <Trash2 size={14} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filteredCases.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No cases yet</h3>
          <p>Use the Risk Queue to approve, review, or block transactions.</p>
        </div>
      ) : (
        /* Case Table */
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Account</th>
                <th>Destination</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Decision</th>
                <th>Notes</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.id}</strong></td>
                  <td>{c.account}</td>
                  <td>{c.destAccount}</td>
                  <td><span className="type-badge">{c.type}</span></td>
                  <td>{formatCurrency(c.amount)}</td>
                  <td>{formatPercent(c.riskScore, 1)}</td>
                  <td>
                    <span className={`status-badge ${c.status}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.decision ? c.decision.charAt(0).toUpperCase() + c.decision.slice(1) : '—'}</td>
                  <td title={c.notes || ''}>{truncate(c.notes)}</td>
                  <td>{c.createdAt ? c.createdAt.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
