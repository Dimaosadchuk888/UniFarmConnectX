/**
 * ТЕСТ ОБНОВЛЕННОГО REFERRALSERVICE С ИСПРАВЛЕННОЙ СХЕМОЙ БАЗЫ ДАННЫХ
 * Проверяет работу после исправления проблемы с колонками amount_uni/amount_ton
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdatedReferralService() {
  try {
    const userId = 48;
    
    console.log('=== ТЕСТ 1: ПОИСК ПОЛЬЗОВАТЕЛЯ ID=48 ===');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, ref_code')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.log('❌ ОШИБКА: Пользователь не найден:', userError?.message);
      return false;
    }
    
    console.log('✅ Пользователь найден:', user);
    
    console.log('\n=== ТЕСТ 2: ПОИСК РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ С ПРАВИЛЬНЫМИ КОЛОНКАМИ ===');
    
    // Используем исправленный запрос из ReferralService
    const { data: referralTransactions, error: refError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, amount_ton, currency, description, created_at')
      .eq('user_id', userId)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    console.log('Результат запроса реферальных транзакций:');
    console.log('- hasTransactions:', !!referralTransactions);
    console.log('- transactionsCount:', referralTransactions?.length || 0);
    console.log('- hasError:', !!refError);
    console.log('- errorMessage:', refError?.message);
    
    if (refError) {
      console.log('❌ ОШИБКА в запросе транзакций:', refError);
      return false;
    }
    
    if (!referralTransactions || referralTransactions.length === 0) {
      console.log('⚠️ Реферальные транзакции не найдены');
      return false;
    }
    
    console.log('✅ Найдены реферальные транзакции:', referralTransactions.length);
    
    console.log('\n=== ТЕСТ 3: АНАЛИЗ СТРУКТУРЫ ТРАНЗАКЦИЙ ===');
    
    // Показываем первые 3 транзакции 
    referralTransactions.slice(0, 3).forEach((tx, index) => {
      console.log(`Транзакция ${index + 1}:`);
      console.log(`  ID: ${tx.id}`);
      console.log(`  amount_uni: ${tx.amount_uni}`);
      console.log(`  amount_ton: ${tx.amount_ton}`);
      console.log(`  currency: ${tx.currency}`);
      console.log(`  description: ${tx.description?.substring(0, 60)}...`);
      
      // Извлекаем уровень из описания транзакции
      const levelMatch = tx.description?.match(/L(\d+)/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1]);
        console.log(`  ✅ Уровень извлечен: L${level}`);
      } else {
        console.log(`  ❌ Не удалось извлечь уровень из описания`);
      }
      console.log('');
    });
    
    console.log('\n=== ТЕСТ 4: СИМУЛЯЦИЯ ЛОГИКИ REFERRALSERVICE ===');
    
    // Симулируем точную логику из getRealReferralStats
    const levelIncome = {};
    const levelCounts = {};
    
    referralTransactions.forEach(tx => {
      // Извлекаем уровень из описания транзакции
      const levelMatch = tx.description?.match(/L(\d+)/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1]);
        if (!levelIncome[level]) {
          levelIncome[level] = { uni: 0, ton: 0 };
        }
        // Обрабатываем UNI транзакции
        if (tx.amount_uni && parseFloat(tx.amount_uni) > 0) {
          levelIncome[level].uni += parseFloat(tx.amount_uni);
        }
        // Обрабатываем TON транзакции  
        if (tx.amount_ton && parseFloat(tx.amount_ton) > 0) {
          levelIncome[level].ton += parseFloat(tx.amount_ton);
        }
        
        // Подсчитываем количество на уровне
        if (!levelCounts[level]) {
          levelCounts[level] = 0;
        }
        levelCounts[level]++;
      }
    });
    
    console.log('Анализ доходов по уровням:');
    Object.keys(levelIncome).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
      const income = levelIncome[level];
      const count = levelCounts[level] || 0;
      console.log(`  Уровень ${level}: ${income.uni.toFixed(6)} UNI + ${income.ton.toFixed(6)} TON (${count} транзакций)`);
    });
    
    // Подсчитываем общий доход
    let totalUniEarned = 0;
    let totalTonEarned = 0;
    Object.values(levelIncome).forEach(income => {
      totalUniEarned += income.uni;
      totalTonEarned += income.ton;
    });
    
    console.log(`\n✅ ОБЩИЙ ДОХОД: ${totalUniEarned.toFixed(6)} UNI + ${totalTonEarned.toFixed(6)} TON`);
    
    console.log('\n=== ТЕСТ 5: ПОИСК ПРЯМЫХ РЕФЕРАЛОВ ===');
    
    const { data: directReferrals, error: refDirectError } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .eq('referred_by', userId);
      
    if (refDirectError) {
      console.log('❌ ОШИБКА поиска прямых рефералов:', refDirectError.message);
    } else {
      console.log(`✅ Найдено прямых рефералов: ${directReferrals?.length || 0}`);
      if (directReferrals && directReferrals.length > 0) {
        directReferrals.forEach((ref, index) => {
          console.log(`  ${index + 1}. User ID:${ref.id}, Username:${ref.username}`);
        });
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 ТЕСТ ОБНОВЛЕННОГО REFERRAL SERVICE');
  console.log('Время запуска:', new Date().toISOString());
  console.log('');
  
  const success = await testUpdatedReferralService();
  
  console.log('\n=== ФИНАЛЬНЫЙ РЕЗУЛЬТАТ ===');
  if (success) {
    console.log('✅ ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО');
    console.log('📋 ВЫВОД: ReferralService должен работать с исправленной схемой базы данных');
    console.log('🔧 СЛЕДУЮЩИЙ ШАГ: Перезапустить сервер для применения изменений');
  } else {
    console.log('❌ ТЕСТЫ ПРОВАЛИЛИСЬ');
    console.log('📋 ВЫВОД: Требуются дополнительные исправления');
  }
}

main().catch(console.error);