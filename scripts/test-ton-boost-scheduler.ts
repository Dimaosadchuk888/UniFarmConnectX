/**
 * Тестовый запуск TON Boost планировщика для диагностики проблем
 */

import { logger } from '../core/logger';
import { supabase } from '../core/supabase';

// Настройка логгера для детального вывода
logger.level = 'debug';

async function testTonBoostScheduler() {
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТОВЫЙ ЗАПУСК TON BOOST ПЛАНИРОВЩИКА');
  console.log('='.repeat(80) + '\n');
  
  try {
    console.log('1. Загрузка модуля планировщика...');
    const { TONBoostIncomeScheduler } = await import('../modules/scheduler/tonBoostIncomeScheduler');
    console.log('✅ Модуль загружен успешно');
    
    console.log('\n2. Создание экземпляра планировщика...');
    const scheduler = new TONBoostIncomeScheduler();
    console.log('✅ Экземпляр создан');
    
    console.log('\n3. Проверка активных TON фармеров перед запуском...');
    const { data: activeFarmers } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gt('farming_balance', 0);
    
    console.log(`Найдено активных фармеров: ${activeFarmers?.length || 0}`);
    if (activeFarmers && activeFarmers.length > 0) {
      console.log('Примеры:');
      activeFarmers.slice(0, 3).forEach(f => {
        console.log(`  - User ${f.user_id}: ${f.farming_balance} TON, rate ${f.farming_rate}`);
      });
    }
    
    console.log('\n4. Запуск одного цикла обработки...');
    console.log('=' + '='.repeat(40));
    
    // Прямой вызов processTonBoostIncome для тестирования
    try {
      // @ts-ignore - обращаемся к приватному методу для тестирования
      await scheduler.processTonBoostIncome();
      console.log('\n✅ Цикл обработки завершен успешно!');
    } catch (processError) {
      console.error('\n❌ ОШИБКА при обработке:', processError);
      if (processError instanceof Error) {
        console.error('Стек ошибки:', processError.stack);
      }
    }
    
    console.log('\n5. Проверка созданных транзакций...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: newTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log(`Создано новых транзакций: ${newTransactions?.length || 0}`);
    if (newTransactions && newTransactions.length > 0) {
      console.log('Новые транзакции:');
      newTransactions.forEach(tx => {
        console.log(`  - User ${tx.user_id}: ${tx.amount} TON`);
      });
    }
    
    console.log('\n6. Проверка обновления farming_last_update...');
    const { data: updatedFarmers } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_last_update')
      .gt('farming_balance', 0);
    
    if (updatedFarmers) {
      const recentlyUpdated = updatedFarmers.filter(f => {
        if (!f.farming_last_update) return false;
        const lastUpdate = new Date(f.farming_last_update).getTime();
        const now = Date.now();
        return (now - lastUpdate) < 60000; // обновлены в последнюю минуту
      });
      
      console.log(`Обновлено записей: ${recentlyUpdated.length} из ${updatedFarmers.length}`);
    }
    
    console.log('\n7. Проверка реферальных наград...');
    const { data: referralRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', fiveMinutesAgo);
    
    console.log(`Создано реферальных наград: ${referralRewards?.length || 0}`);
    if (referralRewards && referralRewards.length > 0) {
      console.log('Реферальные награды:');
      referralRewards.forEach(tx => {
        console.log(`  - User ${tx.user_id}: ${tx.amount} TON от User ${tx.source_user_id}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    if (error instanceof Error) {
      console.error('Сообщение:', error.message);
      console.error('Стек:', error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

testTonBoostScheduler();