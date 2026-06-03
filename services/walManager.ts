import { openDB, IDBPDatabase } from 'idb';

export interface WALEvent {
  eventId: string;
  timestamp: number;
  sessionId: string;
  action: string;
  payload: any;
  targetEtagBefore?: string;
  status: 'PENDING' | 'FLUSHED' | 'FAILED';
}

class WALManager {
  private dbName = 'Ouroboros_WAL_DB';
  private storeName = 'mutation_log';
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(this.dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore('mutation_log', { keyPath: 'eventId' });
        store.createIndex('status', 'status');
        store.createIndex('timestamp', 'timestamp');
      },
    });
  }

  async logEvent(action: string, payload: any, etag?: string): Promise<string> {
    const db = await this.dbPromise;
    const event: WALEvent = {
      eventId: crypto.randomUUID(),
      timestamp: Date.now(),
      sessionId: window.localStorage.getItem('ouroboros_current_session') || 'default',
      action,
      payload,
      targetEtagBefore: etag,
      status: 'PENDING'
    };

    await db.put(this.storeName, event);
    return event.eventId;
  }

  async commitEvent(eventId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const event = await store.get(eventId);
    if (event) {
      event.status = 'FLUSHED';
      await store.put(event);
    }
    await tx.done;
  }

  async getUnflushedEvents(): Promise<WALEvent[]> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.storeName, 'readonly');
    const index = tx.objectStore(this.storeName).index('status');
    const pendingEvents = await index.getAll('PENDING');
    
    return pendingEvents.sort((a, b) => a.timestamp - b.timestamp);
  }
}

export const walManager = new WALManager();
