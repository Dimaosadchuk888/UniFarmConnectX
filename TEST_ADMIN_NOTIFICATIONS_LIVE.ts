/**
 * ЖИВОЙ ТЕСТ УВЕДОМЛЕНИЙ АДМИН БОТА
 * Используем реальную заявку на вывод для тестирования
 */

import { supabase } from './core/supabase';
import { AdminBotService } from './modules/adminBot/service';

async function testAdminNotificationsLive() {
  console.log('🧪 ЖИВОЙ ТЕСТ УВЕДОМЛЕНИЙ АДМИН БОТА');
  console.log('=' .repeat(50));

  try {
    // 1. Получаем последнюю заявку на вывод
    console.log('\n1️⃣ ПОЛУЧЕНИЕ ПОСЛЕДНЕЙ ЗАЯВКИ:');
    const { data: latestRequest, error: requestError } = await supabase
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

    if (!latestRequest) {
      console.log('❌ Нет активных заявок для тестирования');
      return;
    }

    console.log(`✅ Найдена заявка ID: ${latestRequest.id}`);
    console.log(`   - Пользователь: ${latestRequest.username || latestRequest.telegram_id}`);
    console.log(`   - Сумма: ${latestRequest.amount_ton} TON`);
    console.log(`   - Кошелек: ${latestRequest.ton_wallet}`);
    console.log(`   - Дата: ${new Date(latestRequest.created_at).toLocaleString()}`);

    // 2. Проверяем админов в системе
    console.log('\n2️⃣ ПРОВЕРКА АДМИНОВ:');
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('telegram_id, username, is_admin')
      .eq('is_admin', true);

    if (adminsError) {
      console.log('❌ Ошибка получения админов:', adminsError.message);
      return;
    }

    console.log(`✅ Найдено админов: ${admins?.length || 0}`);
    admins?.forEach(admin => {
      console.log(`   - @${admin.username}: telegram_id = ${admin.telegram_id}`);
    });

    // 3. Создаем AdminBotService и отправляем уведомление
    console.log('\n3️⃣ ОТПРАВКА УВЕДОМЛЕНИЯ:');
    const adminBotService = new AdminBotService();
    
    console.log('📤 Отправляем уведомление о заявке...');
    await adminBotService.notifyWithdrawal(latestRequest);
    
    console.log('✅ Уведомление отправлено!');
    console.log('📱 Проверьте Telegram боты админов для получения сообщения');

    // 4. Показываем что должно прийти
    console.log('\n4️⃣ ОЖИДАЕМОЕ СООБЩЕНИЕ:');
    console.log('📄 Админы должны получить сообщение:');
    console.log(`🚨 <b>Новая заявка на вывод!</b>
    
👤 <b>Пользователь:</b> ${latestRequest.username || 'ID: ' + latestRequest.telegram_id}
💰 <b>Сумма:</b> ${latestRequest.amount_ton} TON
🏦 <b>Кошелек:</b> <code>${latestRequest.ton_wallet}</code>
🕒 <b>Дата:</b> ${new Date(latestRequest.created_at).toLocaleString()}
🆔 <b>ID заявки:</b> <code>${latestRequest.id}</code>

С кнопками: [Одобрить] [Отклонить] [Все заявки]`);

  } catch (error) {
    console.error('❌ Ошибка живого теста:', error);
  }

  console.log('\n🎯 ЖИВОЙ ТЕСТ ЗАВЕРШЕН!');
  console.log('Проверьте Telegram боты @a888bnd и @DimaOsadchuk');
}

// Запуск живого теста
testAdminNotificationsLive().catch(console.error);