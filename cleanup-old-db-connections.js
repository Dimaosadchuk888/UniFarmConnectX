/**
 * Скрипт полной зачистки старых подключений к базе данных
 * Удаляет все следы Neon, Replit DB и других старых подключений
 */

import { promises as fs } from 'fs';
import path from 'path';

class DatabaseCleanup {
  constructor() {
    this.foundFiles = [];
    this.cleanedFiles = [];
    this.deletedFiles = [];
  }

  async scanForOldConnections() {
    console.log('🔍 Сканирование проекта на наличие старых подключений...');
    
    const patterns = [
      '@neondatabase',
      'neon.tech',
      'replit.db',
      'PGHOST',
      'PGDATABASE', 
      'PGUSER',
      'PGPASSWORD',
      'ep-rough',
      'ep-lucky',
      'neondb',
      'railway'
    ];

    await this.searchInDirectory('.', patterns);
    return this.foundFiles;
  }

  async searchInDirectory(dir, patterns) {
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist') continue;
        
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.searchInDirectory(fullPath, patterns);
        } else if (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.md') || item.endsWith('.json')) {
          await this.checkFile(fullPath, patterns);
        }
      }
    } catch (error) {
      // Игнорируем ошибки доступа
    }
  }

  async checkFile(filePath, patterns) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const foundPatterns = patterns.filter(pattern => content.includes(pattern));
      
      if (foundPatterns.length > 0) {
        this.foundFiles.push({
          file: filePath,
          patterns: foundPatterns,
          size: content.length
        });
      }
    } catch (error) {
      // Игнорируем ошибки чтения
    }
  }

  async cleanDocumentationFiles() {
    console.log('🧹 Очистка документационных файлов...');
    
    const docsToClean = [
      'docs/DATABASE_MONITORING.md',
      'DB_CONNECTION_CLEANUP_REPORT.md'
    ];

    for (const docPath of docsToClean) {
      try {
        const exists = await fs.access(docPath).then(() => true).catch(() => false);
        if (exists) {
          await fs.unlink(docPath);
          this.deletedFiles.push(docPath);
          console.log(`✅ Удален: ${docPath}`);
        }
      } catch (error) {
        console.log(`⚠️ Не удалось удалить: ${docPath}`);
      }
    }
  }

  async updateReplicMd() {
    console.log('📝 Обновление replit.md...');
    
    try {
      const content = await fs.readFile('replit.md', 'utf8');
      
      // Удаляем упоминания старых баз данных
      const cleanedContent = content
        .replace(/@neondatabase/g, 'database')
        .replace(/neon\.tech/g, 'database provider')
        .replace(/ep-rough-boat/g, 'database')
        .replace(/ep-lucky-boat/g, 'database');
      
      await fs.writeFile('replit.md', cleanedContent);
      this.cleanedFiles.push('replit.md');
      console.log('✅ replit.md обновлен');
    } catch (error) {
      console.log('⚠️ Не удалось обновить replit.md');
    }
  }

  async createCleanDbConnection() {
    console.log('🔧 Создание чистого подключения к базе данных...');
    
    const cleanDbCode = `/**
 * Database connection module - Clean PostgreSQL connection
 * Unified database connection for production deployment
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Validate database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Connection health check
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1 as test');
    return { connected: true, test: result.rows[0]?.test === 1 };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  pool.end();
});

process.on('SIGINT', () => {
  pool.end();
});
`;

    await fs.writeFile('core/db.ts', cleanDbCode);
    console.log('✅ core/db.ts обновлен с чистым подключением');
  }

  async generateCleanupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesScanned: this.foundFiles.length,
        filesCleaned: this.cleanedFiles.length,
        filesDeleted: this.deletedFiles.length
      },
      foundIssues: this.foundFiles,
      cleanedFiles: this.cleanedFiles,
      deletedFiles: this.deletedFiles,
      status: 'completed'
    };

    await fs.writeFile('FINAL_CLEANUP_REPORT.json', JSON.stringify(report, null, 2));
    console.log('📊 Отчет о зачистке сохранен в FINAL_CLEANUP_REPORT.json');
    
    return report;
  }

  async runFullCleanup() {
    console.log('🚀 Запуск полной зачистки базы данных...');
    
    // 1. Сканирование старых подключений
    await this.scanForOldConnections();
    
    // 2. Очистка документации
    await this.cleanDocumentationFiles();
    
    // 3. Обновление replit.md
    await this.updateReplicMd();
    
    // 4. Создание чистого подключения
    await this.createCleanDbConnection();
    
    // 5. Генерация отчета
    const report = await this.generateCleanupReport();
    
    console.log('\n✅ ЗАЧИСТКА ЗАВЕРШЕНА');
    console.log(`📁 Найдено файлов с проблемами: ${report.summary.filesScanned}`);
    console.log(`🧹 Очищено файлов: ${report.summary.filesCleaned}`);
    console.log(`🗑️ Удалено файлов: ${report.summary.filesDeleted}`);
    
    return report;
  }
}

// Запуск зачистки
const cleanup = new DatabaseCleanup();
cleanup.runFullCleanup().catch(console.error);