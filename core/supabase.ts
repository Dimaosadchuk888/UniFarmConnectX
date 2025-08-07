import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const validateSupabaseConfig = () => {
if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] CRITICAL: Missing required environment variables!');
  console.error('[Supabase] Please set SUPABASE_URL and SUPABASE_KEY in Replit Secrets');
  throw new Error('Missing required Supabase configuration. Please check Replit Secrets.');
}
};

console.log('[Supabase] Initializing client with:', {
  url: supabaseUrl ? 'SET' : 'NOT SET',
  key: supabaseKey ? 'SET' : 'NOT SET',
  urlValue: supabaseUrl
});

// Создаем клиент с реальными данными или заглушками для локальной разработки
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase] Using mock client for local development');
    // Возвращаем mock клиент для локальной разработки
    return {
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: null }),
            limit: () => Promise.resolve({ data: null, error: null }),
            order: () => Promise.resolve({ data: null, error: null }),
            gte: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }),
            gt: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }),
            in: () => ({ limit: () => Promise.resolve({ data: null, error: null }) })
          }),
          limit: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: null, error: null }),
          gte: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }),
          gt: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }),
          in: () => ({ limit: () => Promise.resolve({ data: null, error: null }) })
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ data: null, error: null })
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signUp: () => Promise.resolve({ data: null, error: null }),
        signIn: () => Promise.resolve({ data: null, error: null }),
        signOut: () => Promise.resolve({ error: null })
      },
      rpc: () => Promise.resolve({ data: null, error: null })
    };
  }
  
  console.log('[Supabase] Creating real client with URL:', supabaseUrl);
  return createClient(supabaseUrl, supabaseKey);
};

export const supabase = createSupabaseClient();
export { validateSupabaseConfig };