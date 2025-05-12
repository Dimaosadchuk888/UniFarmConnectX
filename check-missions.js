// Скрипт для проверки API миссий
import fetch from 'node-fetch';

async function checkMissions() {
  try {
    console.log('Проверка миссий...');
    const response = await fetch('https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev:3000/api/missions/active');
    
    if (response.ok) {
      const data = await response.json();
      console.log('Ответ API:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('Ошибка API:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

checkMissions();