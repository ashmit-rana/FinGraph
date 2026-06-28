import React from 'react';
import {
  Network,
  LayoutDashboard,
  ShieldAlert,
  Search,
  BrainCircuit,
  GitBranch,
  FileText,
} from 'lucide-react';
import { useAppContext } from '../App';

const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'risk-queue', icon: ShieldAlert, label: 'Risk Queue' },
  { id: 'transaction-scoring', icon: Search, label: 'Transaction Scoring' },
  { id: 'graph-intelligence', icon: Network, label: 'Graph Intelligence' },
  { id: 'model-performance', icon: BrainCircuit, label: 'Model Performance' },
  { id: 'rules-signals', icon: GitBranch, label: 'Rules & Signals' },
  { id: 'case-review', icon: FileText, label: 'Case Review' },
];

export default function Sidebar() {
  const { activePage, setActivePage, cases, source } = useAppContext();
  const isOnline = source === 'live API';

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">
          <Network size={28} />
        </div>
        <span className="eyebrow">Week 8</span>
        <h1>FinGraph</h1>
      </div>

      <nav className="nav-stack">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={activePage === id ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'case-review' && cases.length > 0 && (
              <span className="nav-badge">{cases.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className={isOnline ? 'pulse online' : 'pulse'} />
          <span>{isOnline ? 'Connected to live API' : 'Using local artifacts'}</span>
        </div>
      </div>
    </aside>
  );
}
