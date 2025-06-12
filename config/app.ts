// Валидация критически важных переменных окружения
function validateRequiredEnvVars() {
  const requiredVars = ['SESSION_SECRET', 'JWT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют критически важные переменные окружения:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('⚠️  Сервер может работать небезопасно!');
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Отсутствуют обязательные переменные окружения: ${missing.join(', ')}`);
    }
  }
}

// Выполняем валидацию при импорте модуля
validateRequiredEnvVars();

export const appConfig = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: 'v2',
  baseUrl: process.env.BASE_URL || 'https://unifarm.replit.app',
  
  // Унифицированные CORS настройки - используем CORS_ORIGINS как стандарт
  // Поддержка обратной совместимости с CORS_ORIGIN
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.BASE_URL || '*').split(','),
  
  // API конфигурация с централизованным управлением
  api: {
    baseUrl: process.env.API_BASE_URL || '/api/v2',
    clientBaseUrl: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '/api/v2'
  },
  
  sessionSecret: process.env.SESSION_SECRET!,
  jwtSecret: process.env.JWT_SECRET!
};