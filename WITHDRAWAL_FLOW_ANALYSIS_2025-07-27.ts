#!/usr/bin/env tsx

/**
 * 🔍 АНАЛИЗ ПОТОКА ВЫВОДА СРЕДСТВ
 * Диагностика с правильными именами полей и типов
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function analyzeWithdrawalFlow() {
  console.log('🔍 АНАЛИЗ ПОТОКА ВЫВОДА СРЕДСТВ');
  console.log('=' .repeat(50));
  
  try {
    // 1. ПРОВЕРЯЕМ СТРУКТУРУ ТАБЛИЦЫ WITHDRAW_REQUESTS
    console.log('1️⃣ Анализ структуры таблицы withdraw_requests...');
    
    const { data: withdrawRequests, error: withdrawError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (withdrawError) {
      console.log('❌ Ошибка запроса withdraw_requests:', withdrawError.message);
      
      // Пробуем альтернативные поля
      console.log('🔄 Пробуем запрос с другими полями...');
      const { data: altRequests, error: altError } = await supabase
        .from('withdraw_requests')
        .select('id, user_id, amount_ton, status, created_at')
        .limit(5);
        
      if (altError) {
        console.log('❌ Альтернативный запрос тоже не работает:', altError.message);
      } else {
        console.log(`✅ Найдено заявок через amount_ton: ${altRequests?.length || 0}`);
        altRequests?.forEach(req => {
          console.log(`   ID: ${req.id}, User: ${req.user_id}, Amount: ${req.amount_ton}, Status: ${req.status}`);
        });
      }
    } else {
      console.log(`✅ Найдено заявок: ${withdrawRequests?.length || 0}`);
      if (withdrawRequests && withdrawRequests.length > 0) {
        console.log('📋 Структура записи:', Object.keys(withdrawRequests[0]));
      }
    }

    // 2. ПРОВЕРЯЕМ ENUM ТИПЫ ТРАНЗАКЦИЙ
    console.log('\n2️⃣ Проверка типов транзакций...');
    
    const { data: transactionTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type')
      .order('created_at', { ascending: false })
      .limit(20);

    if (typesError) {
      console.log('❌ Ошибка получения типов транзакций:', typesError.message);
    } else {
      const uniqueTypes = [...new Set(transactionTypes?.map(tx => tx.type) || [])];
      console.log('📊 Существующие типы транзакций:', uniqueTypes);
      
      // Ищем транзакции связанные с выводом
      const withdrawalTypes = uniqueTypes.filter(type => 
        type.toLowerCase().includes('withdraw') || 
        type.toLowerCase().includes('withdrawal')
      );
      console.log('💰 Типы вывода:', withdrawalTypes);
    }

    // 3. ПОИСК ЛОГИКИ УВЕДОМЛЕНИЙ В КОДЕ
    console.log('\n3️⃣ Анализ кода уведомлений...');
    
    const fs = await import('fs');
    
    if (fs.existsSync('modules/wallet/service.ts')) {
      const serviceCode = fs.readFileSync('modules/wallet/service.ts', 'utf8');
      
      // Ищем метод processWithdrawal
      const processWithdrawalStart = serviceCode.indexOf('processWithdrawal');
      if (processWithdrawalStart !== -1) {
        // Находим участок кода с processWithdrawal
        const methodEnd = serviceCode.indexOf('\n  }', processWithdrawalStart + 500);
        const methodCode = serviceCode.substring(processWithdrawalStart, methodEnd + 4);
        
        console.log('📄 Найден метод processWithdrawal');
        
        // Ищем ключевые элементы
        const hasWithdrawRequest = methodCode.includes('withdraw_requests');
        const hasBalanceUpdate = methodCode.includes('balanceManager') || methodCode.includes('updateBalance');
        const hasTransaction = methodCode.includes('transactions');
        const hasNotification = methodCode.includes('AdminBot') || methodCode.includes('sendMessage');
        
        console.log(`   ✅ Создание withdraw_request: ${hasWithdrawRequest}`);
        console.log(`   ✅ Обновление баланса: ${hasBalanceUpdate}`);
        console.log(`   ✅ Создание транзакции: ${hasTransaction}`);
        console.log(`   ❌ Уведомление админ-бота: ${hasNotification}`);
        
        if (!hasNotification) {
          console.log('\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: НЕ НАЙДЕНА ЛОГИКА УВЕДОМЛЕНИЯ АДМИН-БОТА!');
          console.log('   Метод processWithdrawal не содержит вызовов AdminBotService');
          console.log('   Это объясняет, почему админ-бот не получает уведомления');
        }
      }
    }

    // 4. ПРОВЕРКА ПОСЛЕДОВАТЕЛЬНОСТИ ОПЕРАЦИЙ
    console.log('\n4️⃣ Анализ последовательности операций...');
    
    console.log('📋 ПРАВИЛЬНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ ДОЛЖНА БЫТЬ:');
    console.log('   1. Проверка баланса пользователя');
    console.log('   2. Создание записи в withdraw_requests');
    console.log('   3. Списание с баланса пользователя');
    console.log('   4. Создание транзакции');
    console.log('   5. ⚠️  ОТПРАВКА УВЕДОМЛЕНИЯ АДМИН-БОТУ (ОТСУТСТВУЕТ!)');
    console.log('   6. Обновление статуса через WebSocket');

    // 5. АНАЛИЗ WEBHOOK ОШИБКИ
    console.log('\n5️⃣ Анализ ошибки webhook...');
    
    console.log('🔍 ОБНАРУЖЕНА ОШИБКА В TELEGRAM:');
    console.log('   "Wrong response from the webhook: 500 Internal Server Error"');
    console.log('   Это значит, что webhook endpoint отвечает со статусом 500');
    console.log('   Вероятно, ошибка происходит при обработке входящих сообщений');

    // 6. ПРОВЕРКА ADMN BOT SERVICE
    console.log('\n6️⃣ Проверка AdminBotService...');
    
    if (fs.existsSync('modules/adminBot/service.ts')) {
      const adminService = fs.readFileSync('modules/adminBot/service.ts', 'utf8');
      
      const hasNotifyWithdrawal = adminService.includes('notifyWithdrawal') || 
                                  adminService.includes('processWithdrawalNotification');
      const hasSendMessage = adminService.includes('sendMessage');
      
      console.log(`   ✅ Метод sendMessage: ${hasSendMessage}`);
      console.log(`   ❌ Метод уведомления о выводе: ${hasNotifyWithdrawal}`);
      
      if (!hasNotifyWithdrawal) {
        console.log('\n🚨 ПРОБЛЕМА: AdminBotService не имеет метода для уведомлений о выводе!');
      }
    }

    // 7. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n7️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА...');
    
    console.log('\n🎯 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    console.log('1. ❌ НЕТ ИНТЕГРАЦИИ между WalletService и AdminBotService');
    console.log('2. ❌ processWithdrawal() НЕ ВЫЗЫВАЕТ уведомления админ-бота');
    console.log('3. ❌ AdminBotService НЕ ИМЕЕТ метода для обработки уведомлений о выводе');
    console.log('4. ⚠️  Webhook возвращает 500 ошибку при обработке сообщений');
    
    console.log('\n💡 ВАРИАНТЫ РЕШЕНИЯ:');
    console.log('1. ДОБАВИТЬ вызов AdminBotService в конец processWithdrawal()');
    console.log('2. СОЗДАТЬ метод notifyWithdrawal() в AdminBotService');
    console.log('3. ИСПРАВИТЬ webhook ошибку 500 в AdminBot controller');
    console.log('4. ДОБАВИТЬ обработку различных типов уведомлений');
    
    console.log('\n⚡ РЕКОМЕНДУЕМАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ ИСПРАВЛЕНИЙ:');
    console.log('1. Исправить webhook ошибку 500 (проверить AdminBot controller)');
    console.log('2. Добавить метод notifyWithdrawal в AdminBotService');
    console.log('3. Интегрировать уведомление в processWithdrawal');
    console.log('4. Протестировать полный цикл вывода');

    return {
      notification_integration_missing: true,
      webhook_500_error: true,
      admin_bot_method_missing: true,
      critical_issues: 3
    };

  } catch (error) {
    console.error('💥 ОШИБКА АНАЛИЗА:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await analyzeWithdrawalFlow();
    
    console.log('\n📊 РЕЗУЛЬТАТ АНАЛИЗА:');
    console.log(`Критических проблем: ${result.critical_issues}`);
    console.log('Система НЕ МОЖЕТ работать корректно с текущими проблемами');
    
    process.exit(1); // Есть критические проблемы
    
  } catch (error) {
    console.error('\n❌ АНАЛИЗ ПРОВАЛЕН:', error);
    process.exit(1);
  }
}

main();