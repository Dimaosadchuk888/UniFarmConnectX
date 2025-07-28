#!/usr/bin/env tsx

/**
 * КРИТИЧЕСКИЙ АНАЛИЗ ПОТОКА ИНТЕГРАЦИИ
 * Диагностика TON Connect → Backend API flow
 * Поиск разрыва в цепочке обработки депозитов
 */

console.log('🔍 КРИТИЧЕСКИЙ АНАЛИЗ ПОТОКА ИНТЕГРАЦИИ TON ДЕПОЗИТОВ');
console.log('📅 28.07.2025 - User ID 25: 3 TON исчезли после депозита');
console.log('='.repeat(80));

// Проверяем ключевые файлы flow
import fs from 'fs';

function analyzeIntegrationFlow() {
  console.log('\n1️⃣ АНАЛИЗ TON CONNECT SERVICE');
  console.log('-'.repeat(50));
  
  // Проверяем tonConnectService.ts
  const tonConnectPath = 'client/src/services/tonConnectService.ts';
  if (fs.existsSync(tonConnectPath)) {
    const content = fs.readFileSync(tonConnectPath, 'utf8');
    
    // Ищем вызов backend API после sendTransaction
    console.log('🔍 Поиск backend API вызовов после sendTransaction...');
    
    if (content.includes('sendTonTransaction')) {
      const lines = content.split('\n');
      const sendTxLine = lines.findIndex(line => line.includes('export async function sendTonTransaction'));
      
      if (sendTxLine !== -1) {
        // Анализируем следующие 100 строк после объявления функции
        const functionLines = lines.slice(sendTxLine, sendTxLine + 100);
        
        let hasApiCall = false;
        let apiCallLine = '';
        
        functionLines.forEach((line, index) => {
          if (line.includes('fetch') && line.includes('/api/v2/wallet/ton-deposit')) {
            hasApiCall = true;
            apiCallLine = line.trim();
          }
        });
        
        if (hasApiCall) {
          console.log('✅ Backend API вызов найден:');
          console.log(`   ${apiCallLine}`);
        } else {
          console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Backend API вызов НЕ НАЙДЕН!');
          console.log('   sendTonTransaction НЕ уведомляет backend о депозите');
        }
      }
    }
  }
  
  console.log('\n2️⃣ АНАЛИЗ TON DEPOSIT CARD');
  console.log('-'.repeat(50));
  
  // Проверяем TonDepositCard.tsx
  const depositCardPath = 'client/src/components/wallet/TonDepositCard.tsx';
  if (fs.existsSync(depositCardPath)) {
    const content = fs.readFileSync(depositCardPath, 'utf8');
    
    console.log('🔍 Поиск backend уведомлений в TonDepositCard...');
    
    const hasBackendCall = content.includes('/api/v2/wallet/ton-deposit');
    const hasSuccessHandler = content.includes('result.status === \'success\'');
    
    if (hasBackendCall && hasSuccessHandler) {
      console.log('✅ Backend уведомление найдено в TonDepositCard');
    } else {
      console.log('❌ ПРОБЛЕМА: Неполная интеграция в TonDepositCard');
      console.log(`   Backend call: ${hasBackendCall ? 'ДА' : 'НЕТ'}`);
      console.log(`   Success handler: ${hasSuccessHandler ? 'ДА' : 'НЕТ'}`);
    }
  }
  
  console.log('\n3️⃣ АНАЛИЗ WALLET SERVICE');
  console.log('-'.repeat(50));
  
  // Проверяем WalletService
  const walletServicePath = 'modules/wallet/service.ts';
  if (fs.existsSync(walletServicePath)) {
    const content = fs.readFileSync(walletServicePath, 'utf8');
    
    console.log('🔍 Поиск processTonDeposit метода...');
    
    if (content.includes('processTonDeposit')) {
      console.log('✅ processTonDeposit метод найден');
      
      // Анализируем метод
      const lines = content.split('\n');
      const methodStart = lines.findIndex(line => line.includes('processTonDeposit'));
      
      if (methodStart !== -1) {
        const methodLines = lines.slice(methodStart, methodStart + 50);
        
        let hasTransactionCreation = false;
        let hasBalanceUpdate = false;
        
        methodLines.forEach(line => {
          if (line.includes('createTransaction') || line.includes('TON_DEPOSIT')) {
            hasTransactionCreation = true;
          }
          if (line.includes('updateBalance') || line.includes('addBalance')) {
            hasBalanceUpdate = true;
          }
        });
        
        console.log(`   Transaction creation: ${hasTransactionCreation ? 'ДА' : 'НЕТ'}`);
        console.log(`   Balance update: ${hasBalanceUpdate ? 'ДА' : 'НЕТ'}`);
      }
    } else {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: processTonDeposit метод НЕ НАЙДЕН!');
    }
  }
  
  console.log('\n4️⃣ АНАЛИЗ TRANSACTION SERVICE');
  console.log('-'.repeat(50));
  
  // Проверяем TransactionService маппинг
  const transactionServicePath = 'core/TransactionService.ts';
  if (fs.existsSync(transactionServicePath)) {
    const content = fs.readFileSync(transactionServicePath, 'utf8');
    
    console.log('🔍 Анализ TON_DEPOSIT маппинга...');
    
    if (content.includes('TON_DEPOSIT')) {
      // Ищем маппинг
      const mappingMatch = content.match(/'TON_DEPOSIT':\s*'([^']+)'/);
      if (mappingMatch) {
        console.log(`✅ TON_DEPOSIT маппинг: TON_DEPOSIT → ${mappingMatch[1]}`);
      }
      
      // Проверяем shouldUpdateBalance
      if (content.includes('shouldUpdateBalance')) {
        const lines = content.split('\n');
        const shouldUpdateLine = lines.find(line => 
          line.includes('TON_DEPOSIT') && line.includes('shouldUpdateBalance')
        );
        
        if (shouldUpdateLine) {
          console.log('✅ TON_DEPOSIT включен в shouldUpdateBalance');
        } else {
          console.log('⚠️ TON_DEPOSIT может НЕ обновлять баланс автоматически');
        }
      }
    } else {
      console.log('❌ TON_DEPOSIT маппинг НЕ НАЙДЕН!');
    }
  }
  
  console.log('\n5️⃣ АНАЛИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ДЛЯ TON');
  console.log('-'.repeat(50));
  
  const tonVars = [
    'TELEGRAM_WEBAPP_URL',
    'APP_DOMAIN', 
    'TON_API_URL',
    'TON_MANIFEST_URL'
  ];
  
  tonVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`❌ ${varName}: НЕ УСТАНОВЛЕНА`);
    }
  });
}

function diagnoseMissingDeposit() {
  console.log('\n='.repeat(80));
  console.log('🚨 ДИАГНОЗ: ПРИЧИНЫ ИСЧЕЗНОВЕНИЯ 3 TON');
  console.log('='.repeat(80));
  
  console.log('\n📋 НАИБОЛЕЕ ВЕРОЯТНЫЕ ПРИЧИНЫ:');
  console.log('1. ❌ TON Connect выполнил транзакцию на blockchain');
  console.log('2. ✅ Frontend показал средства пользователю');
  console.log('3. ❌ НЕТ вызова backend API для регистрации депозита');
  console.log('4. ❌ Депозит НЕ записан в database.transactions');
  console.log('5. ❌ При перезагрузке/синхронизации средства исчезли');
  
  console.log('\n🔧 ТРЕБУЕМЫЕ ИСПРАВЛЕНИЯ:');
  console.log('1. Добавить backend API вызов в sendTonTransaction()');
  console.log('2. Обеспечить вызов /api/v2/wallet/ton-deposit после успешной blockchain транзакции');
  console.log('3. Проверить processTonDeposit метод в WalletService');
  console.log('4. Убедиться что TON_DEPOSIT правильно мапится и обновляет баланс');
  console.log('5. Добавить fallback для поиска "потерянных" депозитов');
  
  console.log('\n💰 НЕМЕДЛЕННО ТРЕБУЕТСЯ:');
  console.log('1. Восстановить 3 TON для User ID 25');
  console.log('2. Исправить integration flow для предотвращения повторений');
  console.log('3. Добавить мониторинг blockchain → database синхронизации');
}

// Запуск анализа
analyzeIntegrationFlow();
diagnoseMissingDeposit();

console.log('\n✅ Критический анализ завершен');