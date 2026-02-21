
import { HistoryLog, DashboardStats, VoiceProfile, LectureScript } from '../types';

const DB_NAME = 'SQTT_DB';
const DB_VERSION = 3; // Upgrade for Scripts store
const STORE_LOGS = 'logs';
const STORE_VOICES = 'voices';
const STORE_SCRIPTS = 'scripts';

// --- INDEXED DB HELPERS ---
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error("Database error:", request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VOICES)) {
        db.createObjectStore(STORE_VOICES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SCRIPTS)) {
        db.createObjectStore(STORE_SCRIPTS, { keyPath: 'id' });
      }
    };
  });
};

const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbPut = async (storeName: string, value: any): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const dbDelete = async (storeName: string, key: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// --- LOGS ---
export const saveLog = async (log: Omit<HistoryLog, 'id' | 'timestamp'>): Promise<HistoryLog> => {
  const newLog: HistoryLog = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    rawText: log.rawText,
    duration: log.duration,
    mode: log.mode,
    configSummary: log.configSummary,
    audioBlob: log.audioBlob
  };

  await dbPut(STORE_LOGS, newLog);
  return newLog;
};

export const getLogs = async (): Promise<HistoryLog[]> => {
  try {
    const logs = await dbGetAll<HistoryLog>(STORE_LOGS);
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to get logs", error);
    return [];
  }
};

export const deleteLog = async (id: string): Promise<void> => {
  await dbDelete(STORE_LOGS, id);
};

// --- VOICES ---
export const saveVoiceProfile = async (profile: Omit<VoiceProfile, 'id' | 'createdAt' | 'sampleBase64'> & { rawSampleBase64: string }): Promise<VoiceProfile> => {
  const newProfile: VoiceProfile = {
    id: `voice_${Date.now()}`,
    createdAt: Date.now(),
    name: profile.name,
    status: profile.status,
    source: profile.source,
    onlineVoiceId: profile.onlineVoiceId,
    sampleBase64: profile.rawSampleBase64
  };

  await dbPut(STORE_VOICES, newProfile);
  return newProfile;
};

export const getVoices = async (): Promise<VoiceProfile[]> => {
  try {
    const voices = await dbGetAll<VoiceProfile>(STORE_VOICES);
    return voices.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to get voices", error);
    return [];
  }
};

export const deleteVoiceProfile = async (id: string): Promise<void> => {
  await dbDelete(STORE_VOICES, id);
};

// --- SCRIPTS (Lecture Library) ---
export const saveScript = async (script: Omit<LectureScript, 'id' | 'lastModified'> & { id?: string }): Promise<LectureScript> => {
  const newScript: LectureScript = {
    id: script.id || `script_${Date.now()}`,
    lastModified: Date.now(),
    title: script.title,
    content: script.content,
    category: script.category,
    tags: script.tags || []
  };
  await dbPut(STORE_SCRIPTS, newScript);
  return newScript;
};

export const getScripts = async (): Promise<LectureScript[]> => {
  try {
    const scripts = await dbGetAll<LectureScript>(STORE_SCRIPTS);
    return scripts.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error("Failed to get scripts", error);
    return [];
  }
};

export const deleteScript = async (id: string): Promise<void> => {
  await dbDelete(STORE_SCRIPTS, id);
};

// --- STATS ---
export const getStats = async (): Promise<DashboardStats> => {
  try {
    const logs = await dbGetAll<HistoryLog>(STORE_LOGS);
    const voices = await dbGetAll<VoiceProfile>(STORE_VOICES);
    const scripts = await dbGetAll<LectureScript>(STORE_SCRIPTS);
    
    const totalDuration = logs.reduce((acc, log) => acc + log.duration, 0);
    const totalChars = Math.floor(totalDuration * 15); 
    
    let sizeBytes = 0;
    logs.forEach(l => sizeBytes += new Blob([l.rawText, l.audioBlob || '']).size);
    voices.forEach(v => sizeBytes += new Blob([v.sampleBase64]).size);
    scripts.forEach(s => sizeBytes += new Blob([s.content]).size);
    
    const storageUsed = (sizeBytes / 1024 / 1024).toFixed(2) + ' MB';

    return {
      totalChars,
      totalDuration: parseFloat(totalDuration.toFixed(2)),
      storageUsed
    };
  } catch {
    return {
      totalChars: 0,
      totalDuration: 0,
      storageUsed: '0 MB'
    };
  }
};
