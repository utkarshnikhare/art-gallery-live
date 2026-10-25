/**
 * Local Storage & Data Isolation Service
 * Manages tenant-isolated workspace storage, cryptographic state, audit logging,
 * and reliable backup/restore workflows.
 */

import { 
  ArtistWorkspaceState, 
  AuditLogEntry,
  ArtistProfileSettings
} from '../types';

const STORAGE_KEY = 'morrowkind_workspace_v1';

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
   * Load entire workspace state
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
   * Save entire workspace state atomically
   */
  static saveWorkspace(state: ArtistWorkspaceState): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (err) {
      console.error('Failed to save workspace state:', err);
    }
  }

  /**
   * Append an audit log entry
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
   * Export workspace as JSON string
   */
  static exportBackupJson(state: ArtistWorkspaceState): string {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      workspace: state
    }, null, 2);
  }

  /**
   * Restore workspace from JSON string with validation
   */
  static restoreBackupJson(jsonString: string): { success: boolean; error?: string; restoredState?: ArtistWorkspaceState } {
    try {
      const data = JSON.parse(jsonString);
      const ws = data.workspace || data;
      if (!ws || typeof ws !== 'object') {
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
      return { success: false, error: `JSON Parse Error: ${err.message}` };
    }
  }

  /**
   * Completely erase workspace (Right to Erasure compliance)
   */
  static clearWorkspace(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
