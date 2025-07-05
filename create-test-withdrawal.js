/**
 * Создание тестовой заявки на вывод для проверки админ-бота
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

async function createTestWithdrawal() {
  console.log('=== Создание тестовой заявки для админ-бота ===\n');

  try {
    const testRequest = {
      user_id: 48,
      telegram_id: '88888888',
      username: 'demo_user',
      amount_ton: 25.5,
      ton_wallet: 'UQC7VNTwqVDNzRYvEcxw3Ls5_BLuKaUE_jPZ_mXvzP3obxvP',
      status: 'pending'
    };

    const { data: createdRequest, error } = await supabase
      .from('withdraw_requests')
      .insert(testRequest)
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка создания заявки:', error.message);
      return;
    }

    console.log('✅ Тестовая заявка создана успешно!');
    console.log('\nДанные заявки:');
    console.log('ID:', createdRequest.id);
    console.log('Пользователь: @' + createdRequest.username + ' (ID: ' + createdRequest.user_id + ')');
    console.log('Сумма:', createdRequest.amount_ton, 'TON');
    console.log('Кошелек:', createdRequest.ton_wallet);
    console.log('Статус:', createdRequest.status);
    console.log('\nТеперь вы можете:');
    console.log('1. Использовать команду /withdrawals в админ-боте @unifarm_admin_bot');
    console.log('2. Одобрить заявку командой /approve ' + createdRequest.id);
    console.log('3. Или отклонить командой /reject ' + createdRequest.id);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

createTestWithdrawal();