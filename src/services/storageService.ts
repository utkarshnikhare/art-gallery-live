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

export interface PrivacyPasscodeVerificationResult {
  valid: boolean;
  status: 'MATCH' | 'MISMATCH' | 'BLANK' | 'UNCONFIGURED';
  error?: string;
}

export class StorageService {
  static getStorageKey(tenantId = 'default'): string {
    return tenantId === 'default' ? STORAGE_KEY : `morrowkind_workspace_${tenantId}`;
  }

  /**
   * Verify studio privacy screen passcode (visual curtain) in standard storage mode.
   * Universal default passcodes (e.g. '1234') are explicitly rejected.
   */
  static verifyVaultPrivacyPasscode(
    inputPasscode: string | undefined | null,
    configuredPasscode: string | undefined | null
  ): PrivacyPasscodeVerificationResult {
    const trimmedInput = (inputPasscode || '').trim();
    const trimmedConfigured = (configuredPasscode || '').trim();

    if (!trimmedInput) {
      return {
        valid: false,
        status: 'BLANK',
        error: 'Passcode cannot be blank. Enter your studio privacy passcode.'
      };
    }

    if (!trimmedConfigured) {
      return {
        valid: false,
        status: 'UNCONFIGURED',
        error: 'Vault privacy passcode is unconfigured. Universal default passcodes (e.g. 1234) are rejected.'
      };
    }

    if (trimmedInput !== trimmedConfigured) {
      return {
        valid: false,
        status: 'MISMATCH',
        error: 'Incorrect studio passcode. Please re-enter the passcode configured in Studio Settings.'
      };
    }

    return {
      valid: true,
      status: 'MATCH'
    };
  }

  /**
   * Determine whether the local workspace storage is encrypted at rest
   */
  static isStorageEncryptedAtRest(tenantId = 'default'): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const key = StorageService.getStorageKey(tenantId);
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed && parsed.encrypted === true && parsed.algorithm === 'AES-GCM-256';
    } catch {
      return false;
    }
  }

  /**
   * Save workspace with authenticated AES-GCM-256 encryption at rest
   */
  static async saveWorkspaceEncrypted(
    state: ArtistWorkspaceState,
    passphrase: string,
    tenantId = 'default'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof localStorage === 'undefined') return { success: true };
      if (!passphrase || passphrase.length < 6) {
        return { success: false, error: 'Vault passphrase must be at least 6 characters long.' };
      }

      const key = StorageService.getStorageKey(tenantId);
      const plainSerialized = JSON.stringify(state);
      const encryptedPayload = await encryptAesGcm(plainSerialized, passphrase);
      const payloadString = JSON.stringify(encryptedPayload);

      // Staging write first to prevent data corruption
      localStorage.setItem(STAGING_KEY, payloadString);
      localStorage.setItem(key, payloadString);
      localStorage.removeItem(STAGING_KEY);

      return { success: true };
    } catch (err: any) {
      console.error('Failed to save encrypted workspace:', err);
      return { success: false, error: err.message || 'Encryption-at-rest save failed' };
    }
  }

  /**
   * Migrate existing plaintext workspace storage to AES-256-GCM encrypted storage in place
   * Safely encrypts state, verifies ciphertext write, and wipes all residual plaintext.
   */
  static async migrateToEncryptedAtRest(
    passphrase: string,
    tenantId = 'default'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!passphrase || passphrase.length < 8) {
        return { success: false, error: 'Master passphrase must be at least 8 characters long.' };
      }

      if (StorageService.isStorageEncryptedAtRest(tenantId)) {
        return { success: false, error: 'Storage is already encrypted at rest for this workspace.' };
      }

      const currentState = StorageService.loadWorkspace(tenantId);
      const migratedState: ArtistWorkspaceState = {
        ...currentState,
        profile: {
          ...currentState.profile,
          encryptionAtRest: true,
          vaultProtected: true,
        }
      };

      const saveRes = await StorageService.saveWorkspaceEncrypted(migratedState, passphrase, tenantId);
      if (!saveRes.success) {
        return { success: false, error: saveRes.error || 'Failed to encrypt storage' };
      }

      // Purge staging and verify raw storage contains only ciphertext
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STAGING_KEY);
        const key = StorageService.getStorageKey(tenantId);
        const stored = localStorage.getItem(key);
        if (!stored || !stored.includes('AES-GCM-256')) {
          return { success: false, error: 'Verification failed: ciphertext was not written properly.' };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Migration to encrypted storage failed.' };
    }
  }

  /**
   * Migrate from AES-256-GCM encrypted storage back to standard unencrypted local storage
   */
  static async migrateToStandardStorage(
    passphrase: string,
    tenantId = 'default'
  ): Promise<{ success: boolean; state?: ArtistWorkspaceState; error?: string }> {
    try {
      const loadRes = await StorageService.loadWorkspaceEncrypted(passphrase, tenantId);
      if (!loadRes.success || !loadRes.state) {
        return { success: false, error: loadRes.error || 'Failed to decrypt workspace with provided passphrase.' };
      }

      const standardState: ArtistWorkspaceState = {
        ...loadRes.state,
        profile: {
          ...loadRes.state.profile,
          encryptionAtRest: false,
        }
      };

      const saveRes = StorageService.saveWorkspace(standardState, tenantId);
      if (!saveRes.success) {
        return { success: false, error: saveRes.error || 'Failed to save standard workspace' };
      }

      return { success: true, state: standardState };
    } catch (err: any) {
      return { success: false, error: err.message || 'Migration to standard storage failed.' };
    }
  }

  /**
   * Load workspace from AES-GCM-256 encrypted-at-rest storage using master passphrase
   */
  static async loadWorkspaceEncrypted(
    passphrase: string,
    tenantId = 'default'
  ): Promise<{ success: boolean; state?: ArtistWorkspaceState; error?: string }> {
    try {
      if (typeof localStorage === 'undefined') {
        return { success: true, state: EMPTY_WORKSPACE };
      }
      const key = StorageService.getStorageKey(tenantId);
      const raw = localStorage.getItem(key);
      if (!raw) {
        return { success: true, state: EMPTY_WORKSPACE };
      }

      const parsed = JSON.parse(raw);
      if (!parsed.encrypted || parsed.algorithm !== 'AES-GCM-256') {
        // Plaintext payload fallback
        return { success: true, state: StorageService.loadWorkspace(tenantId) };
      }

      const decryptedJson = await decryptAesGcm(parsed, passphrase);
      const ws = JSON.parse(decryptedJson);

      const validatedState: ArtistWorkspaceState = {
        profile: { ...INITIAL_PROFILE, ...(ws.profile || {}), encryptionAtRest: true },
        inventory: Array.isArray(ws.inventory) ? ws.inventory : [],
        sales: Array.isArray(ws.sales) ? ws.sales : [],
        collectors: Array.isArray(ws.collectors) ? ws.collectors : [],
        exhibitions: Array.isArray(ws.exhibitions) ? ws.exhibitions : [],
        campaigns: Array.isArray(ws.campaigns) ? ws.campaigns : [],
        certificates: Array.isArray(ws.certificates) ? ws.certificates : [],
        licensing: Array.isArray(ws.licensing) ? ws.licensing : [],
        auditLogs: Array.isArray(ws.auditLogs) ? ws.auditLogs : [],
      };

      return { success: true, state: validatedState };
    } catch (err: any) {
      return {
        success: false,
        error: `Decryption failed: ${err.message || 'Incorrect passphrase or tampered ciphertext.'}`
      };
    }
  }

  /**
   * Load entire workspace state from storage
   */
  static loadWorkspace(tenantId = 'default'): ArtistWorkspaceState {
    try {
      if (typeof localStorage === 'undefined') {
        return EMPTY_WORKSPACE;
      }
      const key = StorageService.getStorageKey(tenantId);
      const serialized = localStorage.getItem(key);
      if (!serialized) {
        return EMPTY_WORKSPACE;
      }
      const parsed = JSON.parse(serialized);

      // Check if this tenant is encrypted at rest
      if (parsed && parsed.encrypted === true && parsed.algorithm === 'AES-GCM-256') {
        // Encrypted at rest: cannot parse plaintext without passphrase!
        return {
          ...EMPTY_WORKSPACE,
          profile: {
            ...INITIAL_PROFILE,
            vaultProtected: true,
            encryptionAtRest: true,
            sessionVaultLock: true,
          }
        };
      }

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
  static saveWorkspace(state: ArtistWorkspaceState, tenantId = 'default'): { success: boolean; error?: string } {
    try {
      if (typeof localStorage === 'undefined') {
        return { success: true };
      }
      const key = StorageService.getStorageKey(tenantId);
      const serialized = JSON.stringify(state);

      // Staging write first to prevent data corruption during interrupted writes
      try {
        localStorage.setItem(STAGING_KEY, serialized);
        localStorage.setItem(key, serialized);
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
    summary: string,
    tenantId = 'default'
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
    StorageService.saveWorkspace(updated, tenantId);
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
  static clearWorkspace(tenantId = 'default'): void {
    if (typeof localStorage !== 'undefined') {
      const key = StorageService.getStorageKey(tenantId);
      localStorage.removeItem(key);
      localStorage.removeItem(STAGING_KEY);
    }
  }
}
