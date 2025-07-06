import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] CRITICAL: Missing required environment variables!');
  console.error('[Supabase] Please set SUPABASE_URL and SUPABASE_KEY in Replit Secrets');
  throw new Error('Missing required Supabase configuration. Please check Replit Secrets.');
}

console.log('[Supabase] Initializing client with:', {
  url: supabaseUrl ? 'SET' : 'NOT SET',
  key: supabaseKey ? 'SET' : 'NOT SET',
  urlValue: supabaseUrl
});

export const supabase = createClient(supabaseUrl, supabaseKey);