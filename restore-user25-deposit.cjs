#!/usr/bin/env node

/**
 * СКРИПТ ВОССТАНОВЛЕНИЯ: Депозит User #25 - 0.1 TON
 * 
 * Этот скрипт вызывает backend API для обработки депозита User #25,
 * который успешно прошел в блокчейне но не был зафиксирован в БД.
 */

const fetch = require('node-fetch');

const USER25_DEPOSIT_DATA = {
  ton_tx_hash: 'b30da7471672b8fc154baca674b2cc9c0829ead2a443bfa901f7b676ced2c70d',
  amount: 0.1,
  wallet_address: 'user25_wallet_address' // Можно уточнить из блокчейн данных
};

async function restoreUser25Deposit() {
  console.log('🎯 ВОССТАНОВЛЕНИЕ ДЕПОЗИТА USER #25');
  console.log('==================================');
  console.log('User: DimaOsadchuk (ID: 25, telegram_id: 425855744)');
  console.log('Сумма:', USER25_DEPOSIT_DATA.amount, 'TON');
  console.log('Hash:', USER25_DEPOSIT_DATA.ton_tx_hash);
  console.log('');

  try {
    console.log('📤 Отправляем запрос к backend API...');
    
    const response = await fetch('http://localhost:3000/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ВАЖНО: Нужен валидный JWT токен User #25 для авторизации
        // 'Authorization': 'Bearer <USER25_JWT_TOKEN>'
      },
      body: JSON.stringify(USER25_DEPOSIT_DATA)
    });

    const result = await response.json();

    console.log('📥 Ответ от backend:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('');
      console.log('✅ ДЕПОЗИТ УСПЕШНО ВОССТАНОВЛЕН!');
      console.log('- Транзакция ID:', result.transaction_id);
      console.log('- Сумма зачислена:', result.amount, 'TON');
      console.log('- User #25 теперь должен видеть обновленный баланс в UI');
    } else {
      console.log('');
      console.log('❌ ОШИБКА ПРИ ВОССТАНОВЛЕНИИ:');
      console.log('- Код ошибки:', response.status);
      console.log('- Сообщение:', result.error || 'Неизвестная ошибка');
      
      if (response.status === 401) {
        console.log('');
        console.log('🔐 ТРЕБУЕТСЯ АВТОРИЗАЦИЯ:');
        console.log('Для восстановления депозита нужен валидный JWT токен User #25.');
        console.log('Получите токен через аутентификацию User #25 и добавьте в заголовок Authorization.');
      }
    }

  } catch (error) {
    console.log('');
    console.log('💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('Убедитесь что backend server запущен на localhost:3000');
  }

  console.log('');
  console.log('📋 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('1. Проверить баланс User #25 в UI');  
  console.log('2. Убедиться что транзакция появилась в истории');
  console.log('3. Протестировать новые TON депозиты через TON Connect');
}

restoreUser25Deposit().catch(console.error);