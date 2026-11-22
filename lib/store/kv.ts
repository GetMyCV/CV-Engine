/**
 * A tiny IndexedDB key-value store (falls back to localStorage, then memory).
 * IndexedDB gives local workspaces hundreds of MB instead of localStorage's ~5 MB,
 * which matters once CVs carry photos and version history.
 */
const DB = 'cv-engine';
const STORE = 'kv';
const memory = new Map<string, unknown>();

let dbPromise: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const d = await db();
  if (d) {
    return new Promise((resolve) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    });
  }
  try {
    const raw = localStorage.getItem(`${DB}:${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return memory.get(key) as T | undefined;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const d = await db();
  if (d) {
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not save'));
    });
  }
  try {
    localStorage.setItem(`${DB}:${key}`, JSON.stringify(value));
  } catch {
    memory.set(key, value);
  }
}

export async function kvDel(key: string): Promise<void> {
  const d = await db();
  if (d) {
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
  try {
    localStorage.removeItem(`${DB}:${key}`);
  } catch {
    memory.delete(key);
  }
}
