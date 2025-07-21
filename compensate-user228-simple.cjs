/**
 * КОМПЕНСАЦИЯ USER 228 - Простое выполнение
 * Прямое SQL через psql для минимальных зависимостей
 */

const { exec } = require('child_process');

function executeSQL(query) {
  return new Promise((resolve, reject) => {
    const command = `psql "${process.env.DATABASE_URL}" -c "${query}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function compensateUser228() {
  console.log('💰 КОМПЕНСАЦИЯ USER 228 - ПОТЕРЯННЫЙ TON ДЕПОЗИТ');
  console.log('=' + '='.repeat(50));
  
  try {
    // Проверяем User 228
    console.log('🔍 Проверка пользователя...');
    const userQuery = `SELECT id, telegram_id, username, balance_ton FROM users WHERE id = 228;`;
    const userResult = await executeSQL(userQuery);
    
    if (!userResult.includes('228')) {
      console.log('❌ User 228 не найден');
      return;
    }
    
    console.log('👤 User 228 найден в базе данных');
    
    // Проверяем существующие компенсации
    const compensationCheckQuery = `SELECT * FROM transactions WHERE user_id = 228 AND description ILIKE '%компенсация%d1077cd0%';`;
    const existingCompensation = await executeSQL(compensationCheckQuery);
    
    if (existingCompensation.includes('228')) {
      console.log('⚠️ КОМПЕНСАЦИЯ УЖЕ ВЫПЛАЧЕНА - найдена существующая транзакция');
      return;
    }
    
    console.log('✅ Проверки пройдены - выполняем компенсацию');
    
    // 1. Создаем транзакцию
    console.log('📝 Создание компенсационной транзакции...');
    const transactionQuery = `
      INSERT INTO transactions (user_id, type, amount, currency, description, metadata, created_at) 
      VALUES (
        228, 
        'FARMING_REWARD', 
        '1.0', 
        'TON', 
        'Компенсация потерянного TON депозита d1077cd0 из-за мошеннической схемы User 249',
        '{"compensation": true, "original_transaction": "d1077cd0", "fraud_case": "User_249_scheme", "authorized_by": "system_admin"}',
        NOW()
      ) RETURNING id, created_at;
    `;
    
    const transactionResult = await executeSQL(transactionQuery);
    console.log('✅ Транзакция создана:', transactionResult.trim());
    
    // 2. Обновляем баланс
    console.log('💰 Обновление баланса...');
    const balanceQuery = `
      UPDATE users 
      SET balance_ton = (CAST(balance_ton AS DECIMAL) + 1.0)::TEXT 
      WHERE id = 228 
      RETURNING balance_ton;
    `;
    
    const balanceResult = await executeSQL(balanceQuery);
    console.log('✅ Баланс обновлен:', balanceResult.trim());
    
    // 3. Финальная проверка
    console.log('🔍 Финальная проверка...');
    const finalCheckQuery = `
      SELECT 
        u.id, 
        u.balance_ton, 
        t.id as transaction_id, 
        t.amount, 
        t.created_at 
      FROM users u 
      LEFT JOIN transactions t ON u.id = t.user_id 
      WHERE u.id = 228 
        AND t.description ILIKE '%компенсация%d1077cd0%' 
      ORDER BY t.created_at DESC 
      LIMIT 1;
    `;
    
    const finalResult = await executeSQL(finalCheckQuery);
    console.log('📊 Результат:', finalResult.trim());
    
    console.log('\n🎉 КОМПЕНСАЦИЯ УСПЕШНО ВЫПЛАЧЕНА!');
    console.log('📋 ИТОГИ:');
    console.log('   ✅ User 228 получил 1.0 TON компенсацию');
    console.log('   ✅ Транзакция создана в системе');
    console.log('   ✅ Баланс корректно обновлен');
    console.log('   ✅ Справедливость восстановлена');
    
  } catch (error) {
    console.log('❌ ОШИБКА:', error.message);
    console.log('🛑 Компенсация НЕ выполнена');
  }
}

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL не найден в переменных окружения');
  process.exit(1);
}

console.log('🚀 ЗАПУСК КОМПЕНСАЦИИ ЧЕРЕЗ 3 СЕКУНДЫ...');
console.log('💡 Для отмены нажмите Ctrl+C');
console.log('📋 Основание: Потерянная транзакция d1077cd0 из-за мошенничества User 249');

setTimeout(compensateUser228, 3000);