/**
 * Проверка полноты миграции на Supabase API
 * Ищет все оставшиеся импорты старых DB соединений
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SupbaseMigrationVerification {
  constructor() {
    this.results = {
      criticalIssues: [],
      warnings: [],
      cleaned: [],
      verified: []
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
   * Сканирует файлы на наличие старых импортов
   */
  scanForOldImports(dir) {
    const files = this.getAllTSFiles(dir);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Проверяем на старые импорты
        const oldImports = [
          'from \'../../core/db',
          'from \'../core/db',
          'import { db }',
          'drizzle-orm',
          'from \'../../shared/schema',
          'from \'../shared/schema',
          '@neondatabase',
          'DATABASE_URL',
          'PGHOST',
          'PGUSER'
        ];

        const foundIssues = [];
        oldImports.forEach(importPattern => {
          if (content.includes(importPattern)) {
            foundIssues.push(importPattern);
          }
        });

        if (foundIssues.length > 0) {
          this.results.criticalIssues.push({
            file: file.replace(process.cwd(), '.'),
            issues: foundIssues
          });
        } else {
          // Проверяем наличие правильных Supabase импортов
          if (content.includes('from \'../../core/supabase\'') || 
              content.includes('from \'../core/supabase\'')) {
            this.results.verified.push(file.replace(process.cwd(), '.'));
          }
        }
      } catch (error) {
        this.log('ERROR', `Ошибка чтения файла ${file}`, { error: error.message });
      }
    }
  }

  /**
   * Получает все TypeScript файлы в директории
   */
  getAllTSFiles(dir) {
    const files = [];
    
    function scanDir(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && 
              !['node_modules', 'dist', 'build'].includes(item)) {
            scanDir(fullPath);
          } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Игнорируем недоступные директории
      }
    }
    
    scanDir(dir);
    return files;
  }

  /**
   * Проверяет core/supabase.ts на корректность
   */
  verifyCoreSupabase() {
    const supabaseFile = './core/supabase.ts';
    
    if (!fs.existsSync(supabaseFile)) {
      this.results.criticalIssues.push({
        file: supabaseFile,
        issues: ['Отсутствует центральный файл Supabase клиента']
      });
      return;
    }

    const content = fs.readFileSync(supabaseFile, 'utf8');
    
    // Проверяем обязательные элементы
    const requiredElements = [
      'import { createClient }',
      '@supabase/supabase-js',
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'export const supabase'
    ];

    const missingElements = requiredElements.filter(element => !content.includes(element));
    
    if (missingElements.length > 0) {
      this.results.criticalIssues.push({
        file: supabaseFile,
        issues: [`Отсутствуют элементы: ${missingElements.join(', ')}`]
      });
    } else {
      this.results.verified.push(supabaseFile);
    }
  }

  /**
   * Проверяет наличие переменных окружения
   */
  checkEnvironmentVariables() {
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
    const forbiddenVars = [
      'DATABASE_URL', 'PGHOST', 'PGUSER', 'PGPASSWORD', 
      'PGPORT', 'PGDATABASE', 'USE_NEON_DB', 'DATABASE_PROVIDER'
    ];

    // Проверяем обязательные переменные
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      this.results.criticalIssues.push({
        file: 'Environment Variables',
        issues: [`Отсутствуют переменные: ${missingVars.join(', ')}`]
      });
    }

    // Проверяем запрещенные переменные
    const presentForbiddenVars = forbiddenVars.filter(varName => process.env[varName]);
    if (presentForbiddenVars.length > 0) {
      this.results.warnings.push({
        file: 'Environment Variables',
        issues: [`Найдены старые переменные: ${presentForbiddenVars.join(', ')}`]
      });
    }
  }

  /**
   * Основной метод проверки
   */
  async runVerification() {
    this.log('INFO', 'Начинаю проверку миграции на Supabase API');

    // 1. Проверяем core/supabase.ts
    this.verifyCoreSupabase();

    // 2. Сканируем модули на старые импорты
    const moduleDirs = ['./modules', './core', './server'];
    for (const dir of moduleDirs) {
      if (fs.existsSync(dir)) {
        this.scanForOldImports(dir);
      }
    }

    // 3. Проверяем переменные окружения
    this.checkEnvironmentVariables();

    // 4. Генерируем отчет
    this.generateReport();
  }

  /**
   * Генерирует финальный отчет
   */
  generateReport() {
    this.log('INFO', '=== ОТЧЕТ ПРОВЕРКИ МИГРАЦИИ SUPABASE ===');

    if (this.results.criticalIssues.length > 0) {
      this.log('CRITICAL', `Обнаружено ${this.results.criticalIssues.length} критических проблем:`);
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. Файл: ${issue.file}`);
        issue.issues.forEach(problem => console.log(`   - ${problem}`));
      });
    }

    if (this.results.warnings.length > 0) {
      this.log('WARNING', `Предупреждения (${this.results.warnings.length}):`);
      this.results.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.file}: ${warning.issues.join(', ')}`);
      });
    }

    this.log('SUCCESS', `Проверенных файлов с корректными Supabase импортами: ${this.results.verified.length}`);
    
    const migrationStatus = this.results.criticalIssues.length === 0 ? 'УСПЕШНА' : 'ТРЕБУЕТ ИСПРАВЛЕНИЙ';
    const migrationPercentage = Math.round(
      (this.results.verified.length / (this.results.verified.length + this.results.criticalIssues.length)) * 100
    );

    this.log('FINAL', `Статус миграции: ${migrationStatus} (${migrationPercentage}% готовности)`);

    // Сохраняем отчет
    const reportData = {
      timestamp: new Date().toISOString(),
      status: migrationStatus,
      readiness: `${migrationPercentage}%`,
      summary: {
        criticalIssues: this.results.criticalIssues.length,
        warnings: this.results.warnings.length,
        verifiedFiles: this.results.verified.length
      },
      details: this.results
    };

    fs.writeFileSync('SUPABASE_MIGRATION_VERIFICATION_REPORT.json', 
      JSON.stringify(reportData, null, 2)
    );

    this.log('INFO', 'Отчет сохранен в SUPABASE_MIGRATION_VERIFICATION_REPORT.json');
  }
}

async function main() {
  const verification = new SupbaseMigrationVerification();
  await verification.runVerification();
}

main().catch(console.error);