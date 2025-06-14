// Export Supabase client as main database connection
export { supabase as db } from './supabaseClient'
export { supabase } from './supabaseClient'

// Re-export schema for compatibility
export * from '../shared/schema'