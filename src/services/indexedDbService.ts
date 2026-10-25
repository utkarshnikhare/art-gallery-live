/**
 * IndexedDB High-Capacity Storage Service
 * Provides local asset persistence for high-resolution artwork imagery, catalog dossiers,
 * and high-fidelity tear-sheet blobs beyond the browser localStorage 5MB limit.
 */

export const INDEXEDDB_CAPACITY_DISCLAIMER =
  "INDEXEDDB ALLOCATION DISCLAIMER: Local storage capacity is dynamically allocated by the host browser and operating system based on available device storage and origin quota policy. It is not an unconstrained or guaranteed multi-gigabyte constant and remains subject to browser quota limits and device disk constraints.";

const DB_NAME = 'morrowkind_assets_db';
const DB_VERSION = 1;
const STORE_IMAGES = 'artwork_images';

export interface StorageEstimateResult {
  isSupported: boolean;
  usedBytes: number;
  quotaBytes: number;
  percentageUsed: number;
  formattedUsed: string;
  formattedQuota: string;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB not accessible in this browser mode.');
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export class IndexedDbService {
  /**
   * Check real browser storage quota and utilization via StorageManager API
   */
  static async getStorageEstimate(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;
        return {
          isSupported: true,
          usedBytes: used,
          quotaBytes: quota,
          percentageUsed: Math.round(percentage * 100) / 100,
          formattedUsed: formatBytes(used),
          formattedQuota: formatBytes(quota),
        };
      } catch (err) {
        console.warn('Failed to retrieve storage estimate:', err);
      }
    }

    return {
      isSupported: false,
      usedBytes: 0,
      quotaBytes: 0,
      percentageUsed: 0,
      formattedUsed: 'Dynamic (Browser Allocated)',
      formattedQuota: 'Host Governed',
    };
  }

  /**
   * Store high-resolution artwork image asset in IndexedDB with quota error handling
   */
  static async saveArtworkImage(artworkId: string, dataUriOrUrl: string): Promise<{ success: boolean; error?: string }> {
    const db = await openDatabase();
    if (!db) return { success: false, error: 'IndexedDB is unavailable in this environment' };

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
        store.put({ id: artworkId, asset: dataUriOrUrl, updatedAt: new Date().toISOString() });
        transaction.oncomplete = () => resolve({ success: true });
        transaction.onerror = (e: any) => {
          const err = e.target.error;
          if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            resolve({ success: false, error: 'Browser disk quota exceeded. Cannot save image asset.' });
          } else {
            resolve({ success: false, error: err?.message || 'Transaction failed' });
          }
        };
      } catch (err: any) {
        resolve({ success: false, error: err.message || 'Failed to initiate storage transaction' });
      }
    });
  }

  /**
   * Retrieve artwork image asset from IndexedDB
   */
  static async getArtworkImage(artworkId: string): Promise<string | null> {
    const db = await openDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_IMAGES], 'readonly');
        const store = transaction.objectStore(STORE_IMAGES);
        const req = store.get(artworkId);
        req.onsuccess = () => {
          resolve(req.result ? req.result.asset : null);
        };
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  /**
   * Delete artwork asset safely without corrupting other records
   */
  static async deleteArtworkImage(artworkId: string): Promise<boolean> {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
        store.delete(artworkId);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }

  /**
   * Export all stored assets as a map for full comprehensive backup archives
   */
  static async exportAllAssets(): Promise<Record<string, string>> {
    const db = await openDatabase();
    if (!db) return {};

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_IMAGES], 'readonly');
        const store = transaction.objectStore(STORE_IMAGES);
        const req = store.getAll();
        req.onsuccess = () => {
          const result: Record<string, string> = {};
          if (Array.isArray(req.result)) {
            req.result.forEach((item: any) => {
              if (item.id && item.asset) {
                result[item.id] = item.asset;
              }
            });
          }
          resolve(result);
        };
        req.onerror = () => resolve({});
      } catch {
        resolve({});
      }
    });
  }

  /**
   * Restore assets from backup archive into IndexedDB
   */
  static async restoreAssets(assets: Record<string, string>): Promise<number> {
    const db = await openDatabase();
    if (!db || !assets) return 0;

    const entries = Object.entries(assets);
    if (entries.length === 0) return 0;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
        let restoredCount = 0;

        entries.forEach(([id, asset]) => {
          store.put({ id, asset, updatedAt: new Date().toISOString() });
          restoredCount++;
        });

        transaction.oncomplete = () => resolve(restoredCount);
        transaction.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }
}
