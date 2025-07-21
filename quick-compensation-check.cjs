/**
 * БЫСТРАЯ ПРОВЕРКА - определяем схему таблиц и выполняем компенсацию
 */

const { exec } = require('child_process');

function executeSQL(query) {
  return new Promise((resolve, reject) => {
    const command = `psql "${process.env.DATABASE_URL}" -c "${query}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function quickCheck() {
  try {
    console.log('🔍 ПОИСК ТАБЛИЦ ПОЛЬЗОВАТЕЛЕЙ...');
    
    // Проверяем схемы и таблицы
    const tablesQuery = `SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%user%';`;
    const tables = await executeSQL(tablesQuery);
    console.log('📋 Найденные таблицы пользователей:');
    console.log(tables);
    
    // Пробуем разные варианты схем
    const schemas = ['public', 'auth'];
    
    for (const schema of schemas) {
      try {
        console.log(`\n🔍 Проверка схемы: ${schema}`);
        const testQuery = `SELECT COUNT(*) FROM ${schema}.users;`;
        const result = await executeSQL(testQuery);
        console.log(`✅ Схема ${schema}.users найдена:`, result.trim());
        
        // Если схема найдена, проверяем User 228
        const user228Query = `SELECT id, balance_ton FROM ${schema}.users WHERE id = 228;`;
        const user228 = await executeSQL(user228Query);
        
        if (user228.includes('228')) {
          console.log(`👤 User 228 найден в ${schema}.users:`, user228.trim());
          
          // Выполняем компенсацию
          console.log('\n💰 ВЫПОЛНЕНИЕ КОМПЕНСАЦИИ...');
          
          // Создаем транзакцию
          const transactionQuery = `
            INSERT INTO ${schema}.transactions (user_id, type, amount, currency, description, created_at) 
            VALUES (228, 'FARMING_REWARD', '1.0', 'TON', 'Компенсация потерянного TON депозита d1077cd0', NOW()) 
            RETURNING id;
          `;
          
          const transResult = await executeSQL(transactionQuery);
          console.log('✅ Транзакция создана:', transResult.trim());
          
          // Обновляем баланс
          const balanceQuery = `
            UPDATE ${schema}.users 
            SET balance_ton = (CAST(balance_ton AS DECIMAL) + 1.0)::TEXT 
            WHERE id = 228 
            RETURNING balance_ton;
          `;
          
          const balResult = await executeSQL(balanceQuery);
          console.log('✅ Баланс обновлен:', balResult.trim());
          
          console.log('\n🎉 КОМПЕНСАЦИЯ ВЫПОЛНЕНА УСПЕШНО!');
          return;
        }
        
      } catch (schemaError) {
        console.log(`❌ Схема ${schema} недоступна:`, schemaError.message);
      }
    }
    
    console.log('❌ Не удалось найти подходящую схему с таблицей users');
    
  } catch (error) {
    console.log('❌ ОШИБКА:', error.message);
  }
}

quickCheck();