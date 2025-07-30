// Простой скрипт для проверки что возвращает API
import fetch from 'node-fetch';

async function checkAPI() {
  const response = await fetch('http://localhost:5001/api/v2/wallet/balance?user_id=184', {
    headers: {
      'Authorization': 'Bearer test'
    }
  });
  
  const data = await response.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
}

checkAPI().catch(console.error);
