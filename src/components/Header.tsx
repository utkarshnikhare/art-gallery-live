import React from 'react';
import { DatasetMetadata } from '../types';
import { formatInstantToIST } from '../utils/dateUtils';

interface HeaderProps {
  metadata?: DatasetMetadata;
  activePlatformMode: 'discovery' | 'workspace';
  onSelectPlatformMode: (mode: 'discovery' | 'workspace') => void;
  onOpenAbout: () => void;
  onOpenSources: () => void;
  onOpenVerify: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  activePlatformMode,
  onSelectPlatformMode,
  onOpenAbout,
  onOpenSources,
  onOpenVerify,
}) => {
  const lastSyncDate = metadata?.lastSuccessfullyUpdated
    ? new Date(metadata.lastSuccessfullyUpdated)
    : null;

  const formattedUpdate = metadata?.lastSuccessfullyUpdated
    ? formatInstantToIST(metadata.lastSuccessfullyUpdated, {
        month: 'short',
        includeTime: true,
        includeZoneLabel: true,
      })
    : 'Daily sync';

  const isDataStale = lastSyncDate
    ? Date.now() - lastSyncDate.getTime() > 24 * 60 * 60 * 1000
    : false;

  return (
    <header className="app-header" role="banner">
      <div className="header-container">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">🏛️</div>
          <div>
            <div className="brand-title-wrap">
              <h1 className="brand-title">Morrowkind</h1>
              <span className="brand-badge-sub">Artist Intelligence Platform</span>
            </div>
            <p className="brand-tagline">
              Consolidated artist business intelligence, inventory provenance & verified international art discovery
            </p>
          </div>
        </div>

        {/* Global Platform Mode Switcher */}
        <div className="platform-mode-switcher" role="radiogroup" aria-label="Platform Modes">
          <button
            type="button"
            role="radio"
            aria-checked={activePlatformMode === 'workspace'}
            className={`mode-btn ${activePlatformMode === 'workspace' ? 'active' : ''}`}
            onClick={() => onSelectPlatformMode('workspace')}
          >
            <span aria-hidden="true">💼</span> Artist Workspace
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={activePlatformMode === 'discovery'}
            className={`mode-btn ${activePlatformMode === 'discovery' ? 'active' : ''}`}
            onClick={() => onSelectPlatformMode('discovery')}
          >
            <span aria-hidden="true">🏛️</span> Public Discovery
          </button>
        </div>

        <div className="header-meta">
          <div
            className={`update-badge ${isDataStale ? 'badge-stale' : ''}`}
            title="Discovery data is synchronized daily from official gallery and museum records"
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
              className="btn btn-outline btn-sm btn-verify-coa"
              onClick={onOpenVerify}
              aria-label="Verify Certificate of Authenticity"
            >
              Verify COA
            </button>
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
