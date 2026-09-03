import { type AnalysisResult } from '@/lib/analyzeAudio'

export interface HistoryItem {
  id: string
  filename: string
  fileSize: number
  duration: number
  timestamp: number
  result: AnalysisResult
  audioBlob: Blob
}

const DB_NAME = 'verifyvoice_db'
const DB_VERSION = 1
const STORE_NAME = 'history'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
  })
}

export async function saveHistoryItem(
  file: File | Blob,
  filename: string,
  fileSize: number,
  result: AnalysisResult
): Promise<{ success: boolean; item?: HistoryItem; error?: string }> {
  try {
    // Check storage estimate if supported
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.quota && estimate.usage) {
          const available = estimate.quota - estimate.usage
          if (available < fileSize) {
            return {
              success: false,
              error: 'Unable to save this analysis to history because browser storage is full.',
            }
          }
        }
      } catch (e) {
        // Ignore estimate error and attempt transaction
      }
    }

    const db = await openDB()

    const item: HistoryItem = {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      filename: filename || 'recording.wav',
      fileSize: fileSize || file.size || 0,
      duration: result.duration || 18,
      timestamp: Date.now(),
      result,
      audioBlob: file, // Store the raw compressed Blob/File directly
    }

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(item)

      request.onsuccess = () => resolve({ success: true, item })
      request.onerror = (event) => {
        console.error('IndexedDB save error:', request.error)
        const err = request.error
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          err?.name === 'NS_ERROR_DOM_INDEXEDDB_QUOTA_ERR' ||
          (err?.message && err.message.toLowerCase().includes('quota'))

        resolve({
          success: false,
          error: isQuota
            ? 'Unable to save this analysis to history because browser storage is full.'
            : 'Failed to save analysis to browser history.',
        })
      }
    })
  } catch (err: any) {
    console.error('IndexedDB unexpected error:', err)
    return {
      success: false,
      error: 'Unable to save this analysis to history because browser storage is full.',
    }
  }
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev') // newest first

      const items: HistoryItem[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          items.push(cursor.value)
          cursor.continue()
        } else {
          resolve(items)
        }
      }

      request.onerror = () => {
        console.error('IndexedDB get error:', request.error)
        resolve([])
      }
    })
  } catch (err) {
    console.error('IndexedDB get error:', err)
    return []
  }
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  } catch (err) {
    console.error('IndexedDB delete error:', err)
    return false
  }
}

export async function clearAllHistory(): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve(true)
      request.onerror = () => resolve(false)
    })
  } catch (err) {
    console.error('IndexedDB clear error:', err)
    return false
  }
}
