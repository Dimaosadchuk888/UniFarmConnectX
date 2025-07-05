/**
 * Supabase Configuration for UniFarm
 * All database operations now use Supabase API exclusively
 */

// Проверка обязательных переменных окружения
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is not set');
}
if (!process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY environment variable is not set');
}

export const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_KEY,
  
  // API configuration
  schema: 'public',
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true
};