"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.SUPABASE_URL || 'https://wunnsvicbebssrjqedor.supabase.co';
var supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseKey) {
    throw new Error('SUPABASE_KEY environment variable is required');
}
if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Тестовая проверка подключения (только в режиме разработки)
if (process.env.NODE_ENV === 'development') {
    exports.supabase.from('users').select('*').limit(1)
        .then(function (_a) {
        var data = _a.data, error = _a.error;
        if (!error) {
            console.info("Supabase connection OK");
        }
        else {
            console.warn("Supabase connection test failed:", error.message);
        }
    })
        .catch(function () {
        console.warn("Supabase connection test error");
    });
}
else {
    console.log('Supabase client initialized for UniFarm at:', supabaseUrl);
}
