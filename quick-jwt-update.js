import { supabase } from './core/supabase.ts';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function quickJwtUpdate() {
  console.log('🔄 Обновление JWT токена для тестирования...\n');
  
  try {
    // Генерируем новый токен для user 61
    const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
    const payload = {
      userId: 61,
      telegram_id: 123456789,
      username: 'test_new_auth_user',
      ref_code: 'REF_1751646496183_new_auth',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    };
    
    const token = jwt.sign(payload, jwtSecret);
    
    // Делаем тестовый запрос с новым токеном
    console.log('📡 Тестирую новый токен...');
    const response = await fetch('http://localhost:3000/api/v2/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ Ответ от API:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data.id === 61) {
      console.log('\n🎯 УСПЕХ! Новый токен работает правильно.');
      console.log('Теперь нужно применить его в браузере.');
      
      // Создаем HTML файл для автоматического применения
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>JWT Token Update</title>
    <script>
        // Автоматически применяем новый токен
        localStorage.setItem('authToken', '${token}');
        localStorage.setItem('jwt_token', '${token}');
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    </script>
</head>
<body>
    <h1>Обновление JWT токена...</h1>
    <p>Токен обновлен. Перенаправление через 1 секунду...</p>
</body>
</html>`;
      
      // Сохраняем HTML файл
      const fs = await import('fs');
      fs.writeFileSync('auto-jwt-update.html', htmlContent);
      console.log('\n📁 Создан файл auto-jwt-update.html');
      console.log('Откройте его в браузере: http://localhost:3000/auto-jwt-update.html');
      
    } else {
      console.log('\n❌ Ошибка: токен не работает или пользователь не найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

quickJwtUpdate();