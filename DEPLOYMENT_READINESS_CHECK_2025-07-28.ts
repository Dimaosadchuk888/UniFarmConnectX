#!/usr/bin/env tsx

/**
 * ПРОВЕРКА ГОТОВНОСТИ К ДЕПЛОЮ
 * Валидация всех критических переменных окружения
 */

console.log('🚀 ПРОВЕРКА ГОТОВНОСТИ СИСТЕМЫ К ДЕПЛОЮ');
console.log('='.repeat(80));

interface EnvironmentCheck {
  name: string;
  required: boolean;
  category: string;
  description: string;
}

const environmentChecks: EnvironmentCheck[] = [
  // Database & Core
  { name: 'SUPABASE_URL', required: true, category: 'Database', description: 'Supabase project URL' },
  { name: 'SUPABASE_KEY', required: true, category: 'Database', description: 'Supabase service role key' },
  { name: 'DATABASE_URL', required: false, category: 'Database', description: 'PostgreSQL connection (optional)' },
  
  // Authentication
  { name: 'JWT_SECRET', required: true, category: 'Security', description: 'JWT token signing secret' },
  
  // Telegram Integration
  { name: 'TELEGRAM_BOT_TOKEN', required: true, category: 'Telegram', description: 'Main bot token (@UniFarming_Bot)' },
  { name: 'TELEGRAM_ADMIN_BOT_TOKEN', required: true, category: 'Telegram', description: 'Admin bot token' },
  { name: 'TELEGRAM_WEBAPP_URL', required: true, category: 'Telegram', description: 'WebApp URL for bot integration' },
  
  // TON Blockchain
  { name: 'TON_API_URL', required: true, category: 'TON', description: 'TON API endpoint' },
  { name: 'TON_MANIFEST_URL', required: true, category: 'TON', description: 'TON Connect manifest URL' },
  
  // Application
  { name: 'APP_DOMAIN', required: true, category: 'Application', description: 'Main application domain' },
  { name: 'NODE_ENV', required: false, category: 'Application', description: 'Environment mode' },
];

function checkEnvironmentVariables(): { ready: boolean; issues: string[] } {
  console.log('📋 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ\n');
  
  const issues: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;
  
  const categories = ['Database', 'Security', 'Telegram', 'TON', 'Application'];
  
  categories.forEach(category => {
    console.log(`📂 ${category}:`);
    
    const categoryVars = environmentChecks.filter(check => check.category === category);
    categoryVars.forEach(check => {
      totalChecks++;
      const value = process.env[check.name];
      
      if (value) {
        passedChecks++;
        const maskedValue = value.length > 30 
          ? value.substring(0, 15) + '...' + value.substring(value.length - 5)
          : value.substring(0, 20) + '...';
        console.log(`   ✅ ${check.name}: ${maskedValue}`);
      } else {
        const status = check.required ? '❌ ТРЕБУЕТСЯ' : '⚠️ ОПЦИОНАЛЬНО';
        console.log(`   ${status} ${check.name}: НЕ УСТАНОВЛЕНА`);
        
        if (check.required) {
          issues.push(`${check.name} - ${check.description}`);
        }
      }
    });
    console.log('');
  });
  
  console.log(`📊 ИТОГО: ${passedChecks}/${totalChecks} переменных установлено`);
  
  return {
    ready: issues.length === 0,
    issues
  };
}

function validateURLs(): { valid: boolean; issues: string[] } {
  console.log('\n🔗 ПРОВЕРКА URL КОНФИГУРАЦИИ\n');
  
  const issues: string[] = [];
  
  const urls = {
    'APP_DOMAIN': process.env.APP_DOMAIN,
    'TELEGRAM_WEBAPP_URL': process.env.TELEGRAM_WEBAPP_URL,
    'TON_MANIFEST_URL': process.env.TON_MANIFEST_URL,
    'SUPABASE_URL': process.env.SUPABASE_URL
  };
  
  Object.entries(urls).forEach(([name, url]) => {
    if (url) {
      try {
        new URL(url);
        console.log(`✅ ${name}: ${url}`);
      } catch {
        console.log(`❌ ${name}: Невалидный URL - ${url}`);
        issues.push(`${name} содержит невалидный URL`);
      }
    }
  });
  
  // Проверка согласованности доменов
  const appDomain = process.env.APP_DOMAIN;
  const webappUrl = process.env.TELEGRAM_WEBAPP_URL;
  const manifestUrl = process.env.TON_MANIFEST_URL;
  
  if (appDomain && webappUrl && manifestUrl) {
    const domainMatch = webappUrl.includes(appDomain.replace('https://', '')) && 
                       manifestUrl.includes(appDomain.replace('https://', ''));
    
    if (domainMatch) {
      console.log('✅ Домены согласованы между переменными');
    } else {
      console.log('⚠️ Домены не согласованы между переменными');
      issues.push('Несогласованность доменов между APP_DOMAIN, TELEGRAM_WEBAPP_URL и TON_MANIFEST_URL');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

function checkCriticalFiles(): { ready: boolean; issues: string[] } {
  console.log('\n📁 ПРОВЕРКА КРИТИЧЕСКИХ ФАЙЛОВ\n');
  
  const issues: string[] = [];
  
  const criticalFiles = [
    'client/public/tonconnect-manifest.json',
    'client/public/.well-known/tonconnect-manifest.json',
    'server/index.ts',
    'shared/schema.ts',
    'core/TransactionService.ts',
    'modules/wallet/service.ts'
  ];
  
  criticalFiles.forEach(filePath => {
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${filePath}`);
      } else {
        console.log(`❌ ${filePath} - НЕ НАЙДЕН`);
        issues.push(`Отсутствует критический файл: ${filePath}`);
      }
    } catch (error) {
      console.log(`❌ ${filePath} - ОШИБКА ПРОВЕРКИ`);
      issues.push(`Ошибка проверки файла: ${filePath}`);
    }
  });
  
  return {
    ready: issues.length === 0,
    issues
  };
}

function generateDeploymentReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ИТОГОВЫЙ ОТЧЕТ О ГОТОВНОСТИ К ДЕПЛОЮ');
  console.log('='.repeat(80));
  
  const envCheck = checkEnvironmentVariables();
  const urlCheck = validateURLs();
  const fileCheck = checkCriticalFiles();
  
  const allIssues = [...envCheck.issues, ...urlCheck.issues, ...fileCheck.issues];
  
  if (allIssues.length === 0) {
    console.log('\n🎉 СИСТЕМА ГОТОВА К ДЕПЛОЮ!');
    console.log('✅ Все переменные окружения установлены');
    console.log('✅ Все URL валидны и согласованы');
    console.log('✅ Все критические файлы на месте');
    console.log('\n🚀 Можно безопасно выполнять деплой');
  } else {
    console.log('\n⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
    allIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    console.log('\n❌ Необходимо исправить проблемы перед деплоем');
  }
  
  console.log('\n📊 СТАТИСТИКА:');
  console.log(`- Переменные окружения: ${envCheck.ready ? 'ГОТОВО' : 'ТРЕБУЕТ ВНИМАНИЯ'}`);
  console.log(`- URL конфигурация: ${urlCheck.valid ? 'ГОТОВО' : 'ТРЕБУЕТ ВНИМАНИЯ'}`);
  console.log(`- Критические файлы: ${fileCheck.ready ? 'ГОТОВО' : 'ТРЕБУЕТ ВНИМАНИЯ'}`);
  
  console.log('\n='.repeat(80));
}

generateDeploymentReport();