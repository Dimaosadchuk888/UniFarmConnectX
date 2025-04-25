// Скрипт для тестирования функциональности ref_code через прямой доступ к базе данных
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import crypto from 'crypto';

// Функция для генерации уникального guest_id
function generateGuestId() {
  return crypto.randomUUID();
}

// Тестирование генерации и уникальности ref_code
async function testRefCodeGeneration() {
  console.log('=== Начинаем тестирование генерации и уникальности ref_code ===');
  
  try {
    // 1. Создаем запись в базе данных с новым guest_id
    const guestId1 = generateGuestId();
    console.log(`\n1. Создаем пользователя с guest_id: ${guestId1}`);
    
    const [user1] = await db
      .insert(users)
      .values({
        guest_id: guestId1,
        username: `test_user_1_${Date.now()}`,
        ref_code: null, // Пусть база сгенерирует ref_code автоматически
        balance_uni: "100",
        balance_ton: "0",
        created_at: new Date()
      })
      .returning();
    
    console.log(`Пользователь создан с ID: ${user1.id}`);
    console.log(`ref_code: ${user1.ref_code}`);
    
    // Проверяем, что ref_code был сгенерирован
    if (!user1.ref_code) {
      console.error('❌ ОШИБКА: ref_code не был сгенерирован!');
      return;
    }
    
    console.log('✅ ref_code успешно сгенерирован');
    
    // 2. Создаем второго пользователя и проверяем уникальность ref_code
    const guestId2 = generateGuestId();
    console.log(`\n2. Создаем второго пользователя с guest_id: ${guestId2}`);
    
    const [user2] = await db
      .insert(users)
      .values({
        guest_id: guestId2,
        username: `test_user_2_${Date.now()}`,
        ref_code: null, // Пусть база сгенерирует ref_code автоматически
        balance_uni: "100",
        balance_ton: "0",
        created_at: new Date()
      })
      .returning();
    
    console.log(`Второй пользователь создан с ID: ${user2.id}`);
    console.log(`ref_code: ${user2.ref_code}`);
    
    // Проверяем уникальность ref_code
    if (user1.ref_code === user2.ref_code) {
      console.error('❌ ОШИБКА: Сгенерированы одинаковые ref_code!');
      return;
    }
    
    console.log('✅ Проверка пройдена: ref_code уникальны');
    
    // 3. Пытаемся создать запись с уже существующим ref_code
    console.log(`\n3. Пытаемся создать пользователя с существующим ref_code: ${user1.ref_code}`);
    
    const guestId3 = generateGuestId();
    
    // Попытка использовать уже существующий ref_code должна привести к генерации нового
    const [user3] = await db
      .insert(users)
      .values({
        guest_id: guestId3,
        username: `test_user_3_${Date.now()}`,
        ref_code: user1.ref_code, // Используем существующий ref_code
        balance_uni: "100",
        balance_ton: "0",
        created_at: new Date()
      })
      .returning();
    
    console.log(`Третий пользователь создан с ID: ${user3.id}`);
    console.log(`ref_code: ${user3.ref_code}`);
    
    // Если ref_code совпадает с первым, значит наша логика обработки дубликатов не работает
    if (user3.ref_code === user1.ref_code) {
      console.error('❌ ОШИБКА: Сохранен дублирующийся ref_code!');
      return;
    }
    
    console.log('✅ Проверка пройдена: Система автоматически заменила дублирующийся ref_code на новый');
    
    console.log('\n=== Тестирование успешно завершено ===');
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  } finally {
    // Закрываем соединение с базой данных
    await db.client.end();
  }
}

// Запускаем тестирование
testRefCodeGeneration();