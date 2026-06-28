import React from 'react';
import { useAppContext, formatPercent, titleize } from '../App';
import { Sparkles } from 'lucide-react';

export default function ModelPerformance() {
  const { metrics, features } = useAppContext();

  const modelEntries = Object.entries(metrics?.metrics || {});
  const bestModelName = metrics?.best_model || 'random_forest';
  const comparisonModelName = modelEntries.find(([name]) => name !== bestModelName)?.[0];

  const bestModelMetrics = metrics?.metrics?.[bestModelName];
  const comparisonModelMetrics = comparisonModelName ? metrics?.metrics?.[comparisonModelName] : null;

  const maxImportance = features?.length
    ? Math.max(...features.map(f => f.importance))
    : 1;

  const renderMetricPills = (m) => {
    if (!m) return null;
    const pills = [
      { label: 'Precision', value: m.precision },
      { label: 'Recall', value: m.recall },
      { label: 'F1', value: m.f1_score },
      { label: 'Avg Precision', value: m.average_precision },
      { label: 'ROC-AUC', value: m.roc_auc },
    ];
    return (
      <div className="metrics-row">
        {pills.map(p => (
          <div className="metric-pill" key={p.label}>
            <span className="metric-pill-label">{p.label}</span>
            <span className="metric-pill-value">{formatPercent(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderConfusionMatrix = (modelName, modelData) => {
    if (!modelData?.confusion_matrix) return null;
    const matrix = modelData.confusion_matrix;
    const TN = matrix[0][0];
    const FP = matrix[0][1];
    const FN = matrix[1][0];
    const TP = matrix[1][1];

    return (
      <div className="confusion-section">
        <h3 className="confusion-title">Confusion Matrix — {titleize(modelName)}</h3>
        <div className="confusion-grid">
          <div className="confusion-cell tn">
            <span className="confusion-label">True Negative</span>
            <span className="confusion-value">{TN}</span>
          </div>
          <div className="confusion-cell fp">
            <span className="confusion-label">False Positive</span>
            <span className="confusion-value">{FP}</span>
          </div>
          <div className="confusion-cell fn">
            <span className="confusion-label">False Negative</span>
            <span className="confusion-value">{FN}</span>
          </div>
          <div className="confusion-cell tp">
            <span className="confusion-label">True Positive</span>
            <span className="confusion-value">{TP}</span>
          </div>
        </div>
        {modelName === bestModelName && (
          <div className="explanation-text">
            <p>
              <strong>False Positive:</strong> A legitimate transaction incorrectly flagged as fraud
              — causes unnecessary customer friction and manual review overhead.
            </p>
            <p>
              <strong>False Negative:</strong> A fraudulent transaction that the model missed
              — results in direct financial loss and potential regulatory issues.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-content">
      <h2 className="section-title">Model Performance</h2>
      <p className="section-subtitle">Random Forest vs Logistic Regression comparison</p>

      {/* Model Comparison Cards */}
      <div className="model-comparison">
        {modelEntries.map(([name, m]) => {
          const isBest = name === bestModelName;
          return (
            <div className={`model-card${isBest ? ' best' : ''}`} key={name}>
              <div className="model-name">{titleize(name)}</div>
              <span className={`model-tag ${isBest ? 'best' : 'comparison'}`}>
                {isBest ? 'Best Model' : 'Comparison'}
              </span>
              {renderMetricPills(m)}
            </div>
          );
        })}
      </div>

      {/* Confusion Matrices */}
      {renderConfusionMatrix(bestModelName, bestModelMetrics)}
      {comparisonModelName && renderConfusionMatrix(comparisonModelName, comparisonModelMetrics)}

      {/* Feature Importance */}
      <div className="dash-card">
        <div className="card-header">
          <Sparkles size={18} />
          <span>Feature Importance</span>
        </div>
        <div className="feature-chart">
          {(features || []).map((f, i) => {
            const pct = maxImportance > 0 ? (f.importance / maxImportance) * 100 : 0;
            return (
              <div className="feature-row" key={i}>
                <div className="feature-info">
                  <span className="feature-name">{f.feature}</span>
                  <span className="feature-pct">{formatPercent(f.importance)}</span>
                </div>
                <div className="feature-track">
                  <div className="feature-bar" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
