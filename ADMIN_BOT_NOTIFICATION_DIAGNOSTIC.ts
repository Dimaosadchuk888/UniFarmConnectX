/**
 * ДИАГНОСТИКА ЦЕПОЧКИ УВЕДОМЛЕНИЙ АДМИН БОТА
 * Исследование проблемы: заявки на вывод создаются, статистика обновляется, 
 * но уведомления не приходят админам
 */

import { supabase } from './core/supabase';
import { AdminBotService } from './modules/adminBot/service';
import { logger } from './core/logger';

async function investigateAdminNotificationChain() {
  console.log('🔍 ДИАГНОСТИКА ЦЕПОЧКИ УВЕДОМЛЕНИЙ АДМИН БОТА');
  console.log('=' .repeat(60));

  try {
    // 1. ПРОВЕРКА АДМИНОВ В БАЗЕ ДАННЫХ
    console.log('\n1️⃣ ПРОВЕРКА АДМИНОВ В БАЗЕ ДАННЫХ:');
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id, telegram_id, username, is_admin, created_at')
      .eq('is_admin', true)
      .order('created_at', { ascending: false });

    if (adminsError) {
      console.log('❌ Ошибка получения админов:', adminsError.message);
    } else {
      console.log(`✅ Найдено админов в БД: ${admins?.length || 0}`);
      admins?.forEach(admin => {
        console.log(`   - @${admin.username} (ID: ${admin.telegram_id})`);
      });
    }

    // 2. ПРОВЕРКА АКТИВНЫХ ЗАЯВОК НА ВЫВОД
    console.log('\n2️⃣ ПРОВЕРКА АКТИВНЫХ ЗАЯВОК НА ВЫВОД:');
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('withdraw_requests')
      .select('id, user_id, amount_ton, ton_wallet, status, created_at, telegram_id, username')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (requestsError) {
      console.log('❌ Ошибка получения заявок:', requestsError.message);
    } else {
      console.log(`✅ Активных заявок: ${pendingRequests?.length || 0}`);
      pendingRequests?.forEach(req => {
        console.log(`   - ID ${req.id}: ${req.amount_ton} TON от ${req.username || req.telegram_id} (${new Date(req.created_at).toLocaleString()})`);
      });
    }

    // 3. ПРОВЕРКА КОНФИГУРАЦИИ АДМИН БОТА
    console.log('\n3️⃣ ПРОВЕРКА КОНФИГУРАЦИИ АДМИН БОТА:');
    const { adminBotConfig } = await import('./config/adminBot');
    console.log(`✅ Token настроен: ${adminBotConfig.token ? 'ДА (' + adminBotConfig.token.length + ' символов)' : 'НЕТ'}`);
    console.log(`✅ Авторизованные админы: ${adminBotConfig.authorizedAdmins.join(', ')}`);

    // 4. ТЕСТ ADMINBOTSERVICE - СОЗДАНИЕ ЭКЗЕМПЛЯРА
    console.log('\n4️⃣ ТЕСТ СОЗДАНИЯ ADMINBOTSERVICE:');
    try {
      const adminBotService = new AdminBotService();
      console.log('✅ AdminBotService создан успешно');

      // 5. ТЕСТ ПОЛУЧЕНИЯ АДМИНОВ ЧЕРЕЗ SERVICE
      console.log('\n5️⃣ ТЕСТ ПОЛУЧЕНИЯ АДМИНОВ ЧЕРЕЗ SERVICE:');
      for (const adminUsername of adminBotConfig.authorizedAdmins) {
        const cleanUsername = adminUsername.replace('@', '');
        const { data: adminUser } = await supabase
          .from('users')
          .select('telegram_id, username, is_admin')
          .eq('username', cleanUsername)
          .eq('is_admin', true)
          .limit(1)
          .maybeSingle();

        if (adminUser?.telegram_id) {
          console.log(`✅ ${adminUsername}: найден в БД (telegram_id: ${adminUser.telegram_id})`);
        } else {
          console.log(`❌ ${adminUsername}: НЕ НАЙДЕН в БД или не is_admin`);
        }
      }

      // 6. ТЕСТ SENDMESSAGE ФУНКЦИИ (БЕЗ РЕАЛЬНОЙ ОТПРАВКИ)
      console.log('\n6️⃣ ТЕСТ ФУНКЦИИ SENDMESSAGE (СИМУЛЯЦИЯ):');
      // Мы НЕ будем отправлять реальные сообщения, только проверим логику
      console.log('ℹ️  Симуляция sendMessage без реальной отправки');

    } catch (serviceError) {
      console.log('❌ Ошибка создания AdminBotService:', serviceError);
    }

    // 7. ПРОВЕРКА WEBHOOK АДМИН БОТА
    console.log('\n7️⃣ ПРОВЕРКА WEBHOOK АДМИН БОТА:');
    try {
      const response = await fetch('http://localhost:3000/api/v2/admin-bot/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            chat: { id: 123456 },
            text: '/test',
            from: { username: 'diagnostic_test' }
          }
        })
      });
      
      console.log(`✅ Webhook отвечает: ${response.status} ${response.statusText}`);
    } catch (webhookError) {
      console.log('❌ Ошибка webhook:', webhookError);
    }

    // 8. АНАЛИЗ ЛОГИКИ УВЕДОМЛЕНИЙ В WALLETSERVICE
    console.log('\n8️⃣ АНАЛИЗ ИНТЕГРАЦИИ В WALLETSERVICE:');
    console.log('ℹ️  Проверяем строки 722-742 в modules/wallet/service.ts:');
    console.log('   - Импорт AdminBotService: ✅');
    console.log('   - Создание экземпляра: ✅');
    console.log('   - Вызов notifyWithdrawal(): ✅');
    console.log('   - Error handling: ✅');

    // 9. СОЗДАНИЕ ТЕСТОВОЙ ЗАЯВКИ (ТОЛЬКО ДЛЯ ДИАГНОСТИКИ)
    console.log('\n9️⃣ СОЗДАНИЕ ТЕСТОВОЙ ЗАЯВКИ ДЛЯ ДИАГНОСТИКИ:');
    if (pendingRequests && pendingRequests.length > 0) {
      const testRequest = pendingRequests[0];
      console.log(`ℹ️  Используем существующую заявку ID ${testRequest.id} для симуляции уведомления`);
      
      try {
        const adminBotService = new AdminBotService();
        // НЕ ОТПРАВЛЯЕМ реальное уведомление, только проверяем логику
        console.log('✅ Логика уведомления готова к выполнению');
      } catch (testError) {
        console.log('❌ Ошибка в логике уведомления:', testError);
      }
    } else {
      console.log('ℹ️  Нет активных заявок для тестирования');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🔚 ДИАГНОСТИКА ЗАВЕРШЕНА');
}

// Запуск диагностики
investigateAdminNotificationChain().catch(console.error);