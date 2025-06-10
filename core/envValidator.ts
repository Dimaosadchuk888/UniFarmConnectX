/**
 * Environment Variables Validator for UniFarm
 * Проверяет все необходимые переменные окружения при старте приложения
 */

interface EnvConfig {
  required: string[];
  optional: string[];
  defaults: Record<string, string>;
  validation: Record<string, (value: string) => boolean>;
}

const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'NODE_ENV',
    'PORT'
  ],
  optional: [
    'TELEGRAM_BOT_TOKEN',
    'SESSION_SECRET',
    'JWT_SECRET',
    'NEON_API_KEY',
    'NEON_PROJECT_ID',
    'ALLOW_BROWSER_ACCESS',
    'SKIP_TELEGRAM_CHECK',
    'DATABASE_PROVIDER',
    'USE_NEON_DB'
  ],
  defaults: {
    NODE_ENV: 'production',
    PORT: '3000',
    ALLOW_BROWSER_ACCESS: 'true',
    SKIP_TELEGRAM_CHECK: 'false',
    DATABASE_PROVIDER: 'neon',
    USE_NEON_DB: 'true'
  },
  validation: {
    PORT: (value: string) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 65536,
    NODE_ENV: (value: string) => ['development', 'production', 'test'].includes(value),
    DATABASE_URL: (value: string) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    ALLOW_BROWSER_ACCESS: (value: string) => ['true', 'false'].includes(value.toLowerCase()),
    SKIP_TELEGRAM_CHECK: (value: string) => ['true', 'false'].includes(value.toLowerCase()),
    USE_NEON_DB: (value: string) => ['true', 'false'].includes(value.toLowerCase())
  }
};

class EnvValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(): { success: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    // Проверяем обязательные переменные
    this.validateRequired();
    
    // Применяем значения по умолчанию
    this.applyDefaults();
    
    // Валидируем форматы
    this.validateFormats();
    
    // Проверяем критические конфигурации
    this.validateCriticalConfigs();

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  private validateRequired(): void {
    for (const envVar of envConfig.required) {
      if (!process.env[envVar]) {
        this.errors.push(`Отсутствует обязательная переменная окружения: ${envVar}`);
      }
    }
  }

  private applyDefaults(): void {
    for (const [key, defaultValue] of Object.entries(envConfig.defaults)) {
      if (!process.env[key]) {
        process.env[key] = defaultValue;
        this.warnings.push(`Применено значение по умолчанию для ${key}: ${defaultValue}`);
      }
    }
  }

  private validateFormats(): void {
    for (const [envVar, validator] of Object.entries(envConfig.validation)) {
      const value = process.env[envVar];
      if (value && !validator(value)) {
        this.errors.push(`Неверный формат переменной ${envVar}: ${value}`);
      }
    }
  }

  private validateCriticalConfigs(): void {
    // Проверяем совместимость настроек базы данных
    if (process.env.DATABASE_PROVIDER === 'neon' && !process.env.DATABASE_URL?.includes('neon')) {
      this.warnings.push('DATABASE_PROVIDER установлен как neon, но DATABASE_URL не содержит neon домен');
    }

    // Проверяем Telegram конфигурацию
    if (process.env.SKIP_TELEGRAM_CHECK === 'false' && !process.env.TELEGRAM_BOT_TOKEN) {
      this.warnings.push('SKIP_TELEGRAM_CHECK=false, но TELEGRAM_BOT_TOKEN не установлен');
    }

    // Проверяем production настройки
    if (process.env.NODE_ENV === 'production') {
      const productionRequired = ['SESSION_SECRET', 'JWT_SECRET'];
      for (const envVar of productionRequired) {
        if (!process.env[envVar]) {
          this.warnings.push(`В production режиме рекомендуется установить ${envVar}`);
        }
      }
    }
  }

  static validateAndReport(): void {
    const validator = new EnvValidator();
    const result = validator.validate();

    if (result.warnings.length > 0) {
      console.warn('🟡 Предупреждения конфигурации:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (result.errors.length > 0) {
      console.error('🔴 Ошибки конфигурации:');
      result.errors.forEach(error => console.error(`  - ${error}`));
      console.error('\n💡 Проверьте файл .env или переменные окружения в Replit Secrets');
      process.exit(1);
    }

    if (result.warnings.length === 0 && result.errors.length === 0) {
      console.log('✅ Конфигурация переменных окружения прошла проверку');
    }
  }
}

export { EnvValidator };