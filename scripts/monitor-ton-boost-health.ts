/**
 * Мониторинг состояния TON Boost планировщика
 * Автоматически исправляет проблемы с boost_active
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function monitorTonBoostHealth() {
  console.log('\n' + '='.repeat(80));
  console.log('МОНИТОРИНГ СОСТОЯНИЯ TON BOOST');
  console.log('Время: ' + new Date().toISOString());
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Проверяем последние транзакции TON farming
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTx, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', oneHourAgo);
    
    console.log(`1. TON транзакций за последний час: ${count || 0}`);
    
    // 2. Проверяем активных фармеров
    const { data: activeFarmers } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gt('farming_balance', 0);
    
    console.log(`2. Всего фармеров с балансом > 0: ${activeFarmers?.length || 0}`);
    
    // 3. Проверяем фармеров с boost_active = true
    const { data: activeBoostUsers, count: activeCount } = await supabase
      .from('ton_farming_data')
      .select('*', { count: 'exact' })
      .eq('boost_active', true)
      .gt('farming_balance', 0);
    
    console.log(`3. Фармеров с boost_active = TRUE: ${activeCount || 0}`);
    
    // 4. Находим проблемных фармеров
    const { data: inactiveFarmers } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', false)
      .gt('farming_balance', 0)
      .gt('boost_package_id', 0);
    
    console.log(`4. Фармеров с boost_active = FALSE: ${inactiveFarmers?.length || 0}`);
    
    // 5. Автоматическое исправление
    if (inactiveFarmers && inactiveFarmers.length > 0) {
      console.log('\n⚠️  ОБНАРУЖЕНА ПРОБЛЕМА!');
      console.log(`Найдено ${inactiveFarmers.length} неактивных фармеров с депозитами:`);
      
      inactiveFarmers.forEach(f => {
        console.log(`  - User ${f.user_id}: ${f.farming_balance} TON, package #${f.boost_package_id}`);
      });
      
      console.log('\n🔧 Автоматическое исправление...');
      
      const { data: fixedUsers, error } = await supabase
        .from('ton_farming_data')
        .update({ 
          boost_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('boost_active', false)
        .gt('farming_balance', 0)
        .gt('boost_package_id', 0)
        .select();
      
      if (error) {
        console.error('❌ Ошибка исправления:', error);
      } else {
        console.log(`✅ Исправлено ${fixedUsers?.length || 0} записей`);
        logger.info('[TON_BOOST_HEALTH] Автоматически активировано фармеров:', fixedUsers?.length || 0);
      }
    }
    
    // 6. Проверка зависших обновлений
    console.log('\n5. Проверка последних обновлений:');
    if (activeFarmers && activeFarmers.length > 0) {
      const now = Date.now();
      let stuckCount = 0;
      
      activeFarmers.forEach(f => {
        if (f.farming_last_update) {
          const lastUpdate = new Date(f.farming_last_update).getTime();
          const minutesAgo = Math.floor((now - lastUpdate) / (1000 * 60));
          
          if (minutesAgo > 15) {
            stuckCount++;
            console.log(`  ⚠️  User ${f.user_id}: не обновлялся ${minutesAgo} минут`);
          }
        }
      });
      
      if (stuckCount > 0) {
        console.log(`\n⚠️  ${stuckCount} фармеров не обновляются более 15 минут`);
        console.log('Возможно, планировщик остановлен');
      } else {
        console.log('✅ Все фармеры обновляются регулярно');
      }
    }
    
    // 7. Итоговый статус
    console.log('\n' + '-'.repeat(80));
    console.log('ИТОГОВЫЙ СТАТУС:');
    
    if (count === 0 && activeFarmers && activeFarmers.length > 0) {
      console.log('❌ КРИТИЧНО: Планировщик не работает!');
      console.log('   Есть активные фармеры, но нет транзакций');
    } else if (activeCount === 0 && activeFarmers && activeFarmers.length > 0) {
      console.log('⚠️  ВНИМАНИЕ: Все фармеры неактивны (boost_active = FALSE)');
      console.log('   Требуется исправление');
    } else if (count && count > 0) {
      console.log('✅ Система работает нормально');
      console.log(`   Создано ${count} транзакций за последний час`);
    } else {
      console.log('ℹ️  Нет активных TON фармеров');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка мониторинга:', error);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Запуск мониторинга
monitorTonBoostHealth();

// Экспорт для использования в планировщике
export { monitorTonBoostHealth };