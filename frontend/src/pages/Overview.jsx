import React, { useMemo } from 'react';
import {
  CircleDollarSign,
  ShieldAlert,
  AlertTriangle,
  Target,
  Gauge,
  XCircle,
  ShieldX,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAppContext, formatNumber, formatPercent, formatCurrency } from '../App';

export default function Overview() {
  const { metrics, predictions, cases } = useAppContext();

  const bestModel = useMemo(
    () =>
      metrics?.metrics?.[metrics.best_model] ||
      metrics?.metrics?.random_forest ||
      {},
    [metrics],
  );

  const confusionMatrix = useMemo(
    () => bestModel.confusion_matrix || [[0, 0], [0, 0]],
    [bestModel],
  );

  const highRiskCount = useMemo(
    () => (predictions || []).filter((p) => p.fraud_probability >= 0.7).length,
    [predictions],
  );

  const avgRiskScore = useMemo(() => {
    if (!predictions || predictions.length === 0) return 0;
    const sum = predictions.reduce((acc, p) => acc + (p.fraud_probability || 0), 0);
    return sum / predictions.length;
  }, [predictions]);

  const fp = confusionMatrix[0][1];
  const fn = confusionMatrix[1][0];

  const cards = [
    {
      color: 'green',
      icon: CircleDollarSign,
      label: 'Transactions',
      value: formatNumber(metrics?.sample_rows),
      detail: `${formatNumber(metrics?.test_rows)} held out for testing`,
    },
    {
      color: 'red',
      icon: ShieldAlert,
      label: 'Fraud Detected',
      value: metrics?.fraud_cases_in_sample ?? '—',
      detail: `${formatPercent(metrics?.fraud_rate_in_sample)} fraud rate`,
    },
    {
      color: 'amber',
      icon: AlertTriangle,
      label: 'High Risk',
      value: formatNumber(highRiskCount),
      detail: 'flagged by model',
    },
    {
      color: 'blue',
      icon: Target,
      label: 'Precision',
      value: formatPercent(bestModel.precision),
      detail: fp === 0 ? '0 false positives' : `${fp} false positive${fp !== 1 ? 's' : ''}`,
    },
    {
      color: 'violet',
      icon: Gauge,
      label: 'Recall',
      value: formatPercent(bestModel.recall),
      detail: `${fn} missed fraud`,
    },
    {
      color: 'amber',
      icon: XCircle,
      label: 'False Positives',
      value: fp,
      detail: 'legitimate txns flagged',
    },
    {
      color: 'red',
      icon: ShieldX,
      label: 'Missed Fraud',
      value: fn,
      detail: 'undetected fraud cases',
    },
    {
      color: 'blue',
      icon: TrendingUp,
      label: 'Avg Risk Score',
      value: formatPercent(avgRiskScore, 1),
      detail: 'mean probability',
    },
    {
      color: 'green',
      icon: Users,
      label: 'Review Queue',
      value: cases?.length ?? 0,
      detail: 'pending analyst decisions',
    },
  ];

  return (
    <div className="page-enter">
      <h2 className="section-title">Operations Overview</h2>

      <div className="kpi-grid">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div className={`kpi-card ${card.color}`} key={i}>
              <div className="kpi-icon">
                <Icon size={22} />
              </div>
              <span className="kpi-label">{card.label}</span>
              <span className="kpi-value">{card.value}</span>
              <span className="kpi-detail">{card.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
