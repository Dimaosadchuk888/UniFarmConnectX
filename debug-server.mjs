/**
 * Проверка логов сервера во время покупки
 */

import { createClient } from '@supabase/supabase-js';

async function debugServer() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ДИАГНОСТИКА СЕРВЕРА ===');
  console.log('Запрос на покупку...');
  
  try {
    const response = await fetch('http://localhost:3000/api/v2/boost/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTAzNzgsImV4cCI6MTc1MjIxNTE3OH0.v95q1-qqaPthRflbCtJqTAQEpvAgpDwmWzWyFbPQuoM'
      },
      body: JSON.stringify({
        user_id: '48',
        boost_id: '1',
        payment_method: 'wallet'
      })
    });
    
    const result = await response.json();
    console.log('Ответ:', result);
    
  } catch (error) {
    console.error('Ошибка запроса:', error);
  }
  
  console.log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
}

debugServer();