// Файл для тестирования API
import http from 'http';

// Тестовый адрес кошелька, который не существует в базе данных
const testWalletAddress = 'UQBIRuaKRJFCXESfJRjQfGMiZL2FBgydv8wUcQvLAHSc9';

// Формируем URL с параметром wallet_address
const url = `/api/transactions?wallet_address=${testWalletAddress}`;

console.log(`[TEST] Тестирование запроса: ${url}`);

// Делаем GET-запрос к API
const req = https.request({
  hostname: 'localhost',
  port: 3000,
  path: url,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
}, (res) => {
  console.log(`[TEST] Статус ответа: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('[TEST] Получен ответ:');
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Проверяем, что в случае отсутствия транзакций возвращается пустой массив
      if (parsedData.success && parsedData.data && Array.isArray(parsedData.data.transactions)) {
        console.log('[TEST] УСПЕШНО: Возвращен корректный массив transactions');
        if (parsedData.data.transactions.length === 0) {
          console.log('[TEST] УСПЕШНО: Массив transactions пуст, как и ожидалось');
        }
      } else {
        console.log('[TEST] ОШИБКА: Неверный формат ответа');
      }
    } catch (error) {
      console.error('[TEST] ОШИБКА при разборе JSON:', error);
      console.log('Сырой ответ:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('[TEST] Ошибка запроса:', error);
});

req.end();