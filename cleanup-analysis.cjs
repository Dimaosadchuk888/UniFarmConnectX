/**
 * Анализ файлов для безопасной очистки проекта
 */

const fs = require('fs');
const path = require('path');

class ProjectCleanupAnalyzer {
  constructor() {
    this.toDelete = [];
    this.toKeep = [];
    this.suspicious = [];
  }

  // Проверяем, используется ли файл в проекте
  async checkFileUsage(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const fileContent = fs.readFileSync(filePath, 'utf8').substring(0, 1000);
    
    return {
      path: filePath,
      size: fs.statSync(filePath).size,
      hasImports: fileContent.includes('import ') || fileContent.includes('require('),
      hasExports: fileContent.includes('export ') || fileContent.includes('module.exports'),
      isOld: filePath.includes('.old') || filePath.includes('.broken') || filePath.includes('.backup'),
      isTest: filePath.includes('test-') || filePath.includes('-test.'),
      isReport: filePath.endsWith('.md') && (filePath.includes('REPORT') || filePath.includes('_COMPLETION')),
      lastModified: fs.statSync(filePath).mtime
    };
  }

  // Анализируем markdown отчеты
  analyzeReports() {
    const reports = [];
    const files = fs.readdirSync('.').filter(f => f.endsWith('.md'));
    
    const keepReports = ['README.md', 'replit.md'];
    const reportPatterns = [
      /^T\d+_.*REPORT\.md$/,
      /^.*_COMPLETION_REPORT\.md$/,
      /^FINAL_.*_REPORT\.md$/,
      /^SUPABASE_.*\.md$/,
      /^DEPLOYMENT_.*\.md$/,
      /^CRITICAL_.*\.md$/
    ];

    files.forEach(file => {
      if (keepReports.includes(file)) {
        this.toKeep.push({ path: file, reason: 'Important documentation' });
      } else if (reportPatterns.some(pattern => pattern.test(file))) {
        this.toDelete.push({ path: file, reason: 'Old completion report', category: 'reports' });
      } else {
        this.suspicious.push({ path: file, reason: 'Unknown markdown file' });
      }
    });

    return { total: files.length, toDelete: this.toDelete.filter(f => f.category === 'reports').length };
  }

  // Анализируем JavaScript файлы
  analyzeScripts() {
    const scripts = fs.readdirSync('.').filter(f => f.endsWith('.js'));
    
    const keepScripts = [
      'server.js', 'stable-server.js', 'build-production.js', 'eslint.config.js'
    ];
    
    const testPatterns = [
      /^test-.*\.js$/,
      /.*-test\.js$/,
      /^.*-audit\.js$/,
      /^clean-.*\.js$/,
      /^fix-.*\.js$/,
      /^final-.*\.js$/
    ];

    scripts.forEach(file => {
      if (keepScripts.includes(file)) {
        this.toKeep.push({ path: file, reason: 'Production script' });
      } else if (testPatterns.some(pattern => pattern.test(file))) {
        this.toDelete.push({ path: file, reason: 'Test/cleanup script', category: 'scripts' });
      } else {
        this.suspicious.push({ path: file, reason: 'Unknown script file' });
      }
    });

    return { total: scripts.length, toDelete: this.toDelete.filter(f => f.category === 'scripts').length };
  }

  // Проверяем старые файлы в modules
  analyzeModules() {
    const modulePaths = ['modules'];
    let oldFiles = 0;

    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (file.endsWith('.old.ts') || file.endsWith('.broken.ts') || file.endsWith('.backup.ts')) {
          this.toDelete.push({ path: fullPath, reason: 'Old/broken module file', category: 'modules' });
          oldFiles++;
        }
      });
    };

    modulePaths.forEach(walkDir);
    return { oldFiles };
  }

  // Генерируем отчет
  generateReport() {
    const reportsAnalysis = this.analyzeReports();
    const scriptsAnalysis = this.analyzeScripts();
    const modulesAnalysis = this.analyzeModules();

    return {
      summary: {
        totalToDelete: this.toDelete.length,
        totalToKeep: this.toKeep.length,
        totalSuspicious: this.suspicious.length
      },
      categories: {
        reports: reportsAnalysis,
        scripts: scriptsAnalysis,
        modules: modulesAnalysis
      },
      deleteList: this.toDelete,
      keepList: this.toKeep,
      suspiciousList: this.suspicious
    };
  }
}

// Запускаем анализ
const analyzer = new ProjectCleanupAnalyzer();
const report = analyzer.generateReport();

console.log('=== АНАЛИЗ ОЧИСТКИ ПРОЕКТА ===');
console.log(`Файлов к удалению: ${report.summary.totalToDelete}`);
console.log(`Файлов оставить: ${report.summary.totalToKeep}`);
console.log(`Подозрительных файлов: ${report.summary.totalSuspicious}`);

console.log('\n=== ФАЙЛЫ К УДАЛЕНИЮ ===');
report.deleteList.forEach(item => {
  console.log(`${item.path} - ${item.reason}`);
});

console.log('\n=== ПОДОЗРИТЕЛЬНЫЕ ФАЙЛЫ ===');
report.suspiciousList.forEach(item => {
  console.log(`${item.path} - ${item.reason}`);
});

module.exports = { ProjectCleanupAnalyzer };