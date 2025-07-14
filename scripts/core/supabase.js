"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_KEY;
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
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
