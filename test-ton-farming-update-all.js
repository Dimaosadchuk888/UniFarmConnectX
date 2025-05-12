import https from 'https';

const options = {
  hostname: '93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev',
  port: 3000,
  path: '/api/ton-farming/update-all',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-development-mode': 'true',
    'x-development-user-id': '1'
  }
};

// Игнорируем проверку сертификата, так как это тестовый запрос
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const req = https.request(options, (res) => {
  console.log(`Статус запроса: ${res.statusCode}`);
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Ответ от сервера:');
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error('Ошибка при выполнении запроса:', error);
});

req.end();