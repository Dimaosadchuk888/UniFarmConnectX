/**
 * ЖИВОЙ МОНИТОРИНГ НАЖАТИЙ КНОПОК АДМИН БОТА
 * Проверим что происходит когда нажимается "Одобрить"
 */

import { supabase } from './core/supabase';

async function monitorAdminBotActivity() {
  console.log('👀 ЖИВОЙ МОНИТОРИНГ АКТИВНОСТИ АДМИН БОТА');
  console.log('=' .repeat(50));

  try {
    // 1. Проверяем последние логи adminBot в базе (если есть система логирования)
    console.log('\n1️⃣ ПРОВЕРКА ПОСЛЕДНЕЙ АКТИВНОСТИ АДМИН БОТА:');
    
    // 2. Тестируем webhook прямо сейчас с симуляцией нажатия "Одобрить"
    console.log('\n2️⃣ СИМУЛЯЦИЯ НАЖАТИЯ КНОПКИ "ОДОБРИТЬ":');
    
    // Получаем реальную заявку
    const { data: testRequest } = await supabase
      .from('withdraw_requests')
      .select('id')
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (!testRequest) {
      console.log('❌ Нет pending заявок для тестирования');
      return;
    }

    console.log(`🎯 Тестируем с заявкой ID: ${testRequest.id}`);

    // Симуляция callback_query от Telegram
    const callbackQueryPayload = {
      update_id: 999999,
      callback_query: {
        id: "test_callback_query_123",
        from: {
          id: 425855744, // ID Димы
          is_bot: false,
          first_name: "Dima",
          username: "DimaOsadchuk",
          language_code: "ru"
        },
        message: {
          message_id: 123,
          from: {
            id: 7234567890, // ID админ бота
            is_bot: true,
            first_name: "UniFarm Admin",
            username: "unifarm_admin_bot"
          },
          chat: {
            id: 425855744,
            first_name: "Dima",
            username: "DimaOsadchuk",
            type: "private"
          },
          date: Math.floor(Date.now() / 1000),
          text: "🚨 НОВАЯ ЗАЯВКА НА ВЫВОД...",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Одобрить",
                  callback_data: `approve_withdrawal:${testRequest.id}`
                }
              ]
            ]
          }
        },
        chat_instance: "123456789",
        data: `approve_withdrawal:${testRequest.id}`
      }
    };

    console.log(`📤 Отправляем POST к webhook с callback_data: "${callbackQueryPayload.callback_query.data}"`);

    // Отправляем к webhook админ бота
    try {
      const response = await fetch('http://localhost:3000/api/v2/admin-bot/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callbackQueryPayload)
      });

      const responseText = await response.text();
      console.log(`📬 Webhook ответ: ${response.status} ${response.statusText}`);
      console.log(`📄 Ответ: ${responseText}`);

      // Ждем немного для обработки
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Проверяем изменился ли статус заявки
      const { data: updatedRequest } = await supabase
        .from('withdraw_requests')
        .select('status, processed_at, processed_by')
        .eq('id', testRequest.id)
        .single();

      console.log('\n📋 РЕЗУЛЬТАТ ОБРАБОТКИ:');
      if (updatedRequest?.status === 'approved') {
        console.log('✅ УСПЕХ! Заявка одобрена:');
        console.log(`   - Статус: ${updatedRequest.status}`);
        console.log(`   - Обработана: ${updatedRequest.processed_at}`);
        console.log(`   - Кем: ${updatedRequest.processed_by}`);
      } else {
        console.log('❌ ПРОБЛЕМА! Заявка НЕ одобрена:');
        console.log(`   - Статус: ${updatedRequest?.status || 'неизвестно'}`);
        console.log('   - Это означает что кнопка "Одобрить" не сработала');
      }

    } catch (fetchError) {
      console.log('❌ ОШИБКА WEBHOOK:', fetchError);
    }

    // 3. Анализ возможных проблем
    console.log('\n3️⃣ АНАЛИЗ ВОЗМОЖНЫХ ПРИЧИН ПРОБЛЕМЫ:');
    console.log('🔍 Возможные причины "Заявка не найдена":');
    console.log('   1. Race condition - заявка уже обработана другим админом');
    console.log('   2. Проблема с авторизацией админа в callback_query');
    console.log('   3. Ошибка парсинга callback_data параметров');
    console.log('   4. Проблема с Supabase поиском по UUID');
    console.log('   5. Конфликт между разными обработчиками');

  } catch (error) {
    console.error('❌ Ошибка мониторинга:', error);
  }

  console.log('\n🎯 МОНИТОРИНГ ЗАВЕРШЕН');
  console.log('Теперь попробуйте еще раз нажать "Одобрить" в реальном боте');
}

// Запуск мониторинга
monitorAdminBotActivity().catch(console.error);