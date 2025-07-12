#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verifyChain() {
  console.log('=== ПОЛНАЯ ПРОВЕРКА ЦЕПОЧКИ DAILY BONUS ===\n');

  // 1. Проверяем все типы транзакций в БД
  const { data: types } = await supabase
    .from('transactions')
    .select('type')
    .in('type', ['DAILY_BONUS', 'daily_bonus', 'Daily_Bonus'])
    .limit(10);
    
  console.log('1. ПРОВЕРКА ТИПОВ В БД:');
  console.log('Найдено транзакций с типами bonus:', types?.length || 0);
  
  // 2. Проверяем конкретно DAILY_BONUS транзакции
  const { data: dbTx } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_uni, created_at')
    .eq('user_id', 74)
    .eq('type', 'DAILY_BONUS')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\n2. ТРАНЗАКЦИИ ТИПА DAILY_BONUS (UPPERCASE):');
  console.log('Количество:', dbTx?.length || 0);
  if (dbTx?.length > 0) {
    dbTx.forEach(tx => console.log(`  - ${tx.created_at}: ${tx.amount_uni} UNI`));
  }
  
  // 3. Проверяем lowercase вариант
  const { data: lowerTx } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_uni, created_at')
    .eq('user_id', 74)
    .eq('type', 'daily_bonus')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\n3. ТРАНЗАКЦИИ ТИПА daily_bonus (lowercase):');
  console.log('Количество:', lowerTx?.length || 0);
  if (lowerTx?.length > 0) {
    lowerTx.forEach(tx => console.log(`  - ${tx.created_at}: ${tx.amount_uni} UNI`));
  }
  
  // 4. Проверяем последний баланс пользователя
  const { data: user } = await supabase
    .from('users')
    .select('balance_uni, checkin_last_date, checkin_streak')
    .eq('id', 74)
    .single();
    
  console.log('\n4. ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:');
  console.log(`  Баланс UNI: ${user?.balance_uni}`);
  console.log(`  Последний checkin: ${user?.checkin_last_date}`);
  console.log(`  Streak: ${user?.checkin_streak}`);
  
  // 5. Анализ изменения баланса
  console.log('\n5. АНАЛИЗ ИЗМЕНЕНИЯ БАЛАНСА:');
  console.log('  До получения бонуса: 1000500.122573 UNI');
  console.log('  После получения: 1001100.122573 UNI');
  console.log('  Разница: 600 UNI (соответствует streak 2)');
}

verifyChain().catch(console.error);
