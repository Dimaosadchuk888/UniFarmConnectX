#!/usr/bin/env tsx

/**
 * 🎯 СОЗДАНИЕ ТЕСТОВОЙ ЗАЯВКИ НА ВЫВОД (ИСПРАВЛЕННАЯ ВЕРСИЯ)
 * С правильным UUID формат для ID заявки
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function createTestWithdrawalWithUUID() {
  console.log('🎯 СОЗДАНИЕ ТЕСТОВОЙ ЗАЯВКИ С ПРАВИЛЬНЫМ UUID');
  console.log('=' .repeat(55));
  
  try {
    // 1. Тестовый пользователь
    const testUserId = 185;
    
    console.log('1️⃣ Получение данных пользователя...');
    
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton')
      .eq('id', testUserId)
      .single();
      
    if (userError || !testUser) {
      throw new Error(`Пользователь не найден: ${userError?.message}`);
    }
    
    console.log(`👤 Пользователь: @${testUser.username} (ID: ${testUser.id})`);
    console.log(`💰 Баланс: ${testUser.balance_ton} TON`);

    // 2. Создаем заявку с правильным UUID
    console.log('\n2️⃣ Создание заявки с UUID...');
    
    const withdrawRequest = {
      id: randomUUID(), // Правильный UUID формат
      user_id: testUser.id,
      telegram_id: testUser.telegram_id,
      username: testUser.username,
      amount_ton: '1.5', // 1.5 TON для тестирования
      ton_wallet: 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    console.log(`🆔 UUID заявки: ${withdrawRequest.id}`);
    console.log(`💰 Сумма: ${withdrawRequest.amount_ton} TON`);
    console.log(`🏦 Кошелек: ${withdrawRequest.ton_wallet}`);

    // 3. Сохраняем в базе данных
    console.log('\n3️⃣ Сохранение в базе данных...');
    
    const { data: newRequest, error: insertError } = await supabase
      .from('withdraw_requests')
      .insert(withdrawRequest)
      .select()
      .single();
      
    if (insertError) {
      throw new Error(`Ошибка создания заявки: ${insertError.message}`);
    }
    
    console.log('✅ Заявка сохранена в базе данных');

    // 4. Тестируем AdminBotService уведомление
    console.log('\n4️⃣ Тестирование AdminBotService...');
    
    try {
      const { AdminBotService } = await import('./modules/adminBot/service');
      const adminBotService = new AdminBotService();
      
      console.log('🤖 Отправка уведомления админ-боту...');
      
      const notificationResult = await adminBotService.notifyWithdrawal(newRequest);
      
      if (notificationResult) {
        console.log('✅ УВЕДОМЛЕНИЕ ОТПРАВЛЕНО УСПЕШНО!');
        console.log('📱 Проверьте Telegram админ-бота СЕЙЧАС!');
      } else {
        console.log('❌ Уведомление не отправлено');
        console.log('ℹ️  Возможные причины: ошибка API или админы не найдены');
      }
      
    } catch (serviceError) {
      console.log('❌ Ошибка AdminBotService:', serviceError);
      console.log('⚠️  Проверьте импорт и конфигурацию сервиса');
    }

    // 5. Проверяем админов
    console.log('\n5️⃣ Проверка админов...');
    
    const { data: admins } = await supabase
      .from('users')
      .select('username, telegram_id, is_admin')
      .eq('is_admin', true);
      
    console.log(`👥 Админов в системе: ${admins?.length || 0}`);
    admins?.forEach((admin, i) => {
      console.log(`   ${i + 1}. @${admin.username} (${admin.telegram_id})`);
    });

    // 6. Проверяем все заявки на вывод
    console.log('\n6️⃣ Текущие заявки на вывод...');
    
    const { data: allRequests } = await supabase
      .from('withdraw_requests')
      .select('id, user_id, amount_ton, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log(`📋 Последние заявки: ${allRequests?.length || 0}`);
    allRequests?.forEach((req, i) => {
      const date = new Date(req.created_at).toLocaleString('ru-RU');
      console.log(`   ${i + 1}. ${req.amount_ton} TON (${req.status}) - ${date}`);
    });

    // 7. Финальная информация
    console.log('\n7️⃣ РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ...');
    console.log('🎯 ТЕСТОВАЯ ЗАЯВКА СОЗДАНА:');
    console.log(`   🆔 ID: ${newRequest.id}`);
    console.log(`   👤 User: @${newRequest.username} (${newRequest.user_id})`);
    console.log(`   💰 Amount: ${newRequest.amount_ton} TON`);
    console.log(`   🏦 Wallet: ${newRequest.ton_wallet}`);
    console.log(`   📅 Created: ${new Date(newRequest.created_at).toLocaleString('ru-RU')}`);
    console.log(`   ⏳ Status: ${newRequest.status}`);
    
    console.log('\n🔔 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ В TELEGRAM:');
    console.log('1. Админы получат уведомление о новой заявке');
    console.log('2. Уведомление содержит:');
    console.log('   - Данные пользователя и сумму');
    console.log('   - TON кошелек для вывода');
    console.log('   - Дату создания');
    console.log('   - Кнопки: "Одобрить", "Отклонить", "Все заявки"');
    console.log('3. Webhook отвечает 200 OK (без 500 ошибок)');
    
    console.log('\n📱 ИНСТРУКЦИИ:');
    console.log('1. Откройте Telegram и найдите админ-бота');
    console.log('2. Ищите новое уведомление с данными заявки');
    console.log('3. Нажимайте кнопки для тестирования функций');
    console.log('4. Проверьте что нет ошибок webhook');
    
    return newRequest;

  } catch (error) {
    console.error('💥 ОШИБКА СОЗДАНИЯ ЗАЯВКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО СОЗДАНИЯ ТЕСТОВОЙ ЗАЯВКИ НА ВЫВОД');
    console.log(`⏰ ${new Date().toISOString()}\n`);
    
    const result = await createTestWithdrawalWithUUID();
    
    console.log('\n🎉 ЗАЯВКА СОЗДАНА И УВЕДОМЛЕНИЕ ОТПРАВЛЕНО!');
    console.log('📧 НЕМЕДЛЕННО ПРОВЕРЬТЕ TELEGRAM АДМИН-БОТА!');
    
    if (result) {
      console.log(`\n🆔 ID для справки: ${result.id}`);
    }
    
    console.log('\n✅ Система уведомлений о выводе средств работает!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ТЕСТИРОВАНИЕ ПРОВАЛЕНО:', error);
    process.exit(1);
  }
}

main();