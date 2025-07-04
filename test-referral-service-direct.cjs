/**
 * ПРЯМОЙ ТЕСТ REFERRALSERVICE.GETREALREFERRALSTATS
 * Диагностика проблемы "Пользователь не найден" в production коде
 */

// Используем dynamic import для совместимости с ES modules
const nodeFetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Инициализация переменных окружения
require('dotenv').config();

// Проверка переменных окружения
console.log('=== ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'SET' : 'NOT SET');

// Инициализация Supabase клиента
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase клиент инициализирован');

async function testDirectReferralService() {
  try {
    console.log('\n=== ТЕСТ ПРЯМОГО ПОИСКА ПОЛЬЗОВАТЕЛЯ ID=48 ===');
    
    // Точно тот же запрос что делает ReferralService
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', 48)
      .single();
      
    console.log('Результат поиска пользователя:');
    console.log('- hasUser:', !!user);
    console.log('- userError:', userError);
    console.log('- userErrorMessage:', userError?.message);
    console.log('- userErrorCode:', userError?.code);
    console.log('- userData:', user);
    
    if (userError) {
      console.log('\n❌ ОШИБКА: Пользователь ID=48 НЕ НАЙДЕН');
      console.log('Детали ошибки:', JSON.stringify(userError, null, 2));
      return false;
    }
    
    if (!user) {
      console.log('\n❌ ОШИБКА: Запрос прошел успешно, но user = null');
      return false;
    }
    
    console.log('\n✅ УСПЕХ: Пользователь ID=48 найден успешно');
    console.log('Данные пользователя:', JSON.stringify(user, null, 2));
    
    // Теперь протестируем поиск транзакций
    console.log('\n=== ТЕСТ ПОИСКА РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ ===');
    
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, description')
      .eq('user_id', 48)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log('Результат поиска реферальных транзакций:');
    console.log('- hasTransactions:', !!transactions);
    console.log('- transactionsCount:', transactions?.length || 0);
    console.log('- transError:', transError);
    
    if (transactions && transactions.length > 0) {
      console.log('✅ Найдены реферальные транзакции:', transactions.length);
      console.log('Первые 3 транзакции:');
      transactions.slice(0, 3).forEach((trans, index) => {
        console.log(`  ${index + 1}. ID:${trans.id}, Amount:${trans.amount} ${trans.currency}, Desc:${trans.description?.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ Реферальные транзакции не найдены');
    }
    
    // Поиск всех пользователей с referred_by = 48 (прямые рефералы)
    console.log('\n=== ТЕСТ ПОИСКА ПРЯМЫХ РЕФЕРАЛОВ ===');
    
    const { data: referrals, error: refError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('referred_by', 48);
      
    console.log('Результат поиска прямых рефералов:');
    console.log('- hasReferrals:', !!referrals);
    console.log('- referralsCount:', referrals?.length || 0);
    console.log('- refError:', refError);
    
    if (referrals && referrals.length > 0) {
      console.log('✅ Найдены прямые рефералы:', referrals.length);
      referrals.forEach((ref, index) => {
        console.log(`  ${index + 1}. User ID:${ref.id}, Username:${ref.username}, Referred by:${ref.referred_by}`);
      });
    } else {
      console.log('❌ Прямые рефералы не найдены');
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

async function main() {
  console.log('🚀 СТАРТ ДИАГНОСТИКИ REFERRAL SERVICE');
  console.log('Время запуска:', new Date().toISOString());
  
  const success = await testDirectReferralService();
  
  console.log('\n=== ФИНАЛЬНЫЙ РЕЗУЛЬТАТ ===');
  if (success) {
    console.log('✅ ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО');
    console.log('📋 ВЫВОД: Проблема НЕ в Supabase подключении или поиске пользователя');
    console.log('🔍 РЕКОМЕНДАЦИЯ: Проблема в коде ReferralService.getRealReferralStats');
  } else {
    console.log('❌ ТЕСТЫ ПРОВАЛИЛИСЬ');
    console.log('📋 ВЫВОД: Проблема в Supabase подключении или структуре базы данных');
  }
  
  console.log('Время завершения:', new Date().toISOString());
}

// Запуск теста
main().catch(console.error);