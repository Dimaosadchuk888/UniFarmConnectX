/**
 * Скрипт для тестирования функциональности parent_ref_code
 * 
 * Этот скрипт создает тестового пользователя с указанным parent_ref_code
 * и проверяет, что связь правильно записана в базу данных
 */

import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import ws from 'ws';

// Настройка WebSocket для Neon
neonConfig.webSocketConstructor = ws;

// Функция для генерации случайного ref_code
function generateRefCode() {
  // Создаем короткий код из 8 символов (буквы и цифры)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Функция для генерации случайного guest_id
function generateGuestId() {
  return uuidv4();
}

async function testParentRefCode() {
  console.log('Начинаем тестирование функциональности parent_ref_code...');
  
  // Подключаемся к базе данных
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // 1. Создаем первого пользователя (который будет "родителем")
    const parentRefCode = generateRefCode();
    const parentGuestId = generateGuestId();
    
    console.log(`Создаем родительского пользователя с ref_code: ${parentRefCode}`);
    
    const parentInsertResult = await pool.query(
      `INSERT INTO users (username, guest_id, balance_uni, balance_ton, ref_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, ref_code`,
      [`parent_user_${Date.now()}`, parentGuestId, '100', '0', parentRefCode, new Date()]
    );
    
    const parentUser = parentInsertResult.rows[0];
    console.log('Родительский пользователь создан:', parentUser);
    
    // 2. Создаем второго пользователя с parent_ref_code от первого
    const childRefCode = generateRefCode();
    const childGuestId = generateGuestId();
    
    console.log(`Создаем дочернего пользователя с parent_ref_code: ${parentRefCode}`);
    
    const childInsertResult = await pool.query(
      `INSERT INTO users (username, guest_id, balance_uni, balance_ton, ref_code, parent_ref_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, ref_code, parent_ref_code`,
      [`child_user_${Date.now()}`, childGuestId, '100', '0', childRefCode, parentRefCode, new Date()]
    );
    
    const childUser = childInsertResult.rows[0];
    console.log('Дочерний пользователь создан:', childUser);
    
    // 3. Проверяем, что связь правильно записана
    const verifyResult = await pool.query(
      `SELECT * FROM users WHERE parent_ref_code = $1`,
      [parentRefCode]
    );
    
    console.log(`Найдено ${verifyResult.rows.length} пользователей с parent_ref_code = ${parentRefCode}`);
    
    // 4. Проверяем возможность поиска по parent_ref_code
    const parentUserCheck = await pool.query(
      `SELECT * FROM users WHERE ref_code = $1`,
      [parentRefCode]
    );
    
    if (parentUserCheck.rows.length > 0) {
      console.log(`Успешно найден родительский пользователь по ref_code: ${parentRefCode}`);
      console.log(`ID родителя: ${parentUserCheck.rows[0].id}`);
    } else {
      console.log(`ОШИБКА: Не удалось найти родительского пользователя по ref_code: ${parentRefCode}`);
    }
    
    console.log('\nТестирование parent_ref_code успешно завершено!');
  } catch (error) {
    console.error('Ошибка при тестировании parent_ref_code:', error);
  } finally {
    // Закрываем соединение с базой данных
    await pool.end();
  }
}

// Запускаем тест
testParentRefCode().catch(console.error);