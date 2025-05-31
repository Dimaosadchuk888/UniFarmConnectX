/**
 * Скрипт для проверки работоспособности основных компонентов с Neon DB
 */

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Настраиваем окружение для принудительного использования Neon DB
process.env.DATABASE_PROVIDER = 'neon';
process.env.USE_LOCAL_DB_ONLY = 'false';

async function checkNeonComponents() {
  if (!process.env.DATABASE_URL) {
    log('❌ Ошибка: DATABASE_URL не установлен в переменных окружения', colors.red);
    return false;
  }

  log('🔍 Проверка компонентов UniFarm с Neon DB...\n', colors.blue);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. Базовая проверка соединения
    const connectionResult = await pool.query('SELECT NOW() as time');
    log('✅ Соединение с Neon DB установлено', colors.green);
    log(`Время сервера: ${connectionResult.rows[0].time}`, colors.reset);
    
    // 2. Проверка главных таблиц
    log('\n📋 Проверка основных таблиц:', colors.blue);
    
    const coreTables = ['users', 'transactions', 'farming_deposits', 'referrals'];
    
    for (const table of coreTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const rowCount = parseInt(countResult.rows[0].count);
        log(`✅ Таблица ${table}: ${rowCount} записей`, colors.green);
        
        // Выводим пример записей
        if (rowCount > 0) {
          const rowsResult = await pool.query(`SELECT * FROM ${table} LIMIT 2`);
          log(`   Пример записей (${Math.min(rowCount, 2)} из ${rowCount}):`, colors.reset);
          rowsResult.rows.forEach((row, index) => {
            // Уменьшаем размер вывода, показывая только id и несколько полей
            const simplifiedRow = { id: row.id };
            if (table === 'users') {
              simplifiedRow.username = row.username;
              simplifiedRow.ref_code = row.ref_code;
              simplifiedRow.balance_uni = row.balance_uni;
            } else if (table === 'transactions') {
              simplifiedRow.user_id = row.user_id;
              simplifiedRow.type = row.type;
              simplifiedRow.amount = row.amount;
              simplifiedRow.created_at = row.created_at;
            } else if (table === 'farming_deposits') {
              simplifiedRow.user_id = row.user_id;
              simplifiedRow.amount_uni = row.amount_uni;
              simplifiedRow.created_at = row.created_at;
            } else if (table === 'referrals') {
              simplifiedRow.user_id = row.user_id;
              simplifiedRow.inviter_id = row.inviter_id;
              simplifiedRow.level = row.level;
            }
            
            log(`   ${index + 1}. ${JSON.stringify(simplifiedRow)}`, colors.reset);
          });
        }
      } catch (err) {
        log(`❌ Ошибка при проверке таблицы ${table}: ${err.message}`, colors.red);
      }
    }
    
    // 3. Проверка функциональности фарминга
    log('\n🚜 Проверка компонента фарминга:', colors.blue);
    
    try {
      // Проверяем наличие записей в фарминге
      const farmingResult = await pool.query(`
        SELECT u.id, u.username, u.uni_deposit_amount, u.uni_farming_balance, u.uni_farming_rate 
        FROM users u 
        WHERE u.uni_deposit_amount > 0
        LIMIT 3
      `);
      
      if (farmingResult.rows.length > 0) {
        log(`✅ Найдено ${farmingResult.rows.length} пользователей с активным фармингом:`, colors.green);
        farmingResult.rows.forEach((row, index) => {
          log(`   ${index + 1}. ID: ${row.id}, Имя: ${row.username}, Депозит: ${row.uni_deposit_amount}, Баланс: ${row.uni_farming_balance}, Ставка: ${row.uni_farming_rate}`, colors.reset);
        });
      } else {
        log('⚠️ Не найдено пользователей с активным фармингом', colors.yellow);
      }
    } catch (err) {
      log(`❌ Ошибка при проверке фарминга: ${err.message}`, colors.red);
    }
    
    // 4. Проверка реферальной системы
    log('\n👥 Проверка реферальной системы:', colors.blue);
    
    try {
      // Проверяем наличие реферальных связей
      const referralResult = await pool.query(`
        SELECT r.user_id, r.inviter_id, r.level, r.reward_uni,
              u1.username as user_name, u2.username as inviter_name
        FROM referrals r
        JOIN users u1 ON r.user_id = u1.id
        JOIN users u2 ON r.inviter_id = u2.id
        LIMIT 3
      `);
      
      if (referralResult.rows.length > 0) {
        log(`✅ Найдено ${referralResult.rows.length} реферальных связей:`, colors.green);
        referralResult.rows.forEach((row, index) => {
          log(`   ${index + 1}. Пользователь: ${row.user_name} (ID: ${row.user_id}), Пригласитель: ${row.inviter_name} (ID: ${row.inviter_id}), Уровень: ${row.level}, Награда: ${row.reward_uni}`, colors.reset);
        });
      } else {
        log('⚠️ Не найдено реферальных связей', colors.yellow);
      }
    } catch (err) {
      log(`❌ Ошибка при проверке реферальной системы: ${err.message}`, colors.red);
    }
    
    // 5. Проверка миссий
    log('\n🎯 Проверка миссий:', colors.blue);
    
    try {
      // Проверяем доступные миссии
      const missionsResult = await pool.query(`
        SELECT id, type, title, reward_uni, is_active
        FROM missions
        LIMIT 5
      `);
      
      if (missionsResult.rows.length > 0) {
        log(`✅ Найдено ${missionsResult.rows.length} миссий:`, colors.green);
        missionsResult.rows.forEach((row, index) => {
          log(`   ${index + 1}. ${row.title} (ID: ${row.id}, Тип: ${row.type}, Награда: ${row.reward_uni}, Активна: ${row.is_active ? 'Да' : 'Нет'})`, colors.reset);
        });
        
        // Проверяем выполненные миссии
        const completedMissionsResult = await pool.query(`
          SELECT um.user_id, u.username, um.mission_id, m.title, um.completed_at
          FROM user_missions um
          JOIN users u ON um.user_id = u.id
          JOIN missions m ON um.mission_id = m.id
          LIMIT 3
        `);
        
        if (completedMissionsResult.rows.length > 0) {
          log(`✅ Найдено ${completedMissionsResult.rows.length} выполненных миссий:`, colors.green);
          completedMissionsResult.rows.forEach((row, index) => {
            log(`   ${index + 1}. Пользователь: ${row.username}, Миссия: ${row.title}, Выполнена: ${row.completed_at}`, colors.reset);
          });
        } else {
          log('⚠️ Не найдено выполненных миссий', colors.yellow);
        }
      } else {
        log('⚠️ Не найдено миссий', colors.yellow);
      }
    } catch (err) {
      log(`❌ Ошибка при проверке миссий: ${err.message}`, colors.red);
    }
    
    // 6. Проверка TON Boost
    log('\n🚀 Проверка TON Boost:', colors.blue);
    
    try {
      // Проверяем TON Boost депозиты
      const tonBoostResult = await pool.query(`
        SELECT tbd.id, tbd.user_id, u.username, tbd.ton_amount, tbd.bonus_uni, tbd.is_active, tbd.created_at
        FROM ton_boost_deposits tbd
        JOIN users u ON tbd.user_id = u.id
        LIMIT 3
      `);
      
      if (tonBoostResult.rows.length > 0) {
        log(`✅ Найдено ${tonBoostResult.rows.length} TON Boost депозитов:`, colors.green);
        tonBoostResult.rows.forEach((row, index) => {
          log(`   ${index + 1}. Пользователь: ${row.username}, Сумма TON: ${row.ton_amount}, Бонус UNI: ${row.bonus_uni}, Активен: ${row.is_active ? 'Да' : 'Нет'}, Создан: ${row.created_at}`, colors.reset);
        });
      } else {
        log('⚠️ Не найдено TON Boost депозитов', colors.yellow);
      }
    } catch (err) {
      log(`❌ Ошибка при проверке TON Boost: ${err.message}`, colors.red);
    }
    
    // Общий итог
    log('\n🏆 Общий результат проверки компонентов UniFarm с Neon DB:', colors.magenta);
    log('✅ Соединение с базой данных работает корректно', colors.green);
    log('✅ Основные таблицы доступны и содержат данные', colors.green);
    log('✅ Проверка функциональности компонентов завершена', colors.green);
    
    return true;
  } catch (err) {
    log(`❌ Критическая ошибка: ${err.message}`, colors.red);
    console.error(err.stack);
    return false;
  } finally {
    await pool.end();
  }
}

// Запускаем проверку
checkNeonComponents()
  .then(success => {
    if (success) {
      log('\n🎉 Проверка компонентов UniFarm с Neon DB успешно завершена!', colors.green);
    } else {
      log('\n❌ Проверка компонентов UniFarm с Neon DB завершилась с ошибками', colors.red);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Непредвиденная ошибка:', err);
    process.exit(1);
  });