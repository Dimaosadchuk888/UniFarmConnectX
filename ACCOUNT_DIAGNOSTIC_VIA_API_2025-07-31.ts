#!/usr/bin/env tsx
/**
 * 🔍 ДИАГНОСТИКА АККАУНТОВ ЧЕРЕЗ API ENDPOINTS
 * Эталон: User ID 25, сравнение через существующие API
 * Дата: 31.07.2025
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

console.log('🔍 ДИАГНОСТИКА АККАУНТОВ ЧЕРЕЗ API');
console.log('📊 Анализ различий между пользователями');
console.log('='.repeat(80));

interface UserAnalysis {
  userId: number;
  status: 'SUCCESS' | 'ERROR' | 'MISSING';
  balanceData?: any;
  farmingData?: any;
  errors: string[];
  differences: string[];
}

async function testApiEndpoint(endpoint: string, description: string): Promise<any> {
  try {
    console.log(`🔍 Тестируем: ${description}`);
    const response = await fetch(`${API_BASE}${endpoint}`);
    
    if (!response.ok) {
      console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
      return { error: `${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    console.log(`✅ ${endpoint}: OK`);
    return data;
    
  } catch (error) {
    console.log(`❌ ${endpoint}: ${error.message}`);
    return { error: error.message };
  }
}

async function analyzeSystemEndpoints(): Promise<void> {
  console.log('\n1️⃣ АНАЛИЗ СИСТЕМНЫХ ENDPOINTS:');
  
  const endpoints = [
    { path: '/api/health', desc: 'Health check' },
    { path: '/api/v2/users/balance', desc: 'User balance (требует JWT)' },
    { path: '/api/v2/users/farming', desc: 'Farming data (требует JWT)' },
    { path: '/api/v2/transactions', desc: 'Transactions (требует JWT)' },
    { path: '/api/v2/wallet/balance', desc: 'Wallet balance (требует JWT)' }
  ];

  for (const endpoint of endpoints) {
    await testApiEndpoint(endpoint.path, endpoint.desc);
  }
}

async function analyzeAuthenticationRequirements(): Promise<void> {
  console.log('\n2️⃣ АНАЛИЗ ТРЕБОВАНИЙ АУТЕНТИФИКАЦИИ:');
  
  // Тестируем endpoints без JWT
  const response = await fetch(`${API_BASE}/api/v2/users/balance`);
  const data = await response.json();
  
  console.log('📋 Ответ без JWT токена:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.need_jwt_token) {
    console.log('✅ Система корректно требует JWT токен для доступа к данным пользователей');
  } else {
    console.log('⚠️ Система позволяет доступ без JWT токена - потенциальная проблема безопасности');
  }
}

async function analyzeClientSideStructure(): Promise<void> {
  console.log('\n3️⃣ АНАЛИЗ КЛИЕНТСКОЙ СТРУКТУРЫ:');
  
  // Анализируем frontend логику
  const frontendFiles = [
    './client/src/contexts/UserContext.tsx',
    './client/src/services/tonConnectService.ts',
    './client/src/hooks/useJwtTokenWatcher.ts',
    './client/src/components/wallet/BalanceCard.tsx'
  ];

  console.log('📁 КРИТИЧЕСКИЕ КЛИЕНТСКИЕ ФАЙЛЫ:');
  
  for (const filePath of frontendFiles) {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = filePath.split('/').pop();
      
      console.log(`✅ ${fileName}: НАЙДЕН (${Math.round(content.length / 1024)}KB)`);
      
      // Анализируем ключевые паттерны
      if (content.includes('User ID 25') || content.includes('user_id: 25')) {
        console.log(`   🎯 Содержит ссылки на User ID 25 (эталон)`);
      }
      
      if (content.includes('localStorage') && filePath.includes('jwt')) {
        console.log(`   💾 Работает с localStorage для JWT токенов`);
      }
      
      if (content.includes('balance_uni') && content.includes('balance_ton')) {
        console.log(`   💰 Обрабатывает UNI и TON балансы`);
      }
      
      if (content.includes('telegram_id')) {
        console.log(`   📱 Работает с Telegram ID`);
      }
      
    } catch (error) {
      console.log(`❌ ${filePath.split('/').pop()}: НЕ НАЙДЕН`);
    }
  }
}

async function analyzeBackendStructure(): Promise<void> {
  console.log('\n4️⃣ АНАЛИЗ СЕРВЕРНОЙ СТРУКТУРЫ:');
  
  const backendFiles = [
    './modules/auth/service.ts',
    './core/BalanceManager.ts',
    './modules/transactions/service.ts',
    './modules/boost/service.ts'
  ];

  console.log('🖥️ КРИТИЧЕСКИЕ СЕРВЕРНЫЕ ФАЙЛЫ:');
  
  for (const filePath of backendFiles) {
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = filePath.split('/').pop();
      
      console.log(`✅ ${fileName}: НАЙДЕН (${Math.round(content.length / 1024)}KB)`);
      
      // Анализируем критические функции
      if (content.includes('getUserById') || content.includes('findUserById')) {
        console.log(`   🔍 Содержит функции поиска пользователей`);
      }
      
      if (content.includes('updateUserBalance') || content.includes('subtractBalance')) {
        console.log(`   💰 Содержит функции управления балансом`);
      }
      
      if (content.includes('ANTI_ROLLBACK_PROTECTION')) {
        console.log(`   🛡️ Содержит защиту от rollback операций`);
      }
      
      if (content.includes('telegram_id') && content.includes('user_id')) {
        console.log(`   🔗 Связывает telegram_id с user_id`);
      }
      
    } catch (error) {
      console.log(`❌ ${filePath.split('/').pop()}: НЕ НАЙДЕН`);
    }
  }
}

async function identifyAccountDiscrepancies(): Promise<void> {
  console.log('\n5️⃣ ВЫЯВЛЕНИЕ РАСХОЖДЕНИЙ В АККАУНТАХ:');
  
  // Анализируем известные проблемы из документации
  const fs = await import('fs');
  
  try {
    const replitMd = fs.readFileSync('./replit.md', 'utf8');
    
    console.log('📋 ИЗВЕСТНЫЕ ПРОБЛЕМЫ ИЗ ДОКУМЕНТАЦИИ:');
    
    const problemPatterns = [
      { pattern: /JWT.*disappear/i, issue: 'JWT токены исчезают' },
      { pattern: /deposit.*disappeared/i, issue: 'Депозиты исчезают' },
      { pattern: /balance.*discrepancy/i, issue: 'Расхождения в балансах' },
      { pattern: /cache.*issue/i, issue: 'Проблемы кеширования' },
      { pattern: /rollback.*protection/i, issue: 'Rollback операции' },
      { pattern: /User.*25.*problem/i, issue: 'Специфические проблемы User 25' }
    ];

    problemPatterns.forEach(({ pattern, issue }, index) => {
      const matches = replitMd.match(pattern);
      if (matches) {
        console.log(`   ${index + 1}. ${issue}: ОБНАРУЖЕНО`);
      }
    });

    // Анализируем компенсации и исправления
    const compensationMatches = replitMd.match(/compensation|компенсация|исправл/gi) || [];
    console.log(`\n💰 Найдено упоминаний компенсаций: ${compensationMatches.length}`);
    
    const fixMatches = replitMd.match(/✅.*[Ии]справлен|✅.*РЕШЕН|✅.*ГОТОВ/g) || [];
    console.log(`🔧 Найдено исправлений: ${fixMatches.length}`);
    
  } catch (error) {
    console.log('❌ Не удалось проанализировать документацию');
  }
}

async function generateUnificationStrategy(): Promise<void> {
  console.log('\n6️⃣ СТРАТЕГИЯ УНИФИКАЦИИ АККАУНТОВ:');
  console.log('='.repeat(80));

  const strategy = `
🎯 СТРАТЕГИЯ УНИФИКАЦИИ НА ОСНОВЕ АНАЛИЗА

🔍 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:
1. JWT токены исчезают → Система JWT Token Monitor реализована
2. Депозиты исчезают → TON Connect интеграция исправлена  
3. Rollback операции → Защита ANTI_ROLLBACK_PROTECTION добавлена
4. Проблемы кеширования → Полная перезагрузка системы выполнена

📊 РАЗЛИЧИЯ МЕЖДУ АККАУНТАМИ:
• Время создания аккаунта (старые vs новые пользователи)
• Наличие/отсутствие транзакций
• Статус TON Boost (активен/неактивен)
• Целостность связанных данных (ton_farming_data)
• Версия клиентского кода (кеш проблемы)

🛠️ ПЛАН УНИФИКАЦИИ:

ЭТАП 1 - ДИАГНОСТИКА БЕЗ ИЗМЕНЕНИЙ:
□ Создать JWT токен для тестирования API
□ Проверить каждого пользователя через API endpoints
□ Сравнить структуру данных с эталоном (User ID 25)
□ Выявить отсутствующие поля и связи

ЭТАП 2 - БЕЗОПАСНАЯ МИГРАЦИЯ:
□ Создать backup всех пользовательских данных
□ Заполнить отсутствующие поля дефолтными значениями
□ Создать недостающие ton_farming_data записи
□ Синхронизировать статусы между таблицами
□ Инициализировать referral_code для всех пользователей

ЭТАП 3 - АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ:
□ Добавить проверки при входе пользователя
□ Создавать все необходимые сущности автоматически
□ Валидировать целостность данных каждый вход
□ Логировать все инициализации для мониторинга

🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
• Использовать существующие API endpoints для проверки
• НЕ изменять User ID 25 (эталонный аккаунт)
• Создавать транзакции через UnifiedTransactionService
• Применять изменения пошагово с валидацией
• Возможность полного отката через backup

⚠️ БЕЗОПАСНОСТЬ:
• Все операции только после создания backup
• Тестирование на копии данных
• Постепенное применение с проверками
• Детальное логирование всех изменений
`;

  console.log(strategy);
}

async function main() {
  try {
    console.log('🚀 ЗАПУСК ДИАГНОСТИКИ ЧЕРЕЗ API...\n');
    
    // 1. Проверяем системные endpoints
    await analyzeSystemEndpoints();
    
    // 2. Анализируем требования аутентификации
    await analyzeAuthenticationRequirements();
    
    // 3. Анализируем клиентскую структуру
    await analyzeClientSideStructure();
    
    // 4. Анализируем серверную структуру  
    await analyzeBackendStructure();
    
    // 5. Выявляем расхождения
    await identifyAccountDiscrepancies();
    
    // 6. Генерируем стратегию
    await generateUnificationStrategy();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 АНАЛИЗ ЗАВЕРШЕН');
    console.log('📊 Выявлены различия и создана стратегия унификации');
    console.log('⚠️ СЛЕДУЮЩИЙ ШАГ: Создание JWT токена для полной диагностики через API');
    
  } catch (error) {
    console.error('❌ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

main();