import {
  createStore,
  del,
  delMany,
  get,
  getMany,
  keys,
  setMany,
} from "idb-keyval"

let dbInitPromise: Promise<void> | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stores: Record<string, any> = {}

const isClient = typeof window !== "undefined"
const DB_NAME = "ragcoon-db"
const DB_VERSION = 2

let storesReady = false
let storesReadyResolve: () => void = () => {}
const storesReadyPromise = new Promise<void>((resolve) => {
  storesReadyResolve = resolve
})

function initDatabase() {
  if (!isClient) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("chats")) db.createObjectStore("chats")
      if (!db.objectStoreNames.contains("messages"))
        db.createObjectStore("messages")
      if (!db.objectStoreNames.contains("sync")) db.createObjectStore("sync")
    }

    request.onsuccess = () => {
      request.result.close()
      resolve()
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

if (isClient) {
  const checkRequest = indexedDB.open(DB_NAME)

  checkRequest.onsuccess = () => {
    const db = checkRequest.result
    if (db.version > DB_VERSION) {
      db.close()
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
      deleteRequest.onsuccess = () => {
        initDatabaseAndStores()
      }
      deleteRequest.onerror = (event) => {
        console.error("Database deletion failed:", event)
        initDatabaseAndStores()
      }
    } else {
      db.close()
      initDatabaseAndStores()
    }
  }

  checkRequest.onerror = () => {
    initDatabaseAndStores()
  }
}

function initDatabaseAndStores(): void {
  // DISABLED: Skip database initialization to reduce memory usage
  storesReady = true
  storesReadyResolve()
}

export async function ensureDbReady() {
  if (!isClient) {
    console.warn("ensureDbReady: not client")
    return
  }
  if (dbInitPromise) await dbInitPromise
  if (!storesReady) await storesReadyPromise
}

export async function readFromIndexedDB<T>(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<T | T[]> {
  // DISABLED: Chat storage temporarily disabled to reduce memory usage
  return key ? (null as T) : []
}

export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  // DISABLED: Chat storage temporarily disabled to reduce memory usage
  console.log("Chat storage disabled")
  return
}

export async function deleteFromIndexedDB(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<void> {
  // DISABLED: Chat storage temporarily disabled to reduce memory usage
  return
}

export async function clearAllIndexedDBStores() {
  // DISABLED: Chat storage temporarily disabled to reduce memory usage
  return
}
