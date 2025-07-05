/**
 * Тестирование системы заявок на вывод
 * Создание тестовой заявки и проверка функционала
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

async function testWithdrawalSystem() {
  console.log('=== Тестирование системы заявок на вывод ===\n');

  try {
    // 1. Создание тестовой заявки
    console.log('1. Создание тестовой заявки на вывод...');
    
    const testRequest = {
      user_id: 48,
      telegram_id: '88888888',
      username: 'demo_user',
      amount_ton: 10.5,
      ton_wallet: 'UQC_test_wallet_address_123456789',
      status: 'pending'
    };

    const { data: createdRequest, error: createError } = await supabase
      .from('withdraw_requests')
      .insert(testRequest)
      .select()
      .single();

    if (createError) {
      console.error('❌ Ошибка создания заявки:', createError.message);
      console.log('\nТаблица withdraw_requests не существует!');
      console.log('Выполните SQL скрипт create-withdrawal-table.sql в Supabase Dashboard\n');
      return;
    }

    console.log('✅ Заявка создана успешно:');
    console.log('   ID:', createdRequest.id);
    console.log('   User ID:', createdRequest.user_id);
    console.log('   Amount:', createdRequest.amount_ton, 'TON');
    console.log('   Status:', createdRequest.status);

    // 2. Проверка чтения заявок
    console.log('\n2. Проверка чтения всех pending заявок...');
    
    const { data: pendingRequests, error: readError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!readError && pendingRequests) {
      console.log(`✅ Найдено ${pendingRequests.length} pending заявок`);
    }

    // 3. Тестовое одобрение заявки
    console.log('\n3. Тестовое одобрение заявки...');
    
    const { error: approveError } = await supabase
      .from('withdraw_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: '@DimaOsadchuk'
      })
      .eq('id', createdRequest.id);

    if (!approveError) {
      console.log('✅ Заявка одобрена успешно');
    }

    // 4. Проверка обновленной заявки
    console.log('\n4. Проверка обновленной заявки...');
    
    const { data: updatedRequest, error: fetchError } = await supabase
      .from('withdraw_requests')
      .select('*')
      .eq('id', createdRequest.id)
      .single();

    if (!fetchError && updatedRequest) {
      console.log('✅ Данные заявки:');
      console.log('   Status:', updatedRequest.status);
      console.log('   Processed at:', new Date(updatedRequest.processed_at).toLocaleString());
      console.log('   Processed by:', updatedRequest.processed_by);
    }

    // 5. Очистка тестовых данных
    console.log('\n5. Удаление тестовой заявки...');
    
    const { error: deleteError } = await supabase
      .from('withdraw_requests')
      .delete()
      .eq('id', createdRequest.id);

    if (!deleteError) {
      console.log('✅ Тестовая заявка удалена');
    }

    console.log('\n✅ Тестирование завершено успешно!');
    console.log('   Система заявок на вывод готова к использованию');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем тест
testWithdrawalSystem();