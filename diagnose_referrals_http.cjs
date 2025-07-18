const https = require('https');

async function httpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function diagnoseReferrals() {
  console.log('=== ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ===');
  
  try {
    // 1. Проверим последние 5 пользователей через API
    const response = await httpRequest('https://127.0.0.1:3000/api/v2/referral/184/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.JWT_TOKEN || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Ответ от API:', response);
    
  } catch (error) {
    console.error('Ошибка при запросе к API:', error);
    
    // Альтернативный способ через прямой SQL запрос
    console.log('\n=== ПРЯМАЯ ПРОВЕРКА БАЗЫ ДАННЫХ ===');
    console.log('Нужно проверить данные через Supabase Dashboard:');
    console.log('1. Последние 5 пользователей в таблице users');
    console.log('2. Записи в таблице referrals');
    console.log('3. Пользователи с referred_by != null');
    console.log('4. Данные User 184 (основной реферер)');
    console.log('5. Всех кто ссылается на User 184');
    
    console.log('\nSQL запросы для выполнения:');
    console.log('-- Последние 5 пользователей');
    console.log('SELECT id, telegram_id, username, referred_by, created_at FROM users ORDER BY created_at DESC LIMIT 5;');
    
    console.log('\n-- Записи в referrals');
    console.log('SELECT * FROM referrals ORDER BY created_at DESC LIMIT 10;');
    
    console.log('\n-- Пользователи с рефералами');
    console.log('SELECT id, telegram_id, username, referred_by, created_at FROM users WHERE referred_by IS NOT NULL ORDER BY created_at DESC LIMIT 10;');
    
    console.log('\n-- Данные User 184');
    console.log('SELECT id, telegram_id, username, ref_code, referred_by, created_at FROM users WHERE id = 184;');
    
    console.log('\n-- Рефералы User 184');
    console.log('SELECT id, telegram_id, username, referred_by, created_at FROM users WHERE referred_by = 184 ORDER BY created_at DESC;');
  }
  
  process.exit(0);
}

diagnoseReferrals().catch(console.error);