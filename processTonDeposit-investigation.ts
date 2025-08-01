import { supabase } from './core/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function investigateProcessTonDeposit() {
  console.log('🔍 РАССЛЕДОВАНИЕ processTonDeposit() - ПОИСК ПРОБЛЕМЫ');
  console.log('='.repeat(80));

  try {
    // 1. АНАЛИЗ API ЭНДПОИНТОВ ДЛЯ TON ДЕПОЗИТОВ
    console.log('\n1️⃣ ПОИСК API ЭНДПОИНТОВ ДЛЯ TON ДЕПОЗИТОВ:');
    
    const serverDir = './server';
    if (fs.existsSync(serverDir)) {
      const files = fs.readdirSync(serverDir, { recursive: true });
      const routeFiles = files.filter(f => 
        typeof f === 'string' && (f.includes('route') || f.includes('controller'))
      );
      
      console.log(`📁 Найдено файлов маршрутов: ${routeFiles.length}`);
      
      routeFiles.forEach(file => {
        const filePath = path.join(serverDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes('ton-deposit') || content.includes('processTonDeposit')) {
            console.log(`   ✅ ${file}: содержит ton-deposit логику`);
            
            // Ищем строки с ton-deposit
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.includes('ton-deposit') || line.includes('processTonDeposit')) {
                console.log(`     Line ${idx + 1}: ${line.trim()}`);
              }
            });
          }
        }
      });
    }

    // 2. ПРОВЕРКА СУЩЕСТВОВАНИЯ WalletService.processTonDeposit
    console.log('\n2️⃣ ПРОВЕРКА modules/wallet/service.ts:');
    
    const walletServicePath = './modules/wallet/service.ts';
    if (fs.existsSync(walletServicePath)) {
      const content = fs.readFileSync(walletServicePath, 'utf8');
      
      if (content.includes('processTonDeposit')) {
        console.log('   ✅ processTonDeposit метод НАЙДЕН в WalletService');
        
        // Анализируем метод детально
        const methodStart = content.indexOf('processTonDeposit');
        const methodEnd = content.indexOf('}', content.indexOf('{', methodStart));
        const methodCode = content.substring(methodStart, methodEnd + 1);
        
        console.log('\n   📋 АНАЛИЗ МЕТОДА:');
        
        // Проверяем ключевые элементы
        const checks = [
          { name: 'UnifiedTransactionService', found: methodCode.includes('UnifiedTransactionService') },
          { name: 'createTransaction', found: methodCode.includes('createTransaction') },
          { name: 'TON_DEPOSIT', found: methodCode.includes('TON_DEPOSIT') },
          { name: 'BalanceManager', found: methodCode.includes('BalanceManager') },
          { name: 'try-catch блок', found: methodCode.includes('try') && methodCode.includes('catch') }
        ];
        
        checks.forEach(check => {
          console.log(`     ${check.name}: ${check.found ? '✅ ДА' : '❌ НЕТ'}`);
        });
        
        // Ищем потенциальные проблемы
        if (methodCode.includes('return') && methodCode.includes('false')) {
          console.log(`     ⚠️ ВНИМАНИЕ: Метод может возвращать false в некоторых случаях`);
        }
        
        if (methodCode.includes('logger.error') || methodCode.includes('console.error')) {
          console.log(`     ✅ Есть логирование ошибок`);
        }
        
      } else {
        console.log('   ❌ processTonDeposit метод НЕ НАЙДЕН!');
      }
    } else {
      console.log('   ❌ modules/wallet/service.ts НЕ СУЩЕСТВУЕТ!');
    }

    // 3. ПОИСК АЛЬТЕРНАТИВНЫХ ПУТЕЙ ОБНОВЛЕНИЯ БАЛАНСА TON
    console.log('\n3️⃣ ПОИСК АЛЬТЕРНАТИВНЫХ ПУТЕЙ ОБНОВЛЕНИЯ balance_ton:');
    
    const searchDirs = ['./modules', './core', './server'];
    const alternativePaths: string[] = [];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir, { recursive: true });
        
        files.forEach(file => {
          if (typeof file === 'string' && file.endsWith('.ts')) {
            const filePath = path.join(dir, file);
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              
              // Ищем прямые обновления баланса
              if (content.includes('balance_ton') && 
                  (content.includes('UPDATE') || content.includes('update') || content.includes('set'))) {
                
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                  if (line.includes('balance_ton') && 
                      (line.includes('UPDATE') || line.includes('update') || line.includes('SET'))) {
                    alternativePaths.push(`${file}:${idx + 1} - ${line.trim()}`);
                  }
                });
              }
            }
          }
        });
      }
    });
    
    console.log(`📊 Найдено альтернативных путей обновления balance_ton: ${alternativePaths.length}`);
    alternativePaths.slice(0, 10).forEach(path => {
      console.log(`   🔍 ${path}`);
    });

    // 4. ПРОВЕРКА SCHEDULER ОПЕРАЦИЙ
    console.log('\n4️⃣ ПРОВЕРКА SCHEDULER ОПЕРАЦИЙ:');
    
    const schedulerFiles = ['./core/scheduler.ts', './modules/farming/scheduler.ts', './server/scheduler.ts'];
    
    schedulerFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('balance_ton') || content.includes('TON')) {
          console.log(`   ✅ ${filePath}: содержит TON операции`);
          
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('balance_ton') && line.includes('+=')) {
              console.log(`     Line ${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    });

    // 5. ПРОВЕРКА ЛОГОВ СЕРВЕРА НА ВЫЗОВЫ processTonDeposit
    console.log('\n5️⃣ АНАЛИЗ RECENT ЛОГОВ:');
    
    // Проверяем есть ли в БД записи с CRITICAL логами processTonDeposit
    const { data: criticalLogs, error: logsError } = await supabase
      .from('logs')
      .select('message, created_at')
      .like('message', '%processTonDeposit%')
      .or('message.like.%TON_DEPOSIT%,message.like.%CRITICAL%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!logsError && criticalLogs && criticalLogs.length > 0) {
      console.log(`📋 Найдено логов с processTonDeposit: ${criticalLogs.length}`);
      criticalLogs.forEach(log => {
        console.log(`   ${log.created_at}: ${log.message}`);
      });
    } else {
      console.log(`   ❌ НЕТ логов с processTonDeposit в БД`);
    }

    // 6. ПРОВЕРКА API ВЫЗОВОВ TON ДЕПОЗИТОВ В РЕАЛЬНОМ ВРЕМЕНИ
    console.log('\n6️⃣ ПРОВЕРКА API ENDPOINT ДОСТУПНОСТИ:');
    
    const endpoints = [
      '/api/v2/wallet/ton-deposit',
      '/api/wallet/ton-deposit', 
      '/api/deposits/ton',
      '/api/ton/deposit'
    ];
    
    // Этот блок только показывает какие эндпоинты нужно проверить
    console.log(`🔗 Эндпоинты для проверки:`);
    endpoints.forEach(endpoint => {
      console.log(`   ${endpoint}: НУЖНО ПРОТЕСТИРОВАТЬ`);
    });

    // 7. АНАЛИЗ UnifiedTransactionService
    console.log('\n7️⃣ ПРОВЕРКА UnifiedTransactionService:');
    
    const unifiedServicePath = './core/UnifiedTransactionService.ts';
    if (fs.existsSync(unifiedServicePath)) {
      const content = fs.readFileSync(unifiedServicePath, 'utf8');
      
      console.log('   ✅ UnifiedTransactionService НАЙДЕН');
      
      // Проверяем поддержку TON_DEPOSIT
      if (content.includes('TON_DEPOSIT')) {
        console.log('   ✅ TON_DEPOSIT тип ПОДДЕРЖИВАЕТСЯ');
      } else {
        console.log('   ❌ TON_DEPOSIT тип НЕ НАЙДЕН в маппинге!');
      }
      
      // Проверяем TRANSACTION_TYPE_MAPPING
      if (content.includes('TRANSACTION_TYPE_MAPPING')) {
        const mappingStart = content.indexOf('TRANSACTION_TYPE_MAPPING');
        const mappingEnd = content.indexOf('}', mappingStart) + 1;
        const mappingCode = content.substring(mappingStart, mappingEnd);
        
        console.log('\n   📋 TRANSACTION_TYPE_MAPPING:');
        const lines = mappingCode.split('\n');
        lines.forEach(line => {
          if (line.includes('TON_DEPOSIT') || line.includes('DEPOSIT')) {
            console.log(`     ${line.trim()}`);
          }
        });
      }
    } else {
      console.log('   ❌ UnifiedTransactionService НЕ НАЙДЕН!');
    }

    // 8. ВЫВОДЫ И ГИПОТЕЗЫ
    console.log('\n8️⃣ ПРЕДВАРИТЕЛЬНЫЕ ВЫВОДЫ:');
    
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
    console.log('   1. API эндпоинт /ton-deposit НЕ СУЩЕСТВУЕТ или НЕ РАБОТАЕТ');
    console.log('   2. processTonDeposit() НЕ ВЫЗЫВАЕТСЯ из API');
    console.log('   3. UnifiedTransactionService НЕ ПОДДЕРЖИВАЕТ TON_DEPOSIT');
    console.log('   4. Ошибка в коде processTonDeposit() блокирует создание транзакций');
    console.log('   5. Balance обновляется ДРУГИМ способом, минуя processTonDeposit()');
    
    console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ РАССЛЕДОВАНИЯ:');
    console.log('   1. Проверить работу API эндпоинта /api/v2/wallet/ton-deposit');
    console.log('   2. Найти КАК реально обновляются TON балансы пользователей');
    console.log('   3. Проверить логи сервера на ошибки processTonDeposit()');
    console.log('   4. Найти альтернативный путь создания TON депозитов');

  } catch (error) {
    console.error('❌ ОШИБКА РАССЛЕДОВАНИЯ:', error);
  }
}

investigateProcessTonDeposit().catch(console.error);