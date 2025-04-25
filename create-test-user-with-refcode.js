/**
 * Скрипт для создания тестового пользователя и проверки автоматической генерации ref_code
 * Использует прямые запросы к базе данных
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import crypto from 'crypto';

// Настройка WebSocket для Neon DB
neonConfig.webSocketConstructor = ws;

// Генерирует уникальный идентификатор для тестового пользователя
function generateUUID() {
  return crypto.randomUUID();
}

// Основная функция скрипта
async function createTestUserWithRefCode() {
  // Создаем пул соединений
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('=== Создание тестового пользователя для проверки генерации ref_code ===');
    
    // Генерируем тестовые данные
    const testGuestId = generateUUID();
    const testUsername = `test_refcode_user_${Date.now().toString().substring(7)}`;
    
    console.log(`Создаем пользователя с:`);
    console.log(`  - guest_id: ${testGuestId}`);
    console.log(`  - username: ${testUsername}`);
    console.log(`  - ref_code: БУДЕТ СГЕНЕРИРОВАН АВТОМАТИЧЕСКИ`);
    
    // Вставляем пользователя БЕЗ указания ref_code
    const insertResult = await pool.query(
      `INSERT INTO users 
       (guest_id, username, balance_uni, balance_ton, created_at) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, guest_id, username, ref_code, created_at`,
      [testGuestId, testUsername, '100', '0', new Date()]
    );
    
    if (insertResult.rows.length === 0) {
      console.error('❌ Ошибка: Пользователь не был создан');
      return;
    }
    
    const user = insertResult.rows[0];
    console.log('\n✅ Пользователь успешно создан:');
    console.log(`  - id: ${user.id}`);
    console.log(`  - guest_id: ${user.guest_id}`);
    console.log(`  - username: ${user.username}`);
    console.log(`  - ref_code: ${user.ref_code || 'НЕ СГЕНЕРИРОВАН'}`);
    console.log(`  - created_at: ${new Date(user.created_at).toISOString()}`);
    
    // Проверяем, был ли сгенерирован ref_code
    if (!user.ref_code) {
      console.error('\n❌ ОШИБКА: ref_code НЕ БЫЛ сгенерирован автоматически');
      console.log('\nПроверяем, есть ли триггер на таблице users:');
      
      // Проверяем наличие триггеров в базе данных
      const triggersResult = await pool.query(
        `SELECT * FROM information_schema.triggers 
         WHERE event_object_table = 'users'`
      );
      
      console.log(`Найдено триггеров: ${triggersResult.rowCount}`);
      if (triggersResult.rowCount > 0) {
        console.log('\nСписок триггеров:');
        triggersResult.rows.forEach((trigger, index) => {
          console.log(`  ${index + 1}. ${trigger.trigger_name} (${trigger.event_manipulation})`);
        });
      }
      
      // Анализируем коллонку на наличие DEFAULT значения
      const columnResult = await pool.query(
        `SELECT column_name, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'ref_code'`
      );
      
      if (columnResult.rows.length > 0) {
        console.log('\nНастройки колонки ref_code:');
        console.log(`  - Default value: ${columnResult.rows[0].column_default || 'null'}`);
      }
    } else {
      console.log('\n✅ ref_code был успешно сгенерирован автоматически');
      
      // Проверяем длину сгенерированного кода
      console.log(`  - Длина ref_code: ${user.ref_code.length} символов`);
      
      // Проверяем уникальность сгенерированного кода
      const duplicateCheck = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE ref_code = $1`,
        [user.ref_code]
      );
      
      const duplicateCount = parseInt(duplicateCheck.rows[0].count);
      if (duplicateCount > 1) {
        console.error(`❌ ОШИБКА: Найдено ${duplicateCount} пользователей с таким же ref_code!`);
      } else {
        console.log('✅ Проверка пройдена: ref_code уникален в базе данных');
      }
    }
    
    // Теперь создадим пользователя с указанием ref_code
    const customRefCode = 'testcode' + Date.now().toString().substring(7);
    const testGuestId2 = generateUUID();
    const testUsername2 = `test_refcode_manual_${Date.now().toString().substring(7)}`;
    
    console.log(`\nСоздаем пользователя с указанным ref_code:`);
    console.log(`  - guest_id: ${testGuestId2}`);
    console.log(`  - username: ${testUsername2}`);
    console.log(`  - ref_code: ${customRefCode}`);
    
    try {
      const insertResult2 = await pool.query(
        `INSERT INTO users 
         (guest_id, username, ref_code, balance_uni, balance_ton, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, guest_id, username, ref_code, created_at`,
        [testGuestId2, testUsername2, customRefCode, '100', '0', new Date()]
      );
      
      if (insertResult2.rows.length === 0) {
        console.error('❌ Ошибка: Второй пользователь не был создан');
      } else {
        const user2 = insertResult2.rows[0];
        console.log('\n✅ Второй пользователь успешно создан:');
        console.log(`  - id: ${user2.id}`);
        console.log(`  - guest_id: ${user2.guest_id}`);
        console.log(`  - username: ${user2.username}`);
        console.log(`  - ref_code: ${user2.ref_code || 'НЕ УКАЗАН'}`);
        console.log(`  - created_at: ${new Date(user2.created_at).toISOString()}`);
        
        // Проверяем, сохранился ли указанный ref_code
        if (user2.ref_code !== customRefCode) {
          console.error('\n❌ ПРЕДУПРЕЖДЕНИЕ: Указанный ref_code был изменен системой');
        } else {
          console.log('\n✅ Указанный ref_code был успешно сохранен');
        }
      }
    } catch (error) {
      if (error.code === '23505') { // Ошибка уникальности
        console.log('\n✅ Тест пройден: Система предотвратила создание дублирующегося ref_code');
        console.error(`  Детали ошибки: ${error.detail}`);
      } else {
        console.error('\n❌ Ошибка при создании второго пользователя:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении теста:', error);
  } finally {
    // Закрываем соединение с базой данных
    await pool.end();
  }
}

// Запускаем тест
createTestUserWithRefCode();