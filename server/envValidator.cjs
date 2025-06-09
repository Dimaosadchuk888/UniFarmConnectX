/**
 * Валідатор змінних оточення для UniFarm
 */

function EnvValidator() {
  this.requiredVars = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN',
    'SESSION_SECRET',
    'JWT_SECRET'
  ];
  
  this.optionalVars = [
    'NEON_API_KEY',
    'NEON_PROJECT_ID',
    'TELEGRAM_BOT_USERNAME',
    'APP_URL',
    'PORT',
    'NODE_ENV'
  ];
}

EnvValidator.prototype.validate = function() {
  const missing = [];
  const warnings = [];

  // Перевірка обов'язкових змінних
  this.requiredVars.forEach(varName => {
    if (!process.env[varName] || process.env[varName].includes('${')) {
      missing.push(varName);
    }
  });

  // Перевірка опціональних з попередженнями
  this.optionalVars.forEach(varName => {
    if (!process.env[varName] || process.env[varName].includes('${')) {
      warnings.push(varName);
    }
  });

  // Автоматичне налаштування APP_URL
  if (!process.env.APP_URL || process.env.APP_URL.includes('${')) {
    process.env.APP_URL = process.env.REPLIT_DEV_DOMAIN || 'http://localhost:3000';
    console.log('📌 APP_URL автоматично встановлено: ' + process.env.APP_URL);
  }

  // Автоматичне налаштування PORT
  if (!process.env.PORT) {
    process.env.PORT = '3000';
  }

  // Звіт про валідацію
  if (missing.length > 0) {
    console.error('❌ Відсутні критично важливі змінні оточення:');
    missing.forEach(varName => {
      console.error('   - ' + varName);
    });
    console.error('⚠️  Сервер може працювати некоректно!');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Відсутні опціональні змінні оточення:');
    warnings.forEach(varName => {
      console.warn('   - ' + varName);
    });
  }

  if (missing.length === 0 && warnings.length === 0) {
    console.log('✅ Всі змінні оточення налаштовані правильно');
  }

  return {
    isValid: missing.length === 0,
    missing: missing,
    warnings: warnings,
    configured: {
      APP_URL: process.env.APP_URL,
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT
    }
  };
};

EnvValidator.prototype.getPublicConfig = function() {
  return {
    API_BASE_URL: process.env.VITE_API_BASE_URL || '/api/v2',
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',
    WEB_APP_URL: process.env.APP_URL || 'http://localhost:3000'
  };
};

module.exports = EnvValidator;