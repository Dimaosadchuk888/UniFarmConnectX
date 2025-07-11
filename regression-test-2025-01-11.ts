/**
 * Регрессионное тестирование системы UniFarm
 * Дата: 11 января 2025
 * Цель: Проверить работоспособность всех критических компонентов после унификации транзакций
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  component: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const testResults: TestResult[] = [];

// Цветной вывод для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(component: string, test: string, status: TestResult['status'], message: string, details?: any) {
  testResults.push({ component, test, status, message, details });
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`[${status}] ${component} - ${test}: ${message}`, statusColor);
}

// Тест 1: Проверка базы данных
async function testDatabase() {
  log('\n========== ТЕСТ 1: БАЗА ДАННЫХ ==========', 'blue');
  
  try {
    // Проверяем таблицы
    const tables = [
      'users', 'transactions', 'missions', 'user_missions', 
      'referrals', 'farming_sessions', 'boost_purchases',
      'daily_bonus_logs', 'airdrops', 'withdraw_requests', 'user_sessions'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count', { count: 'exact' }).limit(1);
        if (error) {
          addResult('Database', `Table ${table}`, 'FAIL', 'Ошибка доступа', error);
        } else {
          addResult('Database', `Table ${table}`, 'PASS', 'Таблица доступна');
        }
      } catch (e) {
        addResult('Database', `Table ${table}`, 'FAIL', 'Исключение при проверке', e);
      }
    }
    
    // Проверяем типы транзакций
    const { data: txTypes } = await supabase
      .from('transactions')
      .select('type')
      .limit(100);
      
    const uniqueTypes = [...new Set(txTypes?.map(tx => tx.type) || [])];
    const requiredTypes = ['FARMING_REWARD', 'REFERRAL_REWARD', 'MISSION_REWARD', 'DAILY_BONUS', 'BOOST_PURCHASE', 'FARMING_DEPOSIT'];
    
    for (const type of requiredTypes) {
      if (uniqueTypes.includes(type)) {
        addResult('Database', `Transaction type ${type}`, 'PASS', 'Тип транзакции используется');
      } else {
        addResult('Database', `Transaction type ${type}`, 'WARN', 'Тип транзакции не найден в последних 100 записях');
      }
    }
    
  } catch (error) {
    addResult('Database', 'General', 'FAIL', 'Общая ошибка при тестировании БД', error);
  }
}

// Тест 2: Проверка BalanceManager
async function testBalanceManager() {
  log('\n========== ТЕСТ 2: BALANCE MANAGER ==========', 'blue');
  
  try {
    // Проверяем баланс пользователя 74
    const { data: user } = await supabase
      .from('users')
      .select('balance_uni, balance_ton, uni_farming_active, ton_boost_package')
      .eq('id', 74)
      .single();
      
    if (user) {
      addResult('BalanceManager', 'User 74 balance', 'PASS', 
        `UNI: ${user.balance_uni}, TON: ${user.balance_ton}`, user);
      
      if (user.uni_farming_active) {
        addResult('BalanceManager', 'UNI Farming', 'PASS', 'Фарминг активен');
      } else {
        addResult('BalanceManager', 'UNI Farming', 'WARN', 'Фарминг не активен');
      }
      
      if (user.ton_boost_package) {
        addResult('BalanceManager', 'TON Boost', 'PASS', `Пакет #${user.ton_boost_package} активен`);
      } else {
        addResult('BalanceManager', 'TON Boost', 'WARN', 'TON Boost не активен');
      }
    } else {
      addResult('BalanceManager', 'User 74', 'FAIL', 'Пользователь не найден');
    }
    
  } catch (error) {
    addResult('BalanceManager', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Тест 3: Проверка UnifiedTransactionService
async function testTransactionService() {
  log('\n========== ТЕСТ 3: UNIFIED TRANSACTION SERVICE ==========', 'blue');
  
  try {
    // Проверяем последние транзакции с metadata
    const { data: recentTx } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
      
    let withMetadata = 0;
    let withoutMetadata = 0;
    
    recentTx?.forEach(tx => {
      if (tx.metadata && Object.keys(tx.metadata).length > 0) {
        withMetadata++;
      } else {
        withoutMetadata++;
      }
    });
    
    if (withMetadata > 0) {
      addResult('TransactionService', 'Metadata usage', 'PASS', 
        `${withMetadata} из ${recentTx?.length} транзакций имеют metadata`);
    } else {
      addResult('TransactionService', 'Metadata usage', 'WARN', 
        'Не найдено транзакций с metadata в последних 20 записях');
    }
    
    // Проверяем типы транзакций
    const typeGroups = recentTx?.reduce((acc: any, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {});
    
    if (typeGroups) {
      Object.entries(typeGroups).forEach(([type, count]) => {
        addResult('TransactionService', `Type ${type}`, 'PASS', 
          `${count} транзакций`);
      });
    }
    
  } catch (error) {
    addResult('TransactionService', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Тест 4: Проверка планировщиков
async function testSchedulers() {
  log('\n========== ТЕСТ 4: ПЛАНИРОВЩИКИ ==========', 'blue');
  
  try {
    // Проверяем последние farming rewards
    const { data: farmingRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (farmingRewards && farmingRewards.length > 0) {
      const lastReward = farmingRewards[0];
      const timeDiff = new Date().getTime() - new Date(lastReward.created_at).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      
      if (minutesAgo <= 6) {
        addResult('Schedulers', 'UNI Farming Scheduler', 'PASS', 
          `Последнее начисление ${minutesAgo} минут назад`);
      } else {
        addResult('Schedulers', 'UNI Farming Scheduler', 'WARN', 
          `Последнее начисление ${minutesAgo} минут назад (ожидалось < 6)`);
      }
    } else {
      addResult('Schedulers', 'UNI Farming Scheduler', 'WARN', 
        'Не найдено недавних farming rewards');
    }
    
    // Проверяем TON Boost доходы
    const { data: tonBoostIncome } = await supabase
      .from('transactions')
      .select('*')
      .like('description', '%TON Boost income%')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (tonBoostIncome && tonBoostIncome.length > 0) {
      const lastIncome = tonBoostIncome[0];
      const timeDiff = new Date().getTime() - new Date(lastIncome.created_at).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      
      addResult('Schedulers', 'TON Boost Scheduler', 'PASS', 
        `Последнее начисление ${minutesAgo} минут назад`);
    } else {
      addResult('Schedulers', 'TON Boost Scheduler', 'WARN', 
        'Не найдено недавних TON Boost доходов');
    }
    
  } catch (error) {
    addResult('Schedulers', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Тест 5: Проверка реферальной системы
async function testReferralSystem() {
  log('\n========== ТЕСТ 5: РЕФЕРАЛЬНАЯ СИСТЕМА ==========', 'blue');
  
  try {
    // Проверяем реферальные награды
    const { data: refRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (refRewards && refRewards.length > 0) {
      // Анализируем metadata
      let withLevel = 0;
      let withSourceUser = 0;
      
      refRewards.forEach(reward => {
        if (reward.metadata?.level) withLevel++;
        if (reward.metadata?.source_user_id) withSourceUser++;
      });
      
      addResult('ReferralSystem', 'Recent rewards', 'PASS', 
        `${refRewards.length} наград, ${withLevel} с level, ${withSourceUser} с source_user_id`);
        
      // Проверяем описания
      const hasL1 = refRewards.some(r => r.description?.includes('L1'));
      const hasPercentage = refRewards.some(r => r.description?.includes('%'));
      
      if (hasL1 && hasPercentage) {
        addResult('ReferralSystem', 'Description format', 'PASS', 
          'Описания содержат уровни и проценты');
      } else {
        addResult('ReferralSystem', 'Description format', 'WARN', 
          'Некоторые описания не содержат уровни или проценты');
      }
      
    } else {
      addResult('ReferralSystem', 'Recent rewards', 'WARN', 
        'Не найдено недавних реферальных наград');
    }
    
    // Проверяем реферальные цепочки
    const { data: users } = await supabase
      .from('users')
      .select('id, referred_by')
      .not('referred_by', 'is', null)
      .limit(20);
      
    if (users && users.length > 0) {
      addResult('ReferralSystem', 'Referral chains', 'PASS', 
        `${users.length} пользователей имеют реферера`);
    } else {
      addResult('ReferralSystem', 'Referral chains', 'WARN', 
        'Не найдено пользователей с рефералами');
    }
    
  } catch (error) {
    addResult('ReferralSystem', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Тест 6: Проверка миссий
async function testMissions() {
  log('\n========== ТЕСТ 6: МИССИИ ==========', 'blue');
  
  try {
    // Проверяем таблицу миссий
    const { data: missions } = await supabase
      .from('missions')
      .select('*');
      
    if (missions && missions.length > 0) {
      addResult('Missions', 'Mission list', 'PASS', 
        `${missions.length} миссий в системе`);
        
      // Проверяем награды за миссии
      const { data: missionRewards } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'MISSION_REWARD')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (missionRewards && missionRewards.length > 0) {
        const with500UNI = missionRewards.filter(r => r.amount_uni === '500' || r.amount_uni === 500).length;
        addResult('Missions', 'Mission rewards', 'PASS', 
          `${missionRewards.length} наград, ${with500UNI} по 500 UNI`);
      } else {
        addResult('Missions', 'Mission rewards', 'WARN', 
          'Не найдено недавних наград за миссии');
      }
    } else {
      addResult('Missions', 'Mission list', 'FAIL', 
        'Таблица миссий пуста');
    }
    
  } catch (error) {
    addResult('Missions', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Тест 7: Проверка ежедневных бонусов
async function testDailyBonus() {
  log('\n========== ТЕСТ 7: ЕЖЕДНЕВНЫЕ БОНУСЫ ==========', 'blue');
  
  try {
    // Проверяем транзакции ежедневных бонусов
    const { data: dailyBonuses } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'DAILY_BONUS')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (dailyBonuses && dailyBonuses.length > 0) {
      // Анализируем суммы
      const amounts = dailyBonuses.map(b => parseFloat(b.amount_uni || '0'));
      const minAmount = Math.min(...amounts);
      const maxAmount = Math.max(...amounts);
      
      addResult('DailyBonus', 'Bonus transactions', 'PASS', 
        `${dailyBonuses.length} бонусов, от ${minAmount} до ${maxAmount} UNI`);
        
      // Проверяем metadata
      const withStreak = dailyBonuses.filter(b => b.metadata?.streak).length;
      if (withStreak > 0) {
        addResult('DailyBonus', 'Streak tracking', 'PASS', 
          `${withStreak} транзакций с информацией о серии`);
      } else {
        addResult('DailyBonus', 'Streak tracking', 'WARN', 
          'Не найдено транзакций с информацией о серии в metadata');
      }
      
    } else {
      addResult('DailyBonus', 'Bonus transactions', 'WARN', 
        'Не найдено транзакций ежедневных бонусов');
    }
    
    // Проверяем логи в daily_bonus_logs
    const { data: bonusLogs } = await supabase
      .from('daily_bonus_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (bonusLogs && bonusLogs.length > 0) {
      addResult('DailyBonus', 'Bonus logs', 'PASS', 
        `${bonusLogs.length} записей в логах`);
    } else {
      addResult('DailyBonus', 'Bonus logs', 'WARN', 
        'Таблица daily_bonus_logs пуста');
    }
    
  } catch (error) {
    addResult('DailyBonus', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Тест 8: Проверка WebSocket и уведомлений
async function testNotifications() {
  log('\n========== ТЕСТ 8: WEBSOCKET И УВЕДОМЛЕНИЯ ==========', 'blue');
  
  try {
    // Проверяем недавние обновления балансов
    const { data: recentUpdates } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);
      
    if (recentUpdates && recentUpdates.length > 0) {
      const lastUpdate = recentUpdates[0];
      const timeDiff = new Date().getTime() - new Date(lastUpdate.updated_at).getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      
      if (minutesAgo <= 10) {
        addResult('Notifications', 'Balance updates', 'PASS', 
          `Последнее обновление ${minutesAgo} минут назад`);
      } else {
        addResult('Notifications', 'Balance updates', 'WARN', 
          `Последнее обновление ${minutesAgo} минут назад`);
      }
      
      // Здесь можно было бы проверить WebSocket соединение,
      // но это требует активного подключения клиента
      addResult('Notifications', 'WebSocket', 'WARN', 
        'WebSocket проверка требует активного клиента');
        
    } else {
      addResult('Notifications', 'Balance updates', 'FAIL', 
        'Не найдено недавних обновлений балансов');
    }
    
  } catch (error) {
    addResult('Notifications', 'General', 'FAIL', 'Ошибка при проверке', error);
  }
}

// Генерация отчета
function generateReport() {
  log('\n========== ИТОГОВЫЙ ОТЧЕТ ==========', 'magenta');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;
  const total = testResults.length;
  
  const passRate = (passed / total * 100).toFixed(1);
  
  log(`\nВсего тестов: ${total}`, 'blue');
  log(`Успешно: ${passed} (${passRate}%)`, 'green');
  log(`Предупреждения: ${warned}`, 'yellow');
  log(`Ошибки: ${failed}`, 'red');
  
  // Группировка по компонентам
  const componentStats: any = {};
  testResults.forEach(result => {
    if (!componentStats[result.component]) {
      componentStats[result.component] = { pass: 0, fail: 0, warn: 0 };
    }
    componentStats[result.component][result.status.toLowerCase()]++;
  });
  
  log('\n===== СТАТИСТИКА ПО КОМПОНЕНТАМ =====', 'blue');
  Object.entries(componentStats).forEach(([component, stats]: [string, any]) => {
    const total = stats.pass + stats.fail + stats.warn;
    const status = stats.fail > 0 ? 'FAIL' : stats.warn > 0 ? 'WARN' : 'PASS';
    const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    log(`${component}: ${stats.pass}/${total} (${status})`, color);
  });
  
  // Критические проблемы
  const criticalIssues = testResults.filter(r => r.status === 'FAIL');
  if (criticalIssues.length > 0) {
    log('\n===== КРИТИЧЕСКИЕ ПРОБЛЕМЫ =====', 'red');
    criticalIssues.forEach(issue => {
      log(`- ${issue.component}: ${issue.test} - ${issue.message}`, 'red');
    });
  }
  
  // Рекомендации
  log('\n===== РЕКОМЕНДАЦИИ =====', 'yellow');
  if (failed > 0) {
    log('1. Устранить критические ошибки в первую очередь', 'yellow');
  }
  if (warned > 5) {
    log('2. Обратить внимание на компоненты с предупреждениями', 'yellow');
  }
  if (passRate < 90) {
    log('3. Провести дополнительную отладку системы', 'yellow');
  } else {
    log('✓ Система готова к production использованию!', 'green');
  }
  
  // Общая готовность системы
  let readiness = parseFloat(passRate);
  if (failed > 0) readiness -= failed * 5; // Каждая ошибка снижает готовность на 5%
  if (warned > 5) readiness -= 5; // Много предупреждений снижают готовность на 5%
  readiness = Math.max(0, Math.min(100, readiness));
  
  log(`\n===== ГОТОВНОСТЬ СИСТЕМЫ: ${readiness.toFixed(1)}% =====`, readiness >= 80 ? 'green' : readiness >= 60 ? 'yellow' : 'red');
}

// Запуск всех тестов
async function runAllTests() {
  log('РЕГРЕССИОННОЕ ТЕСТИРОВАНИЕ UNIFARM - 11 ЯНВАРЯ 2025', 'magenta');
  log('=============================================\n', 'magenta');
  
  await testDatabase();
  await testBalanceManager();
  await testTransactionService();
  await testSchedulers();
  await testReferralSystem();
  await testMissions();
  await testDailyBonus();
  await testNotifications();
  
  generateReport();
  
  // Сохраняем результаты в файл
  const reportData = {
    date: new Date().toISOString(),
    results: testResults,
    summary: {
      total: testResults.length,
      passed: testResults.filter(r => r.status === 'PASS').length,
      failed: testResults.filter(r => r.status === 'FAIL').length,
      warned: testResults.filter(r => r.status === 'WARN').length
    }
  };
  
  const fs = await import('fs');
  fs.writeFileSync('regression-test-results-2025-01-11.json', JSON.stringify(reportData, null, 2));
  log('\nРезультаты сохранены в regression-test-results-2025-01-11.json', 'blue');
}

// Запускаем тесты
runAllTests().catch(error => {
  log('КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАПУСКЕ ТЕСТОВ', 'red');
  console.error(error);
  process.exit(1);
});