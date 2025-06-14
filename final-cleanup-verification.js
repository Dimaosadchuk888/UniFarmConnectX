/**
 * Финальная проверка зачистки старых подключений к базе данных
 * Создает итоговый отчет о состоянии системы после очистки
 */

import { promises as fs } from 'fs';
import path from 'path';

class FinalCleanupVerification {
  constructor() {
    this.results = {
      coreDbStatus: null,
      moduleImports: [],
      environmentCheck: null,
      packagesCheck: null,
      documentationClean: null,
      overallStatus: 'pending'
    };
  }

  async checkCoreDbFile() {
    console.log('Проверка core/db.ts...');
    
    try {
      const content = await fs.readFile('core/db.ts', 'utf8');
      
      const checks = [
        { check: content.includes('import { Pool } from \'pg\''), desc: 'PostgreSQL Pool импорт' },
        { check: content.includes('import { drizzle } from \'drizzle-orm/node-postgres\''), desc: 'Drizzle ORM импорт' },
        { check: content.includes('process.env.DATABASE_URL'), desc: 'DATABASE_URL используется' },
        { check: !content.includes('@neondatabase'), desc: 'Нет упоминаний Neon' },
        { check: !content.includes('replit'), desc: 'Нет упоминаний Replit DB' },
        { check: content.includes('export const db = drizzle(pool, { schema })'), desc: 'Drizzle экспорт настроен' }
      ];

      const passed = checks.filter(c => c.check).length;
      
      this.results.coreDbStatus = {
        passed,
        total: checks.length,
        checks,
        clean: passed === checks.length
      };

      console.log(`  ✅ Проверка core/db.ts: ${passed}/${checks.length} тестов пройдено`);
    } catch (error) {
      this.results.coreDbStatus = { error: error.message };
      console.log('  ❌ Ошибка чтения core/db.ts');
    }
  }

  async checkModuleImports() {
    console.log('Проверка импортов модулей...');
    
    const moduleFiles = [
      'modules/auth/service.ts',
      'modules/user/service.ts', 
      'modules/farming/service.ts',
      'modules/wallet/service.ts',
      'modules/referral/service.ts',
      'modules/missions/service.ts'
    ];

    for (const modulePath of moduleFiles) {
      try {
        const content = await fs.readFile(modulePath, 'utf8');
        
        const usesCorrectImport = content.includes('from \'../../core/db\'') || 
                                 content.includes('from \'../core/db\'') ||
                                 content.includes('from \'/core/db\'');
        
        const hasOldImports = content.includes('server/db') || 
                             content.includes('@neondatabase') ||
                             content.includes('replit');

        this.results.moduleImports.push({
          module: modulePath,
          correctImport: usesCorrectImport,
          hasOldImports,
          clean: usesCorrectImport && !hasOldImports
        });

        console.log(`  ${usesCorrectImport && !hasOldImports ? '✅' : '⚠️'} ${modulePath}`);
      } catch (error) {
        this.results.moduleImports.push({
          module: modulePath,
          error: error.message
        });
      }
    }
  }

  async checkPackages() {
    console.log('Проверка пакетов...');
    
    try {
      const packageContent = await fs.readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      const hasOldPackages = packageJson.dependencies && 
        (packageJson.dependencies['@neondatabase/serverless'] ||
         packageJson.dependencies['@replit/database']);

      this.results.packagesCheck = {
        hasOldPackages,
        clean: !hasOldPackages,
        dependencies: Object.keys(packageJson.dependencies || {}).filter(dep => 
          dep.includes('neon') || dep.includes('replit')
        )
      };

      console.log(`  ${!hasOldPackages ? '✅' : '⚠️'} Проверка пакетов завершена`);
    } catch (error) {
      this.results.packagesCheck = { error: error.message };
    }
  }

  async checkDocumentation() {
    console.log('Проверка документации...');
    
    const problematicFiles = [
      'docs/DATABASE_MONITORING.md',
      'DB_CONNECTION_CLEANUP_REPORT.md'
    ];

    let cleanCount = 0;
    
    for (const filePath of problematicFiles) {
      try {
        await fs.access(filePath);
        console.log(`  ⚠️ Найден файл: ${filePath}`);
      } catch (error) {
        cleanCount++;
        console.log(`  ✅ Файл удален: ${filePath}`);
      }
    }

    this.results.documentationClean = {
      filesChecked: problematicFiles.length,
      filesRemoved: cleanCount,
      clean: cleanCount === problematicFiles.length
    };
  }

  async checkEnvironmentVariables() {
    console.log('Проверка переменных окружения...');
    
    const hasOldVars = process.env.PGHOST || 
                       process.env.PGDATABASE || 
                       process.env.PGUSER || 
                       process.env.PGPASSWORD ||
                       process.env.DATABASE_PROVIDER;

    const hasDatabaseUrl = !!process.env.DATABASE_URL;

    this.results.environmentCheck = {
      hasOldVars: !!hasOldVars,
      hasDatabaseUrl,
      clean: !hasOldVars && hasDatabaseUrl
    };

    console.log(`  ${!hasOldVars && hasDatabaseUrl ? '✅' : '⚠️'} Переменные окружения проверены`);
  }

  generateFinalReport() {
    const allChecks = [
      this.results.coreDbStatus?.clean,
      this.results.moduleImports.every(m => m.clean),
      this.results.packagesCheck?.clean,
      this.results.documentationClean?.clean,
      this.results.environmentCheck?.clean
    ];

    const allClean = allChecks.every(check => check === true);
    
    this.results.overallStatus = allClean ? 'clean' : 'needs_attention';

    const report = {
      timestamp: new Date().toISOString(),
      status: this.results.overallStatus,
      summary: {
        totalChecks: allChecks.length,
        passedChecks: allChecks.filter(c => c === true).length,
        cleanupComplete: allClean
      },
      details: this.results,
      recommendations: allClean ? [
        'Система полностью очищена от старых подключений',
        'core/db.ts является единственной точкой подключения к базе данных',
        'Готово для production deployment с DATABASE_URL'
      ] : [
        'Требуется дополнительная очистка некоторых компонентов',
        'Проверьте детали в разделе details отчета'
      ]
    };

    return report;
  }

  async runFullVerification() {
    console.log('🔍 Запуск финальной проверки зачистки...\n');
    
    await this.checkCoreDbFile();
    await this.checkModuleImports();
    await this.checkPackages();
    await this.checkDocumentation();
    await this.checkEnvironmentVariables();
    
    const report = this.generateFinalReport();
    
    await fs.writeFile('FINAL_CLEANUP_VERIFICATION.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 РЕЗУЛЬТАТЫ ФИНАЛЬНОЙ ПРОВЕРКИ');
    console.log('=====================================');
    console.log(`Статус: ${report.status === 'clean' ? '✅ ЧИСТО' : '⚠️ ТРЕБУЕТ ВНИМАНИЯ'}`);
    console.log(`Проверок пройдено: ${report.summary.passedChecks}/${report.summary.totalChecks}`);
    console.log(`Зачистка завершена: ${report.summary.cleanupComplete ? 'ДА' : 'НЕТ'}`);
    
    console.log('\n🎯 Рекомендации:');
    report.recommendations.forEach(rec => console.log(`  • ${rec}`));
    
    return report;
  }
}

const verification = new FinalCleanupVerification();
verification.runFullVerification().catch(console.error);