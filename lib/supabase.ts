import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://imadxsqrlzovdfjwfbov.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWR4c3FybHpvdmRmandmYm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzUzMTEsImV4cCI6MjA5MzI1MTMxMX0.x9AYIsqA5HewwP341BzhQG6M2e49P1yB69nzqb-A5ME';

const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
      setItem: (key: string, value: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key: string) => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); return Promise.resolve(); },
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
