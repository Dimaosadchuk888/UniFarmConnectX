// Модуль для проверки API фарминга UNI 
import fetch from 'node-fetch';

const BASE_URL = "https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev:3000";
const USER_ID = 1;

// Добавление заголовков для тестирования в режиме разработки
const headers = {
  'Content-Type': 'application/json',
  'X-Development-Mode': 'true',
  'X-Development-User-Id': USER_ID.toString()
};

async function testSimulateReward() {
  console.log('Тест 1: Симуляция вознаграждения за фарминг');
  try {
    const response = await fetch(`${BASE_URL}/api/new-uni-farming/simulate-reward`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 100, userId: USER_ID })
    });
    
    const data = await response.json();
    console.log('Результат симуляции:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при симуляции вознаграждения:', error);
  }
}

async function testGetUserFarmingInfo() {
  console.log('\nТест 2: Получение информации о фарминге пользователя');
  try {
    const response = await fetch(`${BASE_URL}/api/new-uni-farming/info?userId=${USER_ID}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    console.log('Информация о фарминге:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при получении информации о фарминге:', error);
  }
}

async function testCreateDeposit() {
  console.log('\nТест 3: Создание депозита для фарминга');
  try {
    const response = await fetch(`${BASE_URL}/api/new-uni-farming/deposit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: 10, userId: USER_ID })
    });
    
    const data = await response.json();
    console.log('Результат создания депозита:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при создании депозита:', error);
  }
}

async function testGetUserDeposits() {
  console.log('\nТест 4: Получение списка депозитов пользователя');
  try {
    const response = await fetch(`${BASE_URL}/api/new-uni-farming/deposits?userId=${USER_ID}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    console.log('Список депозитов:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при получении списка депозитов:', error);
  }
}

async function testUpdateUserFarmingBalance() {
  console.log('\nТест 5: Обновление баланса фарминга');
  try {
    const response = await fetch(`${BASE_URL}/api/new-uni-farming/update-balance?userId=${USER_ID}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    console.log('Результат обновления баланса:', data);
    return data;
  } catch (error) {
    console.error('Ошибка при обновлении баланса:', error);
  }
}

async function runTests() {
  await testSimulateReward();
  await testGetUserFarmingInfo();
  await testCreateDeposit();
  await testGetUserDeposits();
  await testUpdateUserFarmingBalance();
}

runTests();