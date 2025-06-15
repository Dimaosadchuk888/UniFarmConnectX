/**
 * Supabase Configuration for UniFarm
 * All database operations now use Supabase API exclusively
 */

export const supabaseConfig = {
  url: process.env.SUPABASE_URL || '',
  key: process.env.SUPABASE_KEY || '',
  
  // API configuration
  schema: 'public',
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true
};