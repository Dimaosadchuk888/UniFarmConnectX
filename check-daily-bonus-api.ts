import dotenv from 'dotenv';
dotenv.config();

// Используем JWT токен пользователя 74
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbUlkIjoiOTk5NDg5IiwidXNlcm5hbWUiOiJ0ZXN0X3VzZXJfNzQiLCJyZWZDb2RlIjoiWFBDR01XIiwiaWF0IjoxNzUyMzIyNDczLCJleHAiOjE3NTI5MjcyNzN9.FqITbdJeF-z1TqfRh9v4LGrJ6zOXGfQdw93QYHvCJjo';

async function checkDailyBonusAPI() {
  console.log('🔍 Проверка Daily Bonus API для пользователя 74\n');

  try {
    // 1. Проверка статистики
    console.log('📊 Получение статистики Daily Bonus...');
    const statsResponse = await fetch('http://localhost:3000/api/v2/daily-bonus/74/stats', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statsResponse.ok) {
      console.error(`❌ Ошибка статистики: ${statsResponse.status} ${statsResponse.statusText}`);
    } else {
      const stats = await statsResponse.json();
      console.log('✅ Статистика получена:', JSON.stringify(stats, null, 2));
    }

    // 2. Проверка истории транзакций
    console.log('\n💰 Получение истории транзакций...');
    const txResponse = await fetch('http://localhost:3000/api/v2/wallet/transactions?limit=50', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!txResponse.ok) {
      console.error(`❌ Ошибка транзакций: ${txResponse.status} ${txResponse.statusText}`);
    } else {
      const txData = await txResponse.json();
      console.log(`✅ Всего транзакций: ${txData.data?.length || 0}`);
      
      // Фильтруем daily bonus транзакции
      const dailyBonusTx = txData.data?.filter((tx: any) => 
        tx.type === 'daily_bonus' || tx.type === 'DAILY_BONUS'
      ) || [];
      
      console.log(`✅ Daily Bonus транзакций: ${dailyBonusTx.length}`);
      if (dailyBonusTx.length > 0) {
        console.log('\nПоследние Daily Bonus транзакции:');
        dailyBonusTx.slice(0, 5).forEach((tx: any) => {
          console.log(`  [${tx.created_at}] +${tx.amount_uni} UNI - ${tx.description}`);
        });
      }
    }

    // 3. Проверка баланса
    console.log('\n💳 Проверка текущего баланса...');
    const balanceResponse = await fetch('http://localhost:3000/api/v2/wallet/balance', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!balanceResponse.ok) {
      console.error(`❌ Ошибка баланса: ${balanceResponse.status} ${balanceResponse.statusText}`);
    } else {
      const balance = await balanceResponse.json();
      console.log('✅ Текущий баланс:', JSON.stringify(balance.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    console.log('\n⚠️  Возможно, сервер не запущен');
  }

  console.log('\n✅ Проверка завершена');
}

// Проверяем каждые 2 секунды пока сервер не запустится
let attempts = 0;
const maxAttempts = 10;

async function waitForServerAndCheck() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Сервер запущен!');
      await checkDailyBonusAPI();
    } else {
      throw new Error('Server not ready');
    }
  } catch (error) {
    attempts++;
    if (attempts < maxAttempts) {
      console.log(`⏳ Ожидание запуска сервера... (попытка ${attempts}/${maxAttempts})`);
      setTimeout(waitForServerAndCheck, 2000);
    } else {
      console.error('❌ Сервер не запустился после 20 секунд');
    }
  }
}

waitForServerAndCheck();