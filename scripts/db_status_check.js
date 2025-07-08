/**
 * Упрощенная проверка состояния базы данных через API
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/v2';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4ODgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE5MzQ5MjIsImV4cCI6MTc1MjUzOTcyMn0.TfQyKEhxOr3lGBrJCfCKlDzQ3zUjNNpGWbZaJgjtFnw';

async function testEndpoint(path, description) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    return {
      path,
      description,
      status: response.status,
      success: response.ok,
      data,
      error: response.ok ? null : `${response.status} ${response.statusText}`
    };
  } catch (error) {
    return {
      path,
      description,
      status: 0,
      success: false,
      data: null,
      error: error.message
    };
  }
}

async function checkDatabaseStatus() {
  console.log('🔍 Проверка состояния базы данных через API...\n');
  
  const endpoints = [
    // Основные модули
    { path: '/users/profile', desc: 'Таблица users' },
    { path: '/wallet/balance', desc: 'Доступ к балансам' },
    { path: '/farming/status', desc: 'Таблица farming_sessions' },
    { path: '/referrals/stats', desc: 'Таблица referrals' },
    { path: '/transactions/history', desc: 'Таблица transactions' },
    
    // Проблемные модули (могут не работать)
    { path: '/boost/farming-status', desc: 'Таблица boost_purchases' },
    { path: '/missions/list', desc: 'Таблица missions' },
    { path: '/daily-bonus/status', desc: 'Система daily bonus' },
    { path: '/airdrop/status', desc: 'Таблица airdrops' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path, endpoint.desc);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint.desc}: ${result.success ? 'OK' : result.error}`);
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 АНАЛИЗ РЕЗУЛЬТАТОВ:');
  
  const working = results.filter(r => r.success).length;
  const total = results.length;
  const percentage = Math.round((working / total) * 100);
  
  console.log(`✅ Работающие модули: ${working}/${total} (${percentage}%)`);
  console.log(`❌ Проблемные модули: ${total - working}`);
  
  // Анализ проблем
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\n🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    failed.forEach(f => {
      console.log(`- ${f.description}: ${f.error}`);
      if (f.data && typeof f.data === 'object' && f.data.error) {
        console.log(`  Детали: ${f.data.error}`);
      }
    });
  }
  
  // Рекомендации
  console.log('\n🎯 РЕКОМЕНДАЦИИ:');
  
  if (percentage < 70) {
    console.log('- 🚨 КРИТИЧНО: Менее 70% модулей работает');
    console.log('- 📋 Требуется создание недостающих таблиц в Supabase');
    console.log('- 📄 Используйте SQL-скрипт: docs/database_fix_script.sql');
  } else if (percentage < 90) {
    console.log('- ⚠️ ВНИМАНИЕ: Система работает частично');
    console.log('- 🔧 Рекомендуется добавить недостающие таблицы');
  } else {
    console.log('- ✅ ОТЛИЧНО: Система работает стабильно');
    console.log('- 🎉 База данных синхронизирована с кодом');
  }
  
  return {
    timestamp: new Date().toISOString(),
    total_endpoints: total,
    working_endpoints: working,
    success_rate: percentage,
    failed_endpoints: failed.map(f => ({
      path: f.path,
      description: f.description,
      error: f.error
    })),
    recommendations: percentage < 70 ? 'critical' : percentage < 90 ? 'warning' : 'good'
  };
}

// Запуск
checkDatabaseStatus()
  .then(report => {
    console.log('\n🎯 Проверка завершена!');
    console.log(`Готовность системы: ${report.success_rate}%`);
  })
  .catch(error => {
    console.error('❌ Ошибка проверки:', error.message);
  });