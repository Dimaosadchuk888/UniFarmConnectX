/**
 * Тестовый запуск UNI farming планировщика
 */

import { logger } from '../core/logger';

async function testUniFarmingScheduler() {
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТОВЫЙ ЗАПУСК UNI FARMING ПЛАНИРОВЩИКА');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Проверяем наличие модуля планировщика
    console.log('1. Загрузка модуля планировщика...');
    const { FarmingScheduler } = await import('../core/scheduler/farmingScheduler');
    console.log('✅ Модуль загружен успешно\n');
    
    // 2. Создаем экземпляр
    console.log('2. Создание экземпляра планировщика...');
    const scheduler = new FarmingScheduler();
    console.log('✅ Экземпляр создан\n');
    
    // 3. Проверяем активных фармеров
    console.log('3. Проверка активных UNI фармеров перед запуском...');
    const { UniFarmingRepository } = await import('../modules/farming/UniFarmingRepository');
    const repo = new UniFarmingRepository();
    const activeFarmers = await repo.getActiveFarmers();
    
    console.log(`Найдено активных фармеров: ${activeFarmers?.length || 0}`);
    if (activeFarmers && activeFarmers.length > 0) {
      console.log('Примеры:');
      activeFarmers.slice(0, 3).forEach(f => {
        console.log(`  - User ${f.user_id}: ${f.uni_deposit_amount} UNI, rate ${f.uni_farming_rate}`);
      });
    }
    console.log('');
    
    // 4. Запускаем один цикл обработки
    console.log('4. Запуск одного цикла обработки UNI farming...');
    console.log('=' * 41);
    
    // Напрямую вызываем метод обработки
    const processMethod = scheduler['processUniFarmingIncome'].bind(scheduler);
    await processMethod();
    
    console.log('\n✅ Цикл обработки завершен!\n');
    
    // 5. Проверяем результаты
    console.log('5. Проверка созданных транзакций...');
    const { supabase } = await import('../core/supabase');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: newTx, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'UNI')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log(`Создано новых транзакций: ${count || 0}`);
    if (newTx && newTx.length > 0) {
      console.log('Новые транзакции:');
      newTx.slice(0, 5).forEach(tx => {
        console.log(`  - User ${tx.user_id}: ${tx.amount} UNI`);
      });
    }
    
    // 6. Проверяем обновление uni_farming_last_update
    console.log('\n6. Проверка обновления uni_farming_last_update...');
    const referralIds = [186, 187, 188, 189, 190];
    const { data: updatedFarmers } = await supabase
      .from('users')
      .select('id, uni_farming_last_update')
      .in('id', referralIds)
      .order('id');
    
    let updatedCount = 0;
    updatedFarmers?.forEach(f => {
      if (f.uni_farming_last_update) {
        const minutesAgo = (Date.now() - new Date(f.uni_farming_last_update).getTime()) / (1000 * 60);
        if (minutesAgo < 5) {
          updatedCount++;
        }
      }
    });
    
    console.log(`Обновлено записей: ${updatedCount} из ${referralIds.length}`);
    
    // 7. Проверяем реферальные награды
    console.log('\n7. Проверка реферальных наград...');
    const { data: referralRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'UNI')
      .gte('created_at', fiveMinutesAgo);
    
    console.log(`Создано реферальных наград: ${referralRewards?.length || 0}`);
    if (referralRewards && referralRewards.length > 0) {
      console.log('Реферальные награды:');
      referralRewards.forEach(tx => {
        console.log(`  - User 184: ${tx.amount} UNI от ${tx.metadata?.source_user_id || 'User ' + tx.description?.match(/User (\d+)/)?.[1]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    if (error instanceof Error) {
      console.error('Стек ошибки:', error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

testUniFarmingScheduler();