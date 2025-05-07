import WebSocket from 'ws';

// Создаем соединение с WebSocket сервером
const ws = new WebSocket('ws://localhost:5000/ws');

// Обработчики событий соединения
ws.on('open', function open() {
  console.log('Соединение с WebSocket сервером установлено');
  
  // Отправляем тестовое сообщение
  const message = {
    type: 'test',
    data: {
      message: 'Тестовое сообщение для проверки WebSocket'
    }
  };
  
  ws.send(JSON.stringify(message));
  console.log('Отправлено тестовое сообщение');
  
  // Отправляем пинг для проверки heartbeat
  const pingMessage = {
    type: 'ping',
    data: {
      timestamp: Date.now()
    }
  };
  
  ws.send(JSON.stringify(pingMessage));
  console.log('Отправлен ping');
});

// Обработчик входящих сообщений
ws.on('message', function incoming(data) {
  const message = JSON.parse(data);
  console.log('Получено сообщение от сервера:', message);
  
  // Если получили pong, значит heartbeat работает
  if (message.type === 'pong') {
    console.log('Получен pong, heartbeat работает корректно');
  }
  
  // Завершаем тест через 2 секунды
  setTimeout(() => {
    ws.close();
    console.log('Тест завершен, соединение закрыто');
  }, 2000);
});

// Обработчик ошибок
ws.on('error', function error(err) {
  console.error('Ошибка WebSocket соединения:', err);
});

// Обработчик закрытия соединения
ws.on('close', function close() {
  console.log('Соединение с WebSocket сервером закрыто');
  process.exit(0);
});

// Завершаем тест через 5 секунд в любом случае
setTimeout(() => {
  console.log('Тайм-аут тестирования');
  process.exit(0);
}, 5000);