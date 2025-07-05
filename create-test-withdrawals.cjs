const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createTestWithdrawals() {
  console.log('📝 Создаю тестовые заявки на вывод...\n');
  
  // Заявка 1
  const { data: request1, error: error1 } = await supabase
    .from('withdraw_requests')
    .insert({
      user_id: 1,
      telegram_id: '123456789',
      username: 'test_user_1',
      amount_ton: 50.5,
      ton_wallet: 'UQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XA5bz',
      status: 'pending'
    })
    .select()
    .single();
    
  if (error1) {
    console.error('❌ Ошибка создания заявки 1:', error1.message);
  } else {
    console.log('✅ Заявка 1 создана:');
    console.log(`ID: ${request1.id}`);
    console.log(`Пользователь: @${request1.username}`);
    console.log(`Сумма: ${request1.amount_ton} TON`);
    console.log(`Кошелек: ${request1.ton_wallet}\n`);
  }
  
  // Заявка 2
  const { data: request2, error: error2 } = await supabase
    .from('withdraw_requests')
    .insert({
      user_id: 2,
      telegram_id: '987654321',
      username: 'test_user_2',
      amount_ton: 125.75,
      ton_wallet: 'UQDQoc5M3Bh8eWFephi9bClhevbDGJmPVHwrUFaPz5it7SAb',
      status: 'pending'
    })
    .select()
    .single();
    
  if (error2) {
    console.error('❌ Ошибка создания заявки 2:', error2.message);
  } else {
    console.log('✅ Заявка 2 создана:');
    console.log(`ID: ${request2.id}`);
    console.log(`Пользователь: @${request2.username}`);
    console.log(`Сумма: ${request2.amount_ton} TON`);
    console.log(`Кошелек: ${request2.ton_wallet}\n`);
  }
  
  console.log('📊 Тестовые заявки готовы для проверки в админ-боте @unifarm_admin_bot');
  console.log('\n🔍 Проверьте следующее:');
  console.log('1. Команда /admin - должно появиться главное меню с кнопками');
  console.log('2. Кнопка "💸 Заявки на вывод" - покажет созданные заявки');
  console.log('3. Кнопка "📋 Копировать адрес" - отправит адрес для копирования');
  console.log('4. Кнопки "✅ Одобрить" и "❌ Отклонить" для обработки заявок');
  console.log('5. Кнопка "🏠 Главное меню" для возврата');
}

createTestWithdrawals();
