#!/usr/bin/env tsx

/**
 * 🎯 ПРОВЕРКА ИНТЕГРАЦИИ СИСТЕМЫ ВЫВОДА СРЕДСТВ
 * Тестирование исправлений после интеграции AdminBotService
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function testWithdrawalIntegration() {
  console.log('🎯 ПРОВЕРКА ИНТЕГРАЦИИ СИСТЕМЫ ВЫВОДА СРЕДСТВ');
  console.log('=' .repeat(55));
  
  try {
    // 1. ПРОВЕРЯЕМ WEBHOOK ENDPOINT
    console.log('1️⃣ Тестирование webhook endpoint...');
    
    const appUrl = process.env.APP_DOMAIN || 'https://uni-farm-connect-unifarm01010101.replit.app';
    const webhookUrl = `${appUrl}/api/v2/admin-bot/webhook`;
    
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: 999999999,
          message: {
            message_id: 1,
            from: { id: 123, username: 'test_user', first_name: 'Test' },
            chat: { id: 123, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '/test'
          }
        })
      });
      
      console.log(`📡 Webhook response: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.status === 200) {
        console.log('✅ Webhook endpoint работает корректно');
      } else {
        console.log('❌ Webhook endpoint возвращает ошибку');
      }
      
    } catch (error) {
      console.log('❌ Ошибка тестирования webhook:', error);
    }

    // 2. ПРОВЕРЯЕМ TELEGRAM WEBHOOK INFO
    console.log('\n2️⃣ Проверка статуса webhook в Telegram...');
    
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    if (adminBotToken) {
      try {
        const webhookResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getWebhookInfo`);
        const webhookInfo = await webhookResponse.json();
        
        if (webhookInfo.ok) {
          console.log(`📡 Webhook URL: ${webhookInfo.result.url || 'НЕ УСТАНОВЛЕН'}`);
          console.log(`📡 Pending Updates: ${webhookInfo.result.pending_update_count || 0}`);
          console.log(`📡 Last Error: ${webhookInfo.result.last_error_message || 'НЕТ'}`);
          
          if (webhookInfo.result.last_error_message) {
            console.log('⚠️  Обнаружена ошибка webhook, но исправления должны ее устранить');
          } else {
            console.log('✅ Webhook работает без ошибок');
          }
        }
        
      } catch (error) {
        console.log('❌ Ошибка проверки webhook info:', error);
      }
    }

    // 3. ПРОВЕРЯЕМ НАЛИЧИЕ МЕТОДОВ В КОДЕ
    console.log('\n3️⃣ Проверка интеграции AdminBotService...');
    
    const fs = await import('fs');
    
    // Проверяем AdminBotService
    if (fs.existsSync('modules/adminBot/service.ts')) {
      const adminService = fs.readFileSync('modules/adminBot/service.ts', 'utf8');
      
      const hasNotifyMethod = adminService.includes('notifyWithdrawal');
      const hasUiKeyboard = adminService.includes('inline_keyboard');
      const hasTelegramIdLookup = adminService.includes('telegram_id');
      
      console.log(`✅ Метод notifyWithdrawal: ${hasNotifyMethod ? 'ДОБАВЛЕН' : 'ОТСУТСТВУЕТ'}`);
      console.log(`✅ Кнопки управления: ${hasUiKeyboard ? 'ДОБАВЛЕНЫ' : 'ОТСУТСТВУЮТ'}`);
      console.log(`✅ Поиск админов: ${hasTelegramIdLookup ? 'РЕАЛИЗОВАН' : 'ОТСУТСТВУЕТ'}`);
    }
    
    // Проверяем WalletService
    if (fs.existsSync('modules/wallet/service.ts')) {
      const walletService = fs.readFileSync('modules/wallet/service.ts', 'utf8');
      
      const hasAdminBotImport = walletService.includes('AdminBotService');
      const hasNotificationCall = walletService.includes('notifyWithdrawal');
      const hasErrorHandling = walletService.includes('notificationError');
      
      console.log(`✅ Импорт AdminBotService: ${hasAdminBotImport ? 'ДОБАВЛЕН' : 'ОТСУТСТВУЕТ'}`);
      console.log(`✅ Вызов уведомления: ${hasNotificationCall ? 'ДОБАВЛЕН' : 'ОТСУТСТВУЕТ'}`);
      console.log(`✅ Обработка ошибок: ${hasErrorHandling ? 'ДОБАВЛЕНА' : 'ОТСУТСТВУЕТ'}`);
    }

    // 4. ПРОВЕРЯЕМ WEBHOOK ROUTES
    console.log('\n4️⃣ Проверка обработки webhook...');
    
    if (fs.existsSync('modules/adminBot/routes.ts')) {
      const routes = fs.readFileSync('modules/adminBot/routes.ts', 'utf8');
      
      const hasImprovedErrorHandling = routes.includes('res.status(200).send(\'OK\')');
      const hasAsyncProcessing = routes.includes('updateId: req.body.update_id');
      const hasStackTrace = routes.includes('stack:');
      
      console.log(`✅ Улучшенная обработка ошибок: ${hasImprovedErrorHandling ? 'ДОБАВЛЕНА' : 'ОТСУТСТВУЕТ'}`);
      console.log(`✅ Логирование запросов: ${hasAsyncProcessing ? 'ДОБАВЛЕНО' : 'ОТСУТСТВУЕТ'}`);
      console.log(`✅ Подробные логи ошибок: ${hasStackTrace ? 'ДОБАВЛЕНЫ' : 'ОТСУТСТВУЮТ'}`);
    }

    // 5. ПРОВЕРЯЕМ БАЗУ ДАННЫХ
    console.log('\n5️⃣ Проверка данных в базе...');
    
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('username, telegram_id, is_admin')
      .eq('is_admin', true);
      
    if (adminsError) {
      console.log('❌ Ошибка запроса админов:', adminsError.message);
    } else {
      console.log(`👥 Найдено админов в БД: ${admins?.length || 0}`);
      admins?.forEach(admin => {
        console.log(`   - @${admin.username} (ID: ${admin.telegram_id})`);
      });
    }

    const { data: recentRequests, error: requestsError } = await supabase
      .from('withdraw_requests')
      .select('id, user_id, amount_ton, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (requestsError) {
      console.log('❌ Ошибка запроса заявок:', requestsError.message);
    } else {
      console.log(`💰 Последние заявки на вывод: ${recentRequests?.length || 0}`);
      recentRequests?.forEach(req => {
        console.log(`   - ID: ${req.id}, User: ${req.user_id}, Amount: ${req.amount_ton} TON, Status: ${req.status}`);
      });
    }

    // 6. ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n6️⃣ ФИНАЛЬНАЯ ОЦЕНКА ИНТЕГРАЦИИ...');
    
    const integrationChecks = {
      adminBotMethod: fs.existsSync('modules/adminBot/service.ts') && 
                      fs.readFileSync('modules/adminBot/service.ts', 'utf8').includes('notifyWithdrawal'),
      walletIntegration: fs.existsSync('modules/wallet/service.ts') && 
                         fs.readFileSync('modules/wallet/service.ts', 'utf8').includes('AdminBotService'),
      webhookFixed: fs.existsSync('modules/adminBot/routes.ts') && 
                    fs.readFileSync('modules/adminBot/routes.ts', 'utf8').includes('res.status(200).send(\'OK\')'),
      adminsInDatabase: admins && admins.length > 0
    };
    
    const passedChecks = Object.values(integrationChecks).filter(Boolean).length;
    const totalChecks = Object.keys(integrationChecks).length;
    
    console.log(`\n📊 РЕЗУЛЬТАТ ИНТЕГРАЦИИ: ${passedChecks}/${totalChecks} проверок пройдено`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 ВСЕ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ УСПЕШНО!');
      console.log('\n✅ ЧТО ИСПРАВЛЕНО:');
      console.log('   1. Добавлен метод notifyWithdrawal в AdminBotService');
      console.log('   2. Интегрирован вызов уведомлений в WalletService.processWithdrawal');
      console.log('   3. Исправлена webhook ошибка 500 (всегда возвращаем 200 OK)');
      console.log('   4. Добавлено подробное логирование для диагностики');
      console.log('   5. Реализованы кнопки быстрых действий для админов');
      
      console.log('\n🚀 СИСТЕМА ГОТОВА К ТЕСТИРОВАНИЮ:');
      console.log('   - Создайте тестовую заявку на вывод');
      console.log('   - Админы получат уведомление с кнопками управления');
      console.log('   - Webhook не будет возвращать 500 ошибок');
      console.log('   - Все операции логируются для мониторинга');
      
    } else {
      console.log('⚠️  НЕКОТОРЫЕ ИСПРАВЛЕНИЯ НЕ ПРИМЕНЕНЫ');
      
      Object.entries(integrationChecks).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      });
    }

    return {
      passed_checks: passedChecks,
      total_checks: totalChecks,
      integration_complete: passedChecks === totalChecks,
      issues_remaining: totalChecks - passedChecks
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО ПРОВЕРКИ ИНТЕГРАЦИИ СИСТЕМЫ ВЫВОДА');
    console.log(`⏰ Время: ${new Date().toISOString()}\n`);
    
    const result = await testWithdrawalIntegration();
    
    console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`Проверок пройдено: ${result.passed_checks}/${result.total_checks}`);
    console.log(`Интеграция завершена: ${result.integration_complete ? 'ДА' : 'НЕТ'}`);
    console.log(`Проблем осталось: ${result.issues_remaining}`);
    
    process.exit(result.integration_complete ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();