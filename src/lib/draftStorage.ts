const DB_NAME = 'mia_studio_db_v1';
const DB_VERSION = 1;
const STORE_VIDEO_DRAFT = 'video_drafts';
const STORE_IMAGE_HISTORY = 'image_history';
const STORE_DOWNLOAD_HISTORY = 'download_history';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_VIDEO_DRAFT)) {
        db.createObjectStore(STORE_VIDEO_DRAFT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGE_HISTORY)) {
        db.createObjectStore(STORE_IMAGE_HISTORY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DOWNLOAD_HISTORY)) {
        db.createObjectStore(STORE_DOWNLOAD_HISTORY, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface VideoDraftRecord {
  id: string;
  title: string;
  updatedAt: number;
  sceneCount: number;
  aspectRatio: string;
  resolution: number;
  transition: string;
  motion: string;
  overlay: string;
  bgmId: string;
  bgmVolume: number;
  scenes: Array<{
    id: string;
    name: string;
    kind: 'image' | 'video';
    blob?: Blob;
    duration: number;
    caption: string;
    transition?: string;
    motion?: string;
    overlay?: string;
    extraOverlays?: string[];
  }>;
}

export async function saveVideoDraft(draft: VideoDraftRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEO_DRAFT, 'readwrite');
      tx.objectStore(STORE_VIDEO_DRAFT).put({ ...draft, id: 'current_draft', updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveVideoDraft error:', err);
  }
}

export async function loadVideoDraft(): Promise<VideoDraftRecord | null> {
  try {
    const db = await openDB();
    return await new Promise<VideoDraftRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEO_DRAFT, 'readonly');
      const req = tx.objectStore(STORE_VIDEO_DRAFT).get('current_draft');
      req.onsuccess = () => {
        const res = req.result as VideoDraftRecord | undefined;
        if (!res) return resolve(null);
        if (Date.now() - res.updatedAt > SEVEN_DAYS_MS) {
          clearVideoDraft();
          return resolve(null);
        }
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearVideoDraft(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VIDEO_DRAFT, 'readwrite');
      tx.objectStore(STORE_VIDEO_DRAFT).delete('current_draft');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export interface DownloadHistoryItem {
  id: string;
  filename: string;
  createdAt: number;
  durationSec: number;
  sizeBytes: number;
  blob: Blob;
}

export async function addDownloadHistory(item: DownloadHistoryItem): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DOWNLOAD_HISTORY, 'readwrite');
      tx.objectStore(STORE_DOWNLOAD_HISTORY).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('addDownloadHistory failed:', e);
  }
}

export async function getDownloadHistory(): Promise<DownloadHistoryItem[]> {
  try {
    const db = await openDB();
    return await new Promise<DownloadHistoryItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_DOWNLOAD_HISTORY, 'readonly');
      const req = tx.objectStore(STORE_DOWNLOAD_HISTORY).getAll();
      req.onsuccess = () => {
        const list = (req.result as DownloadHistoryItem[]) || [];
        resolve(list.sort((a, b) => b.createdAt - a.createdAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteDownloadHistoryItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DOWNLOAD_HISTORY, 'readwrite');
      tx.objectStore(STORE_DOWNLOAD_HISTORY).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
