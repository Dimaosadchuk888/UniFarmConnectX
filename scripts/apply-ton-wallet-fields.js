import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function applyTonWalletFields() {
  console.log('[ApplyTonWalletFields] Проверяем и добавляем поля TON-кошелька...\n');

  try {
    // Проверяем текущую структуру пользователя
    const { data: sampleUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (fetchError) {
      console.error('[ERROR] Ошибка получения пользователя:', fetchError);
      return;
    }

    console.log('📊 Текущие поля пользователя:');
    const fields = Object.keys(sampleUser);
    console.log('  Всего полей:', fields.length);
    console.log('  Список полей:', fields.join(', '));

    // Проверяем наличие полей TON-кошелька
    const tonFields = ['ton_wallet_address', 'ton_wallet_verified', 'ton_wallet_linked_at'];
    const missingFields = tonFields.filter(field => !fields.includes(field));

    if (missingFields.length === 0) {
      console.log('\n✅ Все поля TON-кошелька уже существуют!');
      return;
    }

    console.log('\n⚠️  Отсутствующие поля:', missingFields.join(', '));
    console.log('\n📝 Для добавления полей выполните SQL-запрос из файла:');
    console.log('   scripts/add-ton-wallet-fields.sql');
    console.log('\n   В Supabase Dashboard:');
    console.log('   1. Откройте SQL Editor');
    console.log('   2. Вставьте содержимое SQL-файла');
    console.log('   3. Нажмите "Run"');

    // Проверяем пользователей с TON Boost
    console.log('\n🔍 Проверяем пользователей с активным TON Boost...');
    const { data: tonBoostUsers, error: boostError } = await supabase
      .from('users')
      .select('id, username, ton_boost_package')
      .not('ton_boost_package', 'is', null)
      .limit(10);

    if (!boostError && tonBoostUsers?.length > 0) {
      console.log(`\n📊 Найдено ${tonBoostUsers.length} пользователей с TON Boost:`);
      tonBoostUsers.forEach(user => {
        console.log(`  - User ${user.id} (${user.username}): Package ${user.ton_boost_package}`);
      });
    }

  } catch (error) {
    console.error('[ERROR] Общая ошибка:', error);
  }
}

// Запускаем проверку
applyTonWalletFields();