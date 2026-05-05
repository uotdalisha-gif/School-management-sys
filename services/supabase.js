
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized');
  } catch (err) {
    console.error('❌ Failed to create Supabase client:', err);
  }
} else {
  console.warn('⚠️ Supabase URL or Anon Key is missing in .env');
}

export const supabase = supabaseClient;
