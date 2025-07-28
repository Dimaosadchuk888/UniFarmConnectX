/**
 * КРИТИЧЕСКАЯ ДИАГНОСТИКА: ПОЛЬЗОВАТЕЛЬ 25 - ФИНАНСОВЫЙ УРОН
 * Дата: 28 июля 2025
 * 
 * ПРОБЛЕМА: Пользователь купил 4 TON Boost пакета по 1 TON, но деньги не списались
 * СТАТУС: КРИТИЧЕСКАЯ ФИНАНСОВАЯ УЯЗВИМОСТЬ
 */

import { supabase } from './core/supabaseClient';

async function criticalUser25Diagnostic() {
  console.log('🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА ПОЛЬЗОВАТЕЛЯ 25');
  console.log('=' .repeat(60));
  console.log('⚠️  ФИНАНСОВАЯ УЯЗВИМОСТЬ: ДЕНЬГИ НЕ СПИСАЛИСЬ ЗА TON BOOST');
  
  try {
    // 1. Проверяем баланс пользователя 25
    console.log('\n1️⃣ Проверяем баланс пользователя 25...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni, ton_boost_active, ton_boost_package, ton_boost_rate')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения данных пользователя:', userError.message);
      return;
    }
    
    console.log('👤 Данные пользователя 25:');
    console.log(`   Username: ${userData.username}`);
    console.log(`   💎 TON Balance: ${userData.balance_ton} TON`);
    console.log(`   💰 UNI Balance: ${userData.balance_uni} UNI`);
    console.log(`   🚀 TON Boost Active: ${userData.ton_boost_active}`);
    console.log(`   📦 TON Boost Package: ${userData.ton_boost_package}`);
    console.log(`   📈 TON Boost Rate: ${userData.ton_boost_rate}`);
    
    // 2. Проверяем последние транзакции (за последние 10 минут)
    console.log('\n2️⃣ Проверяем последние транзакции пользователя 25...');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, description, created_at, metadata')
      .eq('user_id', 25)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError.message);
    } else {
      console.log(`📋 Найдено транзакций за последние 10 минут: ${transactions.length}`);
      
      transactions.forEach((tx, index) => {
        console.log(`\n   📜 Транзакция ${index + 1}:`);
        console.log(`      ID: ${tx.id}`);
        console.log(`      Type: ${tx.type}`);
        console.log(`      Amount: ${tx.amount} ${tx.currency}`);
        console.log(`      Description: ${tx.description}`);
        console.log(`      Created: ${tx.created_at}`);
        console.log(`      Metadata: ${JSON.stringify(tx.metadata, null, 8)}`);
      });
      
      // Анализ транзакций
      const boostPurchases = transactions.filter(tx => 
        tx.type === 'BOOST_PURCHASE' || 
        tx.description?.includes('TON Boost') ||
        (tx.metadata && JSON.stringify(tx.metadata).includes('boost'))
      );
      
      const withdrawals = transactions.filter(tx => 
        tx.type === 'WITHDRAWAL' ||
        tx.amount < 0
      );
      
      console.log(`\n📊 АНАЛИЗ ТРАНЗАКЦИЙ:`);
      console.log(`   🛒 TON Boost покупки: ${boostPurchases.length}`);
      console.log(`   💸 Списания (withdrawal): ${withdrawals.length}`);
      
      if (boostPurchases.length > 0 && withdrawals.length === 0) {
        console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: ПОКУПКИ БЕЗ СПИСАНИЙ!');
      }
    }
    
    // 3. Проверяем TON Farming данные
    console.log('\n3️⃣ Проверяем TON Farming данные пользователя 25...');
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_active, created_at, updated_at')
      .eq('user_id', '25');
    
    if (farmingError) {
      console.log('❌ Ошибка получения farming данных:', farmingError.message);
    } else {
      console.log(`🚜 TON Farming записи: ${farmingData.length}`);
      farmingData.forEach((record, index) => {
        console.log(`\n   🌾 Запись ${index + 1}:`);
        console.log(`      User ID: ${record.user_id}`);
        console.log(`      Farming Balance: ${record.farming_balance} TON`);
        console.log(`      Farming Rate: ${record.farming_rate}`);
        console.log(`      Boost Active: ${record.boost_active}`);
        console.log(`      Created: ${record.created_at}`);
        console.log(`      Updated: ${record.updated_at}`);
      });
    }
    
    // 4. Проверяем последние boost покупки в системе
    console.log('\n4️⃣ Проверяем последние TON Boost покупки в системе...');
    const { data: recentBoosts, error: boostError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, description, created_at')
      .or('type.eq.BOOST_PURCHASE,description.ilike.%TON Boost%')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (boostError) {
      console.log('❌ Ошибка получения boost покупок:', boostError.message);
    } else {
      console.log(`🛒 Последние TON Boost покупки: ${recentBoosts.length}`);
      recentBoosts.forEach((boost, index) => {
        console.log(`\n   💳 Покупка ${index + 1}:`);
        console.log(`      User ID: ${boost.user_id}`);
        console.log(`      Type: ${boost.type}`);
        console.log(`      Amount: ${boost.amount} ${boost.currency}`);
        console.log(`      Description: ${boost.description}`);
        console.log(`      Created: ${boost.created_at}`);
      });
    }
    
    // 5. КРИТИЧЕСКИЙ ВЫВОД
    console.log('\n5️⃣ КРИТИЧЕСКИЙ АНАЛИЗ ПРОБЛЕМЫ');
    console.log('=' .repeat(60));
    
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. processWithdrawal() возвращает success=true, но не списывает средства');
    console.log('2. Ошибка в WalletService - создает только приходные транзакции');
    console.log('3. Дублирование кода активации создает бонусы без списаний');
    console.log('4. Кэш баланса не обновляется после "списания"');
    console.log('5. Транзакции создаются с положительными amounts вместо отрицательных');
    
    console.log('\n🚨 ФИНАНСОВЫЙ УЩЕРБ:');
    if (userData.ton_boost_active && userData.balance_ton > 0) {
      console.log('❌ Пользователь получил TON Boost БЕЗ оплаты');
      console.log('❌ Система может начислять доходы с "бесплатного" буста');
      console.log('❌ Возможность массового злоупотребления');
    }
    
    console.log('\n⚠️  НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:');
    console.log('1. ОСТАНОВИТЬ все TON Boost покупки');
    console.log('2. ИССЛЕДОВАТЬ WalletService.processWithdrawal()');
    console.log('3. ПРОВЕРИТЬ все активные boost пакеты на легитимность');
    console.log('4. КОМПЕНСИРОВАТЬ финансовый ущерб');
    
  } catch (error) {
    console.log('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

// Запуск критической диагностики
criticalUser25Diagnostic().catch(console.error);