/**
 * Проверка статуса планировщиков и последних farming транзакций
 */

import { supabase } from '../core/supabase';

async function checkSchedulerStatus() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА СТАТУСА ПЛАНИРОВЩИКОВ И FARMING ТРАНЗАКЦИЙ');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Проверяем последние farming транзакции для ВСЕХ пользователей
    console.log('1. ПОСЛЕДНИЕ FARMING ТРАНЗАКЦИИ (все пользователи):');
    const { data: lastFarming, error: farmingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (farmingError) {
      console.error('Ошибка получения транзакций:', farmingError);
    } else {
      console.log(`Найдено ${lastFarming?.length || 0} последних транзакций:`);
      lastFarming?.forEach(tx => {
        const time = new Date(tx.created_at);
        const now = new Date();
        const hoursAgo = ((now.getTime() - time.getTime()) / (1000 * 60 * 60)).toFixed(1);
        console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency} (${time.toLocaleString()}) - ${hoursAgo} часов назад`);
      });
      
      if (lastFarming && lastFarming.length > 0) {
        const lastTime = new Date(lastFarming[0].created_at);
        const now = new Date();
        const minutesAgo = Math.floor((now.getTime() - lastTime.getTime()) / (1000 * 60));
        
        if (minutesAgo > 10) {
          console.log(`\n⚠️  ВНИМАНИЕ: Последняя транзакция была ${minutesAgo} минут назад!`);
          console.log('   Планировщик должен работать каждые 5 минут.');
        }
      }
    }
    
    // 2. Проверяем активных фармеров
    console.log('\n2. АКТИВНЫЕ ФАРМЕРЫ:');
    const { data: activeFarmers, error: farmersError } = await supabase
      .from('users')
      .select('id, username, uni_farming_active, uni_deposit_amount, uni_farming_last_update')
      .eq('uni_farming_active', true)
      .order('uni_farming_last_update', { ascending: false })
      .limit(10);
    
    if (farmersError) {
      console.error('Ошибка получения фармеров:', farmersError);
    } else {
      console.log(`Найдено ${activeFarmers?.length || 0} активных фармеров:`);
      activeFarmers?.forEach(farmer => {
        const lastUpdate = farmer.uni_farming_last_update ? new Date(farmer.uni_farming_last_update) : null;
        if (lastUpdate) {
          const now = new Date();
          const minutesAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
          console.log(`  - User ${farmer.id}: депозит ${farmer.uni_deposit_amount} UNI, обновлен ${minutesAgo} минут назад`);
        } else {
          console.log(`  - User ${farmer.id}: депозит ${farmer.uni_deposit_amount} UNI, НИКОГДА НЕ ОБНОВЛЯЛСЯ`);
        }
      });
    }
    
    // 3. Проверяем последние реферальные транзакции
    console.log('\n3. ПОСЛЕДНИЕ РЕФЕРАЛЬНЫЕ ТРАНЗАКЦИИ:');
    const { data: lastReferral } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`Найдено ${lastReferral?.length || 0} последних реферальных транзакций:`);
    lastReferral?.forEach(tx => {
      const time = new Date(tx.created_at);
      console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency} от User ${tx.source_user_id} (${time.toLocaleString()})`);
    });
    
    // 4. Анализ проблемы
    console.log('\n4. АНАЛИЗ ПРОБЛЕМЫ:');
    
    if (lastFarming && lastFarming.length > 0) {
      const lastTime = new Date(lastFarming[0].created_at);
      const now = new Date();
      const hoursAgo = ((now.getTime() - lastTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
      
      if (parseFloat(hoursAgo) > 1) {
        console.log('\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Планировщик фарминга НЕ РАБОТАЕТ!');
        console.log(`   Последнее начисление было ${hoursAgo} часов назад.`);
        console.log('   Это объясняет отсутствие реферальных наград.');
        console.log('\n💡 РЕШЕНИЕ: Необходимо перезапустить сервер или планировщики.');
      }
    }
    
    // 5. Проверяем рефералов User 184 которые должны фармить
    console.log('\n5. СТАТУС РЕФЕРАЛОВ USER 184:');
    const referralIds = [186, 187, 188, 189, 190];
    const { data: referralStatus } = await supabase
      .from('users')
      .select('id, username, uni_farming_active, uni_deposit_amount, uni_farming_last_update')
      .in('id', referralIds)
      .order('id');
    
    referralStatus?.forEach(ref => {
      const status = ref.uni_farming_active ? '✓ АКТИВЕН' : '✗ НЕ АКТИВЕН';
      const lastUpdate = ref.uni_farming_last_update ? new Date(ref.uni_farming_last_update) : null;
      const updateInfo = lastUpdate 
        ? `обновлен ${new Date(ref.uni_farming_last_update).toLocaleString()}`
        : 'НИКОГДА НЕ ОБНОВЛЯЛСЯ';
      console.log(`  - User ${ref.id}: ${status}, депозит ${ref.uni_deposit_amount} UNI, ${updateInfo}`);
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

checkSchedulerStatus();