import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://waiivelgakenhioyombg.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhaWl2ZWxnYWtlbmhpb3lvbWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDcyOTksImV4cCI6MjEwMDkyMzI5OX0.es6sPoIXBrJX6CqF9zHhxv9MWtcDKhU8p9-RATb7ytA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
