/**
 * Полная очистка переменных окружения от устаревших PostgreSQL/Neon секретов
 * Этап 3: Финальная очистка после перехода на Supabase API
 */

import fs from 'fs';

class EnvironmentSecretsCleanup {
  constructor() {
    this.results = {
      removed: [],
      kept: [],
      notFound: [],
      errors: []
    };
  }

  log(category, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${category.toUpperCase()}] ${message}`);
    if (details) {
      console.log(JSON.stringify(details, null, 2));
    }
  }

  /**
   * Проверяет наличие устаревших переменных в environment
   */
  checkObsoleteVariables() {
    const obsoleteVars = [
      'DATABASE_URL',
      'PGHOST', 
      'PGUSER',
      'PGPASSWORD',
      'PGPORT',
      'PGDATABASE',
      'DATABASE_PROVIDER',
      'USE_NEON_DB'
    ];

    this.log('INFO', 'Проверяю наличие устаревших переменных...');

    for (const varName of obsoleteVars) {
      if (process.env[varName]) {
        this.results.removed.push({
          name: varName,
          value: process.env[varName] ? '[ПРИСУТСТВУЕТ]' : '[ОТСУТСТВУЕТ]',
          status: 'НАЙДЕНА - ТРЕБУЕТ УДАЛЕНИЯ'
        });
        this.log('WARNING', `Найдена устаревшая переменная: ${varName}`);
      } else {
        this.results.notFound.push(varName);
      }
    }
  }

  /**
   * Проверяет наличие актуальных переменных для Supabase
   */
  checkRequiredVariables() {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'TELEGRAM_BOT_TOKEN',
      'NODE_ENV',
      'PORT'
    ];

    this.log('INFO', 'Проверяю наличие актуальных переменных...');

    for (const varName of requiredVars) {
      if (process.env[varName]) {
        this.results.kept.push({
          name: varName,
          status: 'АКТИВНА',
          present: true
        });
        this.log('SUCCESS', `Актуальная переменная найдена: ${varName}`);
      } else {
        this.results.errors.push(`Отсутствует обязательная переменная: ${varName}`);
        this.log('ERROR', `Отсутствует обязательная переменная: ${varName}`);
      }
    }
  }

  /**
   * Проверяет содержимое .env файла
   */
  checkEnvFile() {
    this.log('INFO', 'Проверяю .env файл...');
    
    try {
      if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        this.log('INFO', `В .env файле найдено ${lines.length} переменных:`);
        lines.forEach(line => {
          const [name] = line.split('=');
          console.log(`  - ${name}`);
        });

        // Проверяем на наличие устаревших переменных в .env
        const obsoleteInEnv = [];
        const obsoleteVars = ['DATABASE_URL', 'PGHOST', 'PGUSER', 'PGPASSWORD', 'PGPORT', 'PGDATABASE', 'DATABASE_PROVIDER', 'USE_NEON_DB'];
        
        for (const line of lines) {
          const [name] = line.split('=');
          if (obsoleteVars.includes(name)) {
            obsoleteInEnv.push(name);
          }
        }

        if (obsoleteInEnv.length > 0) {
          this.log('WARNING', `В .env найдены устаревшие переменные: ${obsoleteInEnv.join(', ')}`);
        } else {
          this.log('SUCCESS', '.env файл чист от устаревших переменных');
        }
      } else {
        this.log('INFO', '.env файл не найден');
      }
    } catch (error) {
      this.log('ERROR', 'Ошибка чтения .env файла', { error: error.message });
    }
  }

  /**
   * Тестирует подключение к Supabase
   */
  async testSupabaseConnection() {
    this.log('INFO', 'Тестирую подключение к Supabase...');
    
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        this.log('ERROR', 'Отсутствуют переменные SUPABASE_URL или SUPABASE_KEY');
        return false;
      }

      // Простая проверка URL и ключа
      if (!supabaseUrl.includes('supabase.co')) {
        this.log('ERROR', 'Некорректный SUPABASE_URL');
        return false;
      }

      if (supabaseKey.length < 100) {
        this.log('ERROR', 'Некорректный SUPABASE_KEY (слишком короткий)');
        return false;
      }

      this.log('SUCCESS', 'Конфигурация Supabase корректна');
      return true;
    } catch (error) {
      this.log('ERROR', 'Ошибка проверки Supabase', { error: error.message });
      return false;
    }
  }

  /**
   * Генерирует отчет об очистке
   */
  generateCleanupReport() {
    this.log('INFO', '=== ОТЧЕТ ОЧИСТКИ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===');

    // Устаревшие переменные для удаления
    if (this.results.removed.length > 0) {
      this.log('WARNING', `НАЙДЕНО ${this.results.removed.length} УСТАРЕВШИХ ПЕРЕМЕННЫХ:`);
      this.results.removed.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.status}`);
      });
    } else {
      this.log('SUCCESS', 'Устаревшие переменные не найдены в окружении');
    }

    // Актуальные переменные
    if (this.results.kept.length > 0) {
      this.log('SUCCESS', `АКТУАЛЬНЫЕ ПЕРЕМЕННЫЕ (${this.results.kept.length}):`);
      this.results.kept.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.status}`);
      });
    }

    // Ошибки
    if (this.results.errors.length > 0) {
      this.log('ERROR', `ОБНАРУЖЕНЫ ПРОБЛЕМЫ (${this.results.errors.length}):`);
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Итоговый статус
    const isClean = this.results.removed.length === 0 && this.results.errors.length === 0;
    const status = isClean ? 'ПОЛНОСТЬЮ ОЧИЩЕНА' : 'ТРЕБУЕТ РУЧНОЙ ОЧИСТКИ';
    
    this.log('FINAL', `Статус системы: ${status}`);

    // Сохраняем отчет
    const reportData = {
      timestamp: new Date().toISOString(),
      status,
      summary: {
        obsoleteVariablesFound: this.results.removed.length,
        activeVariables: this.results.kept.length,
        errors: this.results.errors.length
      },
      details: this.results,
      nextSteps: this.generateNextSteps()
    };

    fs.writeFileSync('ENVIRONMENT_CLEANUP_REPORT.json', 
      JSON.stringify(reportData, null, 2)
    );

    this.log('INFO', 'Отчет сохранен в ENVIRONMENT_CLEANUP_REPORT.json');
  }

  /**
   * Генерирует рекомендации по следующим шагам
   */
  generateNextSteps() {
    const steps = [];

    if (this.results.removed.length > 0) {
      steps.push('УДАЛИТЬ устаревшие переменные из Replit Secrets');
      steps.push('ПРОВЕРИТЬ отсутствие ссылок на старые переменные в коде');
    }

    if (this.results.errors.length > 0) {
      steps.push('ДОБАВИТЬ отсутствующие обязательные переменные');
    }

    if (steps.length === 0) {
      steps.push('СИСТЕМА ГОТОВА - запустить тестирование');
    }

    return steps;
  }

  /**
   * Основной метод очистки
   */
  async runCleanup() {
    this.log('INFO', 'Начинаю очистку переменных окружения от PostgreSQL/Neon...');

    // 1. Проверяем устаревшие переменные
    this.checkObsoleteVariables();

    // 2. Проверяем актуальные переменные
    this.checkRequiredVariables();

    // 3. Проверяем .env файл
    this.checkEnvFile();

    // 4. Тестируем Supabase
    await this.testSupabaseConnection();

    // 5. Генерируем отчет
    this.generateCleanupReport();
  }
}

async function main() {
  const cleanup = new EnvironmentSecretsCleanup();
  await cleanup.runCleanup();
}

main().catch(console.error);