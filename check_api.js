import fetch from 'node-fetch';

async function fetchData() {
  try {
    // Установка переменной среды для указания разработки
    process.env.NODE_ENV = 'development';
    
    console.log('Отправка запроса на тестовый API...');
    
    const response = await fetch('https://803fffad-2d2f-46cb-9ead-5f7a65a36d53-00-d4808hph6lk4.spock.replit.dev/api/auth/test-referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        referrerId: '1'
      })
    });
    
    console.log('Статус ответа:', response.status);
    console.log('Заголовки ответа:', response.headers);
    
    const data = await response.text();
    console.log('Ответ API:', data);
    
    try {
      // Попытка разобрать JSON
      const jsonData = JSON.parse(data);
      console.log('JSON данные:', jsonData);
    } catch (e) {
      console.log('Не удалось разобрать ответ как JSON');
    }
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

fetchData();