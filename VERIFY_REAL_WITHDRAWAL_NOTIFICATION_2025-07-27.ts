#!/usr/bin/env tsx

/**
 * 🔍 ПРОВЕРКА РЕАЛЬНОЙ РАБОТЫ УВЕДОМЛЕНИЙ ПОСЛЕ /start
 * Диагностика почему уведомления не приходят несмотря на /start
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function verifyWithdrawalNotificationFlow() {
  console.log('🔍 ПРОВЕРКА РЕАЛЬНОЙ РАБОТЫ УВЕДОМЛЕНИЙ ПОСЛЕ /start');
  console.log('=' .repeat(65));
  
  try {
    // 1. Проверяем последние заявки пользователя ID 25
    console.log('1️⃣ Проверка последних заявок пользователя ID 25...');
    
    const { data: user25Requests, error: requestsError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (requestsError) {
      console.log('❌ Ошибка получения заявок:', requestsError.message);
      return;
    }
    
    console.log(`📋 Найдено заявок от пользователя 25: ${user25Requests?.length || 0}`);
    
    if (!user25Requests || user25Requests.length === 0) {
      console.log('❌ Заявки от пользователя 25 не найдены');
      console.log('🔧 Создайте заявку на вывод и повторите проверку');
      return;
    }
    
    // Показываем последние заявки
    user25Requests.forEach((req, index) => {
      const date = new Date(req.created_at).toLocaleString('ru-RU');
      console.log(`   ${index + 1}. ${req.amount_ton} TON (${req.status}) - ${date}`);
      console.log(`      ID: ${req.id}`);
      console.log(`      Кошелек: ${req.ton_wallet}`);
    });
    
    // Берем самую последнюю заявку
    const latestRequest = user25Requests[0];
    const timeSinceCreated = Date.now() - new Date(latestRequest.created_at).getTime();
    const minutesAgo = Math.floor(timeSinceCreated / (1000 * 60));
    
    console.log(`\n🎯 Анализируем последнюю заявку:`);
    console.log(`   ID: ${latestRequest.id}`);
    console.log(`   Создана: ${minutesAgo} минут назад`);
    console.log(`   Статус: ${latestRequest.status}`);
    console.log(`   Сумма: ${latestRequest.amount_ton} TON`);

    // 2. Тестируем отправку уведомления для этой заявки
    console.log('\n2️⃣ Тестирование отправки уведомления для последней заявки...');
    
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    if (!adminBotToken) {
      console.log('❌ ADMIN_BOT_TOKEN не настроен');
      return;
    }
    
    // 3. Проверяем всех админов и их чаты
    console.log('\n3️⃣ Проверка доступности чатов с админами...');
    
    const { data: admins } = await supabase
      .from('users')
      .select('username, telegram_id, is_admin')
      .eq('is_admin', true);
      
    console.log(`👥 Админов в системе: ${admins?.length || 0}`);
    
    for (const admin of admins || []) {
      console.log(`\n📱 Тестируем чат с @${admin.username} (${admin.telegram_id}):`);
      
      try {
        // Отправляем простое тестовое сообщение
        const testMessage = `🧪 ТЕСТ СВЯЗИ
        
⏰ ${new Date().toLocaleString('ru-RU')}
Это проверка доступности чата после команды /start`;

        const response = await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: admin.telegram_id,
            text: testMessage
          })
        });
        
        const result = await response.json();
        
        if (result.ok) {
          console.log(`   ✅ Чат доступен - сообщение отправлено (Message ID: ${result.result.message_id})`);
          
          // Если чат доступен, отправляем полное уведомление о заявке
          console.log('   📤 Отправляем уведомление о заявке...');
          
          const withdrawalMessage = `🔔 <b>НОВАЯ ЗАЯВКА НА ВЫВОД</b>

👤 <b>Пользователь:</b> @${latestRequest.username || 'unknown'}
🆔 <b>ID заявки:</b> <code>${latestRequest.id}</code>
💰 <b>Сумма:</b> ${latestRequest.amount_ton} TON
🏦 <b>Кошелек:</b> <code>${latestRequest.ton_wallet}</code>
📅 <b>Дата:</b> ${new Date(latestRequest.created_at).toLocaleString('ru-RU')}
⏳ <b>Статус:</b> ${latestRequest.status}`;

          const notificationResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: admin.telegram_id,
              text: withdrawalMessage,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ Одобрить", callback_data: `approve_${latestRequest.id}` },
                    { text: "❌ Отклонить", callback_data: `reject_${latestRequest.id}` }
                  ],
                  [
                    { text: "📋 Все заявки", callback_data: "all_requests" }
                  ]
                ]
              }
            })
          });
          
          const notificationResult = await notificationResponse.json();
          
          if (notificationResult.ok) {
            console.log(`   ✅ УВЕДОМЛЕНИЕ О ЗАЯВКЕ ОТПРАВЛЕНО! (Message ID: ${notificationResult.result.message_id})`);
            console.log('   📱 Проверьте Telegram - уведомление должно появиться');
          } else {
            console.log(`   ❌ Ошибка отправки уведомления: ${notificationResult.description}`);
          }
          
        } else {
          console.log(`   ❌ Чат недоступен: ${result.description}`);
          
          if (result.error_code === 403) {
            console.log('   ⚠️  Пользователь заблокировал бота или не писал /start');
          } else if (result.error_code === 400) {
            console.log('   ⚠️  Неправильный chat_id или чат не найден');
          }
        }
        
      } catch (chatError) {
        console.log(`   ❌ Ошибка проверки чата: ${chatError}`);
      }
    }

    // 4. Проверяем AdminBotService напрямую
    console.log('\n4️⃣ Прямая проверка AdminBotService...');
    
    try {
      const { AdminBotService } = await import('./modules/adminBot/service');
      const adminBotService = new AdminBotService();
      
      console.log('🤖 Вызываем AdminBotService.notifyWithdrawal() для последней заявки...');
      
      const serviceResult = await adminBotService.notifyWithdrawal(latestRequest);
      
      if (serviceResult) {
        console.log('✅ AdminBotService вернул успех');
      } else {
        console.log('❌ AdminBotService вернул неудачу');
      }
      
    } catch (serviceError) {
      console.log('❌ Ошибка AdminBotService:', serviceError);
    }

    // 5. Проверяем логи WalletService
    console.log('\n5️⃣ Проверка интеграции с WalletService...');
    
    try {
      // Проверяем есть ли вызов AdminBotService в WalletService
      const fs = await import('fs');
      
      if (fs.existsSync('modules/wallet/service.ts')) {
        const walletServiceCode = fs.readFileSync('modules/wallet/service.ts', 'utf8');
        
        // Ищем импорт AdminBotService
        const hasImport = walletServiceCode.includes('AdminBotService');
        console.log(`📦 AdminBotService импортирован в WalletService: ${hasImport ? 'ДА' : 'НЕТ'}`);
        
        // Ищем вызов notifyWithdrawal
        const hasCall = walletServiceCode.includes('notifyWithdrawal');
        console.log(`📞 Вызов notifyWithdrawal найден: ${hasCall ? 'ДА' : 'НЕТ'}`);
        
        if (!hasImport || !hasCall) {
          console.log('⚠️  КРИТИЧЕСКАЯ ПРОБЛЕМА: Интеграция с WalletService отсутствует!');
          console.log('🔧 Необходимо добавить вызов AdminBotService в WalletService.processWithdrawal()');
        } else {
          console.log('✅ Интеграция с WalletService присутствует');
        }
        
      } else {
        console.log('❌ modules/wallet/service.ts не найден');
      }
      
    } catch (fileError) {
      console.log('❌ Ошибка проверки файлов:', fileError);
    }

    // 6. Проверяем webhook последние события
    console.log('\n6️⃣ Проверка webhook статуса...');
    
    try {
      const webhookResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getWebhookInfo`);
      const webhookInfo = await webhookResponse.json();
      
      if (webhookInfo.ok) {
        console.log(`📡 Webhook URL: ${webhookInfo.result.url}`);
        console.log(`📊 Pending updates: ${webhookInfo.result.pending_update_count}`);
        
        if (webhookInfo.result.last_error_message) {
          console.log(`⚠️  Последняя ошибка: ${webhookInfo.result.last_error_message}`);
          console.log(`📅 Время ошибки: ${new Date(webhookInfo.result.last_error_date * 1000).toLocaleString('ru-RU')}`);
        } else {
          console.log('✅ Webhook работает без ошибок');
        }
      }
      
    } catch (webhookError) {
      console.log('❌ Ошибка проверки webhook:', webhookError);
    }

    // 7. Итоговая диагностика
    console.log('\n7️⃣ ИТОГОВАЯ ДИАГНОСТИКА...');
    
    console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
    console.log(`   📋 Последняя заявка ID 25: ${latestRequest.id}`);
    console.log(`   📅 Создана: ${minutesAgo} минут назад`);
    console.log(`   👥 Админов в системе: ${admins?.length || 0}`);
    console.log(`   💌 Попытки отправки уведомлений выполнены`);
    
    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
    console.log('1. WalletService не вызывает AdminBotService автоматически');
    console.log('2. Заявка создана через UI, который обходит WalletService');
    console.log('3. Ошибки в логике AdminBotService.notifyWithdrawal()');
    console.log('4. Проблемы с авторизацией или конфигурацией');
    console.log('5. Telegram_id админов неправильные');
    
    console.log('\n📱 ЧТО ПРОВЕРИТЬ В TELEGRAM:');
    console.log('1. Посмотрите чат с @unifarm_admin_bot');
    console.log('2. Должны быть тестовые сообщения от этой проверки');
    console.log('3. Если тестовые сообщения есть, но уведомления о заявках нет - проблема в интеграции');
    console.log('4. Если тестовых сообщений нет - проблема в настройке бота');

  } catch (error) {
    console.error('💥 ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО ПРОВЕРКИ РЕАЛЬНОЙ РАБОТЫ УВЕДОМЛЕНИЙ');
    console.log(`⏰ ${new Date().toISOString()}\n`);
    
    await verifyWithdrawalNotificationFlow();
    
    console.log('\n🎯 ПРОВЕРКА ЗАВЕРШЕНА');
    console.log('📱 Проверьте Telegram для подтверждения получения тестовых сообщений');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();