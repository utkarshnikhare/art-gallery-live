import React, { useState } from 'react';
import { ArtistWorkspaceState, ArtistProfileSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { downloadFile } from '../../utils/csvService';

interface BackupSettingsViewProps {
  state: ArtistWorkspaceState;
  onUpdateProfile: (profile: ArtistProfileSettings) => void;
  onRestoreWorkspace: (newState: ArtistWorkspaceState) => void;
  onWipeWorkspace: () => void;
}

export const BackupSettingsView: React.FC<BackupSettingsViewProps> = ({
  state,
  onUpdateProfile,
  onRestoreWorkspace,
  onWipeWorkspace,
}) => {
  const [profileForm, setProfileForm] = useState<ArtistProfileSettings>({ ...state.profile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportBackupJson(state);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(jsonStr, `morrowkind-backup-${dateStr}.json`, 'application/json');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.restoreBackupJson(content);
      if (res.success && res.restoredState) {
        onRestoreWorkspace(res.restoredState);
        setRestoreMessage({ type: 'success', text: 'Backup restored successfully!' });
      } else {
        setRestoreMessage({ type: 'error', text: res.error || 'Failed to restore backup file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-backup">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Vault Settings, Security & Disaster Recovery</h2>
          <p className="view-subheading">
            Manage your artist identity, default currencies, cryptographic audit logs, and complete workspace backups.
          </p>
        </div>
      </div>

      <div className="settings-grid-layout">
        {/* Left Column: Profile & Currency Preferences */}
        <div className="settings-panel">
          <h3>Studio Identity & Valuation Defaults</h3>
          <form onSubmit={handleProfileSubmit} className="modal-form">
            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="set-name">Artist Name *</label>
                <input
                  id="set-name"
                  type="text"
                  required
                  value={profileForm.artistName}
                  onChange={(e) => setProfileForm({ ...profileForm, artistName: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="set-studio">Studio / Practice Name</label>
                <input
                  id="set-studio"
                  type="text"
                  value={profileForm.studioName || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, studioName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="set-email">Contact Email</label>
                <input
                  id="set-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="set-currency">Base Currency</label>
                <select
                  id="set-currency"
                  value={profileForm.baseCurrency}
                  onChange={(e) => setProfileForm({ ...profileForm, baseCurrency: e.target.value })}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="set-unit">Measurement Unit</label>
                <select
                  id="set-unit"
                  value={profileForm.measurementUnit}
                  onChange={(e) => setProfileForm({ ...profileForm, measurementUnit: e.target.value as any })}
                >
                  <option value="cm">Centimeters (cm)</option>
                  <option value="in">Inches (in)</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="set-rate">Default Labor Rate ({profileForm.baseCurrency}/hr)</label>
                <input
                  id="set-rate"
                  type="number"
                  min="0"
                  value={profileForm.hourlyRate}
                  onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="set-split">Default Gallery Commission Split (%)</label>
              <input
                id="set-split"
                type="number"
                min="0"
                max="100"
                value={profileForm.defaultMarkupPercent}
                onChange={(e) => setProfileForm({ ...profileForm, defaultMarkupPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="settings-submit-row">
              <button type="submit" className="btn btn-primary">
                Save Studio Settings
              </button>
              {saveSuccess && <span className="valid-text">✓ Settings saved successfully!</span>}
            </div>
          </form>
        </div>

        {/* Right Column: Backup, Restore & Disaster Recovery */}
        <div className="settings-panel">
          <h3>Disaster Recovery & Backup</h3>
          <p className="panel-desc">
            Your workspace data is encrypted and saved in your local browser vault. Download a complete JSON backup
            regularly to prevent data loss when switching devices or clearing browser cache.
          </p>

          <div className="backup-action-box">
            <button type="button" className="btn btn-primary" onClick={handleExportBackup}>
              💾 Download Full Workspace Backup (JSON)
            </button>
            <span className="backup-note">
              Includes {state.inventory.length} artworks, {state.sales.length} transactions, and {state.collectors.length} collectors.
            </span>
          </div>

          <div className="panel-divider"></div>

          <h4>Restore Workspace from Backup</h4>
          <div className="file-dropzone">
            <input type="file" accept=".json" onChange={handleRestoreFile} id="restoreFile" />
            <label htmlFor="restoreFile" className="dropzone-label">
              📥 Click to Select Backup File (.json) to Restore
            </label>
          </div>

          {restoreMessage && (
            <div className={`alert-card ${restoreMessage.type === 'success' ? 'info-accent' : 'warning-accent'}`}>
              <span className="alert-icon" aria-hidden="true">
                {restoreMessage.type === 'success' ? '✓' : '⚠️'}
              </span>
              <span>{restoreMessage.text}</span>
            </div>
          )}

          <div className="panel-divider"></div>

          <h4>Cloud Bridge Architecture (Supabase / Postgres)</h4>
          <div className="cloud-bridge-box">
            <div className="bridge-status">
              <span className="live-dot" aria-hidden="true"></span>
              <strong>Client-Side Isolated Vault: ACTIVE</strong>
            </div>
            <p className="bridge-text">
              To enable cross-device multi-user collaboration with PostgreSQL Row Level Security (RLS), configure
              <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>. Without these, Morrowkind runs 100%
              offline and private without sending confidential financial records over the wire.
            </p>
          </div>

          <div className="panel-divider"></div>

          <div className="danger-zone-box">
            <h4>Danger Zone: Right to Erasure</h4>
            <p>
              Permanently purge all artwork inventory, transactions, and collector contact profiles from this browser vault.
            </p>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (
                  window.confirm(
                    'WARNING: This will completely delete all inventory, sales, and collector data. Have you downloaded a backup first?'
                  )
                ) {
                  onWipeWorkspace();
                }
              }}
            >
              Wipe Local Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Strip */}
      <div className="audit-log-section">
        <h3>Cryptographic Workspace Audit Trail</h3>
        <p className="audit-sub">
          Immutable log of the last {state.auditLogs.length} state alterations, imports, and certificate issuances.
        </p>

        <div className="table-responsive-wrapper">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Summary</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {state.auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>
                    <span className="spec-tag">{log.action}</span>
                  </td>
                  <td>{log.entityType}</td>
                  <td>{log.summary}</td>
                  <td>{log.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
