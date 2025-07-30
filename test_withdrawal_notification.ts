// Тестовый скрипт для диагностики проблемы с уведомлениями админ бота о заявках на вывод

import { createClient } from '@supabase/supabase-js';
import { AdminBotService } from './modules/adminBot/service';
import { config } from 'dotenv';

config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminNotification() {
  console.log('\n=== ТЕСТ УВЕДОМЛЕНИЯ АДМИН БОТА О ЗАЯВКЕ НА ВЫВОД ===\n');

  try {
    // 1. Проверяем админов в базе данных
    console.log('1. Проверка администраторов в базе данных:');
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, telegram_id, username, is_admin')
      .or('username.eq.a888bnd,username.eq.DimaOsadchuk')
      .limit(10);

    if (adminError) {
      console.error('Ошибка получения админов:', adminError);
      return;
    }

    console.log('Найденные пользователи:', admins);

    // 2. Проверяем наличие админов с is_admin = true
    const actualAdmins = admins?.filter(u => u.is_admin);
    console.log('\nАдминистраторы с is_admin=true:', actualAdmins);

    if (!actualAdmins || actualAdmins.length === 0) {
      console.error('\n❌ ПРОБЛЕМА: В базе данных нет пользователей с is_admin=true');
      console.log('\nУСТАНОВКА ФЛАГА is_admin для найденных пользователей...');
      
      // Устанавливаем флаг is_admin для найденных пользователей
      for (const user of (admins || [])) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_admin: true })
          .eq('id', user.id);
          
        if (updateError) {
          console.error(`Ошибка установки is_admin для ${user.username}:`, updateError);
        } else {
          console.log(`✅ is_admin установлен для ${user.username}`);
        }
      }
    }

    // 3. Получаем последнюю заявку на вывод для теста
    console.log('\n3. Получение последней заявки на вывод:');
    const { data: lastWithdrawal, error: withdrawalError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (withdrawalError) {
      console.error('Ошибка получения заявки:', withdrawalError);
      return;
    }

    console.log('Последняя заявка:', lastWithdrawal);

    // 4. Проверяем ADMIN_BOT_TOKEN
    console.log('\n4. Проверка ADMIN_BOT_TOKEN:');
    console.log('Токен установлен:', !!process.env.ADMIN_BOT_TOKEN);
    console.log('Длина токена:', process.env.ADMIN_BOT_TOKEN?.length || 0);

    // 5. Создаем экземпляр AdminBotService и пытаемся отправить уведомление
    console.log('\n5. Тестирование отправки уведомления:');
    const adminBotService = new AdminBotService();
    
    // Проверяем метод sendMessage напрямую
    if (actualAdmins && actualAdmins.length > 0) {
      const testAdmin = actualAdmins[0];
      console.log(`\nПопытка отправить тестовое сообщение админу ${testAdmin.username}:`);
      
      try {
        const testMessage = `🔧 ТЕСТОВОЕ СООБЩЕНИЕ\n\nЭто тест работы админ бота UniFarm.\nЕсли вы видите это сообщение, значит бот работает корректно.`;
        
        // @ts-ignore - временно игнорируем проверку типов для доступа к приватному методу
        const sendResult = await adminBotService.sendMessage(testAdmin.telegram_id, testMessage);
        console.log('Результат отправки тестового сообщения:', sendResult);
      } catch (sendError) {
        console.error('Ошибка отправки тестового сообщения:', sendError);
      }
    }

    // 6. Пытаемся отправить уведомление о заявке
    if (lastWithdrawal) {
      console.log('\n6. Отправка уведомления о заявке на вывод:');
      const notificationResult = await adminBotService.notifyWithdrawal(lastWithdrawal);
      console.log('Результат отправки уведомления:', notificationResult);
    }

  } catch (error) {
    console.error('\nОШИБКА:', error);
  }
}

// Запускаем тест
testAdminNotification().then(() => {
  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===\n');
  process.exit(0);
}).catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});