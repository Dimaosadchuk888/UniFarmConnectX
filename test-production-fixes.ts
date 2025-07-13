/**
 * Тестирование production исправлений UniFarming
 * Проверяем работу планировщика после внесенных изменений
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFarmingScheduler() {
  console.log('=== ТЕСТ PRODUCTION ИСПРАВЛЕНИЙ UNIFARMING ===\n');
  
  try {
    // 1. Проверяем активных фармеров
    console.log('1. Проверка активных фармеров...');
    const { data: activeFarmers, error: farmersError } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, uni_farming_active, uni_deposit_amount, uni_farming_last_update')
      .eq('uni_farming_active', true);
      
    if (farmersError) {
      console.error('Ошибка получения фармеров:', farmersError);
      return;
    }
    
    console.log(`Найдено активных фармеров: ${activeFarmers?.length || 0}`);
    
    // Проверяем временные метки обновления
    const outdatedFarmers = activeFarmers?.filter(f => {
      if (!f.uni_farming_last_update) return true;
      const lastUpdate = new Date(f.uni_farming_last_update);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
      return diffMinutes > 10;
    }) || [];
    
    console.log(`Фармеров с устаревшими обновлениями (>10 минут): ${outdatedFarmers.length}`);
    
    // 2. Проверяем последние транзакции
    console.log('\n2. Проверка последних транзакций FARMING_REWARD...');
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (txError) {
      console.error('Ошибка получения транзакций:', txError);
      return;
    }
    
    console.log(`Найдено последних транзакций: ${recentTransactions?.length || 0}`);
    
    // Проверяем частоту создания транзакций
    if (recentTransactions && recentTransactions.length > 1) {
      const intervals = [];
      for (let i = 1; i < recentTransactions.length; i++) {
        const time1 = new Date(recentTransactions[i-1].created_at);
        const time2 = new Date(recentTransactions[i].created_at);
        const diffMinutes = (time1.getTime() - time2.getTime()) / (1000 * 60);
        intervals.push(diffMinutes);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`Средний интервал между транзакциями: ${avgInterval.toFixed(2)} минут`);
      console.log(`Ожидаемый интервал: 5 минут`);
      
      // Проверяем статус транзакций
      const statusCounts = recentTransactions.reduce((acc, tx) => {
        acc[tx.status] = (acc[tx.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\nСтатистика статусов транзакций:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
    // 3. Проверяем работу BatchBalanceProcessor
    console.log('\n3. Импорт и проверка BatchBalanceProcessor...');
    try {
      const { batchBalanceProcessor } = await import('./core/BatchBalanceProcessor');
      console.log('✅ BatchBalanceProcessor успешно импортирован');
      
      // Проверяем, что метод processFarmingIncome существует
      if (typeof batchBalanceProcessor.processFarmingIncome === 'function') {
        console.log('✅ Метод processFarmingIncome доступен');
      } else {
        console.log('❌ Метод processFarmingIncome не найден');
      }
    } catch (error) {
      console.error('❌ Ошибка импорта BatchBalanceProcessor:', error);
    }
    
    // 4. Выводим итоговый отчет
    console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ===');
    console.log(`✅ Активных фармеров: ${activeFarmers?.length || 0}`);
    console.log(`${outdatedFarmers.length === 0 ? '✅' : '❌'} Фармеров с устаревшими обновлениями: ${outdatedFarmers.length}`);
    console.log(`${recentTransactions && recentTransactions.length > 0 ? '✅' : '❌'} Недавние транзакции найдены: ${recentTransactions?.length || 0}`);
    
    // Рекомендации
    if (outdatedFarmers.length > 0) {
      console.log('\n⚠️  РЕКОМЕНДАЦИЯ: Запустите планировщик для обновления устаревших записей');
    }
    
    console.log('\n✅ Тест завершен');
    
  } catch (error) {
    console.error('Ошибка выполнения теста:', error);
  }
}

// Запуск теста
testFarmingScheduler();