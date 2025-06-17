/**
 * ФИНАЛЬНАЯ ОЦЕНКА СИСТЕМЫ UNIFARM
 * Определение точных оставшихся задач до 100% готовности
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * 1. Проверка всех API endpoints
 */
async function checkAllEndpoints() {
  console.log('\n=== ПРОВЕРКА API ENDPOINTS ===');
  
  const criticalEndpoints = [
    '/health',
    '/api/v2/health',
    '/api/v2/auth/telegram',
    '/api/v2/users/profile',
    '/api/v2/farming/start',
    '/api/v2/boost/packages',
    '/api/v2/referral/info',
    '/api/v2/missions/list',
    '/api/v2/daily-bonus/claim',
    '/api/v2/ton-farming/info',
    '/api/v2/admin/stats'
  ];
  
  const results = [];
  
  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      const status = response.status;
      const isWorking = status !== 404;
      
      results.push({
        endpoint,
        status,
        working: isWorking
      });
      
      console.log(`${isWorking ? '✅' : '❌'} ${endpoint} - ${status}`);
    } catch (error) {
      results.push({
        endpoint,
        status: 'ERROR',
        working: false,
        error: error.message
      });
      console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
    }
  }
  
  const workingCount = results.filter(r => r.working).length;
  const readiness = Math.round((workingCount / criticalEndpoints.length) * 100);
  
  console.log(`\n📊 API Endpoints: ${workingCount}/${criticalEndpoints.length} работают (${readiness}%)`);
  
  return {
    total: criticalEndpoints.length,
    working: workingCount,
    readiness,
    results
  };
}

/**
 * 2. Проверка базы данных
 */
async function checkDatabase() {
  console.log('\n=== ПРОВЕРКА БАЗЫ ДАННЫХ ===');
  
  const requiredTables = [
    'users',
    'transactions', 
    'boost_purchases',
    'missions',
    'mission_progress',
    'airdrop_claims',
    'wallet_logs',
    'daily_bonus_history'
  ];
  
  const tableStatus = [];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        tableStatus.push({
          table,
          exists: false,
          count: 0,
          error: error.message
        });
        console.log(`❌ ${table} - НЕ СУЩЕСТВУЕТ: ${error.message}`);
      } else {
        tableStatus.push({
          table,
          exists: true,
          count: data?.length || 0
        });
        console.log(`✅ ${table} - ${data?.length || 0} записей`);
      }
    } catch (err) {
      tableStatus.push({
        table,
        exists: false,
        count: 0,
        error: err.message
      });
      console.log(`❌ ${table} - ОШИБКА: ${err.message}`);
    }
  }
  
  const existingTables = tableStatus.filter(t => t.exists).length;
  const dbReadiness = Math.round((existingTables / requiredTables.length) * 100);
  
  console.log(`\n📊 Database: ${existingTables}/${requiredTables.length} таблиц (${dbReadiness}%)`);
  
  return {
    total: requiredTables.length,
    existing: existingTables,
    readiness: dbReadiness,
    tables: tableStatus
  };
}

/**
 * 3. Проверка пользователей и данных
 */
async function checkUserData() {
  console.log('\n=== ПРОВЕРКА ПОЛЬЗОВАТЕЛЬСКИХ ДАННЫХ ===');
  
  try {
    // Пользователи
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log(`❌ Ошибка загрузки пользователей: ${usersError.message}`);
      return { readiness: 0 };
    }
    
    console.log(`✅ Пользователи: ${users.length} зарегистрированных`);
    
    // Активные фармеры
    const activeFarmers = users.filter(u => 
      u.uni_farming_start_timestamp && 
      u.uni_deposit_amount > 0
    ).length;
    
    console.log(`✅ Активные UNI фармеры: ${activeFarmers}`);
    
    // TON Boost пользователи
    const tonBoostUsers = users.filter(u => 
      u.ton_boost_package && 
      u.ton_boost_deposit_amount > 0
    ).length;
    
    console.log(`✅ TON Boost пользователи: ${tonBoostUsers}`);
    
    // Транзакции
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*');
    
    console.log(`✅ Транзакции: ${transactions?.length || 0} обработанных`);
    
    // Баланс системы
    const totalUNI = users.reduce((sum, u) => sum + (u.balance_uni || 0), 0);
    const totalTON = users.reduce((sum, u) => sum + (u.balance_ton || 0), 0);
    
    console.log(`✅ Общий баланс: ${totalUNI} UNI, ${totalTON} TON`);
    
    const dataHealth = users.length > 0 ? 100 : 0;
    
    return {
      users: users.length,
      activeFarmers,
      tonBoostUsers,
      transactions: transactions?.length || 0,
      totalUNI,
      totalTON,
      readiness: dataHealth
    };
    
  } catch (error) {
    console.log(`❌ Ошибка проверки данных: ${error.message}`);
    return { readiness: 0 };
  }
}

/**
 * 4. Проверка архитектуры кода
 */
async function checkCodeArchitecture() {
  console.log('\n=== ПРОВЕРКА АРХИТЕКТУРЫ КОДА ===');
  
  const modulesPath = './modules';
  const requiredFiles = ['controller.ts', 'routes.ts', 'service.ts', 'types.ts', 'model.ts'];
  
  try {
    const modules = fs.readdirSync(modulesPath);
    let totalModules = 0;
    let completeModules = 0;
    
    for (const module of modules) {
      const modulePath = path.join(modulesPath, module);
      if (fs.statSync(modulePath).isDirectory()) {
        totalModules++;
        
        const moduleFiles = fs.readdirSync(modulePath);
        const hasAllFiles = requiredFiles.every(file => 
          moduleFiles.includes(file)
        );
        
        if (hasAllFiles) {
          completeModules++;
          console.log(`✅ ${module} - полная архитектура`);
        } else {
          const missingFiles = requiredFiles.filter(file => 
            !moduleFiles.includes(file)
          );
          console.log(`❌ ${module} - отсутствуют: ${missingFiles.join(', ')}`);
        }
      }
    }
    
    const architectureReadiness = Math.round((completeModules / totalModules) * 100);
    console.log(`\n📊 Архитектура: ${completeModules}/${totalModules} модулей (${architectureReadiness}%)`);
    
    return {
      total: totalModules,
      complete: completeModules,
      readiness: architectureReadiness
    };
    
  } catch (error) {
    console.log(`❌ Ошибка проверки архитектуры: ${error.message}`);
    return { readiness: 0 };
  }
}

/**
 * 5. Проверка Telegram интеграции
 */
async function checkTelegramIntegration() {
  console.log('\n=== ПРОВЕРКА TELEGRAM ИНТЕГРАЦИИ ===');
  
  const checks = [
    {
      name: 'TELEGRAM_BOT_TOKEN',
      check: () => !!process.env.TELEGRAM_BOT_TOKEN,
      weight: 30
    },
    {
      name: 'Webhook endpoint',
      check: async () => {
        try {
          const response = await fetch('http://localhost:3000/webhook');
          return response.status !== 404;
        } catch {
          return false;
        }
      },
      weight: 25
    },
    {
      name: 'Telegram auth endpoint',
      check: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/v2/auth/telegram');
          return response.status !== 404;
        } catch {
          return false;
        }
      },
      weight: 25
    },
    {
      name: 'Mini App files',
      check: () => {
        try {
          return fs.existsSync('./client/public/manifest.json');
        } catch {
          return false;
        }
      },
      weight: 20
    }
  ];
  
  let totalScore = 0;
  let maxScore = 0;
  
  for (const check of checks) {
    const result = await check.check();
    const score = result ? check.weight : 0;
    totalScore += score;
    maxScore += check.weight;
    
    console.log(`${result ? '✅' : '❌'} ${check.name} - ${score}/${check.weight}`);
  }
  
  const telegramReadiness = Math.round((totalScore / maxScore) * 100);
  console.log(`\n📊 Telegram Integration: ${totalScore}/${maxScore} (${telegramReadiness}%)`);
  
  return {
    score: totalScore,
    maxScore,
    readiness: telegramReadiness
  };
}

/**
 * Генерация финального отчета
 */
function generateFinalReport(results) {
  const {
    endpoints,
    database,
    userData,
    architecture,
    telegram
  } = results;
  
  console.log('\n' + '='.repeat(50));
  console.log('ФИНАЛЬНАЯ ОЦЕНКА ГОТОВНОСТИ UNIFARM');
  console.log('='.repeat(50));
  
  const components = [
    { name: 'API Endpoints', readiness: endpoints.readiness, weight: 25 },
    { name: 'Database', readiness: database.readiness, weight: 20 },
    { name: 'User Data', readiness: userData.readiness, weight: 15 },
    { name: 'Architecture', readiness: architecture.readiness, weight: 20 },
    { name: 'Telegram Integration', readiness: telegram.readiness, weight: 20 }
  ];
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  console.log('\nДЕТАЛЬНЫЙ АНАЛИЗ:');
  for (const component of components) {
    const weightedScore = (component.readiness * component.weight) / 100;
    totalWeightedScore += weightedScore;
    totalWeight += component.weight;
    
    const status = component.readiness >= 90 ? '✅' : 
                   component.readiness >= 70 ? '🟡' : '❌';
    
    console.log(`${status} ${component.name}: ${component.readiness}% (вес: ${component.weight}%)`);
  }
  
  const overallReadiness = Math.round((totalWeightedScore / totalWeight) * 100);
  
  console.log('\n' + '='.repeat(30));
  console.log(`ОБЩАЯ ГОТОВНОСТЬ: ${overallReadiness}%`);
  console.log('='.repeat(30));
  
  // Определение оставшихся задач
  const remainingTasks = [];
  
  if (endpoints.readiness < 100) {
    const brokenEndpoints = endpoints.results.filter(r => !r.working);
    remainingTasks.push({
      priority: 'HIGH',
      task: `Исправить ${brokenEndpoints.length} неработающих API endpoints`,
      details: brokenEndpoints.map(e => `${e.endpoint} (${e.status})`).join(', ')
    });
  }
  
  if (database.readiness < 100) {
    const missingTables = database.tables.filter(t => !t.exists);
    remainingTasks.push({
      priority: 'HIGH',
      task: `Создать ${missingTables.length} отсутствующих таблиц в базе данных`,
      details: missingTables.map(t => t.table).join(', ')
    });
  }
  
  if (architecture.readiness < 100) {
    remainingTasks.push({
      priority: 'MEDIUM',
      task: `Завершить архитектуру ${architecture.total - architecture.complete} модулей`,
      details: 'Добавить недостающие файлы controller.ts, service.ts, types.ts, model.ts'
    });
  }
  
  if (telegram.readiness < 100) {
    remainingTasks.push({
      priority: 'HIGH',
      task: 'Исправить Telegram интеграцию',
      details: 'Проверить токен бота, webhook endpoints, auth система'
    });
  }
  
  if (remainingTasks.length === 0) {
    console.log('\n🎉 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К ЗАПУСКУ!');
    console.log('Никаких критических задач не осталось.');
  } else {
    console.log('\n📋 ОСТАВШИЕСЯ ЗАДАЧИ:');
    remainingTasks.forEach((task, index) => {
      console.log(`\n${index + 1}. [${task.priority}] ${task.task}`);
      console.log(`   Детали: ${task.details}`);
    });
  }
  
  // Статус запуска
  if (overallReadiness >= 95) {
    console.log('\n🚀 СТАТУС: ГОТОВ К КОММЕРЧЕСКОМУ ЗАПУСКУ');
  } else if (overallReadiness >= 85) {
    console.log('\n🟡 СТАТУС: ГОТОВ К BETA ТЕСТИРОВАНИЮ');
  } else {
    console.log('\n❌ СТАТУС: ТРЕБУЕТ ДОРАБОТКИ');
  }
  
  return {
    overallReadiness,
    remainingTasks,
    components,
    canLaunch: overallReadiness >= 95
  };
}

/**
 * Основная функция оценки
 */
async function runFinalAssessment() {
  console.log('🔍 Начинаем финальную оценку системы UniFarm...');
  
  try {
    const endpoints = await checkAllEndpoints();
    const database = await checkDatabase();
    const userData = await checkUserData();
    const architecture = await checkCodeArchitecture();
    const telegram = await checkTelegramIntegration();
    
    const finalReport = generateFinalReport({
      endpoints,
      database,
      userData,
      architecture,
      telegram
    });
    
    // Сохранение отчета
    const reportData = {
      timestamp: new Date().toISOString(),
      overallReadiness: finalReport.overallReadiness,
      canLaunch: finalReport.canLaunch,
      components: finalReport.components,
      remainingTasks: finalReport.remainingTasks,
      detailedResults: {
        endpoints,
        database,
        userData,
        architecture,
        telegram
      }
    };
    
    fs.writeFileSync(
      'FINAL_ASSESSMENT_REPORT.json',
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 Детальный отчет сохранен в FINAL_ASSESSMENT_REPORT.json');
    
    return finalReport;
    
  } catch (error) {
    console.error('❌ Ошибка при проведении оценки:', error);
    return {
      overallReadiness: 0,
      remainingTasks: [{
        priority: 'CRITICAL',
        task: 'Исправить критическую ошибку системы',
        details: error.message
      }],
      canLaunch: false
    };
  }
}

// Запуск оценки
runFinalAssessment()
  .then(result => {
    process.exit(result.canLaunch ? 0 : 1);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });