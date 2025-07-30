/**
 * ДЕТАЛЬНАЯ ДИАГНОСТИКА ОБРАБОТКИ CALLBACK_QUERY
 * Проверим что происходит в AdminBotController.handleUpdate()
 */

import { AdminBotController } from './modules/adminBot/controller';
import { supabase } from './core/supabase';

async function debugCallbackQueryProcessing() {
  console.log('🐛 ДЕТАЛЬНАЯ ДИАГНОСТИКА CALLBACK_QUERY');
  console.log('=' .repeat(50));

  try {
    // 1. Получаем реальную заявку
    const { data: testRequest } = await supabase
      .from('withdraw_requests')
      .select('id, username, amount_ton')
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (!testRequest) {
      console.log('❌ Нет pending заявок');
      return;
    }

    console.log(`🎯 Тестируем с заявкой ID: ${testRequest.id}`);

    // 2. Создаем экземпляр AdminBotController
    console.log('\n🔧 СОЗДАНИЕ ADMINBOTCONTROLLER:');
    const adminBotController = new AdminBotController();
    console.log('✅ AdminBotController создан');

    // 3. Симулируем точный callback_query от Telegram
    const callbackQueryUpdate = {
      update_id: 123456789,
      callback_query: {
        id: "callback_query_test_123",
        from: {
          id: 425855744, // Дима Осадчук
          is_bot: false,
          first_name: "Dima",
          username: "DimaOsadchuk",
          language_code: "ru"
        },
        message: {
          message_id: 456,
          from: {
            id: 7234567890, // Admin bot ID
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
          text: "🚨 НОВАЯ ЗАЯВКА НА ВЫВОД..."
        },
        chat_instance: "test_chat_instance",
        data: `approve_withdrawal:${testRequest.id}`
      }
    };

    console.log(`📤 Данные callback_query:`);
    console.log(`   - from.username: ${callbackQueryUpdate.callback_query.from.username}`);
    console.log(`   - data: ${callbackQueryUpdate.callback_query.data}`);

    // 4. Прямой вызов handleUpdate для детальной диагностики
    console.log('\n🚀 ПРЯМОЙ ВЫЗОВ ADMINBOTCONTROLLER.HANDLEUPDATE:');
    
    try {
      await adminBotController.handleUpdate(callbackQueryUpdate);
      console.log('✅ handleUpdate выполнен без ошибок');
    } catch (error) {
      console.log('❌ ОШИБКА в handleUpdate:', error);
      if (error instanceof Error) {
        console.log('   - Message:', error.message);
        console.log('   - Stack:', error.stack);
      }
    }

    // 5. Проверяем результат обработки
    console.log('\n📋 ПРОВЕРКА РЕЗУЛЬТАТА:');
    const { data: updatedRequest } = await supabase
      .from('withdraw_requests')
      .select('status, processed_at, processed_by')
      .eq('id', testRequest.id)
      .single();

    if (updatedRequest?.status === 'approved') {
      console.log('✅ УСПЕХ! Заявка одобрена:');
      console.log(`   - Статус: ${updatedRequest.status}`);
      console.log(`   - Время: ${updatedRequest.processed_at}`);
      console.log(`   - Кем: ${updatedRequest.processed_by}`);
    } else {
      console.log('❌ ПРОБЛЕМА! Заявка НЕ одобрена:');
      console.log(`   - Текущий статус: ${updatedRequest?.status}`);
      
      // Анализируем возможные причины
      console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
      console.log('   1. Проблема с авторизацией админа');
      console.log('   2. Ошибка парсинга callback_data');
      console.log('   3. Проблема с approveWithdrawal()');
      console.log('   4. Внутренняя ошибка в обработчике');
    }

    // 6. Тестируем авторизацию отдельно
    console.log('\n🔐 ТЕСТ АВТОРИЗАЦИИ АДМИНА:');
    const { AdminBotService } = await import('./modules/adminBot/service');
    const adminBotService = new AdminBotService();
    
    const isAuthorized = await adminBotService.isAuthorizedAdmin('DimaOsadchuk');
    console.log(`   - Авторизация DimaOsadchuk: ${isAuthorized ? 'РАЗРЕШЕНА' : 'ЗАПРЕЩЕНА'}`);

    // 7. Тестируем функцию approveWithdrawal отдельно
    console.log('\n⚙️ ПРЯМОЙ ТЕСТ APPROVEWITHDRAWAL:');
    try {
      const approveResult = await adminBotService.approveWithdrawal(testRequest.id, 'DimaOsadchuk');
      console.log(`   - Результат approveWithdrawal: ${approveResult ? 'УСПЕХ' : 'ОШИБКА'}`);
      
      if (approveResult) {
        // Проверяем еще раз статус после прямого вызова
        const { data: finalCheck } = await supabase
          .from('withdraw_requests')
          .select('status')
          .eq('id', testRequest.id)
          .single();
        console.log(`   - Финальный статус: ${finalCheck?.status}`);
      }
    } catch (approveError) {
      console.log('❌ Ошибка в approveWithdrawal:', approveError);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }

  console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
}

// Запуск диагностики
debugCallbackQueryProcessing().catch(console.error);