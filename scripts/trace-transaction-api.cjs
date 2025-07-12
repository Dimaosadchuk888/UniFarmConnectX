#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function traceAPI() {
  console.log('=== ТРАССИРОВКА API /api/v2/transactions ===\n');

  // 1. Имитируем запрос frontend с userId: 74
  console.log('1. FRONTEND отправляет запрос:');
  console.log('   URL: /api/v2/transactions?page=1&limit=20');
  console.log('   Headers: { Authorization: Bearer <JWT с user_id=74> }\n');
  
  // 2. Что делает backend согласно коду
  console.log('2. BACKEND обработка (modules/transactions/controller.ts):');
  console.log('   - Извлекает telegram.user.id из JWT');
  console.log('   - Вызывает getUserByTelegramId(telegram.user.id)');
  console.log('   - ВАЖНО: в JWT хранится user_id=74, НЕ telegram_id!\n');
  
  // 3. Проверяем реальный поиск
  console.log('3. ПОИСК В БД:');
  
  // Ищем по telegram_id = 74
  const { data: userByTelegramId } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .eq('telegram_id', 74)
    .single();
    
  console.log(`   getUserByTelegramId(74) находит:`);
  if (userByTelegramId) {
    console.log(`   User ID: ${userByTelegramId.id}`);
    console.log(`   Username: ${userByTelegramId.username}`);
    console.log(`   Telegram ID: ${userByTelegramId.telegram_id}\n`);
  }
  
  // 4. Проверяем транзакции найденного пользователя
  if (userByTelegramId) {
    const { data: txs, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userByTelegramId.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log(`4. ТРАНЗАКЦИИ пользователя ${userByTelegramId.id}:`);
    console.log(`   Всего транзакций: ${count}`);
    if (txs && txs.length > 0) {
      console.log('   Последние транзакции:');
      txs.forEach(tx => {
        console.log(`   - ${tx.type}: ${tx.amount_uni || tx.amount_ton} ${tx.currency}`);
      });
    }
  }
  
  // 5. JWT токен содержит
  console.log('\n5. СОДЕРЖИМОЕ JWT токена (client/src/main.tsx):');
  console.log('   payload.id = 74 (это user_id из БД)');
  console.log('   payload.telegram_id = 999489');
  console.log('   payload.username = test_user_1752129840905');
  
  console.log('\n6. ВЫВОД:');
  console.log('   ❌ ОШИБКА: API использует user_id из JWT как telegram_id');
  console.log('   ❌ Находит пользователя 77 вместо 74');
  console.log('   ❌ Возвращает транзакции пользователя 77');
}

traceAPI().catch(console.error);
