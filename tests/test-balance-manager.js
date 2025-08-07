/**
 * Тест работы BalanceManager
 * Проверяем можем ли мы обновить баланс напрямую
 */
import { balanceManager } from './core/BalanceManager.ts';

async function testBalanceManager() {
  console.log('=== ТЕСТ BALANCEMANAGER ===');
  
  const userId = 62;
  
  try {
    // 1. Получаем текущий баланс
    console.log('1. Получение текущего баланса...');
    const currentBalance = await balanceManager.getUserBalance(userId);
    console.log('Текущий баланс:', JSON.stringify(currentBalance, null, 2));
    
    // 2. Пробуем списать 1 UNI
    console.log('\n2. Попытка списать 1 UNI...');
    const subtractResult = await balanceManager.subtractBalance(userId, 1, 0, 'Test subtract');
    console.log('Результат списания:', JSON.stringify(subtractResult, null, 2));
    
    // 3. Проверяем новый баланс
    console.log('\n3. Проверка нового баланса...');
    const newBalance = await balanceManager.getUserBalance(userId);
    console.log('Новый баланс:', JSON.stringify(newBalance, null, 2));
    
    // 4. Возвращаем баланс обратно
    console.log('\n4. Возвращение баланса...');
    const addResult = await balanceManager.addBalance(userId, 1, 0, 'Test add');
    console.log('Результат добавления:', JSON.stringify(addResult, null, 2));
    
    // 5. Финальная проверка
    console.log('\n5. Финальная проверка баланса...');
    const finalBalance = await balanceManager.getUserBalance(userId);
    console.log('Финальный баланс:', JSON.stringify(finalBalance, null, 2));
    
  } catch (error) {
    console.error('Ошибка в тесте BalanceManager:', error);
    console.error('Stack:', error.stack);
  }
}

testBalanceManager().catch(console.error);