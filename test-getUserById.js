/**
 * Тест метода getUserById для проверки правильности возврата данных
 */

import { supabase } from './core/supabase.ts';

async function testGetUserById() {
  try {
    console.log('=== ТЕСТ getUserById для ID=48 ===\n');

    // Прямой запрос через Supabase API
    const { data: directData, error: directError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();

    if (directError) {
      console.error('❌ Ошибка прямого запроса:', directError);
      return;
    }

    console.log('✅ Прямой запрос getUserById(48):');
    console.log(`   ID: ${directData.id}`);
    console.log(`   Telegram ID: ${directData.telegram_id}`);
    console.log(`   Username: ${directData.username}`);
    console.log(`   Balance UNI: ${directData.balance_uni} (тип: ${typeof directData.balance_uni})`);
    console.log(`   Balance TON: ${directData.balance_ton} (тип: ${typeof directData.balance_ton})`);
    console.log(`   Created at: ${directData.created_at}`);
    console.log(`   Ref Code: ${directData.ref_code}`);

    // Проверим также через getUserByTelegramId для сравнения
    const { data: telegramData, error: telegramError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 88888888)
      .single();

    if (telegramError) {
      console.error('❌ Ошибка поиска по telegram_id:', telegramError);
      return;
    }

    console.log('\n✅ Поиск по telegram_id=88888888:');
    console.log(`   ID: ${telegramData.id}`);
    console.log(`   Balance UNI: ${telegramData.balance_uni}`);
    console.log(`   Balance TON: ${telegramData.balance_ton}`);

    // Сравним результаты
    if (directData.id === telegramData.id) {
      console.log('\n✅ РЕЗУЛЬТАТЫ СОВПАДАЮТ - это один и тот же пользователь');
    } else {
      console.log('\n❌ КОНФЛИКТ - получены разные пользователи!');
      console.log(`   getUserById(48): ID=${directData.id}`);
      console.log(`   getUserByTelegramId(88888888): ID=${telegramData.id}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testGetUserById();