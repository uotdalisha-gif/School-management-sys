import { TABLES } from '../database/schema.js';
import { supabase } from './supabase.js';

// --- Internal State ---

export const getAuthToken = () => {
  try {
    return localStorage.getItem('school_admin_token');
  } catch (e) {
    return null;
  }
};

/**
 * Unified LocalStorage interface for the application.
 */
export const localStore = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(`school_admin_${key}`);
      if (!item) return defaultValue;
      const parsed = JSON.parse(item);
      return parsed ?? defaultValue;
    } catch (err) {
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(`school_admin_${key}`, JSON.stringify(value));
    } catch (err) {
      // Ignore quota errors or other storage issues
    }
  },

  isDirty: (key) => {
    try {
      return !!localStorage.getItem(`school_admin_${key}_dirty`);
    } catch (e) {
      return false;
    }
  },
  
  setDirty: (key, dirty) => {
    try {
      if (dirty) {
        localStorage.setItem(`school_admin_${key}_dirty`, 'true');
      } else {
        localStorage.removeItem(`school_admin_${key}_dirty`);
      }
    } catch (e) {}
  }
};

// --- Config Helpers ---

export const pushConfig = async (key, value) => {
  localStore.set(key, value);
};

// --- CRUD Operations (Syncing with Supabase) ---

export async function fetchCollection(table, mapper) {
  console.log(`🔍 Fetching collection: ${table}`);
  
  // 1. Get local data first
  const localData = localStore.get(table, []);
  const isDirty = localStore.isDirty(table);

  const mapItem = (item) => {
    if (!mapper) return item;
    try {
      if (typeof mapper === 'function') {
        return mapper.fromDb ? mapper.fromDb(item) : mapper(item);
      }
      return mapper.fromDb ? mapper.fromDb(item) : item;
    } catch (e) {
      return item;
    }
  };

  // 2. If local data is dirty, we MUST NOT overwrite it with DB data
  // and we should return the local data to the UI to maintain consistency.
  if (isDirty) {
    console.log(`⚠️ Table ${table} is dirty. Prioritizing local data.`);
    return localData.map(mapItem);
  }
  
  // 3. If not dirty, background fetch from Supabase if possible
  if (navigator.onLine && supabase) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (!error && data) {
        console.log(`✅ Fetched ${data.length} items for ${table} from Supabase`);
        localStore.set(table, data);
        return data.map(mapItem);
      }
    } catch (supaErr) {
      console.warn(`Supabase fetch failed for ${table}:`, supaErr);
    }
  }

  // 4. Return local data if online fetch failed or we are offline
  return localData.map(mapItem);
}

export async function pushCollection(table, items, mapper) {
  if (!Array.isArray(items)) return;
  localStore.set(table, items);
  localStore.setDirty(table, true);
}

export async function deleteRecord(table, id) {
  // 1. Delete from local storage first
  const currentLocal = localStore.get(table, []);
  localStore.set(
    table,
    currentLocal.filter((item) => item && item.id !== id)
  );
  localStore.setDirty(table, true);

  // 2. Delete from Supabase
  if (navigator.onLine && supabase) {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        console.error(`❌ Supabase DELETE failed for ${table}/${id}:`, error.message);
      } else {
        console.log(`✅ Deleted ${id} from ${table} in Supabase`);
      }
    } catch (err) {
      console.error(`❌ Supabase DELETE exception for ${table}/${id}:`, err);
    }
  }
}

export function clearLocalCache() {
  const tables = Object.values(TABLES);
  tables.forEach((t) => {
    localStorage.removeItem(`school_admin_${t}`);
    localStorage.removeItem(`school_admin_${t}_dirty`);
  });
  window.location.reload();
}
