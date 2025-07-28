#!/usr/bin/env tsx

/**
 * 🔍 ДИАГНОСТИКА ПРОБЛЕМ С УВЕДОМЛЕНИЯМИ АДМИН-БОТА
 * Анализ почему уведомления не отправляются
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function diagnoseAdminNotificationIssue() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМ С УВЕДОМЛЕНИЯМИ АДМИН-БОТА');
  console.log('=' .repeat(60));
  
  try {
    // 1. Проверяем конфигурацию админ-бота
    console.log('1️⃣ Проверка конфигурации админ-бота...');
    
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    const appDomain = process.env.APP_DOMAIN;
    
    console.log(`🔑 ADMIN_BOT_TOKEN: ${adminBotToken ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'}`);
    console.log(`🌐 APP_DOMAIN: ${appDomain || 'НЕ УСТАНОВЛЕН'}`);
    
    if (!adminBotToken) {
      console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: ADMIN_BOT_TOKEN не настроен!');
      console.log('🔧 Решение: Добавьте ADMIN_BOT_TOKEN в .env файл');
      return;
    }

    // 2. Тестируем Telegram Bot API
    console.log('\n2️⃣ Тестирование Telegram Bot API...');
    
    try {
      const botInfoResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getMe`);
      const botInfo = await botInfoResponse.json();
      
      if (botInfo.ok) {
        console.log(`✅ Бот активен: @${botInfo.result.username}`);
        console.log(`📛 Имя бота: ${botInfo.result.first_name}`);
        console.log(`🆔 ID бота: ${botInfo.result.id}`);
      } else {
        console.log('❌ Ошибка Bot API:', botInfo.description);
        console.log('🔧 Проверьте правильность ADMIN_BOT_TOKEN');
        return;
      }
      
    } catch (apiError) {
      console.log('❌ Ошибка подключения к Telegram API:', apiError);
      return;
    }

    // 3. Анализируем админов в базе данных
    console.log('\n3️⃣ Анализ админов в базе данных...');
    
    const { data: allAdmins, error: adminsError } = await supabase
      .from('users')
      .select('id, username, telegram_id, is_admin, created_at')
      .eq('is_admin', true);
      
    if (adminsError) {
      console.log('❌ Ошибка запроса админов:', adminsError.message);
      return;
    }
    
    console.log(`👥 Всего админов в базе: ${allAdmins?.length || 0}`);
    
    if (!allAdmins || allAdmins.length === 0) {
      console.log('❌ В базе нет админов с is_admin = true');
      console.log('🔧 Решение: Назначьте пользователей админами');
      return;
    }
    
    allAdmins.forEach((admin, index) => {
      console.log(`\n   ${index + 1}. Админ @${admin.username}:`);
      console.log(`      📊 User ID: ${admin.id}`);
      console.log(`      📱 Telegram ID: ${admin.telegram_id}`);
      console.log(`      🗓  Создан: ${new Date(admin.created_at).toLocaleString('ru-RU')}`);
      console.log(`      🎯 is_admin: ${admin.is_admin}`);
    });

    // 4. Проверяем конфигурацию AdminBotService
    console.log('\n4️⃣ Проверка конфигурации AdminBotService...');
    
    try {
      const fs = await import('fs');
      
      // Проверяем config/adminBot.ts
      if (fs.existsSync('config/adminBot.ts')) {
        const adminBotConfig = fs.readFileSync('config/adminBot.ts', 'utf8');
        
        console.log('📄 Найден config/adminBot.ts');
        
        // Ищем authorizedAdmins
        const authorizedMatch = adminBotConfig.match(/authorizedAdmins:\s*\[(.*?)\]/s);
        if (authorizedMatch) {
          console.log('👥 authorizedAdmins найден в конфигурации');
          
          // Извлекаем список админов
          const adminsList = authorizedMatch[1].match(/'@[^']+'/g);
          console.log(`📝 Список авторизованных админов: ${adminsList?.join(', ') || 'ПУСТОЙ'}`);
        } else {
          console.log('⚠️  authorizedAdmins не найден в конфигурации');
        }
        
        // Проверяем импорт переменных окружения
        const tokenCheck = adminBotConfig.includes('process.env.ADMIN_BOT_TOKEN');
        console.log(`🔑 Использует ADMIN_BOT_TOKEN: ${tokenCheck ? 'ДА' : 'НЕТ'}`);
        
      } else {
        console.log('❌ config/adminBot.ts не найден');
      }
      
    } catch (configError) {
      console.log('⚠️  Не удалось проверить конфигурацию:', configError);
    }

    // 5. Тестируем отправку сообщения напрямую
    console.log('\n5️⃣ Тестирование отправки сообщения...');
    
    // Берем первого админа для тестирования
    const testAdmin = allAdmins[0];
    const testMessage = `🧪 ТЕСТ УВЕДОМЛЕНИЯ АДМИН-БОТА

⏰ Время: ${new Date().toLocaleString('ru-RU')}
🎯 Это тестовое сообщение для проверки работы уведомлений

Если вы видите это сообщение, то система уведомлений работает корректно!`;

    try {
      console.log(`📤 Отправка тестового сообщения админу @${testAdmin.username} (${testAdmin.telegram_id})`);
      
      const sendResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: testAdmin.telegram_id,
          text: testMessage,
          parse_mode: 'HTML'
        })
      });
      
      const sendResult = await sendResponse.json();
      
      if (sendResult.ok) {
        console.log('✅ ТЕСТОВОЕ СООБЩЕНИЕ ОТПРАВЛЕНО УСПЕШНО!');
        console.log(`📱 Message ID: ${sendResult.result.message_id}`);
        console.log('🎉 Система отправки работает корректно');
      } else {
        console.log('❌ Ошибка отправки сообщения:', sendResult.description);
        console.log(`🔍 Код ошибки: ${sendResult.error_code}`);
        
        if (sendResult.error_code === 403) {
          console.log('⚠️  Бот заблокирован пользователем или чат не найден');
          console.log('🔧 Решение: Админ должен написать боту /start');
        }
      }
      
    } catch (sendError) {
      console.log('❌ Ошибка отправки тестового сообщения:', sendError);
    }

    // 6. Проверяем webhook статус
    console.log('\n6️⃣ Проверка webhook статуса...');
    
    try {
      const webhookResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getWebhookInfo`);
      const webhookInfo = await webhookResponse.json();
      
      if (webhookInfo.ok) {
        console.log(`📡 Webhook URL: ${webhookInfo.result.url || 'НЕ УСТАНОВЛЕН'}`);
        console.log(`📊 Pending updates: ${webhookInfo.result.pending_update_count || 0}`);
        
        if (webhookInfo.result.last_error_message) {
          console.log(`⚠️  Последняя ошибка: ${webhookInfo.result.last_error_message}`);
          console.log(`📅 Дата ошибки: ${new Date(webhookInfo.result.last_error_date * 1000).toLocaleString('ru-RU')}`);
        } else {
          console.log('✅ Webhook работает без ошибок');
        }
      }
      
    } catch (webhookError) {
      console.log('❌ Ошибка проверки webhook:', webhookError);
    }

    // 7. Рекомендации по исправлению
    console.log('\n7️⃣ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ...');
    
    console.log('🔧 ВОЗМОЖНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ:');
    
    console.log('\n1. Админы не написали боту /start:');
    console.log('   - Каждый админ должен открыть чат с ботом');
    console.log('   - Написать команду /start');
    console.log('   - Только после этого бот может отправлять сообщения');
    
    console.log('\n2. Неправильные Telegram ID:');
    console.log('   - Проверьте telegram_id админов в базе данных');
    console.log('   - ID должны быть числовыми (например: 425855744)');
    console.log('   - Не должны содержать @ или текст');
    
    console.log('\n3. Проблемы с конфигурацией:');
    console.log('   - Убедитесь что ADMIN_BOT_TOKEN правильный');
    console.log('   - Проверьте список authorizedAdmins в config/adminBot.ts');
    console.log('   - Админы должны совпадать по username');
    
    console.log('\n4. Блокировка бота:');
    console.log('   - Если админ заблокировал бота, разблокируйте');
    console.log('   - Проверьте что бот не удален из чата');
    
    console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Попросите каждого админа написать боту /start');
    console.log('2. Проверьте что telegram_id правильные');
    console.log('3. Повторите тест отправки уведомления');
    console.log('4. Проверьте логи системы на ошибки');

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО ДИАГНОСТИКИ СИСТЕМЫ УВЕДОМЛЕНИЙ');
    console.log(`⏰ ${new Date().toISOString()}\n`);
    
    await diagnoseAdminNotificationIssue();
    
    console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('📊 Проанализируйте результаты выше для устранения проблем');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ДИАГНОСТИКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();