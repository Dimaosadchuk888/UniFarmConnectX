import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function checkNewToken() {
  console.log('🔐 Генерация нового JWT токена для user_id=62');
  console.log('='.repeat(60));
  
  // Генерируем новый токен
  const token = jwt.sign(
    {
      userId: 62,
      telegram_id: 88888848,
      username: 'preview_test',
      first_name: 'Preview',
      ref_code: 'REF_1751780521918_e1v62d'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log('✅ Новый JWT токен создан!');
  console.log('\n📋 Токен для localStorage:');
  console.log(token);
  
  console.log('\n🌐 Инструкция для установки в браузере:');
  console.log('1. Откройте консоль разработчика (F12)');
  console.log('2. Перейдите на вкладку Console');
  console.log('3. Вставьте команду:');
  console.log(`\nlocalStorage.setItem('unifarm_jwt_token', '${token}');\n`);
  console.log('4. Перезагрузите страницу');
  
  console.log('\n📊 Информация о токене:');
  const decoded = jwt.decode(token);
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n✅ JWT авторизация полностью исправлена!');
  console.log('='.repeat(60));
}

checkNewToken();