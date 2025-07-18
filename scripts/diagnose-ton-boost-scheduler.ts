/**
 * Диагностика TON Boost планировщика
 */

import { supabase } from '../core/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function diagnoseTonBoostScheduler() {
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА TON BOOST ПЛАНИРОВЩИКА');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Проверяем последние логи сервера
    console.log('1. ПРОВЕРКА ЛОГОВ СЕРВЕРА:');
    const logPath = path.join(process.cwd(), 'data', 'server-output.log');
    
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      const lines = logContent.split('\n');
      
      // Ищем ошибки связанные с TON Boost
      const tonBoostErrors = lines.filter(line => 
        line.toLowerCase().includes('ton') && 
        (line.toLowerCase().includes('error') || 
         line.toLowerCase().includes('failed') ||
         line.toLowerCase().includes('stopped'))
      ).slice(-10);
      
      console.log(`Найдено ${tonBoostErrors.length} ошибок TON Boost в логах:`);
      tonBoostErrors.forEach(error => {
        console.log(`  - ${error.substring(0, 200)}`);
      });
      
      // Ищем последние упоминания TON Boost scheduler
      const schedulerLogs = lines.filter(line => 
        line.includes('tonBoostIncomeScheduler') || 
        line.includes('TON_BOOST_SCHEDULER')
      ).slice(-5);
      
      console.log(`\nПоследние логи TON Boost планировщика:`);
      schedulerLogs.forEach(log => {
        console.log(`  - ${log.substring(0, 200)}`);
      });
    } else {
      console.log('Файл логов не найден');
    }
    
    // 2. Проверяем состояние планировщика в БД
    console.log('\n\n2. ПРОВЕРКА СОСТОЯНИЯ В БД:');
    
    // Проверяем активных TON фармеров
    const { data: activeFarmers, error: farmersError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gt('farming_balance', 0);
    
    if (farmersError) {
      console.error('Ошибка получения фармеров:', farmersError);
    } else {
      console.log(`Активных TON фармеров: ${activeFarmers?.length || 0}`);
      
      if (activeFarmers && activeFarmers.length > 0) {
        // Проверяем время последнего обновления
        const lastUpdates = activeFarmers.map(f => 
          f.farming_last_update ? new Date(f.farming_last_update).getTime() : 0
        );
        const mostRecentUpdate = Math.max(...lastUpdates);
        const now = Date.now();
        const minutesSinceUpdate = Math.floor((now - mostRecentUpdate) / (1000 * 60));
        
        console.log(`Последнее обновление: ${minutesSinceUpdate} минут назад`);
        
        if (minutesSinceUpdate > 10) {
          console.log('\n⚠️  ПЛАНИРОВЩИК НЕ РАБОТАЕТ!');
          console.log(`   Должен обновляться каждые 5 минут, но не обновлялся ${minutesSinceUpdate} минут`);
        }
      }
    }
    
    // 3. Проверяем транзакции типа TON_BOOST_INCOME
    console.log('\n\n3. ПРОВЕРКА ТРАНЗАКЦИЙ:');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTonTx, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('currency', 'TON')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', oneHourAgo);
    
    console.log(`TON транзакций за последний час: ${count || 0}`);
    
    if (count === 0) {
      console.log('\n❌ НЕТ TON ТРАНЗАКЦИЙ за последний час!');
      console.log('   Это подтверждает, что планировщик не работает.');
    }
    
    // 4. Проверяем конфигурацию планировщика
    console.log('\n\n4. КОНФИГУРАЦИЯ ПЛАНИРОВЩИКА:');
    const schedulerPath = path.join(process.cwd(), 'modules', 'scheduler', 'tonBoostIncomeScheduler.ts');
    
    if (fs.existsSync(schedulerPath)) {
      const schedulerContent = fs.readFileSync(schedulerPath, 'utf-8');
      
      // Проверяем интервал
      const intervalMatch = schedulerContent.match(/setInterval.*?(\d+)\s*\*\s*60\s*\*\s*1000/);
      if (intervalMatch) {
        console.log(`Интервал запуска: ${intervalMatch[1]} минут`);
      }
      
      // Проверяем наличие try-catch
      const hasTryCatch = schedulerContent.includes('try {') && schedulerContent.includes('catch');
      console.log(`Обработка ошибок: ${hasTryCatch ? '✓ Есть' : '✗ Нет'}`);
      
      // Проверяем логирование
      const hasLogging = schedulerContent.includes('console.log') || schedulerContent.includes('logger');
      console.log(`Логирование: ${hasLogging ? '✓ Есть' : '✗ Нет'}`);
    }
    
    // 5. Проверяем типичные проблемы
    console.log('\n\n5. ТИПИЧНЫЕ ПРОБЛЕМЫ:');
    
    console.log('\nВозможные причины остановки:');
    console.log('  1. Необработанное исключение в коде планировщика');
    console.log('  2. Проблемы с подключением к БД');
    console.log('  3. Несоответствие типов данных (string vs number для user_id)');
    console.log('  4. Отсутствие активных пользователей с boost');
    console.log('  5. Ошибки в расчете наград');
    
    // 6. Рекомендации
    console.log('\n\n6. РЕКОМЕНДАЦИИ:');
    console.log('  1. Добавить глобальную обработку ошибок в планировщик');
    console.log('  2. Добавить детальное логирование каждого шага');
    console.log('  3. Реализовать механизм автоперезапуска при сбое');
    console.log('  4. Добавить мониторинг состояния планировщика');
    console.log('  5. Создать отдельный health-check endpoint');
    
    // 7. Проверяем есть ли процесс node
    console.log('\n\n7. ПРОВЕРКА ПРОЦЕССОВ:');
    try {
      const { execSync } = require('child_process');
      const processes = execSync('ps aux | grep -E "node|tsx" | grep -v grep', { encoding: 'utf-8' });
      console.log('Запущенные Node процессы:');
      console.log(processes);
    } catch (e) {
      console.log('Не удалось получить список процессов');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

diagnoseTonBoostScheduler();