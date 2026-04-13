const DB_NAME = 'company-based-cv-editor-v1';
const STORE_NAME = 'uploads';
const RECORD_KEY = 'lastPdf';

export type CachedCvLanguage = 'turkish' | 'english';

type CachedPayload = {
  name: string;
  type: string;
  lastModified: number;
  buffer: ArrayBuffer;
  cvLanguage: CachedCvLanguage;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function saveCachedCompanyCvPdf(file: File, cvLanguage: CachedCvLanguage): Promise<void> {
  const buffer = await file.arrayBuffer();
  const payload: CachedPayload = {
    name: file.name || 'cv.pdf',
    type: file.type || 'application/pdf',
    lastModified: file.lastModified || Date.now(),
    buffer,
    cvLanguage
  };

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB write failed'));
    };
    tx.objectStore(STORE_NAME).put(payload, RECORD_KEY);
  });
}

export async function loadCachedCompanyCvPdf(): Promise<{ file: File; cvLanguage: CachedCvLanguage } | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        const raw = req.result as CachedPayload | undefined;
        if (!raw?.buffer) {
          resolve(null);
          return;
        }
        const file = new File([raw.buffer], raw.name, {
          type: raw.type,
          lastModified: raw.lastModified
        });
        resolve({
          file,
          cvLanguage: raw.cvLanguage === 'english' ? 'english' : 'turkish'
        });
      };
      req.onerror = () => {
        db.close();
        reject(req.error ?? new Error('IndexedDB read failed'));
      };
    });
  } catch {
    return null;
  }
}

export async function clearCachedCompanyCvPdf(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB delete failed'));
      };
      tx.objectStore(STORE_NAME).delete(RECORD_KEY);
    });
  } catch {
    // ignore
  }
}
