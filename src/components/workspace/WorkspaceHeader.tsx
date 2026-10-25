import React from 'react';
import { WorkspaceModuleId, ArtistProfileSettings } from '../../types';

interface WorkspaceHeaderProps {
  activeModule: WorkspaceModuleId;
  onSelectModule: (module: WorkspaceModuleId) => void;
  profile: ArtistProfileSettings;
  counts: {
    inventory: number;
    sales: number;
    collectors: number;
    exhibitions: number;
    certificates: number;
    licensing: number;
  };
  onOpenVerifyModal: () => void;
  onSwitchToDiscovery: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeModule,
  onSelectModule,
  profile,
  counts,
  onOpenVerifyModal,
  onSwitchToDiscovery,
}) => {
  const navItems: { id: WorkspaceModuleId; label: string; icon: string; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Artwork Inventory', icon: '🖼️', count: counts.inventory },
    { id: 'sales', label: 'Sales & Revenue', icon: '💰', count: counts.sales },
    { id: 'collectors', label: 'Collectors CRM', icon: '👥', count: counts.collectors },
    { id: 'exhibitions', label: 'Exhibitions & ROI', icon: '🎪', count: counts.exhibitions },
    { id: 'pricing', label: 'Pricing Intelligence', icon: '🏷️' },
    { id: 'certificates', label: 'Digital Certificates', icon: '📜', count: counts.certificates },
    { id: 'licensing', label: 'Rights & Licensing', icon: '⚖️', count: counts.licensing },
    { id: 'marketing', label: 'Marketing Analytics', icon: '📈' },
    { id: 'catalog', label: 'Portfolio Catalog', icon: '📖' },
    { id: 'backup', label: 'Vault & Backup', icon: '💾' },
  ];

  return (
    <div className="workspace-header-bar">
      <div className="workspace-top-row">
        <div className="workspace-brand">
          <div className="brand-badge-gold" aria-hidden="true">MK</div>
          <div>
            <div className="brand-eyebrow">Artist Intelligence Platform</div>
            <h2 className="workspace-title">
              Morrowkind <span className="workspace-vault-tag">Private Vault</span>
            </h2>
          </div>
        </div>

        <div className="workspace-top-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onOpenVerifyModal}
            aria-label="Verify Certificate of Authenticity"
          >
            🔍 Verify Certificate
          </button>
          
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onSwitchToDiscovery}
            aria-label="Switch to Public Art Discovery"
          >
            🏛️ Public Discovery Directory
          </button>

          <div className="artist-profile-chip" title={`Base Currency: ${profile.baseCurrency} | Studio: ${profile.studioName || 'Private'}`}>
            <span className="profile-dot" aria-hidden="true"></span>
            <span className="profile-name">{profile.artistName}</span>
            <span className="profile-currency">({profile.baseCurrency})</span>
          </div>
        </div>
      </div>

      <nav className="workspace-nav" aria-label="Workspace Modules">
        <div className="workspace-nav-list" role="tablist">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                id={`ws-tab-${item.id}`}
                className={`workspace-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSelectModule(item.id)}
              >
                <span className="tab-icon" aria-hidden="true">{item.icon}</span>
                <span className="tab-label">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="ws-pill">{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
