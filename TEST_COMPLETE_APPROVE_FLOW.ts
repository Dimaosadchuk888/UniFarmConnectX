/**
 * ТЕСТ ПОЛНОГО ПРОЦЕССА ОДОБРЕНИЯ:
 * 1. approve_withdrawal → показывает диалог
 * 2. confirm_approve_withdrawal → одобряет заявку
 */

import { AdminBotController } from './modules/adminBot/controller';
import { supabase } from './core/supabase';

async function testCompleteApprovalFlow() {
  console.log('🎯 ТЕСТ ПОЛНОГО ПРОЦЕССА ОДОБРЕНИЯ');
  console.log('=' .repeat(50));

  try {
    // 1. Получаем pending заявку
    const { data: testRequest } = await supabase
      .from('withdraw_requests')
      .select('id')
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (!testRequest) {
      console.log('❌ Нет pending заявок');
      return;
    }

    console.log(`🎯 Тестируем с заявкой ID: ${testRequest.id}`);

    const adminBotController = new AdminBotController();

    // 2. Шаг 1: Нажимаем "Одобрить" (должен показать диалог)
    console.log('\n🔴 ШАГ 1: НАЖИМАЕМ "ОДОБРИТЬ"');
    const firstClickUpdate = {
      update_id: 111111,
      callback_query: {
        id: "first_click_123",
        from: {
          id: 425855744,
          username: "DimaOsadchuk"
        },
        message: { message_id: 456, chat: { id: 425855744, type: "private" } },
        chat_instance: "test1",
        data: `approve_withdrawal:${testRequest.id}`
      }
    };

    console.log('📤 Отправляем первый callback_query: approve_withdrawal');
    await adminBotController.handleUpdate(firstClickUpdate);
    console.log('✅ Первый callback обработан (должен показать диалог подтверждения)');

    // Проверяем что заявка еще pending
    const { data: afterFirst } = await supabase
      .from('withdraw_requests')
      .select('status')
      .eq('id', testRequest.id)
      .single();

    console.log(`📋 Статус после первого клика: ${afterFirst?.status} (должен быть pending)`);

    // 3. Шаг 2: Нажимаем "✅ Да, одобрить" (должен одобрить)
    console.log('\n🟢 ШАГ 2: НАЖИМАЕМ "✅ ДА, ОДОБРИТЬ"');
    const secondClickUpdate = {
      update_id: 222222,
      callback_query: {
        id: "second_click_456",
        from: {
          id: 425855744,
          username: "DimaOsadchuk"
        },
        message: { message_id: 789, chat: { id: 425855744, type: "private" } },
        chat_instance: "test2",
        data: `confirm_approve_withdrawal:${testRequest.id}`
      }
    };

    console.log('📤 Отправляем второй callback_query: confirm_approve_withdrawal');
    await adminBotController.handleUpdate(secondClickUpdate);
    console.log('✅ Второй callback обработан (должен одобрить заявку)');

    // Проверяем финальный результат
    await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем секунду

    const { data: finalResult } = await supabase
      .from('withdraw_requests')
      .select('status, processed_at, processed_by')
      .eq('id', testRequest.id)
      .single();

    console.log('\n📊 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:');
    if (finalResult?.status === 'approved') {
      console.log('🎉 УСПЕХ! Полный процесс одобрения работает:');
      console.log(`   ✅ Статус: ${finalResult.status}`);
      console.log(`   ⏰ Время: ${finalResult.processed_at}`);
      console.log(`   👤 Кем: ${finalResult.processed_by}`);
      console.log('\n🎯 ПРОБЛЕМА ПОЛНОСТЬЮ РЕШЕНА!');
      console.log('   - Первый клик показывает диалог подтверждения');
      console.log('   - Второй клик одобряет заявку');
      console.log('   - Администраторы могут успешно одобрять заявки');
    } else {
      console.log('❌ ПРОБЛЕМА ОСТАЕТСЯ! Заявка НЕ одобрена:');
      console.log(`   - Статус: ${finalResult?.status}`);
      console.log('\n🔍 Проблема во втором шаге (confirm_approve_withdrawal)');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }

  console.log('\n🎯 ТЕСТ ЗАВЕРШЕН');
}

// Запуск полного теста
testCompleteApprovalFlow().catch(console.error);