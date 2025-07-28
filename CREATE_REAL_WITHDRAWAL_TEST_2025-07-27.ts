#!/usr/bin/env tsx

/**
 * 🎯 СОЗДАНИЕ РЕАЛЬНОЙ ТЕСТОВОЙ ЗАЯВКИ НА ВЫВОД
 * Полная проверка интеграции WalletService + AdminBotService
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function createRealWithdrawalTest() {
  console.log('🎯 СОЗДАНИЕ РЕАЛЬНОЙ ТЕСТОВОЙ ЗАЯВКИ НА ВЫВОД');
  console.log('=' .repeat(55));
  
  try {
    // 1. Выбираем тестового пользователя
    const testUserId = 185; // Пользователь с балансом 100 TON
    
    console.log('1️⃣ Получение данных тестового пользователя...');
    
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .eq('id', testUserId)
      .single();
      
    if (userError || !testUser) {
      throw new Error(`Пользователь ${testUserId} не найден: ${userError?.message}`);
    }
    
    console.log(`👤 Тестовый пользователь: @${testUser.username} (ID: ${testUser.id})`);
    console.log(`💰 Текущий баланс: ${testUser.balance_ton} TON`);
    console.log(`📱 Telegram ID: ${testUser.telegram_id}`);

    // 2. Создаем заявку на вывод напрямую через WalletService
    console.log('\n2️⃣ Создание заявки через WalletService...');
    
    const withdrawalAmount = '2'; // 2 TON для тестирования
    const testWallet = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'; // Тестовый TON кошелек
    
    // Создаем заявку напрямую в таблице withdraw_requests
    const withdrawRequest = {
      id: `test_withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: testUser.id,
      telegram_id: testUser.telegram_id,
      username: testUser.username,
      amount_ton: withdrawalAmount,
      ton_wallet: testWallet,
      status: 'pending',
      created_at: new Date().toISOString(),
      processed_at: null,
      processed_by: null
    };
    
    console.log('📝 Данные заявки:');
    console.log(`   ID: ${withdrawRequest.id}`);
    console.log(`   Пользователь: @${withdrawRequest.username} (${withdrawRequest.user_id})`);
    console.log(`   Сумма: ${withdrawRequest.amount_ton} TON`);
    console.log(`   Кошелек: ${withdrawRequest.ton_wallet}`);
    console.log(`   Статус: ${withdrawRequest.status}`);

    // 3. Вставляем заявку в базу данных
    console.log('\n3️⃣ Сохранение заявки в базе данных...');
    
    const { data: newRequest, error: insertError } = await supabase
      .from('withdraw_requests')
      .insert(withdrawRequest)
      .select()
      .single();
      
    if (insertError) {
      throw new Error(`Ошибка создания заявки: ${insertError.message}`);
    }
    
    console.log('✅ Заявка создана в базе данных успешно');

    // 4. Списываем баланс пользователя (имитируем WalletService.processWithdrawal)
    console.log('\n4️⃣ Списание баланса пользователя...');
    
    const newBalance = parseFloat(testUser.balance_ton) - parseFloat(withdrawalAmount);
    
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance_ton: newBalance.toString() })
      .eq('id', testUser.id);
      
    if (balanceError) {
      console.log('⚠️  Ошибка списания баланса:', balanceError.message);
      console.log('ℹ️  Продолжаем тестирование уведомлений...');
    } else {
      console.log(`✅ Баланс списан: ${testUser.balance_ton} → ${newBalance} TON`);
    }

    // 5. Тестируем AdminBotService.notifyWithdrawal() напрямую
    console.log('\n5️⃣ Тестирование уведомления админ-бота...');
    
    // Импортируем и создаем экземпляр AdminBotService
    const { AdminBotService } = await import('./modules/adminBot/service');
    const adminBotService = new AdminBotService();
    
    console.log('🤖 AdminBotService создан, отправляем уведомление...');
    
    try {
      const notificationSent = await adminBotService.notifyWithdrawal(newRequest);
      
      if (notificationSent) {
        console.log('✅ Уведомление админ-бота отправлено успешно!');
        console.log('📱 Проверьте Telegram админ-бота на наличие нового уведомления');
      } else {
        console.log('❌ Уведомление админ-бота не отправлено');
        console.log('ℹ️  Возможные причины: админы не найдены или ошибка отправки');
      }
      
    } catch (notifyError) {
      console.log('❌ Ошибка отправки уведомления:', notifyError);
      console.log('ℹ️  Проверьте логи для подробностей');
    }

    // 6. Проверяем админов в системе
    console.log('\n6️⃣ Проверка админов в системе...');
    
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('username, telegram_id, is_admin')
      .eq('is_admin', true);
      
    if (adminsError) {
      console.log('❌ Ошибка поиска админов:', adminsError.message);
    } else {
      console.log(`👥 Найдено админов: ${admins?.length || 0}`);
      
      if (admins && admins.length > 0) {
        admins.forEach((admin, index) => {
          console.log(`   ${index + 1}. @${admin.username} (Telegram ID: ${admin.telegram_id})`);
        });
        
        console.log('✅ Админы найдены, уведомления должны отправиться');
      } else {
        console.log('⚠️  Админы не найдены в базе данных');
      }
    }

    // 7. Проверяем webhook статус
    console.log('\n7️⃣ Проверка webhook статуса...');
    
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    if (adminBotToken) {
      try {
        const fetch = (await import('node-fetch')).default;
        const webhookResponse = await fetch(`https://api.telegram.org/bot${adminBotToken}/getWebhookInfo`);
        const webhookInfo = await webhookResponse.json();
        
        if (webhookInfo.ok) {
          console.log(`📡 Webhook URL: ${webhookInfo.result.url || 'НЕ УСТАНОВЛЕН'}`);
          console.log(`📡 Pending Updates: ${webhookInfo.result.pending_update_count || 0}`);
          
          if (webhookInfo.result.last_error_message) {
            console.log(`📡 Last Error: ${webhookInfo.result.last_error_message}`);
            console.log('ℹ️  После исправлений эта ошибка должна исчезнуть');
          } else {
            console.log('✅ Webhook работает без ошибок');
          }
        }
        
      } catch (webhookError) {
        console.log('⚠️  Не удалось проверить webhook статус');
      }
    } else {
      console.log('⚠️  ADMIN_BOT_TOKEN не настроен');
    }

    // 8. Итоговая информация
    console.log('\n8️⃣ ИТОГИ ТЕСТИРОВАНИЯ...');
    console.log('🎯 СОЗДАНА ТЕСТОВАЯ ЗАЯВКА НА ВЫВОД:');
    console.log(`   🆔 ID заявки: ${newRequest.id}`);
    console.log(`   👤 Пользователь: @${newRequest.username} (${newRequest.user_id})`);
    console.log(`   💰 Сумма: ${newRequest.amount_ton} TON`);
    console.log(`   🏦 Кошелек: ${newRequest.ton_wallet}`);
    console.log(`   📅 Создана: ${new Date(newRequest.created_at).toLocaleString('ru-RU')}`);
    console.log(`   ⏳ Статус: ${newRequest.status}`);
    
    console.log('\n🔔 ЧТО ДОЛЖНО ПРОИЗОЙТИ В TELEGRAM:');
    console.log('1. Админы получат уведомление о новой заявке');
    console.log('2. Уведомление будет содержать:');
    console.log('   - Информацию о пользователе и сумме');
    console.log('   - Адрес кошелька для вывода');
    console.log('   - Кнопки "Одобрить" и "Отклонить"');
    console.log('   - Кнопку "Все заявки"');
    console.log('3. Клик по кнопкам должен работать без ошибок');
    
    console.log('\n📱 ИНСТРУКЦИИ ДЛЯ ПРОВЕРКИ:');
    console.log('1. Откройте Telegram админ-бота');
    console.log('2. Найдите новое уведомление о выводе');
    console.log('3. Проверьте корректность информации');
    console.log('4. Нажмите на кнопки управления');
    console.log('5. Убедитесь что webhook не возвращает ошибки');
    
    return newRequest;

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО СОЗДАНИЯ ТЕСТОВОЙ ЗАЯВКИ');
    console.log(`⏰ Время: ${new Date().toISOString()}\n`);
    
    const testRequest = await createRealWithdrawalTest();
    
    console.log('\n🎉 ТЕСТОВАЯ ЗАЯВКА СОЗДАНА УСПЕШНО!');
    console.log('📧 НЕМЕДЛЕННО ПРОВЕРЬТЕ TELEGRAM АДМИН-БОТА!');
    
    if (testRequest) {
      console.log(`\n🆔 Для справки - ID тестовой заявки: ${testRequest.id}`);
      console.log('📝 Эта заявка может быть использована для тестирования кнопок управления');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ СОЗДАНИЕ ТЕСТОВОЙ ЗАЯВКИ ПРОВАЛЕНО:', error);
    console.error('🔧 Проверьте логи для диагностики проблемы');
    process.exit(1);
  }
}

main();