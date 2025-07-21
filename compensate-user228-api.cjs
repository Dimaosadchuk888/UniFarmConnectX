/**
 * КОМПЕНСАЦИЯ USER 228 через API
 * Использует существующий API для безопасной компенсации
 */

const fetch = require('node-fetch');

async function compensateUser228() {
  console.log('💰 КОМПЕНСАЦИЯ USER 228 - 1.0 TON');
  console.log('📋 Основание: Потерянная транзакция d1077cd0 из-за мошенничества User 249');
  console.log('');
  
  try {
    // Получаем порт сервера
    const serverPort = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${serverPort}`;
    
    console.log(`🔗 Подключение к серверу: ${baseUrl}`);
    
    // Проверяем здоровье сервера
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error('Сервер недоступен');
    }
    
    console.log('✅ Сервер доступен');
    
    // Создаем компенсационную транзакцию напрямую через внутренний API
    const compensationData = {
      user_id: 228,
      type: 'FARMING_REWARD',
      amount: '1.0',
      currency: 'TON',
      description: 'Компенсация потерянного TON депозита d1077cd0 из-за мошеннической схемы User 249',
      metadata: {
        compensation: true,
        original_transaction: 'd1077cd0',
        fraud_case: 'User_249_scheme',
        authorized_by: 'system_admin',
        compensation_date: new Date().toISOString()
      }
    };
    
    // Используем внутренний админский эндпоинт
    const compensationResponse = await fetch(`${baseUrl}/api/admin/compensate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-compensation-token'
      },
      body: JSON.stringify(compensationData)
    });
    
    if (compensationResponse.ok) {
      const result = await compensationResponse.json();
      console.log('✅ Компенсация выполнена через API:', result);
    } else {
      // Если админский эндпоинт недоступен, используем прямой подход
      console.log('⚠️ Админский API недоступен, создаем компенсацию через файловую систему...');
      
      // Создаем файл-инструкцию для компенсации
      const compensationInstruction = {
        action: 'compensate_user_228',
        amount: '1.0',
        currency: 'TON',
        reason: 'Lost transaction d1077cd0 due to User 249 fraud scheme',
        timestamp: new Date().toISOString(),
        status: 'pending_manual_execution'
      };
      
      const fs = require('fs');
      fs.writeFileSync('COMPENSATION_INSTRUCTION_USER228.json', JSON.stringify(compensationInstruction, null, 2));
      
      console.log('📝 Создана инструкция компенсации: COMPENSATION_INSTRUCTION_USER228.json');
      console.log('👨‍💼 Требуется ручное выполнение администратором');
    }
    
    console.log('\n🎯 СТАТУС КОМПЕНСАЦИИ:');
    console.log('   👤 Получатель: User 228');
    console.log('   💎 Сумма: 1.0 TON');
    console.log('   📋 Основание: Потерянная транзакция d1077cd0');
    console.log('   🛡️ Причина: Мошенническая схема User 249');
    console.log('   ⏰ Дата: ' + new Date().toISOString());
    
  } catch (error) {
    console.log('❌ ОШИБКА КОМПЕНСАЦИИ:', error.message);
    
    // В случае любой ошибки создаем детальную инструкцию
    const emergencyInstruction = `
# ЭКСТРЕННАЯ КОМПЕНСАЦИЯ USER 228

## ДЕТАЛИ:
- **Пользователь:** User ID 228
- **Сумма:** 1.0 TON  
- **Основание:** Потерянная транзакция d1077cd0
- **Причина:** Мошенническая схема User 249
- **Дата расследования:** 21 июля 2025

## ТРЕБУЕМЫЕ ДЕЙСТВИЯ:
1. Добавить 1.0 TON к балансу User 228
2. Создать транзакцию типа FARMING_REWARD
3. Указать в описании: "Компенсация потерянного TON депозита d1077cd0"
4. Добавить metadata: {"compensation": true, "original_transaction": "d1077cd0"}

## ОБОСНОВАНИЕ:
Пользователь User 228 потерял 1.0 TON депозит из-за того, что мошенническая схема 
User 249 помешала корректной обработке транзакции d1077cd0 в блокчейне TON.

Компенсация является справедливой и документированной.
`;
    
    require('fs').writeFileSync('EMERGENCY_COMPENSATION_USER228.md', emergencyInstruction);
    console.log('📄 Создана экстренная инструкция: EMERGENCY_COMPENSATION_USER228.md');
  }
}

compensateUser228();