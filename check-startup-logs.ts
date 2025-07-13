import { supabase } from './core/supabase';

async function checkStartupLogs() {
  console.log('=== ПРОВЕРКА ЛОГОВ ЗАПУСКА ПОСЛЕ РЕСТАРТА ===\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Проверяем процессы
    console.log('📋 1. ПРОВЕРКА ПРОЦЕССОВ:\n');
    const exec = require('child_process').execSync;
    try {
      const processes = exec('ps aux | grep -E "node|npm" | grep -v grep', { encoding: 'utf-8' });
      console.log('Активные процессы:');
      console.log(processes);
    } catch (e) {
      console.log('Нет активных процессов Node.js\n');
    }

    // 2. Проверяем последние транзакции после рестарта
    console.log('\n📊 2. ТРАНЗАКЦИИ ПОСЛЕ РЕСТАРТА:\n');
    
    const restartTime = new Date();
    restartTime.setMinutes(restartTime.getMinutes() - 5); // Проверяем последние 5 минут

    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('type, currency, amount, created_at, description')
      .gt('created_at', restartTime.toISOString())
      .in('type', ['FARMING_REWARD'])
      .order('created_at', { ascending: false });

    if (!txError && recentTx) {
      console.log(`Найдено транзакций: ${recentTx.length}`);
      
      const uniTx = recentTx.filter(t => t.currency === 'UNI');
      const tonTx = recentTx.filter(t => t.currency === 'TON');
      
      console.log(`- UNI Farming: ${uniTx.length} транзакций`);
      console.log(`- TON Boost: ${tonTx.length} транзакций\n`);
      
      if (tonTx.length === 0) {
        console.log('❌ TON Boost транзакций НЕТ после рестарта!');
      }
    }

    // 3. Проверяем активных пользователей TON Boost
    console.log('\n👥 3. АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ TON BOOST:\n');
    
    const { data: activeUsers, error: activeError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_active, boost_package_id, updated_at')
      .eq('boost_active', true)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!activeError && activeUsers) {
      console.log(`Всего активных: ${activeUsers.length}`);
      console.log('\nПоследние обновления:');
      
      activeUsers.forEach(user => {
        const updatedAt = new Date(user.updated_at);
        const minutesAgo = (new Date().getTime() - updatedAt.getTime()) / 60000;
        
        console.log(`  User ${user.user_id}: farming_balance=${user.farming_balance}, обновлен ${minutesAgo.toFixed(1)} мин назад`);
      });
    }

    // 4. Анализ проблемы
    console.log('\n🔍 4. АНАЛИЗ ПРОБЛЕМЫ:\n');
    
    console.log('Возможные причины почему планировщик не запускается:');
    console.log('1. Ошибка в конструкторе TONBoostIncomeScheduler');
    console.log('2. Исключение при первом вызове processTonBoostIncome()');
    console.log('3. Неверные пути импорта после рестарта');
    console.log('4. Проблема с динамическими импортами внутри планировщика');
    console.log('5. setInterval не устанавливается из-за ошибки\n');

    // 5. Проверяем логи ошибок
    console.log('💡 5. РЕКОМЕНДАЦИИ:\n');
    
    console.log('Для диагностики нужно:');
    console.log('1. Добавить console.log в начало метода start() планировщика');
    console.log('2. Обернуть processTonBoostIncome() в try/catch');
    console.log('3. Проверить логи сервера на ошибки импорта');
    console.log('4. Попробовать запустить планировщик вручную через временный скрипт');

  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkStartupLogs();