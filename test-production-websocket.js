/**
 * Тест WebSocket уведомлений с реальными данными
 * Проверяет работу автоматических обновлений баланса в production режиме
 */

const WebSocket = require('ws');

async function testProductionWebSocket() {
  console.log('🔄 Тестирование WebSocket уведомлений с реальными данными...');
  
  try {
    // Подключаемся к WebSocket серверу
    const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.on('open', () => {
      console.log('✅ WebSocket подключен');
      
      // Подписываемся на обновления пользователя 48 (production user)
      ws.send(JSON.stringify({
        type: 'subscribe',
        userId: 48
      }));
      
      console.log('📡 Подписка на обновления пользователя 48 отправлена');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Получено сообщение:', message);
        
        if (message.type === 'balance_update') {
          console.log('💰 Обновление баланса:', {
            userId: message.userId,
            currency: message.currency,
            changeAmount: message.changeAmount,
            source: message.source,
            timestamp: message.timestamp
          });
        }
      } catch (error) {
        console.error('❌ Ошибка парсинга сообщения:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket соединение закрыто');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket ошибка:', error);
    });
    
    // Симулируем обновление баланса через API
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/v2/test/balance-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer production-test-token'
          },
          body: JSON.stringify({
            userId: 48,
            balanceUni: 3184185.675944,
            balanceTon: 1000.072063,
            changeAmount: 0.125,
            currency: 'TON',
            source: 'boost'
          })
        });
        
        if (response.ok) {
          console.log('✅ Тестовое обновление баланса отправлено');
        } else {
          console.log('⚠️ Тестовый эндпоинт недоступен (это нормально)');
        }
      } catch (error) {
        console.log('⚠️ Тестовый эндпоинт недоступен (это нормально)');
      }
    }, 2000);
    
    // Закрываем соединение через 10 секунд
    setTimeout(() => {
      ws.close();
      console.log('🏁 Тест завершен');
    }, 10000);
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

// Запускаем тест
testProductionWebSocket();