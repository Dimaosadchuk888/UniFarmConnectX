/**
 * Удаление устаревших переменных окружения PostgreSQL/Neon
 * Очищает систему от конфликтующих секретов для работы только с Supabase
 */

import fs from 'fs';

class ObsoleteEnvRemover {
  constructor() {
    this.obsoleteVars = [
      'DATABASE_URL',
      'PGHOST', 
      'PGUSER',
      'PGPASSWORD',
      'PGPORT',
      'PGDATABASE',
      'DATABASE_PROVIDER',
      'USE_NEON_DB'
    ];

    this.results = {
      removed: [],
      notFound: [],
      errors: []
    };
  }

  log(level, message) {
    console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
  }

  /**
   * Удаляет устаревшие переменные из текущего процесса
   */
  removeFromProcess() {
    this.log('INFO', 'Удаляю устаревшие переменные из process.env...');

    for (const varName of this.obsoleteVars) {
      if (process.env[varName]) {
        delete process.env[varName];
        this.results.removed.push(varName);
        this.log('SUCCESS', `Удалена переменная: ${varName}`);
      } else {
        this.results.notFound.push(varName);
      }
    }
  }

  /**
   * Создает чистый .env файл только с актуальными переменными
   */
  createCleanEnvFile() {
    this.log('INFO', 'Создаю чистый .env файл...');

    const requiredVars = {
      'NODE_ENV': 'production',
      'PORT': '3000',
      'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN || '',
      'SUPABASE_URL': process.env.SUPABASE_URL || '',
      'SUPABASE_KEY': process.env.SUPABASE_KEY || ''
    };

    let envContent = '# UniFarm Environment Variables - Clean Supabase Configuration\n';
    envContent += '# Generated: ' + new Date().toISOString() + '\n\n';

    for (const [key, value] of Object.entries(requiredVars)) {
      if (value) {
        envContent += `${key}=${value}\n`;
      } else {
        envContent += `# ${key}=\n`;
      }
    }

    try {
      fs.writeFileSync('.env', envContent);
      this.log('SUCCESS', 'Создан чистый .env файл');
    } catch (error) {
      this.log('ERROR', `Ошибка создания .env файла: ${error.message}`);
      this.results.errors.push(`Ошибка создания .env: ${error.message}`);
    }
  }

  /**
   * Создает инструкции для ручного удаления из Replit Secrets
   */
  generateRemovalInstructions() {
    const instructions = {
      title: 'Инструкции по удалению устаревших секретов из Replit',
      steps: [
        '1. Откройте панель Secrets в Replit (Tools -> Secrets)',
        '2. Найдите и удалите следующие переменные:',
        ...this.obsoleteVars.map(varName => `   - ${varName}`),
        '',
        '3. Убедитесь, что остались только эти переменные:',
        '   - SUPABASE_URL',
        '   - SUPABASE_KEY', 
        '   - TELEGRAM_BOT_TOKEN',
        '   - NODE_ENV (опционально)',
        '   - PORT (опционально)',
        '',
        '4. Перезапустите Replit для применения изменений'
      ],
      warning: 'ВНИМАНИЕ: НЕ удаляйте SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN!'
    };

    fs.writeFileSync('REPLIT_SECRETS_REMOVAL_INSTRUCTIONS.json', 
      JSON.stringify(instructions, null, 2)
    );

    this.log('INFO', 'Созданы инструкции: REPLIT_SECRETS_REMOVAL_INSTRUCTIONS.json');
  }

  /**
   * Проверяет наличие обязательных переменных
   */
  validateRequiredVars() {
    this.log('INFO', 'Проверяю обязательные переменные...');

    const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN'];
    const missing = [];

    for (const varName of required) {
      if (!process.env[varName]) {
        missing.push(varName);
        this.log('ERROR', `Отсутствует обязательная переменная: ${varName}`);
      } else {
        this.log('SUCCESS', `Переменная присутствует: ${varName}`);
      }
    }

    return missing.length === 0;
  }

  /**
   * Тестирует систему после очистки
   */
  async testAfterCleanup() {
    this.log('INFO', 'Тестирую систему после очистки...');

    try {
      // Проверяем, что устаревшие переменные удалены
      const stillPresent = this.obsoleteVars.filter(varName => process.env[varName]);
      
      if (stillPresent.length > 0) {
        this.log('WARNING', `Еще присутствуют устаревшие переменные: ${stillPresent.join(', ')}`);
        return false;
      }

      // Проверяем конфигурацию Supabase
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        this.log('ERROR', 'Отсутствуют переменные Supabase');
        return false;
      }

      this.log('SUCCESS', 'Система готова к работе только с Supabase');
      return true;
    } catch (error) {
      this.log('ERROR', `Ошибка тестирования: ${error.message}`);
      return false;
    }
  }

  /**
   * Генерирует финальный отчет
   */
  generateFinalReport() {
    const report = {
      timestamp: new Date().toISOString(),
      action: 'Очистка устаревших переменных окружения',
      status: this.results.errors.length === 0 ? 'УСПЕШНО' : 'С ОШИБКАМИ',
      summary: {
        removedFromProcess: this.results.removed.length,
        notFound: this.results.notFound.length,
        errors: this.results.errors.length
      },
      details: {
        removed: this.results.removed,
        notFound: this.results.notFound,
        errors: this.results.errors
      },
      nextSteps: [
        'УДАЛИТЬ переменные из Replit Secrets вручную',
        'ПЕРЕЗАПУСТИТЬ Replit',
        'ПРОТЕСТИРОВАТЬ подключение к Supabase',
        'ЗАПУСТИТЬ stable-server.js'
      ]
    };

    fs.writeFileSync('OBSOLETE_ENV_REMOVAL_REPORT.json', 
      JSON.stringify(report, null, 2)
    );

    this.log('INFO', 'Финальный отчет: OBSOLETE_ENV_REMOVAL_REPORT.json');
    
    // Выводим краткий отчет
    this.log('INFO', '=== ОТЧЕТ ОЧИСТКИ ===');
    this.log('INFO', `Удалено из process.env: ${this.results.removed.length}`);
    this.log('INFO', `Не найдено: ${this.results.notFound.length}`);
    this.log('INFO', `Ошибок: ${this.results.errors.length}`);
    
    if (this.results.removed.length > 0) {
      this.log('SUCCESS', `Удаленные переменные: ${this.results.removed.join(', ')}`);
    }
  }

  /**
   * Основной метод выполнения очистки
   */
  async run() {
    this.log('INFO', 'Начинаю удаление устаревших переменных PostgreSQL/Neon...');

    // 1. Удаляем из текущего процесса
    this.removeFromProcess();

    // 2. Создаем чистый .env файл
    this.createCleanEnvFile();

    // 3. Проверяем обязательные переменные
    this.validateRequiredVars();

    // 4. Создаем инструкции для Replit Secrets
    this.generateRemovalInstructions();

    // 5. Тестируем после очистки
    await this.testAfterCleanup();

    // 6. Генерируем отчет
    this.generateFinalReport();

    this.log('SUCCESS', 'Очистка завершена! Проверьте инструкции для Replit Secrets.');
  }
}

async function main() {
  const remover = new ObsoleteEnvRemover();
  await remover.run();
}

main().catch(console.error);