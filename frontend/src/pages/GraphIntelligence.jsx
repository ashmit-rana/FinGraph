import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppContext, formatNumber, formatCurrency } from '../App';

export default function GraphIntelligence() {
  const { predictions } = useAppContext();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  /* -------- Build graph data -------- */
  const graphData = useMemo(() => {
    if (!predictions || predictions.length === 0)
      return { nodes: [], edges: [], nodeMap: new Map() };

    const nodeMap = new Map();

    const ensureNode = (id) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, {
          id,
          txnCount: 0,
          totalAmount: 0,
          isFraud: false,
          highRisk: false,
        });
      }
      return nodeMap.get(id);
    };

    const edges = [];

    predictions.forEach((p) => {
      const orig = ensureNode(p.nameOrig);
      const dest = ensureNode(p.nameDest);

      orig.txnCount++;
      dest.txnCount++;
      orig.totalAmount += p.amount || 0;
      dest.totalAmount += p.amount || 0;

      const fraud = !!(p.actual_isFraud || p.isFraud);
      if (fraud) {
        orig.isFraud = true;
        dest.isFraud = true;
      }
      if (p.fraud_probability >= 0.7) {
        orig.highRisk = true;
        dest.highRisk = true;
      }

      edges.push({
        from: p.nameOrig,
        to: p.nameDest,
        amount: p.amount || 0,
        isFraud: fraud,
        fraudProb: p.fraud_probability || 0,
      });
    });

    const nodes = Array.from(nodeMap.values());
    return { nodes, edges, nodeMap };
  }, [predictions]);

  /* -------- Stats -------- */
  const stats = useMemo(() => {
    const { nodes, edges } = graphData;
    const fraudAccounts = nodes.filter((n) => n.isFraud).length;
    const highValue = edges.filter((e) => e.amount > 50000).length;
    const totalAmount = edges.reduce((s, e) => s + e.amount, 0);
    const avgAmount = edges.length > 0 ? totalAmount / edges.length : 0;
    return {
      totalAccounts: nodes.length,
      totalTransactions: edges.length,
      fraudAccounts,
      highValue,
      avgAmount,
    };
  }, [graphData]);

  /* -------- Draw -------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { nodes, edges, nodeMap } = graphData;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    if (nodes.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No prediction data to visualize', W / 2, H / 2);
      return;
    }

    /* Position nodes in a circle */
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.38;
    const positions = new Map();

    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions.set(node.id, {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    });

    /* Max amount for edge width scaling */
    const maxAmt = Math.max(...edges.map((e) => e.amount), 1);

    /* Draw edges */
    edges.forEach((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return;

      let color;
      if (edge.isFraud) color = '#ef4444';
      else if (edge.fraudProb >= 0.7) color = '#f59e0b';
      else color = 'rgba(255,255,255,0.15)';

      const width = 1 + (edge.amount / maxAmt) * 3;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    /* Max txn count for node size scaling */
    const maxTxn = Math.max(...nodes.map((n) => n.txnCount), 1);

    /* Draw nodes */
    nodes.forEach((node) => {
      const pos = positions.get(node.id);
      if (!pos) return;

      let fill;
      if (node.isFraud) fill = '#ef4444';
      else if (node.highRisk) fill = '#f59e0b';
      else fill = '#3b82f6';

      const size = 6 + (node.txnCount / maxTxn) * 8;

      /* Glow */
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size + 3, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;

      /* Node */
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* Label */
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = node.id.length > 10 ? node.id.slice(0, 10) + '…' : node.id;
      ctx.fillText(label, pos.x, pos.y + size + 4);
    });
  }, [graphData]);

  useEffect(() => {
    draw();

    const container = containerRef.current;
    if (!container) return;

    let resizeObserver;
    try {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(draw);
      });
      resizeObserver.observe(container);
    } catch {
      /* Fallback for older browsers */
      const onResize = () => requestAnimationFrame(draw);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [draw]);

  return (
    <div className="page-enter">
      <h2 className="section-title">Graph Intelligence</h2>

      <div className="graph-wrapper">
        {/* Canvas */}
        <div className="graph-canvas-area" ref={containerRef}>
          <canvas ref={canvasRef} className="graph-canvas" />
        </div>

        {/* Sidebar */}
        <aside className="graph-sidebar">
          {/* Legend */}
          <div className="graph-legend">
            <h4>Legend</h4>

            <div className="legend-section">
              <h5>Accounts</h5>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#ef4444' }} />
                Fraud account
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#f59e0b' }} />
                High-risk account
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#3b82f6' }} />
                Normal account
              </div>
            </div>

            <div className="legend-section">
              <h5>Transactions</h5>
              <div className="legend-item">
                <span className="legend-line" style={{ background: '#ef4444' }} />
                Fraud transaction
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ background: '#f59e0b' }} />
                High-risk transaction
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ background: 'rgba(255,255,255,0.3)' }} />
                Normal transaction
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="graph-stats">
            <h4>Network Stats</h4>
            <div className="stat-row">
              <span className="stat-label">Total Accounts</span>
              <span className="stat-value">{formatNumber(stats.totalAccounts)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Transactions</span>
              <span className="stat-value">{formatNumber(stats.totalTransactions)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Fraud Accounts</span>
              <span className="stat-value fraud">{formatNumber(stats.fraudAccounts)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">High-Value Txns</span>
              <span className="stat-value">{formatNumber(stats.highValue)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Txn Amount</span>
              <span className="stat-value">{formatCurrency(stats.avgAmount)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
