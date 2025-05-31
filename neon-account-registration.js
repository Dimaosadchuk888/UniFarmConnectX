/**
 * Регистрация аккаунта разработки в Neon базе данных
 * Создает пользователя для полноценной работы внутри Replit
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
const DATABASE_URL = process.env.DATABASE_URL;

if (!NEON_API_KEY || !NEON_PROJECT_ID) {
  console.error('❌ Отсутствуют NEON_API_KEY или NEON_PROJECT_ID');
  process.exit(1);
}

/**
 * Создает нового пользователя в базе данных через Neon API
 */
async function registerDevelopmentAccount() {
  try {
    console.log('🔄 Регистрация аккаунта разработки в Neon...');
    
    // Получаем информацию о проекте
    const projectResponse = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}`, {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!projectResponse.ok) {
      throw new Error(`Ошибка получения информации о проекте: ${projectResponse.status}`);
    }
    
    const projectData = await projectResponse.json();
    console.log('✅ Проект найден:', projectData.project.name);
    
    // Создаем роль пользователя для разработки
    const roleResponse = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: {
          name: 'replit_dev_user',
          password: generateSecurePassword()
        }
      })
    });
    
    if (roleResponse.ok) {
      const roleData = await roleResponse.json();
      console.log('✅ Пользователь базы данных создан:', roleData.role.name);
    } else {
      console.log('ℹ️ Пользователь уже существует или создание не требуется');
    }
    
    // Подключение к базе данных для создания пользователя приложения
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Создаем пользователя приложения
    const replit_user_id = `replit_dev_${Date.now()}`;
    const guest_id = generateGuestId();
    
    const insertQuery = `
      INSERT INTO users (
        telegram_id, 
        username, 
        first_name, 
        guest_id, 
        created_at, 
        updated_at,
        balance,
        last_login
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), 0, NOW())
      ON CONFLICT (telegram_id) DO UPDATE SET
        last_login = NOW()
      RETURNING *;
    `;
    
    const result = await pool.query(insertQuery, [
      replit_user_id,
      'replit_developer',
      'Replit Developer',
      guest_id
    ]);
    
    console.log('✅ Пользователь приложения зарегистрирован:', {
      id: result.rows[0].id,
      telegram_id: result.rows[0].telegram_id,
      username: result.rows[0].username,
      guest_id: result.rows[0].guest_id
    });
    
    // Создаем начальную запись для фарминга
    const farmingQuery = `
      INSERT INTO farming_sessions (
        user_id, 
        start_time, 
        last_update, 
        uni_accumulated, 
        is_active,
        rate_per_hour
      ) VALUES ($1, NOW(), NOW(), 0, true, 100)
      ON CONFLICT (user_id) DO UPDATE SET
        last_update = NOW()
      RETURNING *;
    `;
    
    await pool.query(farmingQuery, [result.rows[0].id]);
    console.log('✅ Фарминг сессия инициализирована');
    
    await pool.end();
    
    console.log('\n🎉 Аккаунт разработки успешно зарегистрирован в Neon!');
    console.log('📋 Данные для входа:');
    console.log(`   User ID: ${result.rows[0].id}`);
    console.log(`   Telegram ID: ${replit_user_id}`);
    console.log(`   Guest ID: ${guest_id}`);
    console.log(`   Username: replit_developer`);
    
    return {
      user_id: result.rows[0].id,
      telegram_id: replit_user_id,
      guest_id: guest_id,
      username: 'replit_developer'
    };
    
  } catch (error) {
    console.error('❌ Ошибка регистрации аккаунта:', error.message);
    throw error;
  }
}

function generateSecurePassword() {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

function generateGuestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Запуск регистрации
if (import.meta.url === `file://${process.argv[1]}`) {
  registerDevelopmentAccount()
    .then((userData) => {
      console.log('\n✅ Регистрация завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ошибка регистрации:', error.message);
      process.exit(1);
    });
}

export { registerDevelopmentAccount };