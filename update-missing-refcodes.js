/**
 * Миграционный скрипт для обновления отсутствующих ref_code у пользователей
 * 
 * Этот скрипт:
 * 1. Находит всех пользователей без ref_code
 * 2. Генерирует уникальные ref_code для каждого пользователя
 * 3. Обновляет записи в базе данных
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import crypto from 'crypto';

// Настройка WebSocket для Neon DB
neonConfig.webSocketConstructor = ws;

// Генерирует уникальный ref_code
function generateRefCode() {
  // Набор символов, из которых будет формироваться реферальный код
  // Исключаем символы, которые могут быть неоднозначно восприняты: 0, O, 1, I, l
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  
  // Генерируем 8 символов - компромисс между длиной и надежностью
  const length = 8;
  
  // Используем crypto.randomBytes для криптографически стойкой генерации
  const randomBytes = crypto.randomBytes(length);
  
  // Преобразуем байты в символы из нашего набора
  let refCode = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    refCode += chars[randomIndex];
  }
  
  return refCode;
}

// Основная функция миграции
async function updateMissingRefCodes() {
  console.log('=== Миграция: Обновление отсутствующих ref_code у пользователей ===');
  
  // Создаем пул соединений
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 1. Находим всех пользователей без ref_code
    const usersWithoutRefCodeResult = await pool.query(
      'SELECT id, username, guest_id FROM users WHERE ref_code IS NULL'
    );
    
    const usersWithoutRefCode = usersWithoutRefCodeResult.rows;
    const totalCount = usersWithoutRefCode.length;
    
    console.log(`Найдено ${totalCount} пользователей без ref_code`);
    
    if (totalCount === 0) {
      console.log('✅ Все пользователи уже имеют ref_code. Миграция не требуется.');
      return;
    }
    
    // 2. Для каждого пользователя генерируем и устанавливаем уникальный ref_code
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithoutRefCode) {
      try {
        // Генерируем ref_code
        let refCode = generateRefCode();
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Проверяем уникальность ref_code и генерируем новый, если нужно
        while (!isUnique && attempts < maxAttempts) {
          const duplicateCheck = await pool.query(
            'SELECT id FROM users WHERE ref_code = $1',
            [refCode]
          );
          
          isUnique = duplicateCheck.rows.length === 0;
          
          if (!isUnique) {
            console.log(`⚠️ ref_code "${refCode}" уже используется. Генерируем новый...`);
            refCode = generateRefCode();
            attempts++;
          }
        }
        
        // Если не смогли сгенерировать уникальный код, создаем расширенный код
        if (!isUnique) {
          refCode = generateRefCode() + generateRefCode().substring(0, 4);
          console.log(`⚠️ Сгенерирован расширенный ref_code: ${refCode}`);
        }
        
        // Обновляем запись в базе данных
        await pool.query(
          'UPDATE users SET ref_code = $1 WHERE id = $2',
          [refCode, user.id]
        );
        
        console.log(`✅ Установлен ref_code "${refCode}" для пользователя ID ${user.id} (${user.username || 'без имени'})`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Ошибка при обновлении пользователя ID ${user.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== Итоги миграции ===');
    console.log(`Всего пользователей без ref_code: ${totalCount}`);
    console.log(`Успешно обновлено: ${updatedCount}`);
    console.log(`Ошибок: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ Миграция успешно завершена. Все пользователи теперь имеют ref_code.');
    } else {
      console.error('\n⚠️ Миграция завершена с ошибками. Проверьте логи выше.');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
  } finally {
    // Закрываем соединение с базой
    await pool.end();
  }
}

// Запускаем миграцию
updateMissingRefCodes();