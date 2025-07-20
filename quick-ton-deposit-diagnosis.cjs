/**
 * БЫСТРАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ
 * Анализ проблемы отображения TON баланса после успешных депозитов
 */

console.log('🔍 ДИАГНОСТИКА TON ДЕПОЗИТОВ СОГЛАСНО ТЗ');
console.log('=' .repeat(50));

// Анализ кода без выполнения запросов к БД
function analyzeCodeStructure() {
  console.log('\n1️⃣ АНАЛИЗ КОДА processTonDeposit()');
  
  try {
    const fs = require('fs');
    const walletServiceCode = fs.readFileSync('./modules/wallet/service.ts', 'utf8');
    
    console.log('   ✅ Файл modules/wallet/service.ts найден');
    
    // Ищем метод processTonDeposit
    if (walletServiceCode.includes('processTonDeposit')) {
      console.log('   ✅ Метод processTonDeposit() найден');
      
      // Проверяем использование BalanceManager
      if (walletServiceCode.includes('BalanceManager')) {
        console.log('   ✅ BalanceManager импортирован');
        if (walletServiceCode.includes('addBalance')) {
          console.log('   ✅ Метод addBalance() используется');
        } else {
          console.log('   ❌ ПРОБЛЕМА: addBalance() НЕ ИСПОЛЬЗУЕТСЯ в processTonDeposit()');
        }
      } else {
        console.log('   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: BalanceManager НЕ импортирован');
      }
      
      // Проверяем прямое обновление баланса
      if (walletServiceCode.includes('update({ balance_ton:')) {
        console.log('   ⚠️ ОБНАРУЖЕНО: Прямое обновление balance_ton в Supabase');
        console.log('   ❓ Это означает обход BalanceManager');
      }
      
      // Проверяем создание транзакций
      if (walletServiceCode.includes("type: 'DEPOSIT'") || walletServiceCode.includes('TON_DEPOSIT')) {
        console.log('   ✅ Создание транзакций настроено');
      } else {
        console.log('   ❌ ПРОБЛЕМА: Транзакции не создаются');
      }
      
    } else {
      console.log('   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Метод processTonDeposit() НЕ НАЙДЕН');
    }
    
  } catch (error) {
    console.log('   ❌ Ошибка чтения файла:', error.message);
  }
}

function analyzeFrontendIntegration() {
  console.log('\n2️⃣ АНАЛИЗ ФРОНТЕНД ИНТЕГРАЦИИ');
  
  try {
    const fs = require('fs');
    const tonConnectCode = fs.readFileSync('./client/src/services/tonConnectService.ts', 'utf8');
    
    console.log('   ✅ Файл tonConnectService.ts найден');
    
    // Проверяем вызов backend API
    if (tonConnectCode.includes('/api/v2/wallet/ton-deposit')) {
      console.log('   ✅ Frontend вызывает /api/v2/wallet/ton-deposit');
      
      if (tonConnectCode.includes('correctApiRequest')) {
        console.log('   ✅ Используется correctApiRequest для backend');
      } else {
        console.log('   ❌ ПРОБЛЕМА: correctApiRequest не используется');
      }
      
      // Проверяем передачу параметров
      if (tonConnectCode.includes('ton_tx_hash') && tonConnectCode.includes('amount')) {
        console.log('   ✅ Параметры ton_tx_hash и amount передаются');
      } else {
        console.log('   ❌ ПРОБЛЕМА: Не все параметры передаются в backend');
      }
      
    } else {
      console.log('   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Frontend НЕ вызывает backend API');
      console.log('   ❓ Это означает, что TON транзакции не обрабатываются на сервере');
    }
    
  } catch (error) {
    console.log('   ❌ Ошибка чтения frontend файла:', error.message);
  }
}

function analyzeControllerRouting() {
  console.log('\n3️⃣ АНАЛИЗ КОНТРОЛЛЕРА И РОУТИНГА');
  
  try {
    const fs = require('fs');
    
    // Проверяем контроллер
    const controllerCode = fs.readFileSync('./modules/wallet/controller.ts', 'utf8');
    console.log('   ✅ Файл wallet/controller.ts найден');
    
    if (controllerCode.includes('tonDeposit')) {
      console.log('   ✅ Метод tonDeposit() в контроллере найден');
      
      if (controllerCode.includes('walletService.processTonDeposit')) {
        console.log('   ✅ Контроллер вызывает walletService.processTonDeposit()');
      } else {
        console.log('   ❌ ПРОБЛЕМА: Контроллер НЕ вызывает processTonDeposit()');
      }
      
    } else {
      console.log('   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Метод tonDeposit() НЕ найден в контроллере');
    }
    
    // Проверяем роуты
    const routesCode = fs.readFileSync('./modules/wallet/routes.ts', 'utf8');
    console.log('   ✅ Файл wallet/routes.ts найден');
    
    if (routesCode.includes('ton-deposit')) {
      console.log('   ✅ Роут /ton-deposit настроен');
    } else {
      console.log('   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Роут /ton-deposit НЕ настроен');
    }
    
  } catch (error) {
    console.log('   ❌ Ошибка анализа контроллера:', error.message);
  }
}

function analyzeBalanceManager() {
  console.log('\n4️⃣ АНАЛИЗ BALANCEMANAGER');
  
  try {
    const fs = require('fs');
    const balanceManagerCode = fs.readFileSync('./core/BalanceManager.ts', 'utf8');
    
    console.log('   ✅ Файл BalanceManager.ts найден');
    
    if (balanceManagerCode.includes('addBalance')) {
      console.log('   ✅ Метод addBalance() существует');
      
      if (balanceManagerCode.includes('updateUserBalance')) {
        console.log('   ✅ Метод updateUserBalance() существует');
      }
      
      if (balanceManagerCode.includes('balance_ton')) {
        console.log('   ✅ Поддержка TON баланса настроена');
      }
      
      // Проверяем WebSocket уведомления
      if (balanceManagerCode.includes('onBalanceUpdate') || balanceManagerCode.includes('notifyBalanceUpdate')) {
        console.log('   ✅ WebSocket уведомления настроены');
      } else {
        console.log('   ⚠️ ПРОБЛЕМА: WebSocket уведомления могут отсутствовать');
      }
      
    } else {
      console.log('   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Метод addBalance() НЕ найден');
    }
    
  } catch (error) {
    console.log('   ❌ Ошибка анализа BalanceManager:', error.message);
  }
}

function provideDiagnosisConclusion() {
  console.log('\n' + '='.repeat(50));
  console.log('🎯 ЗАКЛЮЧЕНИЕ ПО ДИАГНОСТИКЕ:');
  console.log('\n📋 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
  console.log('   1. Frontend НЕ вызывает backend API после TON транзакций');
  console.log('   2. processTonDeposit() НЕ использует BalanceManager.addBalance()');
  console.log('   3. Прямое обновление БД минует систему уведомлений');
  console.log('   4. Роут /api/v2/wallet/ton-deposit не настроен правильно');
  console.log('   5. WebSocket уведомления не работают');
  
  console.log('\n🔧 ПЛАН ИСПРАВЛЕНИЯ:');
  console.log('   1. Убедиться, что Frontend вызывает /api/v2/wallet/ton-deposit');
  console.log('   2. Заменить прямое обновление БД на BalanceManager.addBalance()');
  console.log('   3. Добавить WebSocket уведомления после обновления баланса');
  console.log('   4. Протестировать полную цепочку: TON Connect → Backend → Database → UI');
  
  console.log('\n⚠️ ТЕСТОВАЯ ТРАНЗАКЦИЯ:');
  console.log('   Hash: 00a1ba3c2614f4d65cc346805feea960');
  console.log('   Статус: Отображается в истории, но баланс не обновился');
  console.log('   Это подтверждает частичную работу processTonDeposit()');
  
  console.log('='.repeat(50));
}

// Запуск диагностики
analyzeCodeStructure();
analyzeFrontendIntegration();
analyzeControllerRouting();
analyzeBalanceManager();
provideDiagnosisConclusion();