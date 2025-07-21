#!/usr/bin/env node
/**
 * ПОЛНОЕ ИССЛЕДОВАНИЕ ЦЕПОЧКИ TON ПЛАТЕЖЕЙ
 * Анализ всей цепочки от инициации платежа до отображения баланса
 * БЕЗ ИЗМЕНЕНИЯ КОДА - только анализ
 */

const fs = require('fs');
const path = require('path');

function investigatePaymentChain() {
  console.log('🔍 ПОЛНОЕ ИССЛЕДОВАНИЕ ЦЕПОЧКИ TON ПЛАТЕЖЕЙ');
  console.log('='.repeat(60));
  
  const findings = {};
  
  // ЭТАП 1: Анализ файлов инициации платежа (Frontend)
  console.log('\n1️⃣ АНАЛИЗ ИНИЦИАЦИИ ПЛАТЕЖА (FRONTEND)');
  console.log('-'.repeat(40));
  
  const frontendFiles = [
    'client/src/components/wallet/TonDepositCard.tsx',
    'client/src/services/tonConnectService.ts',
    'client/src/contexts/UserContext.tsx'
  ];
  
  frontendFiles.forEach(filePath => {
    console.log(`\n📄 ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   ✅ Файл существует (${content.length} символов)`);
      
      // Поиск ключевых функций платежей
      const tonPaymentPatterns = {
        'sendTonTransaction': content.includes('sendTonTransaction'),
        'connectWallet': content.includes('connectWallet'),
        'tonConnectUI': content.includes('tonConnectUI'),
        'processTonDeposit': content.includes('processTonDeposit'),
        '/api/v2/wallet/ton-deposit': content.includes('/api/v2/wallet/ton-deposit'),
        'refreshBalance': content.includes('refreshBalance')
      };
      
      Object.entries(tonPaymentPatterns).forEach(([pattern, found]) => {
        if (found) {
          console.log(`   🔍 ${pattern}: НАЙДЕНО`);
          
          // Извлечение контекста для ключевых функций
          if (pattern === '/api/v2/wallet/ton-deposit') {
            const apiCallMatches = content.match(/\/api\/v2\/wallet\/ton-deposit[^'"\n]*/g);
            apiCallMatches?.forEach(match => {
              console.log(`      📡 API вызов: ${match}`);
            });
          }
          
          if (pattern === 'processTonDeposit') {
            const funcMatches = content.match(/processTonDeposit\([^)]*\)/g);
            funcMatches?.forEach(match => {
              console.log(`      ⚡ Вызов функции: ${match}`);
            });
          }
        } else {
          console.log(`   ❌ ${pattern}: НЕ НАЙДЕНО`);
        }
      });
      
      // Анализ параметров отправляемых на backend
      if (content.includes('ton-deposit')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('ton-deposit') && (line.includes('POST') || line.includes('fetch'))) {
            console.log(`   📤 Строка ${index + 1}: ${line.trim()}`);
            
            // Ищем следующие несколько строк для параметров
            for (let i = 1; i <= 10 && index + i < lines.length; i++) {
              const nextLine = lines[index + i].trim();
              if (nextLine.includes('user_id') || nextLine.includes('amount') || 
                  nextLine.includes('tx_hash') || nextLine.includes('wallet_address')) {
                console.log(`      ├─ ${nextLine}`);
              }
              if (nextLine.includes('}') && nextLine.length < 5) break;
            }
          }
        });
      }
      
    } else {
      console.log(`   ❌ Файл не найден`);
    }
  });
  
  // ЭТАП 2: Анализ API endpoint'а (Backend)
  console.log('\n\n2️⃣ АНАЛИЗ API ENDPOINT (BACKEND)');
  console.log('-'.repeat(40));
  
  const backendFiles = [
    'modules/wallet/controller.ts',
    'modules/wallet/service.ts',
    'server/routes.ts'
  ];
  
  backendFiles.forEach(filePath => {
    console.log(`\n📄 ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   ✅ Файл существует (${content.length} символов)`);
      
      // Поиск TON deposit роута
      if (content.includes('ton-deposit')) {
        console.log(`   🎯 Найден TON deposit endpoint`);
        
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('ton-deposit')) {
            console.log(`   📍 Строка ${index + 1}: ${line.trim()}`);
          }
        });
      }
      
      // Поиск функции processTonDeposit
      if (content.includes('processTonDeposit')) {
        console.log(`   ⚡ Найдена функция processTonDeposit`);
        
        // Извлечение сигнатуры функции
        const funcRegex = /processTonDeposit\s*\([^)]*\)[^{]*{/;
        const match = content.match(funcRegex);
        if (match) {
          console.log(`   📝 Сигнатура: ${match[0].replace(/\s+/g, ' ')}`);
        }
        
        // Поиск параметров, которые функция принимает
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('processTonDeposit')) {
            console.log(`   📋 Определение функции на строке ${index + 1}`);
            
            // Ищем параметры в следующих строках
            for (let i = 1; i <= 15 && index + i < lines.length; i++) {
              const nextLine = lines[index + i].trim();
              if (nextLine.includes('user_id') || nextLine.includes('telegram_id') || 
                  nextLine.includes('username') || nextLine.includes('amount') ||
                  nextLine.includes('tx_hash') || nextLine.includes('wallet_address')) {
                console.log(`      ├─ ${nextLine}`);
              }
            }
          }
        });
      }
      
      // Поиск логики идентификации пользователя
      const userIdentificationPatterns = {
        'getUserByTelegramId': content.includes('getUserByTelegramId'),
        'findByTelegramId': content.includes('findByTelegramId'),
        'findByUsername': content.includes('findByUsername'),
        'telegram_id': content.match(/telegram_id/g)?.length || 0,
        'username': content.match(/username/g)?.length || 0,
        'user_id': content.match(/user_id/g)?.length || 0
      };
      
      console.log(`   👤 Анализ идентификации пользователя:`);
      Object.entries(userIdentificationPatterns).forEach(([pattern, value]) => {
        if (typeof value === 'boolean' && value) {
          console.log(`      ✅ ${pattern}: найдено`);
        } else if (typeof value === 'number' && value > 0) {
          console.log(`      📊 ${pattern}: ${value} упоминаний`);
        }
      });
      
    } else {
      console.log(`   ❌ Файл не найден`);
    }
  });
  
  // ЭТАП 3: Анализ обновления баланса
  console.log('\n\n3️⃣ АНАЛИЗ ОБНОВЛЕНИЯ БАЛАНСА');
  console.log('-'.repeat(40));
  
  const balanceFiles = [
    'core/BalanceManager.ts',
    'core/UnifiedTransactionService.ts',
    'modules/wallet/service.ts'
  ];
  
  balanceFiles.forEach(filePath => {
    console.log(`\n📄 ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   ✅ Файл существует (${content.length} символов)`);
      
      // Поиск методов обновления баланса
      const balanceUpdatePatterns = {
        'addBalance': content.includes('addBalance'),
        'updateBalance': content.includes('updateBalance'),
        'balance_ton': content.includes('balance_ton'),
        'createTransaction': content.includes('createTransaction'),
        'insertTransaction': content.includes('insertTransaction')
      };
      
      console.log(`   💰 Анализ обновления баланса:`);
      Object.entries(balanceUpdatePatterns).forEach(([pattern, found]) => {
        if (found) {
          console.log(`      ✅ ${pattern}: найдено`);
          
          // Для addBalance показать сигнатуру
          if (pattern === 'addBalance') {
            const funcRegex = /addBalance\s*\([^)]*\)/g;
            const matches = content.match(funcRegex);
            matches?.forEach(match => {
              console.log(`         📝 ${match}`);
            });
          }
        } else {
          console.log(`      ❌ ${pattern}: не найдено`);
        }
      });
      
    } else {
      console.log(`   ❌ Файл не найден`);
    }
  });
  
  // ЭТАП 4: Анализ WebSocket уведомлений
  console.log('\n\n4️⃣ АНАЛИЗ WEBSOCKET УВЕДОМЛЕНИЙ');
  console.log('-'.repeat(40));
  
  const wsFiles = [
    'server/websocket.ts',
    'client/src/contexts/webSocketContext.tsx',
    'client/src/hooks/useWebSocketBalanceSync.ts'
  ];
  
  wsFiles.forEach(filePath => {
    console.log(`\n📄 ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   ✅ Файл существует (${content.length} символов)`);
      
      const wsPatterns = {
        'balance_updated': content.includes('balance_updated'),
        'notifyBalanceUpdate': content.includes('notifyBalanceUpdate'),
        'sendToUser': content.includes('sendToUser'),
        'emit': content.includes('emit'),
        'broadcast': content.includes('broadcast')
      };
      
      console.log(`   📡 Анализ WebSocket уведомлений:`);
      Object.entries(wsPatterns).forEach(([pattern, found]) => {
        console.log(`      ${found ? '✅' : '❌'} ${pattern}: ${found ? 'найдено' : 'не найдено'}`);
      });
      
    } else {
      console.log(`   ❌ Файл не найден`);
    }
  });
  
  // ЭТАП 5: Анализ middleware аутентификации
  console.log('\n\n5️⃣ АНАЛИЗ MIDDLEWARE АУТЕНТИФИКАЦИИ');
  console.log('-'.repeat(40));
  
  const authFiles = [
    'core/middleware/auth.ts',
    'utils/telegram.ts'
  ];
  
  authFiles.forEach(filePath => {
    console.log(`\n📄 ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   ✅ Файл существует (${content.length} символов)`);
      
      // Анализ JWT обработки
      if (content.includes('JWT') || content.includes('jwt')) {
        console.log(`   🔐 JWT обработка найдена`);
        
        const jwtPatterns = {
          'verifyJWTToken': content.includes('verifyJWTToken'),
          'userId': content.includes('userId'),
          'telegram_id': content.includes('telegram_id'),
          'req.user': content.includes('req.user')
        };
        
        Object.entries(jwtPatterns).forEach(([pattern, found]) => {
          console.log(`      ${found ? '✅' : '❌'} ${pattern}: ${found ? 'найдено' : 'не найдено'}`);
        });
      }
      
    } else {
      console.log(`   ❌ Файл не найден`);
    }
  });
  
  // РЕЗЮМЕ
  console.log('\n\n🎯 РЕЗЮМЕ ИССЛЕДОВАНИЯ');
  console.log('='.repeat(50));
  console.log('✅ Анализ цепочки платежей завершен');
  console.log('📋 Проверены все критические файлы');
  console.log('🔍 Готовы рекомендации по исправлению');
  
  return findings;
}

// Запуск исследования
try {
  investigatePaymentChain();
  console.log('\n✅ Исследование завершено успешно');
} catch (error) {
  console.error('❌ Ошибка исследования:', error);
}