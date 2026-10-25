/**
 * IndexedDB High-Capacity Storage Service
 * Provides multi-megabyte / gigabyte local asset persistence for high-resolution
 * artwork imagery, catalog dossiers, and high-fidelity tear-sheet blobs.
 * Solves browser localStorage 5MB quota constraints.
 */

const DB_NAME = 'morrowkind_assets_db';
const DB_VERSION = 1;
const STORE_IMAGES = 'artwork_images';

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

export class IndexedDbService {
  /**
   * Store high-resolution artwork image asset in IndexedDB
   */
  static async saveArtworkImage(artworkId: string, dataUriOrUrl: string): Promise<boolean> {
    const db = await openDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(STORE_IMAGES);
        store.put({ id: artworkId, asset: dataUriOrUrl, updatedAt: new Date().toISOString() });
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
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
   * Delete artwork asset
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
}
