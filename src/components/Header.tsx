import React from 'react';
import { DatasetMetadata } from '../types';

interface HeaderProps {
  metadata?: DatasetMetadata;
  onOpenAbout: () => void;
  onOpenSources: () => void;
}

export const Header: React.FC<HeaderProps> = ({ metadata, onOpenAbout, onOpenSources }) => {
  const lastSyncDate = metadata?.lastSuccessfullyUpdated
    ? new Date(metadata.lastSuccessfullyUpdated)
    : null;

  const formattedUpdate = lastSyncDate
    ? lastSyncDate.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Daily sync';

  // Check if data is older than 24 hours
  const isDataStale = lastSyncDate
    ? Date.now() - lastSyncDate.getTime() > 24 * 60 * 60 * 1000
    : false;

  return (
    <header className="app-header" role="banner">
      <div className="header-container">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">🏛️</div>
          <div>
            <h1 className="brand-title">Art Gallery Live</h1>
            <p className="brand-tagline">Trustworthy discovery of real exhibitions, art fairs & creative events</p>
          </div>
        </div>

        <div className="header-meta">
          <div
            className={`update-badge ${isDataStale ? 'badge-stale' : ''}`}
            title="Data is synchronized daily from official gallery and museum records"
          >
            <span className={`live-dot ${isDataStale ? 'dot-stale' : ''}`} aria-hidden="true"></span>
            <span>
              {isDataStale ? '⚠️ Refresh Delayed: ' : 'Updated: '}
              <strong className="timestamp-text">{formattedUpdate}</strong>
            </span>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenSources}
              aria-label="View verified sources registry and health status"
            >
              Sources ({metadata?.sourcesCount || 16})
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenAbout}
              aria-label="About data accuracy and policy"
            >
              Verification Policy
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
