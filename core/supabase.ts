import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDU0NjE3MiwiZXhwIjoyMDQ2MTIyMTcyfQ.qe7iifh-kILRJoJT1Wvp6T7pBR1F7YRzLiHb9tREf7I';

console.log('[Supabase] Initializing client with:', {
  url: supabaseUrl ? 'SET' : 'NOT SET',
  key: supabaseKey ? 'SET' : 'NOT SET',
  urlValue: supabaseUrl
});

export const supabase = createClient(supabaseUrl, supabaseKey);