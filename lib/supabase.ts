import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://imadxsqrlzovdfjwfbov.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYWR4c3FybHpvdmRmandmYm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzUzMTEsImV4cCI6MjA5MzI1MTMxMX0.x9AYIsqA5HewwP341BzhQG6M2e49P1yB69nzqb-A5ME';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
