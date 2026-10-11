// =============================================================================
// SalesIQ High-Capacity Client-Side Storage & IndexedDB Cache Engine
// Enables multi-megabyte structured caching across page navigations with 0ms render
// =============================================================================

const DB_NAME = "salesiq_cache_db_v2";
const STORE_NAME = "collections_cache";
const DB_VERSION = 1;

let _dbPromise = null;
const _memoryFallback = new Map();

/**
 * Returns a promise resolving to an open IDBDatabase instance.
 * Gracefully resolves to null if IndexedDB is unavailable or restricted.
 */
export function getIDB() {
  if (_dbPromise) return _dbPromise;

  if (typeof window === "undefined" || !("indexedDB" in window)) {
    _dbPromise = Promise.resolve(null);
    return _dbPromise;
  }

  _dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = (err) => {
        console.warn("[SalesIQ IDB] Failed to open IndexedDB:", err);
        resolve(null);
      };
      req.onblocked = () => {
        console.warn("[SalesIQ IDB] Database upgrade blocked");
        resolve(null);
      };
    } catch (err) {
      console.warn("[SalesIQ IDB] IndexedDB not accessible:", err);
      resolve(null);
    }
  });

  return _dbPromise;
}

/**
 * Retrieve cached collection entry from IndexedDB.
 * Returns { data, timestamp, stale } or null.
 */
export async function idbGet(key) {
  try {
    const db = await getIDB();
    if (!db) return _memoryFallback.get(key) || null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result;
          if (res && res.data) {
            resolve({
              data: res.data,
              timestamp: res.timestamp || 0,
              stale: Boolean(res.stale),
            });
          } else {
            resolve(null);
          }
        };

        req.onerror = () => resolve(_memoryFallback.get(key) || null);
      } catch (_) {
        resolve(_memoryFallback.get(key) || null);
      }
    });
  } catch (_) {
    return _memoryFallback.get(key) || null;
  }
}

/**
 * Store collection entry into IndexedDB with high storage quota.
 */
export async function idbSet(key, data) {
  const entry = {
    key,
    data,
    timestamp: Date.now(),
    stale: false,
  };

  // Always keep in memory fallback
  _memoryFallback.set(key, entry);

  try {
    const db = await getIDB();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(entry);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  } catch (_) {
    return false;
  }
}

/**
 * Mark a cached collection as stale so it can be revalidated in the background.
 */
export async function idbMarkStale(predicate) {
  for (const [k, v] of _memoryFallback.entries()) {
    if (!predicate || predicate(k)) {
      v.stale = true;
      v.timestamp = 0;
    }
  }

  try {
    const db = await getIDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (!predicate || predicate(cursor.key)) {
          const updated = cursor.value;
          updated.stale = true;
          updated.timestamp = 0;
          cursor.update(updated);
        }
        cursor.continue();
      }
    };
  } catch (_) {}
}

/**
 * Remove an entry from IndexedDB.
 */
export async function idbDelete(key) {
  _memoryFallback.delete(key);
  try {
    const db = await getIDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
  } catch (_) {}
}

/**
 * Clear all cached collections in IndexedDB.
 */
export async function idbClear() {
  _memoryFallback.clear();
  try {
    const db = await getIDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch (_) {}
}

