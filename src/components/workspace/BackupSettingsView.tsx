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

  // Encrypted Backup Modal State
  const [isEncModalOpen, setIsEncModalOpen] = useState(false);
  const [encPassphrase, setEncPassphrase] = useState('');
  const [encConfirm, setEncConfirm] = useState('');
  const [encError, setEncError] = useState('');

  // Encrypted Restore State
  const [isRestoreEncOpen, setIsRestoreEncOpen] = useState(false);
  const [restoreEncFileContent, setRestoreEncFileContent] = useState('');
  const [restoreEncPassphrase, setRestoreEncPassphrase] = useState('');
  const [restoreEncError, setRestoreEncError] = useState('');

  // Storage In-Place Migration State
  const [isStorageEncrypted, setIsStorageEncrypted] = useState(() => StorageService.isStorageEncryptedAtRest());
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [migratePassphrase, setMigratePassphrase] = useState('');
  const [migrateConfirm, setMigrateConfirm] = useState('');
  const [migrateError, setMigrateError] = useState('');

  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [disablePassphrase, setDisablePassphrase] = useState('');
  const [disableError, setDisableError] = useState('');

  const handleMigrateToEncrypted = async (e: React.FormEvent) => {
    e.preventDefault();
    setMigrateError('');

    if (migratePassphrase.length < 8) {
      setMigrateError('Passphrase must be at least 8 characters long for AES-256 storage encryption.');
      return;
    }
    if (migratePassphrase !== migrateConfirm) {
      setMigrateError('Passphrases do not match. Please re-enter carefully.');
      return;
    }

    const res = await StorageService.migrateToEncryptedAtRest(migratePassphrase);
    if (res.success) {
      setIsStorageEncrypted(true);
      setIsMigrateModalOpen(false);
      setMigratePassphrase('');
      setMigrateConfirm('');
      setRestoreMessage({
        type: 'success',
        text: 'Successfully migrated to AES-256-GCM Encrypted Storage at Rest! All residual plaintext records have been purged.'
      });
    } else {
      setMigrateError(res.error || 'Migration failed.');
    }
  };

  const handleMigrateToStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableError('');

    if (!disablePassphrase) {
      setDisableError('Please enter your vault passphrase to decrypt storage.');
      return;
    }

    const res = await StorageService.migrateToStandardStorage(disablePassphrase);
    if (res.success && res.state) {
      setIsStorageEncrypted(false);
      setIsDisableModalOpen(false);
      setDisablePassphrase('');
      onRestoreWorkspace(res.state);
      setRestoreMessage({
        type: 'success',
        text: 'Storage returned to Standard Local Mode. Data preserved successfully.'
      });
    } else {
      setDisableError(res.error || 'Failed to decrypt storage.');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportStandardBackup = () => {
    const jsonStr = StorageService.exportBackupJson(state);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(jsonStr, `morrowkind-backup-${dateStr}.json`, 'application/json');
  };

  const handleExportEncryptedBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEncError('');

    if (encPassphrase.length < 8) {
      setEncError('Passphrase must be at least 8 characters long for military-grade AES-256 security.');
      return;
    }
    if (encPassphrase !== encConfirm) {
      setEncError('Passphrases do not match. Please re-enter carefully.');
      return;
    }

    try {
      const encryptedJson = await StorageService.exportEncryptedBackup(state, encPassphrase);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(encryptedJson, `morrowkind-vault-encrypted-${dateStr}.enc.json`, 'application/json');
      setIsEncModalOpen(false);
      setEncPassphrase('');
      setEncConfirm('');
      setRestoreMessage({ type: 'success', text: 'AES-256-GCM encrypted backup created and downloaded!' });
    } catch (err: any) {
      setEncError(err.message || 'Encryption failed.');
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (parsed.encryption === 'AES-GCM-256' || parsed.type === 'MORROWKIND_ENCRYPTED_VAULT_BACKUP') {
          // Open encrypted restore dialog
          setRestoreEncFileContent(content);
          setIsRestoreEncOpen(true);
          return;
        }

        const res = StorageService.restoreBackupJson(content);
        if (res.success && res.restoredState) {
          onRestoreWorkspace(res.restoredState);
          setRestoreMessage({ type: 'success', text: 'Standard backup restored successfully!' });
        } else {
          setRestoreMessage({ type: 'error', text: res.error || 'Failed to restore backup file.' });
        }
      } catch (err: any) {
        setRestoreMessage({ type: 'error', text: `Failed to parse file: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const handleDecryptAndRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreEncError('');

    if (!restoreEncPassphrase) {
      setRestoreEncError('Please enter the vault passphrase used when creating this backup.');
      return;
    }

    try {
      const res = await StorageService.restoreEncryptedBackup(restoreEncFileContent, restoreEncPassphrase);
      if (res.success && res.restoredState) {
        onRestoreWorkspace(res.restoredState);
        setIsRestoreEncOpen(false);
        setRestoreEncPassphrase('');
        setRestoreEncFileContent('');
        setRestoreMessage({ type: 'success', text: 'AES-256-GCM encrypted backup decrypted and restored successfully!' });
      } else {
        setRestoreEncError(res.error || 'Decryption failed.');
      }
    } catch (err: any) {
      setRestoreEncError(`Decryption failed: ${err.message}`);
    }
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

            <div className="panel-divider" style={{ margin: '16px 0' }}></div>

            <div className="form-field">
              <label htmlFor="set-passcode" style={{ fontWeight: 600 }}>
                Studio Privacy Passcode (Visual Screen Curtain)
              </label>
              <p className="field-hint" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                PIN or passcode required to unlock the visual privacy screen when 'Lock Vault' is pressed. Visual protection against studio shoulder-surfing. (Leave blank to keep unconfigured).
              </p>
              <input
                id="set-passcode"
                type="password"
                placeholder="Set 4+ character privacy PIN (e.g. 5821)"
                value={profileForm.vaultPasscodeHash || ''}
                onChange={(e) => setProfileForm({ ...profileForm, vaultPasscodeHash: e.target.value })}
                autoComplete="new-password"
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

        {/* Right Column: Backup, Restore & Security Posture */}
        <div className="settings-panel">
          <h3>Storage Architecture & Disaster Recovery</h3>
          
          <div className="security-posture-box">
            <div className="storage-status-strip">
              <span className="live-dot" aria-hidden="true"></span>
              <strong>Client-Side Isolated Storage: ACTIVE</strong>
            </div>
            <p className="panel-desc">
              Sensitive studio financial records, collector contacts, and artwork valuations are isolated strictly inside
              your browser's local sandbox. No private records are stored on public servers or logged in telemetry.
            </p>
          </div>

          <div className="backup-action-grid">
            <button type="button" className="btn btn-primary" onClick={handleExportStandardBackup}>
              💾 Download Backup (JSON)
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEncModalOpen(true)}>
              🔒 Export AES-256 Encrypted Vault
            </button>
          </div>
          <span className="backup-note">
            Contains {state.inventory.length} artworks, {state.sales.length} transactions, and {state.collectors.length} collectors.
          </span>

          <div className="panel-divider"></div>

          {/* Storage Mode & Migration Box */}
          <div className="storage-mode-control-box">
            <h4>Storage Security Mode</h4>
            <div className="storage-mode-status">
              <span className={`status-pill ${isStorageEncrypted ? 'pill-paid' : 'pill-standard'}`}>
                {isStorageEncrypted ? '🔒 AES-256-GCM Encrypted at Rest' : '🛡️ Standard Local Storage (Default)'}
              </span>
            </div>
            <p className="panel-desc">
              {isStorageEncrypted
                ? 'Your local workspace records are fully encrypted at rest. Raw disk inspection reveals strictly zero plaintext.'
                : 'Standard mode stores records in an isolated browser sandbox. You can perform an in-place migration to AES-256 encryption at rest to cryptographically protect sensitive records on disk.'}
            </p>
            <div className="migration-actions-row">
              {isStorageEncrypted ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsDisableModalOpen(true)}
                >
                  🔓 Decrypt Storage (Return to Standard Mode)
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsMigrateModalOpen(true)}
                >
                  🔒 Enable AES-256 Storage at Rest (In-Place Migration)
                </button>
              )}
            </div>
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

          {/* Recovery Boundaries Notice */}
          <div className="recovery-rules-box">
            <h4>⚠️ Exact Recovery Boundaries</h4>
            <ul>
              <li><strong>What CAN be recovered:</strong> Full JSON backups, AES-256 encrypted backups with correct passphrase, and local storage on reload.</li>
              <li><strong>What CANNOT be recovered:</strong> If you lose your passphrase for an AES-256-GCM encrypted backup, it is mathematically unrecoverable. Clearing browser cache wipes local data if no external backup file was exported.</li>
            </ul>
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

      {/* Encrypted Export Modal */}
      {isEncModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="encModalTitle">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="encModalTitle">🔒 Export AES-256-GCM Encrypted Vault</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsEncModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleExportEncryptedBackup} className="modal-form">
              <p className="modal-intro">
                Your workspace will be encrypted using NIST SP 800-38D AES-GCM (256-bit key derived via PBKDF2 with 100,000 SHA-256 iterations).
                Without this passphrase, the backup cannot be opened by anyone.
              </p>

              <div className="form-field">
                <label htmlFor="encPass">Vault Passphrase (minimum 8 characters) *</label>
                <input
                  id="encPass"
                  type="password"
                  required
                  value={encPassphrase}
                  onChange={(e) => setEncPassphrase(e.target.value)}
                  placeholder="Enter a strong passphrase"
                />
              </div>

              <div className="form-field">
                <label htmlFor="encConfirm">Confirm Passphrase *</label>
                <input
                  id="encConfirm"
                  type="password"
                  required
                  value={encConfirm}
                  onChange={(e) => setEncConfirm(e.target.value)}
                  placeholder="Re-enter passphrase"
                />
              </div>

              {encError && <div className="error-text">⚠️ {encError}</div>}

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEncModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Encrypt & Download Backup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Encrypted Restore Modal */}
      {isRestoreEncOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="decModalTitle">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="decModalTitle">🔓 Decrypt & Restore AES-256-GCM Vault</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsRestoreEncOpen(false)}>×</button>
            </div>
            <form onSubmit={handleDecryptAndRestore} className="modal-form">
              <p className="modal-intro">
                This file is encrypted with AES-256-GCM. Enter the secret passphrase used during export to decrypt and restore your studio data.
              </p>

              <div className="form-field">
                <label htmlFor="decPass">Vault Passphrase *</label>
                <input
                  id="decPass"
                  type="password"
                  required
                  value={restoreEncPassphrase}
                  onChange={(e) => setRestoreEncPassphrase(e.target.value)}
                  placeholder="Enter vault passphrase"
                />
              </div>

              {restoreEncError && <div className="error-text">⚠️ {restoreEncError}</div>}

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRestoreEncOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Decrypt & Restore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Place Migration to Encrypted Modal */}
      {isMigrateModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="migrateModalTitle">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="migrateModalTitle">🔒 In-Place Migration to AES-256 Storage</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsMigrateModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleMigrateToEncrypted} className="modal-form">
              <p className="modal-intro">
                All existing inventory, sales records, and collector data will be encrypted in place using AES-GCM-256 (PBKDF2 100,000 iterations).
                All residual plaintext records and staging caches will be completely wiped from disk.
              </p>

              <div className="form-field">
                <label htmlFor="migPass">Create Master Vault Passphrase (min 8 characters) *</label>
                <input
                  id="migPass"
                  type="password"
                  required
                  value={migratePassphrase}
                  onChange={(e) => setMigratePassphrase(e.target.value)}
                  placeholder="Enter a strong master passphrase"
                />
              </div>

              <div className="form-field">
                <label htmlFor="migConfirm">Confirm Master Passphrase *</label>
                <input
                  id="migConfirm"
                  type="password"
                  required
                  value={migrateConfirm}
                  onChange={(e) => setMigrateConfirm(e.target.value)}
                  placeholder="Re-enter master passphrase"
                />
              </div>

              {migrateError && <div className="error-text">⚠️ {migrateError}</div>}

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsMigrateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Encrypt Storage in Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return to Standard Mode Modal */}
      {isDisableModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="disableModalTitle">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="disableModalTitle">🔓 Return to Standard Local Storage</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsDisableModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleMigrateToStandard} className="modal-form">
              <p className="modal-intro">
                Enter your current master vault passphrase to decrypt your workspace and store it in standard local sandbox mode.
              </p>

              <div className="form-field">
                <label htmlFor="disPass">Current Vault Passphrase *</label>
                <input
                  id="disPass"
                  type="password"
                  required
                  value={disablePassphrase}
                  onChange={(e) => setDisablePassphrase(e.target.value)}
                  placeholder="Enter vault passphrase"
                />
              </div>

              {disableError && <div className="error-text">⚠️ {disableError}</div>}

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDisableModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Decrypt & Switch Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Strip */}
      <div className="audit-log-section">
        <h3>Cryptographic Workspace Audit Trail</h3>
        <p className="audit-sub">
          Immutable log of the last {state.auditLogs.length} state alterations, imports, and certificate issuances.
        </p>

        <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Cryptographic audit trail data table">
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
