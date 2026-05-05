import { TABLES } from '../database/schema.js';
import { supabase } from './supabase.js';

// --- Internal State ---

export const getAuthToken = () => {
  return localStorage.getItem('school_admin_token');
};

/**
 * Unified LocalStorage interface for the application.
 */
export const localStore = {
  get: (key, defaultValue) => {
    const item = localStorage.getItem(`school_admin_${key}`);
    try {
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
      console.error(`LocalStore set error for ${key}:`, err);
    }
  },

  isDirty: (key) => {
    return !!localStorage.getItem(`school_admin_${key}_dirty`);
  },
  
  setDirty: (key, dirty) => {
    if (dirty) {
      localStorage.setItem(`school_admin_${key}_dirty`, 'true');
    } else {
      localStorage.removeItem(`school_admin_${key}_dirty`);
    }
  }
};

// --- CRUD Operations (Syncing with Supabase) ---

export async function fetchCollection(table, mapper) {
  try {
    // 1. Try to fetch from Supabase first if online and client exists
    if (navigator.onLine && supabase) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (!error && data) {
          localStore.set(table, data);
          
          if (mapper && typeof mapper === 'function') {
            return data.map(item => {
              try {
                // Handle both object mappers and function mappers
                return mapper.fromDb ? mapper.fromDb(item) : mapper(item);
              } catch (e) {
                return item;
              }
            });
          }
          return data;
        }
      } catch (supaErr) {
        console.warn('Supabase request failed, using local fallback.');
      }
    }

    // 2. Fallback to local storage
    const local = localStore.get(table, []);
    if (!Array.isArray(local)) return [];

    if (mapper && typeof mapper === 'function') {
      return local
        .filter(item => item !== null && typeof item === 'object')
        .map(item => {
          try {
            return mapper.fromDb ? mapper.fromDb(item) : mapper(item);
          } catch (e) {
            return item;
          }
        });
    }
    return local;
  } catch (err) {
    console.error(`fetchCollection critical failure for ${table}:`, err);
    return [];
  }
}

export async function pushCollection(table, items, mapper) {
  if (!Array.isArray(items)) return;
  localStore.set(table, items);
  localStore.setDirty(table, true);
}

export async function deleteRecord(table, id) {
  try {
    if (navigator.onLine && supabase) {
      await supabase.from(table).delete().eq('id', id).catch(() => {});
    }

    const currentLocal = localStore.get(table, []);
    if (Array.isArray(currentLocal)) {
      localStore.set(
        table,
        currentLocal.filter((item) => item && item.id !== id)
      );
    }
  } catch (err) {
    console.error(`deleteRecord failed for ${table}:`, err);
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
