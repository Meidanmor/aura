/**
 * Minimal IndexedDB key/value store for the native app's offline copies
 * (src/boot/native-api.js). Two stores, both keyed by the root-relative
 * path the app requests:
 *
 *   json   '/config/home.json' -> { body: '<raw JSON text>', time }
 *   media  '/sections/12-a.png' -> { blob, type, size, time }
 *
 * IndexedDB lives in the app's private storage, survives restarts, and is
 * only cleared when the user clears the app's data / uninstalls it.
 * Every function resolves to a safe fallback (null / []) instead of
 * throwing, so a storage problem never breaks loading content.
 */
const DB_NAME = 'qwoo-offline'
const DB_VERSION = 1
export const JSON_STORE = 'json'
export const MEDIA_STORE = 'media'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(JSON_STORE)) db.createObjectStore(JSON_STORE)
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

function run(storeName, mode, fn) {
  return openDb().then((db) => new Promise((resolve) => {
    if (!db) return resolve(null)
    try {
      const tx = db.transaction(storeName, mode)
      const result = fn(tx.objectStore(storeName))
      tx.oncomplete = () => resolve(result && 'result' in result ? result.result : true)
      tx.onerror = () => resolve(null)
      tx.onabort = () => resolve(null)
    } catch {
      resolve(null)
    }
  }))
}

export const idbGet = (store, key) => run(store, 'readonly', (s) => s.get(key))
export const idbPut = (store, key, value) => run(store, 'readwrite', (s) => s.put(value, key))
export const idbDelete = (store, key) => run(store, 'readwrite', (s) => s.delete(key))

/** All [key, value] pairs of a store. */
export function idbEntries(store) {
  return openDb().then((db) => new Promise((resolve) => {
    if (!db) return resolve([])
    const out = []
    try {
      const req = db.transaction(store, 'readonly').objectStore(store).openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) return resolve(out)
        out.push([cursor.key, cursor.value])
        cursor.continue()
      }
      req.onerror = () => resolve(out)
    } catch {
      resolve(out)
    }
  }))
}
