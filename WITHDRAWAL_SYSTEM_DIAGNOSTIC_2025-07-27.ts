#!/usr/bin/env tsx

/**
 * 🔍 ДИАГНОСТИКА СИСТЕМЫ ВЫВОДА СРЕДСТВ
 * Точечная проверка всех звеньев процесса вывода без правок кода
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function diagnosticWithdrawalSystem() {
  console.log('🔍 ДИАГНОСТИКА СИСТЕМЫ ВЫВОДА СРЕДСТВ');
  console.log('=' .repeat(50));
  
  try {
    // 1. ПРОВЕРКА ЗАЯВОК НА ВЫВОД
    console.log('1️⃣ Проверка последних заявок на вывод...');
    
    const { data: withdrawRequests, error: withdrawError } = await supabase
      .from('withdraw_requests')
      .select(`
        id, 
        user_id, 
        telegram_id,
        username,
        amount, 
        currency, 
        status, 
        wallet_address,
        created_at,
        processed_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (withdrawError) {
      console.log('❌ Ошибка запроса заявок на вывод:', withdrawError.message);
    } else {
      console.log(`📋 Найдено заявок на вывод: ${withdrawRequests?.length || 0}`);
      
      if (withdrawRequests && withdrawRequests.length > 0) {
        withdrawRequests.forEach((req, index) => {
          console.log(`\n   [${index + 1}] ID: ${req.id} | Status: ${req.status}`);
          console.log(`       User: ${req.username || req.telegram_id} (ID: ${req.user_id})`);
          console.log(`       Amount: ${req.amount} ${req.currency}`);
          console.log(`       Wallet: ${req.wallet_address}`);
          console.log(`       Created: ${req.created_at}`);
          console.log(`       Processed: ${req.processed_at || 'НЕ ОБРАБОТАНО'}`);
        });
      }
    }

    // 2. ПРОВЕРКА ТРАНЗАКЦИЙ ВЫВОДА
    console.log('\n2️⃣ Проверка транзакций вывода в БД...');
    
    const { data: withdrawalTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['WITHDRAWAL', 'withdrawal', 'UNI_WITHDRAWAL', 'TON_WITHDRAWAL'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.log('❌ Ошибка запроса транзакций вывода:', txError.message);
    } else {
      console.log(`💰 Найдено транзакций вывода за 24 часа: ${withdrawalTransactions?.length || 0}`);
      
      if (withdrawalTransactions && withdrawalTransactions.length > 0) {
        withdrawalTransactions.forEach((tx, index) => {
          console.log(`\n   [${index + 1}] TX ID: ${tx.id} | Type: ${tx.type}`);
          console.log(`       User ID: ${tx.user_id}`);
          console.log(`       Amount: ${tx.amount} ${tx.currency}`);
          console.log(`       Status: ${tx.status}`);
          console.log(`       Created: ${tx.created_at}`);
          console.log(`       Description: ${tx.description}`);
          if (tx.metadata) {
            console.log(`       Metadata: ${JSON.stringify(tx.metadata)}`);
          }
        });
      }
    }

    // 3. ПРОВЕРКА АДМИН-БОТА СТАТУСА
    console.log('\n3️⃣ Проверка статуса админ-бота...');
    
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    if (!adminBotToken) {
      console.log('❌ ADMIN_BOT_TOKEN не найден в переменных окружения');
    } else {
      console.log('✅ ADMIN_BOT_TOKEN настроен');
      
      try {
        const botInfoResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getMe`);
        const botInfo = await botInfoResponse.json();
        
        if (botInfo.ok) {
          console.log(`✅ Админ-бот активен: @${botInfo.result.username} (ID: ${botInfo.result.id})`);
        } else {
          console.log('❌ Админ-бот не отвечает:', botInfo.description);
        }
        
        // Проверка webhook
        const webhookResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getWebhookInfo`);
        const webhookInfo = await webhookResponse.json();
        
        if (webhookInfo.ok) {
          console.log(`📡 Webhook URL: ${webhookInfo.result.url || 'НЕ УСТАНОВЛЕН'}`);
          console.log(`📡 Pending Updates: ${webhookInfo.result.pending_update_count || 0}`);
          console.log(`📡 Last Error: ${webhookInfo.result.last_error_message || 'НЕТ'}`);
        }
        
      } catch (error) {
        console.log('❌ Ошибка проверки админ-бота:', error);
      }
    }

    // 4. ПРОВЕРКА WEBHOOK ENDPOINT
    console.log('\n4️⃣ Проверка webhook endpoint...');
    
    const appUrl = process.env.APP_DOMAIN || 'https://uni-farm-connect-unifarm01010101.replit.app';
    const webhookUrl = `${appUrl}/api/v2/admin-bot/webhook`;
    
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      console.log(`🌐 Webhook endpoint (${webhookUrl}):`);
      console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.status === 404) {
        console.log('❌ Webhook endpoint не найден (404) - роутинг не работает');
      } else if (testResponse.status === 200) {
        console.log('✅ Webhook endpoint отвечает');
      }
      
    } catch (error) {
      console.log('❌ Ошибка тестирования webhook endpoint:', error);
    }

    // 5. ПРОВЕРКА БАЛАНСА ПОЛЬЗОВАТЕЛЕЙ С НЕДАВНИМИ ВЫВОДАМИ
    console.log('\n5️⃣ Проверка балансов пользователей с заявками...');
    
    if (withdrawRequests && withdrawRequests.length > 0) {
      const recentUserIds = [...new Set(withdrawRequests.map(req => req.user_id))];
      
      for (const userId of recentUserIds.slice(0, 5)) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, username, balance_uni, balance_ton, telegram_id')
          .eq('id', userId)
          .single();

        if (user) {
          console.log(`\n   User ${user.id} (@${user.username}):`);
          console.log(`     UNI Balance: ${user.balance_uni}`);
          console.log(`     TON Balance: ${user.balance_ton}`);
          console.log(`     Telegram ID: ${user.telegram_id}`);
        }
      }
    }

    // 6. ПРОВЕРКА ЛОГИКИ УВЕДОМЛЕНИЙ
    console.log('\n6️⃣ Проверка кода уведомлений админ-бота...');
    
    const fs = await import('fs');
    
    // Проверяем файлы админ-бота
    const serviceExists = fs.existsSync('modules/adminBot/service.ts');
    const controllerExists = fs.existsSync('modules/adminBot/controller.ts');
    const routesExists = fs.existsSync('modules/adminBot/routes.ts');
    
    console.log(`📁 modules/adminBot/service.ts: ${serviceExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`📁 modules/adminBot/controller.ts: ${controllerExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`📁 modules/adminBot/routes.ts: ${routesExists ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Проверяем логику отправки уведомлений в модуле вывода
    if (fs.existsSync('modules/wallet/service.ts')) {
      const walletService = fs.readFileSync('modules/wallet/service.ts', 'utf8');
      
      const hasAdminNotification = walletService.includes('AdminBotService') || 
                                   walletService.includes('sendMessage') ||
                                   walletService.includes('notifyWithdrawal') ||
                                   walletService.includes('admin-bot');
      
      console.log(`🔔 Уведомления админ-бота в wallet/service.ts: ${hasAdminNotification ? '✅ НАЙДЕНЫ' : '❌ НЕ НАЙДЕНЫ'}`);
      
      // Поиск конкретных функций
      const notificationPatterns = [
        'AdminBotService',
        'sendMessage',
        'notifyWithdrawal',
        'admin_bot_token',
        'ADMIN_BOT_TOKEN'
      ];
      
      notificationPatterns.forEach(pattern => {
        const found = walletService.includes(pattern);
        console.log(`   - ${pattern}: ${found ? '✅' : '❌'}`);
      });
    }

    // 7. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
    console.log('\n7️⃣ Проверка переменных окружения...');
    
    const envVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY', 
      'ADMIN_BOT_TOKEN',
      'APP_DOMAIN',
      'TELEGRAM_WEBAPP_URL'
    ];
    
    envVars.forEach(varName => {
      const exists = !!process.env[varName];
      console.log(`🔑 ${varName}: ${exists ? '✅ SET' : '❌ MISSING'}`);
    });

    // 8. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n8️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА...');
    
    const issues = [];
    
    if (!withdrawRequests || withdrawRequests.length === 0) {
      issues.push('Нет заявок на вывод в базе данных');
    }
    
    if (!adminBotToken) {
      issues.push('Отсутствует ADMIN_BOT_TOKEN');
    }
    
    if (!serviceExists || !controllerExists || !routesExists) {
      issues.push('Отсутствуют файлы админ-бота');
    }
    
    if (issues.length === 0) {
      console.log('✅ Критических проблем не обнаружено');
      console.log('\n📋 РЕКОМЕНДАЦИИ ДЛЯ ДАЛЬНЕЙШЕЙ ДИАГНОСТИКИ:');
      console.log('1. Проверить логи сервера во время создания заявки');
      console.log('2. Проверить вызовы AdminBotService в processWithdrawal');
      console.log('3. Протестировать создание тестовой заявки');
      console.log('4. Проверить доступность webhook URL снаружи');
    } else {
      console.log('⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    return {
      withdraw_requests_count: withdrawRequests?.length || 0,
      withdrawal_transactions_count: withdrawalTransactions?.length || 0,
      admin_bot_configured: !!adminBotToken,
      webhook_files_exist: serviceExists && controllerExists && routesExists,
      issues: issues
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО ДИАГНОСТИКИ СИСТЕМЫ ВЫВОДА СРЕДСТВ');
    console.log(`⏰ Время: ${new Date().toISOString()}\n`);
    
    const result = await diagnosticWithdrawalSystem();
    
    console.log('\n📊 РЕЗУЛЬТАТ ДИАГНОСТИКИ:');
    console.log(`Заявок на вывод: ${result.withdraw_requests_count}`);
    console.log(`Транзакций вывода: ${result.withdrawal_transactions_count}`);
    console.log(`Админ-бот настроен: ${result.admin_bot_configured}`);
    console.log(`Файлы webhook существуют: ${result.webhook_files_exist}`);
    console.log(`Проблем обнаружено: ${result.issues.length}`);
    
    process.exit(result.issues.length === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ДИАГНОСТИКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();