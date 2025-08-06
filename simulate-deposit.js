// Симуляция TON депозита в Preview режиме
console.log('=== СИМУЛЯЦИЯ TON ДЕПОЗИТА В PREVIEW ===');

// Получаем JWT токен из localStorage
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxODQsInRlbGVncmFtX2lkIjoiMTA4OTg2MTU4NSIsInVzZXJuYW1lIjoiYWxhc2thX2tvbCIsImZpcnN0X25hbWUiOiJBbGFza2EiLCJsYXN0X25hbWUiOm51bGwsImxhbmd1YWdlX2NvZGUiOiJydSIsInByZW1pdW0iOjEsImF1dGhlbnRpY2F0aW9uX2RhdGUiOiIxNzU0NDM5MzcxIiwiaGFzaCI6ImI5NjFjZGVmNGEzNDU4NzAwOWNmMzc2MzQxODc3OGI5YzUyMmJkNTA1ODY1NjA3ZmY4MTMyODBlOGZmNjQ0MjMifSwiaWF0IjoxNzU0NDM5MzcxLCJleHAiOjE3NTQ1MjU3NzF9.h0FKJODgpXgdP3z8bYqzl8GhQCxJJoJj0fxKAhKOJok';

// Симулируем данные транзакции
const mockTransaction = {
  ton_tx_hash: 'PREVIEW_TEST_' + Date.now(),
  amount: 0.1,
  wallet_address: 'UQPreview_Test_Wallet_Address'
};

console.log('Тестовые данные транзакции:', mockTransaction);

// Вызываем API депозита
fetch('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(mockTransaction)
})
.then(response => {
  console.log('HTTP статус:', response.status);
  return response.json();
})
.then(data => {
  console.log('Ответ от backend:', data);
  if (data.success) {
    console.log('✅ Депозит успешно обработан');
    console.log('Transaction ID:', data.transaction_id);
  } else {
    console.log('❌ Ошибка обработки:', data.error);
  }
})
.catch(error => {
  console.error('Сетевая ошибка:', error);
});

console.log('Запрос отправлен, ожидаем ответ...');
