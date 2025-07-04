// Декодирование JWT токена для проверки userId
import jwt from 'jsonwebtoken';

// Симулируем токен из localStorage (который видим в логах)
function decodeJWTToken() {
  console.log('🔍 Проверка JWT токена...');
  
  // Токен, который видим в браузере, пустой из-за отсутствия initData
  // Но middleware пытается загрузить данные для userId=48
  
  // Посмотрим что происходит с JWT secret
  const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
  console.log('JWT Secret длина:', jwtSecret.length);
  
  // Попробуем создать токен для user_id=48 (как он создается)
  const testPayload = {
    userId: 48,
    telegram_id: 88888888,
    username: 'demo_user',
    ref_code: 'REF_1750952576614_t938vs'
  };
  
  const testToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '7d' });
  console.log('Созданный токен для user_id=48:', testToken.substring(0, 50) + '...');
  
  // Декодируем обратно
  const decoded = jwt.verify(testToken, jwtSecret);
  console.log('Декодированный payload:', decoded);
  
  return testToken;
}

const token = decodeJWTToken();
console.log('\n🧪 Если этот токен есть в localStorage, то middleware будет загружать user_id=48');
console.log('Токен для проверки localStorage:', token);