/**
 * Скрипт для проверки транзакций миссий пользователя 184
 */

import { supabase } from '../core/supabase';

async function checkMissionRewards() {
  console.log('\n=== ПРОВЕРКА НАГРАД ЗА МИССИИ (USER 184) ===\n');
  
  // 1. Проверяем транзакции MISSION_REWARD за последний час
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: missionTransactions, error: missionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'MISSION_REWARD')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });
    
  if (missionError) {
    console.error('Ошибка получения транзакций миссий:', missionError);
    return;
  }
  
  console.log('📊 Транзакции MISSION_REWARD за последний час:');
  console.log('Количество:', missionTransactions?.length || 0);
  
  if (missionTransactions && missionTransactions.length > 0) {
    let totalMissionUni = 0;
    
    missionTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Транзакция ID: ${tx.id}`);
      console.log(`   Время: ${tx.created_at}`);
      console.log(`   UNI: ${tx.amount_uni}`);
      console.log(`   Описание: ${tx.description || 'нет'}`);
      console.log(`   Metadata: ${JSON.stringify(tx.metadata)}`);
      
      totalMissionUni += parseFloat(tx.amount_uni || '0');
    });
    
    console.log(`\n🔴 ИТОГО начислено UNI за миссии: ${totalMissionUni}`);
  }
  
  // 2. Проверяем ВСЕ транзакции за последний час
  const { data: allTransactions, error: allError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });
    
  if (allError) {
    console.error('Ошибка получения всех транзакций:', allError);
    return;
  }
  
  console.log('\n\n📋 ВСЕ транзакции за последний час:');
  console.log('Количество:', allTransactions?.length || 0);
  
  if (allTransactions && allTransactions.length > 0) {
    // Группируем по типам
    const groupedByType: Record<string, { count: number; totalUni: number }> = {};
    
    allTransactions.forEach(tx => {
      const type = tx.type || 'UNKNOWN';
      if (!groupedByType[type]) {
        groupedByType[type] = { count: 0, totalUni: 0 };
      }
      groupedByType[type].count++;
      groupedByType[type].totalUni += parseFloat(tx.amount_uni || '0');
    });
    
    console.log('\nГруппировка по типам:');
    Object.entries(groupedByType).forEach(([type, data]) => {
      console.log(`- ${type}: ${data.count} транзакций, ${data.totalUni} UNI`);
    });
    
    // Показываем последние 10 транзакций
    console.log('\nПоследние транзакции:');
    allTransactions.slice(0, 10).forEach(tx => {
      console.log(`[${tx.type}] ${tx.amount_uni} UNI - ${tx.description || 'без описания'}`);
    });
  }
  
  // 3. Проверяем состояние mission_progress
  const { data: missionProgress, error: progressError } = await supabase
    .from('mission_progress')
    .select('*')
    .eq('user_id', 184)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false });
    
  console.log('\n\n✅ Выполненные миссии (mission_progress):');
  if (missionProgress && missionProgress.length > 0) {
    missionProgress.forEach(mp => {
      console.log(`- Миссия ${mp.mission_id}: выполнена ${mp.completed_at}, награда ${mp.reward_amount} UNI`);
    });
  } else {
    console.log('Нет записей о выполненных миссиях');
  }
}

// Запускаем проверку
checkMissionRewards()
  .then(() => console.log('\n✅ Проверка завершена'))
  .catch(error => console.error('❌ Ошибка:', error));