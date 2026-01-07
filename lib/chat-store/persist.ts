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
  dbInitPromise = initDatabase().then(() => {
    stores.chats = createStore(DB_NAME, "chats")
    stores.messages = createStore(DB_NAME, "messages")
    stores.sync = createStore(DB_NAME, "sync")
    storesReady = true
    storesReadyResolve()
  })
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
): Promise<T | T[] | null> {
  if (!isClient) return key ? null : []
  await ensureDbReady()
  if (!stores[table]) return key ? null : []

  if (key) {
    return (await get(key, stores[table])) || null
  } else {
    const allKeys = await keys(stores[table])
    const values = await getMany(allKeys, stores[table])
    return values.filter((v) => v !== undefined)
  }
}

export async function writeToIndexedDB<T extends { id: string | number }>(
  table: "chats" | "messages" | "sync",
  data: T | T[]
): Promise<void> {
  if (!isClient) return
  await ensureDbReady()
  if (!stores[table]) return

  const items = Array.isArray(data) ? data : [data]
  const entries = items.map((item) => [item.id.toString(), item] as [string, T])
  await setMany(entries, stores[table])
}

export async function deleteFromIndexedDB(
  table: "chats" | "messages" | "sync",
  key?: string
): Promise<void> {
  if (!isClient) return
  await ensureDbReady()
  if (!stores[table]) return

  if (key) {
    await del(key, stores[table])
  } else {
    const allKeys = await keys(stores[table])
    if (allKeys.length > 0) {
      await delMany(allKeys, stores[table])
    }
  }
}

export async function clearAllIndexedDBStores() {
  if (!isClient) return
  await ensureDbReady()

  const tables: Array<"chats" | "messages" | "sync"> = ["chats", "messages", "sync"]
  for (const table of tables) {
    if (stores[table]) {
      const allKeys = await keys(stores[table])
      if (allKeys.length > 0) {
        await delMany(allKeys, stores[table])
      }
    }
  }
}
