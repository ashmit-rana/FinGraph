import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { useAppContext } from '../App';

export default function TopHeader() {
  const { source, loading, error, reload, lastRefreshed, health } = useAppContext();
  const modelLoaded = health?.model_loaded;
  const isLive = source === 'live API';

  return (
    <header className="top-header">
      <div className="header-left">
        <h2>FinGraph Risk Operations</h2>
      </div>

      <div className="header-right">
        <div className="status-indicator">
          <span className={modelLoaded ? 'status-dot online' : 'status-dot'} />
          <span>{modelLoaded ? 'Model loaded' : 'Model unavailable'}</span>
        </div>

        <span className={isLive ? 'data-chip' : 'data-chip offline'}>
          {isLive ? 'Live API' : 'Artifact Mode'}
        </span>

        {lastRefreshed && (
          <span className="timestamp">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
        )}

        <button
          className="refresh-btn"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh data"
        >
          <RefreshCcw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
}
