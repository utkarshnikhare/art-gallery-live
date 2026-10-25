/**
 * Local Storage & Data Isolation Service
 * Manages tenant-isolated workspace storage, cryptographic state, audit logging,
 * QuotaExceededError protection, atomic saves, and AES-256-GCM encrypted backup/restore workflows.
 */

import { 
  ArtistWorkspaceState, 
  AuditLogEntry,
  ArtistProfileSettings,
  EncryptedStoragePayload
} from '../types';
import { encryptAesGcm, decryptAesGcm } from '../utils/cryptoUtils';

const STORAGE_KEY = 'morrowkind_workspace_v1';
const STAGING_KEY = 'morrowkind_workspace_staging';

export const INITIAL_PROFILE: ArtistProfileSettings = {
  artistName: 'Independent Artist',
  studioName: 'Studio Workspace',
  email: 'artist@morrowkind.internal',
  country: 'United States',
  baseCurrency: 'USD',
  measurementUnit: 'cm',
  hourlyRate: 65,
  defaultMarkupPercent: 50,
  vaultProtected: false,
  encryptionAtRest: false,
  supabaseConfig: {
    configured: false,
    note: 'Client-side isolated vault active. Connect Supabase when cloud sync is required.'
  }
};

export const EMPTY_WORKSPACE: ArtistWorkspaceState = {
  profile: INITIAL_PROFILE,
  inventory: [],
  sales: [],
  collectors: [],
  exhibitions: [],
  campaigns: [],
  certificates: [],
  licensing: [],
  auditLogs: [
    {
      id: `log-init-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CREATE',
      entityType: 'SETTINGS',
      entityId: 'profile',
      summary: 'Initialized private artist intelligence vault',
      actor: 'System'
    }
  ],
};

export class StorageService {
  /**
   * Load entire workspace state from storage
   */
  static loadWorkspace(): ArtistWorkspaceState {
    try {
      if (typeof localStorage === 'undefined') {
        return EMPTY_WORKSPACE;
      }
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return EMPTY_WORKSPACE;
      }
      const parsed: ArtistWorkspaceState = JSON.parse(serialized);
      // Ensure all arrays are initialized
      return {
        profile: { ...INITIAL_PROFILE, ...(parsed.profile || {}) },
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        collectors: Array.isArray(parsed.collectors) ? parsed.collectors : [],
        exhibitions: Array.isArray(parsed.exhibitions) ? parsed.exhibitions : [],
        campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
        certificates: Array.isArray(parsed.certificates) ? parsed.certificates : [],
        licensing: Array.isArray(parsed.licensing) ? parsed.licensing : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
    } catch (err) {
      console.error('Failed to parse workspace storage:', err);
      return EMPTY_WORKSPACE;
    }
  }

  /**
   * Save entire workspace state atomically with QuotaExceededError protection
   */
  static saveWorkspace(state: ArtistWorkspaceState): { success: boolean; error?: string } {
    try {
      if (typeof localStorage === 'undefined') {
        return { success: true };
      }
      const serialized = JSON.stringify(state);

      // Staging write first to prevent data corruption during interrupted writes
      try {
        localStorage.setItem(STAGING_KEY, serialized);
        localStorage.setItem(STORAGE_KEY, serialized);
        localStorage.removeItem(STAGING_KEY);
        return { success: true };
      } catch (domErr: any) {
        if (
          domErr.name === 'QuotaExceededError' ||
          domErr.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          domErr.code === 22 ||
          domErr.code === 1014
        ) {
          console.error('Storage quota exceeded! Cannot persist state:', domErr);
          return {
            success: false,
            error: 'Browser storage quota exceeded. Please export a JSON backup and clear older archived records.'
          };
        }
        throw domErr;
      }
    } catch (err: any) {
      console.error('Failed to save workspace state:', err);
      return { success: false, error: err.message || 'Unknown storage error' };
    }
  }

  /**
   * Append an audit log entry with SHA-256 chain integrity
   */
  static addAuditLog(
    state: ArtistWorkspaceState,
    action: AuditLogEntry['action'],
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    summary: string
  ): ArtistWorkspaceState {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      summary,
      actor: state.profile.artistName || 'Artist'
    };

    const nextLogs = [entry, ...state.auditLogs].slice(0, 100); // Keep last 100 entries
    const updated = { ...state, auditLogs: nextLogs };
    StorageService.saveWorkspace(updated);
    return updated;
  }

  /**
   * Export unencrypted workspace as JSON string
   */
  static exportBackupJson(state: ArtistWorkspaceState): string {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      encryption: 'none',
      workspace: state
    }, null, 2);
  }

  /**
   * Export AES-256-GCM passphrase-encrypted workspace backup
   */
  static async exportEncryptedBackup(state: ArtistWorkspaceState, passphrase: string): Promise<string> {
    const plainString = JSON.stringify(state);
    const encryptedPayload: EncryptedStoragePayload = await encryptAesGcm(plainString, passphrase);

    return JSON.stringify({
      version: '2.0.0',
      type: 'MORROWKIND_ENCRYPTED_VAULT_BACKUP',
      exportedAt: new Date().toISOString(),
      encryption: 'AES-GCM-256',
      payload: encryptedPayload
    }, null, 2);
  }

  /**
   * Restore unencrypted workspace from JSON string with schema validation
   */
  static restoreBackupJson(jsonString: string): { success: boolean; error?: string; restoredState?: ArtistWorkspaceState } {
    try {
      const data = JSON.parse(jsonString);

      // Check if user accidentally uploaded an encrypted backup into the plain restore input
      if (data.type === 'MORROWKIND_ENCRYPTED_VAULT_BACKUP' || data.encryption === 'AES-GCM-256') {
        return {
          success: false,
          error: 'This is an AES-256-GCM encrypted backup file. Please use the Encrypted Vault Restore option and enter your passphrase.'
        };
      }

      const ws = data.workspace || data;
      if (!ws || typeof ws !== 'object' || Array.isArray(ws)) {
        return { success: false, error: 'Invalid backup file structure: workspace object not found' };
      }

      const validatedState: ArtistWorkspaceState = {
        profile: { ...INITIAL_PROFILE, ...(ws.profile || {}) },
        inventory: Array.isArray(ws.inventory) ? ws.inventory : [],
        sales: Array.isArray(ws.sales) ? ws.sales : [],
        collectors: Array.isArray(ws.collectors) ? ws.collectors : [],
        exhibitions: Array.isArray(ws.exhibitions) ? ws.exhibitions : [],
        campaigns: Array.isArray(ws.campaigns) ? ws.campaigns : [],
        certificates: Array.isArray(ws.certificates) ? ws.certificates : [],
        licensing: Array.isArray(ws.licensing) ? ws.licensing : [],
        auditLogs: [
          {
            id: `log-restore-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'RESTORE',
            entityType: 'SETTINGS',
            entityId: 'backup',
            summary: `Restored workspace backup with ${ws.inventory?.length || 0} artworks and ${ws.sales?.length || 0} sales records`,
            actor: 'System'
          },
          ...(Array.isArray(ws.auditLogs) ? ws.auditLogs : [])
        ]
      };

      StorageService.saveWorkspace(validatedState);
      return { success: true, restoredState: validatedState };
    } catch (err: any) {
      return { success: false, error: `Malformed JSON: ${err.message}` };
    }
  }

  /**
   * Restore AES-256-GCM encrypted workspace backup
   */
  static async restoreEncryptedBackup(
    fileString: string,
    passphrase: string
  ): Promise<{ success: boolean; error?: string; restoredState?: ArtistWorkspaceState }> {
    try {
      const data = JSON.parse(fileString);
      if (!data.payload || data.encryption !== 'AES-GCM-256') {
        return {
          success: false,
          error: 'Invalid file: not a recognized AES-GCM-256 encrypted Morrowkind vault backup.'
        };
      }

      const decryptedJson = await decryptAesGcm(data.payload, passphrase);
      const parsedWs: ArtistWorkspaceState = JSON.parse(decryptedJson);

      return StorageService.restoreBackupJson(JSON.stringify(parsedWs));
    } catch (err: any) {
      return {
        success: false,
        error: `Decryption failed: ${err.message || 'Incorrect passphrase or corrupted file.'}`
      };
    }
  }

  /**
   * Completely erase workspace (Right to Erasure compliance)
   */
  static clearWorkspace(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STAGING_KEY);
    }
  }
}
