/**
 * РУЧНАЯ КОМПЕНСАЦИЯ USER 228 - 1.0 TON
 * Прямое обращение к базе данных через существующие модули
 */

async function manualCompensation() {
  console.log('💰 РУЧНАЯ КОМПЕНСАЦИЯ USER 228');
  console.log('Сумма: 1.0 TON');
  console.log('Основание: Потерянная транзакция d1077cd0\n');

  try {
    // Импортируем модули напрямую
    const path = require('path');
    const { createRequire } = require('module');
    const require = createRequire(import.meta.url);

    // Пробуем разные пути к модулям
    const modulePaths = [
      './core/BalanceManager.js',
      './dist/core/BalanceManager.js', 
      './modules/wallet/service.js',
      './dist/modules/wallet/service.js'
    ];

    let BalanceManager = null;
    let WalletService = null;

    for (const modulePath of modulePaths) {
      try {
        if (modulePath.includes('BalanceManager')) {
          BalanceManager = require(modulePath).BalanceManager;
          if (BalanceManager) {
            console.log(`✅ BalanceManager загружен из: ${modulePath}`);
            break;
          }
        }
      } catch (e) {
        // Игнорируем ошибки импорта
      }
    }

    if (!BalanceManager) {
      console.log('⚠️ BalanceManager недоступен, используем прямой API подход');
      
      // Создаем транзакцию через внутренний API
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3000/api/v2/wallet/manual-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 228,
          amount: '1.0',
          currency: 'TON',
          description: 'Компенсация потерянного TON депозита d1077cd0',
          type: 'compensation'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Компенсация выполнена через API:', result);
        return;
      } else {
        console.log('❌ API недоступен, переходим к прямому обновлению');
      }
    }

    // Если все другие методы не работают, создаем компенсацию через файловую инъекцию
    console.log('🔧 Создание SQL инъекции для компенсации...');
    
    const compensationSQL = `
-- КОМПЕНСАЦИЯ USER 228 - 1.0 TON
-- Выполнить в базе данных:

-- 1. Создать транзакцию
INSERT INTO transactions (
  user_id, 
  type, 
  amount, 
  currency, 
  description, 
  metadata,
  status,
  created_at, 
  updated_at
) VALUES (
  228,
  'FARMING_REWARD',
  '1.0',
  'TON',
  'Компенсация потерянного TON депозита d1077cd0 из-за мошеннической схемы User 249',
  '{"compensation": true, "original_transaction": "d1077cd0", "fraud_case": "User_249_scheme", "authorized_by": "manual_admin"}',
  'completed',
  NOW(),
  NOW()
);

-- 2. Обновить баланс пользователя
UPDATE users 
SET balance_ton = (CAST(balance_ton AS DECIMAL) + 1.0)::TEXT 
WHERE id = 228;

-- 3. Проверить результат
SELECT 
  id, 
  balance_ton, 
  (SELECT COUNT(*) FROM transactions WHERE user_id = 228 AND description LIKE '%компенсация%d1077cd0%') as compensation_count
FROM users 
WHERE id = 228;
`;

    require('fs').writeFileSync('EXECUTE_COMPENSATION_USER228.sql', compensationSQL);
    console.log('📄 SQL скрипт создан: EXECUTE_COMPENSATION_USER228.sql');

    // Также создаем JSON инструкцию для автоматического выполнения
    const autoCompensation = {
      action: 'compensate_user',
      user_id: 228,
      amount: '1.0',
      currency: 'TON',
      reason: 'Lost transaction d1077cd0 due to fraud scheme User 249',
      transaction_type: 'FARMING_REWARD',
      status: 'ready_for_execution',
      created_at: new Date().toISOString(),
      sql_file: 'EXECUTE_COMPENSATION_USER228.sql'
    };

    require('fs').writeFileSync('AUTO_COMPENSATION_USER228.json', JSON.stringify(autoCompensation, null, 2));
    console.log('📋 Автоматическая инструкция: AUTO_COMPENSATION_USER228.json');

    console.log('\n🎯 КОМПЕНСАЦИЯ ПОДГОТОВЛЕНА:');
    console.log('   📄 SQL скрипт готов к выполнению');
    console.log('   💰 Сумма: 1.0 TON для User 228');
    console.log('   📋 Основание: Потерянная транзакция d1077cd0');
    console.log('   ⚡ Статус: Готов к применению администратором');

  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

manualCompensation();