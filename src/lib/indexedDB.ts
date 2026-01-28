// IndexedDB wrapper for offline caching and action queue

const DB_NAME = 'splitsmart-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  EXPENSES: 'expenses',
  GROUPS: 'groups',
  BALANCES: 'balances',
  OFFLINE_QUEUE: 'offline_queue',
  USER_CACHE: 'user_cache',
} as const;

export interface OfflineAction {
  id: string;
  type: 'CREATE_EXPENSE' | 'DELETE_EXPENSE' | 'UPDATE_EXPENSE' | 'RECORD_PAYMENT';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!database.objectStoreNames.contains(STORES.EXPENSES)) {
        database.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.GROUPS)) {
        database.createObjectStore(STORES.GROUPS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.BALANCES)) {
        database.createObjectStore(STORES.BALANCES, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = database.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!database.objectStoreNames.contains(STORES.USER_CACHE)) {
        database.createObjectStore(STORES.USER_CACHE, { keyPath: 'key' });
      }
    };
  });
}

// Generic CRUD operations
export async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function setItem<T>(storeName: string, item: T): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteItem(storeName: string, key: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Offline queue specific operations
export async function addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
  const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const queueItem: OfflineAction = {
    ...action,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await setItem(STORES.OFFLINE_QUEUE, queueItem);
  return id;
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  const items = await getAllItems<OfflineAction>(STORES.OFFLINE_QUEUE);
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  await deleteItem(STORES.OFFLINE_QUEUE, id);
}

export async function updateQueueItemRetry(id: string): Promise<void> {
  const item = await getItem<OfflineAction>(STORES.OFFLINE_QUEUE, id);
  if (item) {
    await setItem(STORES.OFFLINE_QUEUE, { ...item, retryCount: item.retryCount + 1 });
  }
}

// Cache management
export async function cacheData<T>(key: string, data: T, expiresInMinutes = 30): Promise<void> {
  await setItem(STORES.USER_CACHE, {
    key,
    data,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const cached = await getItem<{ key: string; data: T; expiresAt: string }>(STORES.USER_CACHE, key);
  if (!cached) return null;
  
  if (new Date(cached.expiresAt) < new Date()) {
    await deleteItem(STORES.USER_CACHE, key);
    return null;
  }
  
  return cached.data;
}

// Bulk cache operations for expenses and groups
export async function cacheExpenses(groupId: string, expenses: unknown[]): Promise<void> {
  for (const expense of expenses) {
    await setItem(STORES.EXPENSES, expense);
  }
  await cacheData(`expenses_${groupId}`, expenses, 60);
}

export async function getCachedExpenses(groupId: string): Promise<unknown[] | null> {
  return getCachedData(`expenses_${groupId}`);
}

export async function cacheGroups(groups: unknown[]): Promise<void> {
  for (const group of groups) {
    await setItem(STORES.GROUPS, group);
  }
  await cacheData('user_groups', groups, 60);
}

export async function getCachedGroups(): Promise<unknown[] | null> {
  return getCachedData('user_groups');
}
