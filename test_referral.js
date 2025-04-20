import fetch from 'node-fetch';

async function testReferralApi() {
  try {
    console.log('Тестирование API реферальной системы...');
    
    const response = await fetch('http://localhost:5000/api/auth/test-referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referrerId: '1'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Ответ API:', JSON.stringify(data, null, 2));
      return data;
    } else {
      console.error('Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Текст ошибки:', errorText);
    }
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
  }
}

testReferralApi();