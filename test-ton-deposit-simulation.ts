/**
 * Скрипт для симуляции процесса пополнения через TON Connect
 * Эмулирует действия пользователя в Preview режиме
 */

import { apiRequest } from './client/src/lib/queryClient';

// Симулируем процесс депозита
async function simulateTonDeposit() {
  console.log('=== НАЧАЛО СИМУЛЯЦИИ TON ДЕПОЗИТА ===');
  console.log('Режим: Replit Preview (не Telegram WebApp)');
  
  try {
    // Шаг 1: Проверяем наличие JWT токена
    const jwtToken = localStorage.getItem('unifarm_jwt_token');
    console.log('1. JWT токен:', jwtToken ? 'Найден' : 'Отсутствует');
    
    // Шаг 2: Проверяем текущего пользователя
    const userResponse = await fetch('/api/v2/auth/check', {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    const userData = await userResponse.json();
    console.log('2. Текущий пользователь:', userData);
    
    // Шаг 3: Симулируем подключение кошелька
    console.log('3. Симуляция подключения TON Connect...');
    // В Preview режиме TON Connect может не работать полностью
    
    // Шаг 4: Симулируем отправку транзакции
    const mockTxHash = 'SIMULATE_' + Date.now() + '_PREVIEW';
    const depositAmount = 0.1; // Тестовая сумма
    const walletAddress = 'UQTest_Preview_Wallet_' + Date.now();
    
    console.log('4. Симулируем отправку транзакции:');
    console.log('   - Hash:', mockTxHash);
    console.log('   - Amount:', depositAmount);
    console.log('   - Wallet:', walletAddress);
    
    // Шаг 5: Отправляем на backend
    console.log('5. Отправка на backend /api/v2/wallet/ton-deposit...');
    
    const depositResponse = await fetch('/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        ton_tx_hash: mockTxHash,
        amount: depositAmount,
        wallet_address: walletAddress
      })
    });
    
    const depositResult = await depositResponse.json();
    console.log('6. Ответ от backend:', depositResult);
    
    // Шаг 7: Проверяем баланс
    console.log('7. Проверка баланса после депозита...');
    const balanceResponse = await fetch('/api/v2/wallet/balance?user_id=' + userData.user?.id, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    const balanceData = await balanceResponse.json();
    console.log('8. Новый баланс:', balanceData);
    
  } catch (error) {
    console.error('ОШИБКА В СИМУЛЯЦИИ:', error);
    console.log('Это ожидаемо в Preview режиме');
  }
  
  console.log('=== КОНЕЦ СИМУЛЯЦИИ ===');
}

// Запускаем симуляцию
simulateTonDeposit();