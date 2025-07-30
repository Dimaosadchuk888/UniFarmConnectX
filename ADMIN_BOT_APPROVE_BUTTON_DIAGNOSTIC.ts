/**
 * ДИАГНОСТИКА ПРОБЛЕМЫ С КНОПКОЙ "ОДОБРИТЬ"
 * Исследование: почему при нажатии "Одобрить" бот отвечает "Заявка не найдена"
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

async function diagnosticApproveButtonIssue() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С КНОПКОЙ "ОДОБРИТЬ"');
  console.log('=' .repeat(60));

  try {
    // 1. ПРОВЕРЯЕМ СТРУКТУРУ CALLBACK_DATA В УВЕДОМЛЕНИЯХ
    console.log('\n1️⃣ АНАЛИЗ СТРУКТУРЫ CALLBACK_DATA:');
    console.log('📄 В notifyWithdrawal() создаются кнопки:');
    console.log('   - Одобрить: callback_data = `approve_withdrawal:${withdrawRequest.id}`');
    console.log('   - Отклонить: callback_data = `reject_withdrawal:${withdrawRequest.id}`');
    console.log('');
    console.log('🔄 В handleCallbackQuery() обработка:');
    console.log('   - action = "approve_withdrawal"');
    console.log('   - params[0] = requestId');
    console.log('   - Вызывается: handleApproveCommand(chatId, [params[0]], username)');

    // 2. ПОЛУЧАЕМ РЕАЛЬНУЮ ЗАЯВКУ ДЛЯ ТЕСТИРОВАНИЯ
    console.log('\n2️⃣ ПОЛУЧЕНИЕ РЕАЛЬНОЙ ЗАЯВКИ ДЛЯ ТЕСТИРОВАНИЯ:');
    const { data: testRequest, error: requestError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      console.log('❌ Ошибка получения заявки:', requestError.message);
      return;
    }

    if (!testRequest) {
      console.log('❌ Нет pending заявок для тестирования');
      return;
    }

    console.log(`✅ Найдена тестовая заявка:`);
    console.log(`   - ID: ${testRequest.id}`);
    console.log(`   - Пользователь: ${testRequest.username || testRequest.telegram_id}`);
    console.log(`   - Сумма: ${testRequest.amount_ton} TON`);
    console.log(`   - Статус: ${testRequest.status}`);

    // 3. ТЕСТИРУЕМ ПОИСК ЗАЯВКИ ПО ID (КАК В approveWithdrawal)
    console.log('\n3️⃣ ТЕСТ ПОИСКА ЗАЯВКИ ПО ID (КАК В approveWithdrawal):');
    const { data: foundRequest, error: fetchError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('id', testRequest.id)
      .single();

    if (fetchError) {
      console.log('❌ ПРОБЛЕМА НАЙДЕНА! Ошибка поиска заявки:', fetchError.message);
      console.log('   - Code:', fetchError.code);
      console.log('   - Details:', fetchError.details);
      console.log('   - Hint:', fetchError.hint);
    } else if (!foundRequest) {
      console.log('❌ ПРОБЛЕМА НАЙДЕНА! Заявка не найдена при поиске по ID');
    } else {
      console.log('✅ Заявка найдена успешно:');
      console.log(`   - ID: ${foundRequest.id}`);
      console.log(`   - Статус: ${foundRequest.status}`);
    }

    // 4. АНАЛИЗ ВОЗМОЖНЫХ ПРОБЛЕМ
    console.log('\n4️⃣ АНАЛИЗ ВОЗМОЖНЫХ ПРОБЛЕМ:');
    
    // 4.1 Проверяем формат ID (UUID vs число)
    console.log(`🔍 Формат ID заявки: ${testRequest.id}`);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testRequest.id);
    console.log(`   - Это UUID: ${isUUID ? 'ДА' : 'НЕТ'}`);

    // 4.2 Проверяем callback_data который будет сгенерирован
    const expectedCallbackData = `approve_withdrawal:${testRequest.id}`;
    console.log(`🔗 Ожидаемый callback_data: "${expectedCallbackData}"`);
    console.log(`   - Длина: ${expectedCallbackData.length} символов`);
    
    // Telegram ограничивает callback_data до 64 байт
    if (expectedCallbackData.length > 64) {
      console.log('⚠️ ВОЗМОЖНАЯ ПРОБЛЕМА: callback_data превышает лимит 64 символа!');
    }

    // 4.3 Симулируем разбор callback_data
    const parts = expectedCallbackData.split(':');
    const action = parts[0];
    const params = parts.slice(1);
    console.log(`🔄 Симуляция разбора callback_data:`);
    console.log(`   - action: "${action}"`);
    console.log(`   - params[0]: "${params[0]}"`);
    console.log(`   - params.length: ${params.length}`);

    // 5. ПРОВЕРЯЕМ ВСЕ PENDING ЗАЯВКИ
    console.log('\n5️⃣ СПИСОК ВСЕХ PENDING ЗАЯВОК:');
    const { data: allPending, error: allError } = await supabase
      .from('withdraw_requests')
      .select('id, username, amount_ton, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.log('❌ Ошибка получения всех заявок:', allError.message);
    } else {
      console.log(`✅ Найдено pending заявок: ${allPending?.length || 0}`);
      allPending?.forEach((req, index) => {
        const callbackLength = `approve_withdrawal:${req.id}`.length;
        const status = callbackLength > 64 ? '⚠️ ДЛИННО' : '✅';
        console.log(`   ${index + 1}. ${req.id} (${req.username}) - callback: ${callbackLength} символов ${status}`);
      });
    }

    // 6. ПРОВЕРЯЕМ ЛОГИ АДМИН БОТА
    console.log('\n6️⃣ РЕКОМЕНДАЦИИ ПО ПРОВЕРКЕ ЛОГОВ:');
    console.log('📋 При следующем нажатии "Одобрить" проверьте логи на:');
    console.log('   - [AdminBot] Получено обновление от Telegram');
    console.log('   - [AdminBot] Обрабатываем callback query');
    console.log('   - [AdminBot] Callback query обработан успешно');
    console.log('   - [AdminBot] Withdrawal request not found');
    console.log('   - [AdminBot] Error approving withdrawal');

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🔚 ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('🎯 СЛЕДУЮЩИЙ ШАГ: Нажмите "Одобрить" в боте и проверьте логи сервера');
}

// Запуск диагностики
diagnosticApproveButtonIssue().catch(console.error);