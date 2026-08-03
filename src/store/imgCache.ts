// 图片本地缓存（IndexedDB）：以图片 URL 为 key，避免重复请求
// 用于扩展页来源截图/显式图片（ADR-0013）

const DB_NAME = 'quiz-quest-img-cache'
const STORE = 'images'
const MAX_ENTRIES = 80 // 缓存上限（条数），超出删除最旧

let dbPromise: Promise<IDBDatabase> | null = null

interface CacheItem {
  key: string
  blob: Blob
  ts: number
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

/** 按 key 读取缓存图片；无缓存或出错返回 null */
export async function getCachedImage(key: string): Promise<Blob | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve((req.result as CacheItem | undefined)?.blob ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/** 缓存图片；超出上限删除最旧条目（LRU 简化版） */
export async function cacheImage(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb()
    const all = await new Promise<CacheItem[]>((resolve) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve((req.result as CacheItem[]) ?? [])
      req.onerror = () => resolve([])
    })
    if (all.length >= MAX_ENTRIES) {
      const stale = all
        .filter((x) => x.key !== key)
        .sort((a, b) => a.ts - b.ts)
        .slice(0, all.length - MAX_ENTRIES + 1)
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        for (const item of stale) store.delete(item.key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    }
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ key, blob, ts: Date.now() } satisfies CacheItem)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // 缓存失败不影响图片显示
  }
}
