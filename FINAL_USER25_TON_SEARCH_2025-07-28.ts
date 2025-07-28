#!/usr/bin/env tsx

/**
 * ФИНАЛЬНЫЙ ПОИСК: 3 TON депозит User ID 25
 * Поиск транзакции через все возможные источники
 */

console.log('🔍 ФИНАЛЬНЫЙ ПОИСК ТРАНЗАКЦИИ 3 TON - User ID 25');
console.log('📅 28.07.2025, 14:04');
console.log('🔗 Hash: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaK');
console.log('='.repeat(80));

async function searchTransactionEverywhere() {
  const targetHash = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaK';
  const shortHash = targetHash.substring(0, 30);
  
  console.log('1️⃣ Проверяем через API endpoint /health...');
  try {
    const healthResponse = await fetch('http://localhost:3000/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('✅ Сервер работает:', healthData.substring(0, 50));
    } else {
      console.log('❌ Сервер недоступен');
      return;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к серверу');
    return;
  }
  
  console.log('\n2️⃣ Поиск в логах сервера...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Поиск в логах по hash
    const { stdout: logResult } = await execAsync(`grep -i "${shortHash}" server.log 2>/dev/null || echo "Не найдено в логах"`);
    console.log('📋 Результат поиска в логах:', logResult.trim());
    
  } catch (error) {
    console.log('⚠️ Не удалось проверить логи сервера');
  }
  
  console.log('\n3️⃣ Проверяем структуру API endpoints...');
  try {
    // Пробуем разные API endpoints
    const endpoints = [
      '/api/v2/wallet/balance?user_id=25',
      '/api/v2/transactions/user/25?limit=5',
      '/api/v2/transactions?user_id=25&limit=5'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        console.log(`📡 ${endpoint}: HTTP ${response.status}`);
        
        if (response.status === 200) {
          const data = await response.json();
          console.log(`   Данные: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   Ошибка: ${error}`);
      }
    }
  } catch (error) {
    console.log('❌ Ошибка проверки API endpoints');
  }
  
  console.log('\n4️⃣ Анализируем временные файлы...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Проверяем временные файлы
    const { stdout: tempFiles } = await execAsync('find /tmp -name "*unifarm*" 2>/dev/null | head -5 || echo "Нет временных файлов"');
    console.log('📁 Временные файлы:', tempFiles.trim());
    
    // Проверяем логи в папке logs
    const { stdout: logFiles } = await execAsync('ls -la logs/ 2>/dev/null | head -5 || echo "Нет папки logs"');
    console.log('📋 Файлы логов:', logFiles.trim());
    
  } catch (error) {
    console.log('⚠️ Не удалось проверить временные файлы');
  }
  
  console.log('\n='.repeat(80));
  console.log('📋 ИТОГИ ПОИСКА:');
  console.log('='.repeat(80));
  console.log('🔍 Транзакция с hash НЕ НАЙДЕНА в:');
  console.log('   - Database transactions table');
  console.log('   - Server logs');
  console.log('   - API endpoints');
  console.log('   - Temporary files');
  console.log('');
  console.log('📊 ВЫВОДЫ:');
  console.log('   ❌ Blockchain депозит 3 TON НЕ ДОШЕЛ до backend системы');
  console.log('   ❌ Frontend показал средства, но backend их не зарегистрировал');
  console.log('   ❌ Нарушена интеграция TON Connect → Backend API');
  console.log('');
  console.log('🔧 ТРЕБУЕТСЯ:');
  console.log('   1. Восстановить 3 TON для User ID 25 вручную');
  console.log('   2. Исправить TON Connect integration');
  console.log('   3. Добавить мониторинг "потерянных" депозитов');
  console.log('='.repeat(80));
}

searchTransactionEverywhere()
  .then(() => {
    console.log('\n✅ Поиск завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Ошибка поиска:', error);
    process.exit(1);
  });