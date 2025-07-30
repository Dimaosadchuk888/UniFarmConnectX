/**
 * ИСПРАВЛЕНИЕ ДУБЛИКАТОВ АДМИНОВ
 * Отключаем is_admin для неправильных telegram_id вместо удаления
 */

import { supabase } from './core/supabase';

async function fixAdminDuplicates() {
  console.log('🔧 ИСПРАВЛЕНИЕ ДУБЛИКАТОВ АДМИНОВ');
  console.log('=' .repeat(50));

  try {
    // Отключаем is_admin для @a888bnd с неправильным telegram_id (не 415087491)
    console.log('\n🔧 ОТКЛЮЧЕНИЕ НЕПРАВИЛЬНЫХ @a888bnd:');
    const { data: alinaDisabled, error: alinaError } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('username', 'a888bnd')
      .neq('telegram_id', 415087491)  // Все кроме правильного ID
      .select('id, telegram_id, username, is_admin');

    if (alinaError) {
      console.log('❌ Ошибка отключения @a888bnd:', alinaError.message);
    } else {
      console.log(`✅ Отключено @a888bnd записей: ${alinaDisabled?.length || 0}`);
      alinaDisabled?.forEach(user => {
        console.log(`   - ID ${user.id}: telegram_id = ${user.telegram_id} → is_admin = false`);
      });
    }

    // Отключаем is_admin для @DimaOsadchuk с неправильным telegram_id (не 425855744)
    console.log('\n🔧 ОТКЛЮЧЕНИЕ НЕПРАВИЛЬНЫХ @DimaOsadchuk:');
    const { data: dimaDisabled, error: dimaError } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('username', 'DimaOsadchuk')
      .neq('telegram_id', 425855744)  // Все кроме правильного ID
      .select('id, telegram_id, username, is_admin');

    if (dimaError) {
      console.log('❌ Ошибка отключения @DimaOsadchuk:', dimaError.message);
    } else {
      console.log(`✅ Отключено @DimaOsadchuk записей: ${dimaDisabled?.length || 0}`);
      dimaDisabled?.forEach(user => {
        console.log(`   - ID ${user.id}: telegram_id = ${user.telegram_id} → is_admin = false`);
      });
    }

    // Проверяем финальное состояние админов
    console.log('\n✅ ФИНАЛЬНЫЕ АДМИНЫ (is_admin = true):');
    const { data: finalAdmins, error: finalError } = await supabase
      .from('users')
      .select('id, telegram_id, username, is_admin')
      .eq('is_admin', true)
      .order('telegram_id');

    if (finalError) {
      console.log('❌ Ошибка проверки админов:', finalError.message);
    } else {
      console.log(`✅ Активных админов: ${finalAdmins?.length || 0}`);
      finalAdmins?.forEach(admin => {
        console.log(`   - @${admin.username}: telegram_id = ${admin.telegram_id} (database_id = ${admin.id})`);
      });
    }

    console.log('\n🎯 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('Теперь в системе только правильные админы с корректными telegram_id');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запуск исправления
fixAdminDuplicates().catch(console.error);