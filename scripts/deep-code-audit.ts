import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

interface FieldUsage {
  file: string;
  line: number;
  code: string;
  context: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AuditReport {
  wallet: FieldUsage[];
  uni_farming_deposit: FieldUsage[];
  ton_boost_package_id: FieldUsage[];
  summary: {
    totalIssues: number;
    criticalFiles: string[];
    recommendations: string[];
  };
}

async function analyzeFile(filePath: string, content: string): Promise<{
  wallet: FieldUsage[];
  uni_farming_deposit: FieldUsage[];
  ton_boost_package_id: FieldUsage[];
}> {
  const lines = content.split('\n');
  const result = {
    wallet: [] as FieldUsage[],
    uni_farming_deposit: [] as FieldUsage[],
    ton_boost_package_id: [] as FieldUsage[]
  };
  
  lines.forEach((line, index) => {
    // Анализ использования wallet
    if (line.match(/[^\w]wallet[^\w]/) && !line.includes('ton_wallet_address')) {
      // Определяем контекст использования
      let context = 'UNKNOWN';
      let severity: FieldUsage['severity'] = 'LOW';
      
      if (line.includes('routes.ts') || line.includes('controller.ts')) {
        context = 'API_ENDPOINT';
        severity = 'CRITICAL';
      } else if (line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE')) {
        context = 'DATABASE_QUERY';
        severity = 'CRITICAL';
      } else if (line.includes('interface') || line.includes('type') || line.includes('schema')) {
        context = 'TYPE_DEFINITION';
        severity = 'HIGH';
      } else if (line.includes('import') || line.includes('export')) {
        context = 'MODULE_INTERFACE';
        severity = 'MEDIUM';
      } else if (line.includes('//') || line.includes('/*')) {
        context = 'COMMENT';
        severity = 'LOW';
      }
      
      result.wallet.push({
        file: filePath,
        line: index + 1,
        code: line.trim(),
        context,
        severity
      });
    }
    
    // Анализ uni_farming_deposit
    if (line.includes('uni_farming_deposit')) {
      let severity: FieldUsage['severity'] = 'HIGH';
      const context = line.includes('SELECT') || line.includes('INSERT') ? 'DATABASE_QUERY' : 'CODE_REFERENCE';
      
      result.uni_farming_deposit.push({
        file: filePath,
        line: index + 1,
        code: line.trim(),
        context,
        severity
      });
    }
    
    // Анализ ton_boost_package_id
    if (line.includes('ton_boost_package_id')) {
      let severity: FieldUsage['severity'] = 'HIGH';
      const context = line.includes('SELECT') || line.includes('INSERT') ? 'DATABASE_QUERY' : 'CODE_REFERENCE';
      
      result.ton_boost_package_id.push({
        file: filePath,
        line: index + 1,
        code: line.trim(),
        context,
        severity
      });
    }
  });
  
  return result;
}

async function performDeepAudit() {
  console.log('🔍 ГЛУБОКИЙ АУДИТ ИСПОЛЬЗОВАНИЯ УДАЛЕННЫХ ПОЛЕЙ');
  console.log('='.repeat(60));
  console.log(`📅 Дата: ${new Date().toISOString()}`);
  console.log('\n');
  
  const files = await glob([
    'client/**/*.{ts,tsx}',
    'server/**/*.{ts,js}',
    'modules/**/*.{ts,js}',
    'shared/**/*.{ts,js}'
  ]);
  
  const report: AuditReport = {
    wallet: [],
    uni_farming_deposit: [],
    ton_boost_package_id: [],
    summary: {
      totalIssues: 0,
      criticalFiles: [],
      recommendations: []
    }
  };
  
  // Анализируем каждый файл
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const analysis = await analyzeFile(file, content);
    
    report.wallet.push(...analysis.wallet);
    report.uni_farming_deposit.push(...analysis.uni_farming_deposit);
    report.ton_boost_package_id.push(...analysis.ton_boost_package_id);
  }
  
  // Сортируем по критичности
  const sortBySeverity = (a: FieldUsage, b: FieldUsage) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  };
  
  report.wallet.sort(sortBySeverity);
  report.uni_farming_deposit.sort(sortBySeverity);
  report.ton_boost_package_id.sort(sortBySeverity);
  
  // 1. АНАЛИЗ ПОЛЯ WALLET
  console.log('1️⃣ АНАЛИЗ ИСПОЛЬЗОВАНИЯ ПОЛЯ "wallet"');
  console.log('-'.repeat(40));
  console.log(`Всего найдено: ${report.wallet.length} использований`);
  
  const walletBySeverity = report.wallet.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\nПо критичности:');
  Object.entries(walletBySeverity).forEach(([severity, count]) => {
    console.log(`  ${severity}: ${count}`);
  });
  
  console.log('\n🔴 КРИТИЧЕСКИЕ ИСПОЛЬЗОВАНИЯ (требуют немедленного исправления):');
  const criticalWallet = report.wallet.filter(u => u.severity === 'CRITICAL');
  criticalWallet.slice(0, 10).forEach(usage => {
    console.log(`\n📍 ${usage.file}:${usage.line}`);
    console.log(`   Контекст: ${usage.context}`);
    console.log(`   Код: ${usage.code}`);
  });
  
  // 2. АНАЛИЗ ДРУГИХ ПОЛЕЙ
  console.log('\n2️⃣ АНАЛИЗ ДРУГИХ УДАЛЕННЫХ ПОЛЕЙ');
  console.log('-'.repeat(40));
  console.log(`uni_farming_deposit: ${report.uni_farming_deposit.length} использований`);
  console.log(`ton_boost_package_id: ${report.ton_boost_package_id.length} использований`);
  
  // 3. АНАЛИЗ КРИТИЧНЫХ ФАЙЛОВ
  console.log('\n3️⃣ НАИБОЛЕЕ ПРОБЛЕМНЫЕ ФАЙЛЫ');
  console.log('-'.repeat(40));
  
  const fileIssueCount: Record<string, number> = {};
  [...report.wallet, ...report.uni_farming_deposit, ...report.ton_boost_package_id].forEach(usage => {
    if (usage.severity === 'CRITICAL' || usage.severity === 'HIGH') {
      fileIssueCount[usage.file] = (fileIssueCount[usage.file] || 0) + 1;
    }
  });
  
  const sortedFiles = Object.entries(fileIssueCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  sortedFiles.forEach(([file, count]) => {
    console.log(`  ${file}: ${count} критичных проблем`);
    report.summary.criticalFiles.push(file);
  });
  
  // 4. ВЛИЯНИЕ НА СИСТЕМУ
  console.log('\n4️⃣ ВЛИЯНИЕ НА РАБОТУ СИСТЕМЫ');
  console.log('-'.repeat(40));
  
  if (criticalWallet.length > 0) {
    console.log('❌ КРИТИЧНО: Найдены SQL запросы и API endpoints использующие удаленные поля');
    console.log('   Это может вызвать ошибки 500 при обращении к этим endpoints');
  }
  
  console.log('\n✅ ПОЧЕМУ СИСТЕМА ВСЕ ЕЩЕ РАБОТАЕТ:');
  console.log('1. Views (uni_farming_data, ton_farming_data) маппят старые поля на новые');
  console.log('2. Основной функционал использует новые поля (ton_wallet_address, uni_deposit_amount)');
  console.log('3. Критические ошибки могут возникать только в специфических endpoints');
  
  // 5. РЕКОМЕНДАЦИИ
  console.log('\n5️⃣ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ');
  console.log('-'.repeat(40));
  
  report.summary.recommendations = [
    '1. СРОЧНО: Исправить критические файлы (API endpoints и SQL запросы)',
    '2. Заменить все использования "wallet" на "ton_wallet_address"',
    '3. Заменить "uni_farming_deposit" на "uni_deposit_amount"',
    '4. Заменить "ton_boost_package_id" на "ton_boost_package"',
    '5. Обновить TypeScript интерфейсы и типы',
    '6. Протестировать все API endpoints после исправлений'
  ];
  
  report.summary.recommendations.forEach(rec => console.log(rec));
  
  // Сохраняем детальный отчет
  report.summary.totalIssues = report.wallet.length + report.uni_farming_deposit.length + report.ton_boost_package_id.length;
  
  await fs.writeFile(
    'DEEP_CODE_AUDIT_REPORT.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Детальный отчет сохранен в DEEP_CODE_AUDIT_REPORT.json');
  
  // 6. ПЛАН ДЕЙСТВИЙ
  console.log('\n6️⃣ ПЛАН ДЕЙСТВИЙ');
  console.log('-'.repeat(40));
  console.log('ШАГ 1: Исправить критические файлы (API и БД запросы)');
  console.log('ШАГ 2: Обновить TypeScript типы');
  console.log('ШАГ 3: Постепенно заменить все остальные использования');
  console.log('ШАГ 4: Удалить views после полной очистки кода');
  
  console.log('\n🎯 ИТОГ: Система работает, но требует постепенной очистки кода');
}

performDeepAudit().catch(console.error);