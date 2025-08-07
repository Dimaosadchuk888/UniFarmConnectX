import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY

const validateSupabaseClientConfig = () => {
  if (!supabaseKey) {
    throw new Error('SUPABASE_KEY environment variable is required')
  }

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required')
  }
};

// Создаем клиент с заглушками для локальной разработки
const createSupabaseClient = () => {
  if (!supabaseKey) {
    console.warn('[SupabaseClient] Using mock client for local development');
    // Возвращаем mock клиент для локальной разработки
    return {
      from: () => ({
        select: () => ({ 
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          limit: () => Promise.resolve({ data: null, error: null })
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
      }
    };
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

export const supabase = createSupabaseClient();

// Тестовая проверка подключения (только в режиме разработки)
if (process.env.NODE_ENV === 'development' && supabaseKey) {
  (supabase.from('users').select('*').limit(1) as any)
    .then(({ data, error }: any) => {
      if (!error) {
        console.info("Supabase connection OK");
      } else {
        console.warn("Supabase connection test failed:", error.message);
      }
    })
    .catch(() => {
      console.warn("Supabase connection test error");
    });
} else {
  console.log('Supabase client initialized for UniFarm at:', supabaseUrl);
}

export { validateSupabaseClientConfig };