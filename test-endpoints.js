import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/v2';

async function testEndpoints() {
  console.log('Тестирование API endpoints с реальными данными...\n');

  try {
    // 1. Тест health check
    console.log('1. Проверка health check:');
    const healthResponse = await fetch(`${BASE_URL}/status`);
    const healthData = await healthResponse.json();
    console.log('   Статус:', healthData.success ? 'OK' : 'FAIL');
    console.log('   Модули:', healthData.modules?.length || 0);
    console.log('   База данных:', healthData.database);
    console.log('');

    // 2. Тест получения пользователя
    console.log('2. Получение пользователя ID=1:');
    const userResponse = await fetch(`${BASE_URL}/users/1`);
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('   ID:', userData.id);
      console.log('   Telegram ID:', userData.telegram_id);
      console.log('   Баланс UNI:', userData.balance_uni);
      console.log('   Ref код:', userData.ref_code);
    } else {
      console.log('   Ошибка получения пользователя');
    }
    console.log('');

    // 3. Тест получения баланса
    console.log('3. Получение баланса пользователя ID=1:');
    const walletResponse = await fetch(`${BASE_URL}/wallet/1`);
    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      console.log('   UNI баланс:', walletData.uni);
      console.log('   TON баланс:', walletData.ton);
    } else {
      console.log('   Ошибка получения баланса');
    }
    console.log('');

    // 4. Тест получения миссий
    console.log('4. Получение доступных миссий для пользователя ID=1:');
    const missionsResponse = await fetch(`${BASE_URL}/missions/1`);
    if (missionsResponse.ok) {
      const missionsData = await missionsResponse.json();
      console.log('   Количество миссий:', missionsData.length);
      if (missionsData.length > 0) {
        console.log('   Первая миссия:', missionsData[0].title);
        console.log('   Награда:', missionsData[0].reward);
      }
    } else {
      console.log('   Ошибка получения миссий');
    }
    console.log('');

    // 5. Тест статуса фарминга
    console.log('5. Статус фарминга пользователя ID=1:');
    const farmingResponse = await fetch(`${BASE_URL}/farming/1`);
    if (farmingResponse.ok) {
      const farmingData = await farmingResponse.json();
      console.log('   Активен:', farmingData.isActive);
      console.log('   Ожидаемые награды:', farmingData.pendingRewards);
      console.log('   Сумма депозита:', farmingData.depositAmount);
    } else {
      console.log('   Ошибка получения статуса фарминга');
    }

    console.log('\n✅ Тестирование завершено');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testEndpoints();