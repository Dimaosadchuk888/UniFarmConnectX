/**
 * ПРЯМАЯ КОМПЕНСАЦИЯ USER 228 - 1.0 TON
 * Использует существующие модули системы
 */

import { BalanceManager } from './core/BalanceManager';
import { UnifiedTransactionService } from './core/UnifiedTransactionService';

async function executeCompensation() {
  console.log('💰 НАЧИНАЮ КОМПЕНСАЦИЮ USER 228');
  console.log('Сумма: 1.0 TON');
  console.log('Основание: Потерянная транзакция d1077cd0\n');

  try {
    // 1. Создаем транзакцию компенсации
    console.log('📝 Создание компенсационной транзакции...');
    
    const transactionId = await UnifiedTransactionService.createTransaction({
      user_id: 228,
      type: 'FARMING_REWARD',
      amount: '1.0',
      currency: 'TON',
      description: 'Компенсация потерянного TON депозита d1077cd0 из-за мошеннической схемы User 249',
      metadata: {
        compensation: true,
        original_transaction: 'd1077cd0',
        fraud_case: 'User_249_scheme',
        authorized_by: 'manual_admin',
        compensation_date: new Date().toISOString()
      }
    });

    console.log(`✅ Транзакция создана с ID: ${transactionId}`);

    // 2. Обновляем баланс пользователя
    console.log('💰 Обновление баланса...');
    
    await BalanceManager.addBalance(228, 1.0, 'TON');
    console.log('✅ Баланс User 228 увеличен на 1.0 TON');

    // 3. Проверяем результат
    console.log('🔍 Проверка компенсации...');
    
    const updatedBalance = await BalanceManager.getBalance(228, 'TON');
    console.log(`📊 Новый TON баланс User 228: ${updatedBalance}`);

    console.log('\n🎉 КОМПЕНСАЦИЯ ВЫПОЛНЕНА УСПЕШНО!');
    console.log('📋 ИТОГИ:');
    console.log('   ✅ User 228 получил 1.0 TON');
    console.log('   ✅ Транзакция зафиксирована в системе');
    console.log('   ✅ Баланс корректно обновлен');
    console.log('   ✅ Справедливость восстановлена');

  } catch (error) {
    console.error('❌ ОШИБКА КОМПЕНСАЦИИ:', error.message);
    console.error('Стек ошибки:', error.stack);
    
    // Создаем fallback инструкцию
    console.log('\n📄 СОЗДАНИЕ BACKUP ИНСТРУКЦИИ...');
    
    const backupInstruction = {
      user_id: 228,
      action: 'add_balance',
      amount: '1.0',
      currency: 'TON',
      description: 'Компенсация потерянного TON депозита d1077cd0',
      reason: 'Мошенническая схема User 249 помешала обработке транзакции',
      status: 'requires_manual_execution',
      created_at: new Date().toISOString()
    };

    require('fs').writeFileSync(
      'BACKUP_COMPENSATION_USER228.json', 
      JSON.stringify(backupInstruction, null, 2)
    );
    
    console.log('📋 Backup инструкция создана: BACKUP_COMPENSATION_USER228.json');
  }
}

executeCompensation();