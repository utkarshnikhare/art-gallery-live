import React from 'react';
import { DatasetMetadata } from '../types';

interface HeaderProps {
  metadata?: DatasetMetadata;
  onOpenAbout: () => void;
  onOpenSources: () => void;
}

export const Header: React.FC<HeaderProps> = ({ metadata, onOpenAbout, onOpenSources }) => {
  const formattedUpdate = metadata?.lastSuccessfullyUpdated
    ? new Date(metadata.lastSuccessfullyUpdated).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Daily sync';

  return (
    <header className="app-header" role="banner">
      <div className="header-container">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">🏛️</div>
          <div>
            <h1 className="brand-title">Art Gallery Live</h1>
            <p className="brand-tagline">Discover exhibitions, art fairs and creative events</p>
          </div>
        </div>

        <div className="header-meta">
          <div className="update-badge" title="Data is synchronized daily from official gallery and museum records">
            <span className="live-dot" aria-hidden="true"></span>
            <span>Updated: <strong className="timestamp-text">{formattedUpdate}</strong></span>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenSources}
              aria-label="View verified sources directory"
            >
              Sources Directory
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenAbout}
              aria-label="About data accuracy and policy"
            >
              About Data
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
