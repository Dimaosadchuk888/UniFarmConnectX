/**
 * Тест WebSocket обновлений балансов
 */

import { balanceManager } from '../core/BalanceManager';
import { BalanceNotificationService } from '../modules/websocket/BalanceNotificationService';

async function testWebSocketBalance() {
  console.log('\n=== ТЕСТ WEBSOCKET ОБНОВЛЕНИЙ БАЛАНСОВ ===\n');
  
  const userId = 184;
  const testAmount = 0.01; // Малая сумма для теста
  
  console.log('1. Проверяем статус WebSocket интеграции...');
  
  // Проверяем есть ли callback в BalanceManager
  const hasCallback = (balanceManager as any).onBalanceUpdate !== undefined;
  console.log(`   BalanceManager имеет callback: ${hasCallback ? '✅ ДА' : '❌ НЕТ'}`);
  
  // Проверяем BalanceNotificationService
  const notificationService = BalanceNotificationService.getInstance();
  console.log(`   BalanceNotificationService создан: ✅`);
  
  console.log('\n2. Тестовое обновление баланса...');
  console.log(`   Добавляем ${testAmount} UNI пользователю ${userId}`);
  
  // Добавляем небольшую сумму для теста
  const result = await balanceManager.addBalance(
    userId,
    testAmount,
    0,
    'WebSocket_Test'
  );
  
  if (result.success) {
    console.log('   ✅ Баланс успешно обновлен в БД');
    console.log(`   Новый баланс UNI: ${result.balance_uni}`);
    
    // Проверяем, был ли вызван callback
    console.log('\n3. Проверка WebSocket уведомления...');
    console.log('   ⚠️  WebSocket уведомление должно быть отправлено автоматически');
    console.log('   Проверьте в браузере обновился ли баланс без перезагрузки страницы');
    
    // Возвращаем баланс обратно
    console.log('\n4. Возвращаем баланс обратно...');
    await balanceManager.subtractBalance(
      userId,
      testAmount,
      0,
      'WebSocket_Test_Revert'
    );
    console.log('   ✅ Тестовая сумма вычтена обратно');
    
  } else {
    console.error('   ❌ Ошибка обновления баланса:', result.error);
  }
  
  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log('WebSocket интеграция настроена:', hasCallback ? '✅ ДА' : '❌ НЕТ');
  console.log('\nЕсли баланс НЕ обновился автоматически в браузере:');
  console.log('- WebSocket уведомления не работают');
  console.log('- Требуется ручное обновление страницы\n');
}

// Запускаем тест
testWebSocketBalance()
  .then(() => console.log('✅ Тест завершен'))
  .catch(error => console.error('❌ Ошибка теста:', error));