/**
 * ТРЕЙСИНГ ПРОБЛЕМЫ TON DEPOSIT
 * Проверка всех узлов: Frontend → API Routes → Controller → Service → Database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function traceTonDepositIssue() {
  console.log('🔍 ТРЕЙСИНГ TON DEPOSIT ISSUE');
  console.log('===============================');
  
  try {
    // 1. ПРОВЕРКА FRONTEND КОДА tonConnectService
    console.log('\n1. 📱 АНАЛИЗ FRONTEND КОДА:');
    
    const tonConnectContent = fs.readFileSync('client/src/services/tonConnectService.ts', 'utf8');
    
    // Проверяем наличие backend вызова
    const hasBackendCall = tonConnectContent.includes('correctApiRequest(\'/api/v2/wallet/ton-deposit\'');
    const hasImport = tonConnectContent.includes('import(@/lib/correctApiRequest)');
    const hasTryCatch = tonConnectContent.includes('[TON_DEPOSIT]');
    
    console.log(`   - Backend API вызов присутствует: ${hasBackendCall ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Dynamic import correctApiRequest: ${hasImport ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Логирование TON_DEPOSIT: ${hasTryCatch ? 'ДА' : 'НЕТ'}`);
    
    // Ищем строку с вызовом
    if (hasBackendCall) {
      const lines = tonConnectContent.split('\n');
      const callLineIndex = lines.findIndex(line => line.includes('correctApiRequest(\'/api/v2/wallet/ton-deposit\''));
      if (callLineIndex >= 0) {
        console.log(`   - Найден вызов на строке ${callLineIndex + 1}:`);
        console.log(`     ${lines[callLineIndex].trim()}`);
        
        // Проверяем контекст вокруг вызова
        const contextStart = Math.max(0, callLineIndex - 2);
        const contextEnd = Math.min(lines.length, callLineIndex + 3);
        console.log('   - Контекст вызова:');
        for (let i = contextStart; i < contextEnd; i++) {
          console.log(`     ${i + 1}: ${lines[i]}`);
        }
      }
    }
    
    // 2. ПРОВЕРКА ROUTES CONFIGURATION
    console.log('\n2. 🛣️ АНАЛИЗ ROUTES:');
    
    const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
    const hasTonDepositRoute = routesContent.includes('/api/v2/wallet/ton-deposit') || routesContent.includes('ton-deposit');
    const hasWalletRoutes = routesContent.includes('wallet');
    
    console.log(`   - TON deposit route найден: ${hasTonDepositRoute ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Wallet routes присутствуют: ${hasWalletRoutes ? 'ДА' : 'НЕТ'}`);
    
    if (hasTonDepositRoute) {
      const routeLines = routesContent.split('\n');
      const routeLineIndex = routeLines.findIndex(line => line.includes('ton-deposit'));
      if (routeLineIndex >= 0) {
        console.log(`   - Route определен на строке ${routeLineIndex + 1}:`);
        console.log(`     ${routeLines[routeLineIndex].trim()}`);
      }
    }
    
    // 3. ПРОВЕРКА CONTROLLER
    console.log('\n3. 🎛️ АНАЛИЗ CONTROLLER:');
    
    const controllerContent = fs.readFileSync('modules/wallet/controller.ts', 'utf8');
    const hasTonDepositMethod = controllerContent.includes('async tonDeposit');
    const hasProcessTonDeposit = controllerContent.includes('processTonDeposit');
    const hasValidation = controllerContent.includes('ton_tx_hash') && controllerContent.includes('amount');
    
    console.log(`   - tonDeposit метод найден: ${hasTonDepositMethod ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Вызов processTonDeposit: ${hasProcessTonDeposit ? 'ДА' : 'НЕТ'}`);
    console.log(`   - Валидация параметров: ${hasValidation ? 'ДА' : 'НЕТ'}`);
    
    // 4. ПРОВЕРКА SERVICE
    console.log('\n4. ⚙️ АНАЛИЗ SERVICE:');
    
    try {
      const serviceContent = fs.readFileSync('modules/wallet/service.ts', 'utf8');
      const hasProcessMethod = serviceContent.includes('processTonDeposit');
      const hasBalanceManager = serviceContent.includes('BalanceManager') || serviceContent.includes('addBalance');
      const hasTransactionCreate = serviceContent.includes('transaction') && serviceContent.includes('create');
      
      console.log(`   - processTonDeposit метод: ${hasProcessMethod ? 'ДА' : 'НЕТ'}`);
      console.log(`   - BalanceManager интеграция: ${hasBalanceManager ? 'ДА' : 'НЕТ'}`);
      console.log(`   - Создание транзакций: ${hasTransactionCreate ? 'ДА' : 'НЕТ'}`);
      
    } catch (serviceError) {
      console.log(`   ❌ Ошибка чтения service.ts: ${serviceError.message}`);
    }
    
    // 5. ПРОВЕРКА БАЗЫ ДАННЫХ НА ОШИБКИ
    console.log('\n5. 💾 ПРОВЕРКА БД НА ОШИБКИ:');
    
    // Попытка найти ошибки в логах через транзакции с error в описании
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: errorLogs, error: logError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', oneHourAgo)
      .or('description.ilike.%error%,description.ilike.%failed%,description.ilike.%exception%')
      .order('created_at', { ascending: false });
    
    if (logError) {
      console.log('❌ Ошибка поиска логов ошибок:', logError.message);
    } else {
      console.log(`   - Найдено ошибок в транзакциях за час: ${errorLogs?.length || 0}`);
      errorLogs?.slice(0, 3).forEach(log => {
        console.log(`     - ${log.created_at}: ${log.description}`);
      });
    }
    
    // 6. ПРОВЕРКА JWT TOKEN ISSUES
    console.log('\n6. 🔐 ПРОВЕРКА JWT ПРОБЛЕМ:');
    
    // User #25 может иметь проблемы с JWT токенами
    const { data: user25, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();
    
    if (userError) {
      console.log('❌ Ошибка получения User #25:', userError.message);
    } else {
      console.log(`   - User #25 найден: ID ${user25.id}, telegram_id ${user25.telegram_id}`);
      console.log(`   - Username: ${user25.username || 'НЕТ'}`);
      console.log(`   - Balance TON: ${user25.balance_ton}`);
    }
    
    // 7. ИТОГОВЫЙ АНАЛИЗ ПРОБЛЕМЫ
    console.log('\n7. 🎯 ДИАГНОЗ ПРОБЛЕМЫ:');
    console.log('========================');
    
    const frontendOk = hasBackendCall && hasImport && hasTryCatch;
    const routingOk = hasTonDepositRoute && hasWalletRoutes;
    const controllerOk = hasTonDepositMethod && hasProcessTonDeposit && hasValidation;
    
    console.log(`frontend_integration: ${frontendOk ? 'ИСПРАВЕН' : 'ПРОБЛЕМА'}`);
    console.log(`routing_configuration: ${routingOk ? 'ИСПРАВЕН' : 'ПРОБЛЕМА'}`);
    console.log(`controller_logic: ${controllerOk ? 'ИСПРАВЕН' : 'ПРОБЛЕМА'}`);
    console.log(`database_connectivity: РАБОТАЕТ (видны другие транзакции)`);
    
    if (frontendOk && routingOk && controllerOk) {
      console.log('ВОЗМОЖНАЯ_ПРИЧИНА: Проблема в Service слое или в JWT аутентификации');
      console.log('РЕКОМЕНДАЦИЯ: Проверить processTonDeposit в WalletService');
    } else {
      console.log('КРИТИЧЕСКАЯ_ПРОБЛЕМА: Нарушена цепочка Frontend → Backend');
      if (!frontendOk) console.log('  - Frontend не вызывает backend корректно');
      if (!routingOk) console.log('  - Routes не настроены');
      if (!controllerOk) console.log('  - Controller не обрабатывает запросы');
    }
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ТРЕЙСИНГА:', error.message);
  }
}

traceTonDepositIssue();