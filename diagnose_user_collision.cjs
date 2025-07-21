#!/usr/bin/env node

// Диагностика проблемы collision пользователей User 25 и User 227
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseUserCollision() {
  console.log('🔍 ДИАГНОСТИКА COLLISION ПОЛЬЗОВАТЕЛЕЙ User 25 и User 227\n');
  
  try {
    // 1. Проверяем User 25 и User 227
    console.log('1️⃣ ПРОВЕРКА ОСНОВНЫХ ПОЛЬЗОВАТЕЛЕЙ:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, balance_uni, balance_ton')
      .in('id', [25, 227])
      .order('id');
      
    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError.message);
      return;
    }
    
    users.forEach(user => {
      console.log(`User ${user.id}:`, {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        balance_ton: user.balance_ton
      });
    });
    
    // 2. Поиск всех пользователей с username "DimaOsadchuk"
    console.log('\n2️⃣ ПОИСК ПОЛЬЗОВАТЕЛЕЙ С USERNAME "DimaOsadchuk":');
    const { data: duplicateUsers, error: duplicateError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, balance_ton, created_at')
      .eq('username', 'DimaOsadchuk')
      .order('id');
      
    if (duplicateError) {
      console.error('❌ Ошибка поиска дублей:', duplicateError.message);
      return;
    }
    
    console.log(`Найдено ${duplicateUsers.length} пользователей с username "DimaOsadchuk":`);
    duplicateUsers.forEach(user => {
      console.log(`- User ${user.id}: telegram_id=${user.telegram_id}, balance_ton=${user.balance_ton}, created_at=${user.created_at}`);
    });
    
    // 3. Тестируем getUserByTelegramId для обоих
    console.log('\n3️⃣ ТЕСТИРОВАНИЕ getUserByTelegramId:');
    
    // User 25: telegram_id = 425855744
    const { data: user25Test, error: error25 } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .eq('telegram_id', 425855744)
      .single();
      
    console.log('User 25 поиск по telegram_id=425855744:', user25Test || 'НЕ НАЙДЕН', error25?.message);
    
    // User 227: telegram_id = 25
    const { data: user227Test, error: error227 } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .eq('telegram_id', 25)
      .single();
      
    console.log('User 227 поиск по telegram_id=25:', user227Test || 'НЕ НАЙДЕН', error227?.message);
    
    // 4. Проверяем TON депозиты для обоих пользователей
    console.log('\n4️⃣ ПРОВЕРКА TON ДЕПОЗИТОВ:');
    const { data: tonTransactions, error: tonError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, created_at')
      .in('user_id', [25, 227])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
      
    if (tonError) {
      console.error('❌ Ошибка получения TON транзакций:', tonError.message);
      return;
    }
    
    console.log(`Найдено ${tonTransactions.length} TON транзакций:`);
    tonTransactions.forEach(tx => {
      console.log(`- TX ${tx.id}: User ${tx.user_id}, ${tx.amount_ton} TON, ${tx.description.substring(0, 50)}...`);
    });
    
    // 5. СИМУЛЯЦИЯ ПРОБЛЕМЫ: что происходит при поиске по username
    console.log('\n5️⃣ СИМУЛЯЦИЯ ПРОБЛЕМЫ - ПОИСК ПО USERNAME:');
    const { data: usernameSearch, error: usernameError } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .eq('username', 'DimaOsadchuk')
      .single(); // ← ВОТ ПРОБЛЕМА! single() вернет ПЕРВОГО найденного
      
    console.log('Поиск по username "DimaOsadchuk" вернул:', usernameSearch || 'НЕ НАЙДЕН');
    console.log('Это User', usernameSearch?.id, 'с telegram_id', usernameSearch?.telegram_id);
    
    if (usernameSearch?.id !== 25) {
      console.log('🚨 ПРОБЛЕМА ПОДТВЕРЖДЕНА: Поиск по username возвращает неправильного пользователя!');
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

diagnoseUserCollision().then(() => {
  console.log('\n✅ Диагностика завершена');
  process.exit(0);
}).catch(error => {
  console.error('💥 Неожиданная ошибка:', error);
  process.exit(1);
});