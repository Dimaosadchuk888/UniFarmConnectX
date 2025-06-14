import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseKey) {
  throw new Error('SUPABASE_KEY environment variable is required')
}

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Тестовая проверка подключения (только в режиме разработки)
if (process.env.NODE_ENV === 'development') {
  supabase.from('users').select('*').limit(1)
    .then(({ data, error }) => {
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