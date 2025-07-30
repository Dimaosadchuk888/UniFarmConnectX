/**
 * ИСПРАВЛЕНИЕ TELEGRAM_ID АДМИНОВ
 * Дима Осадчук: 425855744
 * Алина (@a888bnd): 415087491
 */

import { supabase } from './core/supabase';

async function fixAdminTelegramIds() {
  console.log('🔧 ИСПРАВЛЕНИЕ TELEGRAM_ID АДМИНОВ');
  console.log('=' .repeat(50));

  try {
    // Показываем текущее состояние
    console.log('\n📋 ТЕКУЩИЕ АДМИНЫ:');
    const { data: currentAdmins, error: currentError } = await supabase
      .from('users')
      .select('id, telegram_id, username, is_admin')
      .eq('is_admin', true)
      .order('telegram_id');

    if (currentError) {
      console.log('❌ Ошибка получения админов:', currentError.message);
      return;
    }

    currentAdmins?.forEach(admin => {
      console.log(`   - @${admin.username}: telegram_id = ${admin.telegram_id} (database_id = ${admin.id})`);
    });

    // 1. ИСПРАВЛЯЕМ @a888bnd (Алина): telegram_id = 415087491
    console.log('\n🔧 ИСПРАВЛЕНИЕ @a888bnd (Алина):');
    const { data: alinaUpdated, error: alinaError } = await supabase
      .from('users')
      .update({ 
        telegram_id: 415087491
      })
      .eq('username', 'a888bnd')
      .eq('is_admin', true)
      .neq('telegram_id', 415087491)  // Обновляем только если текущий не равен правильному
      .select();

    if (alinaError) {
      console.log('❌ Ошибка обновления @a888bnd:', alinaError.message);
    } else {
      console.log(`✅ @a888bnd обновлен: ${alinaUpdated?.length || 0} записей`);
      alinaUpdated?.forEach(user => {
        console.log(`   - ID ${user.id}: telegram_id = ${user.telegram_id}`);
      });
    }

    // 2. ИСПРАВЛЯЕМ @DimaOsadchuk (Дима): telegram_id = 425855744
    console.log('\n🔧 ИСПРАВЛЕНИЕ @DimaOsadchuk (Дима):');
    const { data: dimaUpdated, error: dimaError } = await supabase
      .from('users')
      .update({ 
        telegram_id: 425855744
      })
      .eq('username', 'DimaOsadchuk')
      .eq('is_admin', true)
      .neq('telegram_id', 425855744)  // Обновляем только если текущий не равен правильному
      .select();

    if (dimaError) {
      console.log('❌ Ошибка обновления @DimaOsadchuk:', dimaError.message);
    } else {
      console.log(`✅ @DimaOsadchuk обновлен: ${dimaUpdated?.length || 0} записей`);
      dimaUpdated?.forEach(user => {
        console.log(`   - ID ${user.id}: telegram_id = ${user.telegram_id}`);
      });
    }

    // 3. ПРОВЕРЯЕМ ФИНАЛЬНОЕ СОСТОЯНИЕ
    console.log('\n✅ ФИНАЛЬНОЕ СОСТОЯНИЕ АДМИНОВ:');
    const { data: finalAdmins, error: finalError } = await supabase
      .from('users')
      .select('id, telegram_id, username, is_admin')
      .eq('is_admin', true)
      .order('telegram_id');

    if (finalError) {
      console.log('❌ Ошибка проверки финального состояния:', finalError.message);
    } else {
      finalAdmins?.forEach(admin => {
        const status = (admin.telegram_id === 415087491 || admin.telegram_id === 425855744) ? '✅' : '⚠️ ';
        console.log(`   ${status} @${admin.username}: telegram_id = ${admin.telegram_id}`);
      });
    }

    // 4. УДАЛЯЕМ ДУБЛИКАТЫ (если есть записи с неправильными telegram_id)
    console.log('\n🧹 ОЧИСТКА ДУБЛИКАТОВ:');
    
    // Удаляем записи @a888bnd с неправильным telegram_id (не 415087491)
    const { data: alinaDeleted, error: alinaDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('username', 'a888bnd')
      .eq('is_admin', true)
      .neq('telegram_id', 415087491)
      .select();

    if (alinaDeleteError) {
      console.log('❌ Ошибка удаления дубликатов @a888bnd:', alinaDeleteError.message);
    } else {
      console.log(`✅ Удалено дубликатов @a888bnd: ${alinaDeleted?.length || 0}`);
    }

    // Удаляем записи @DimaOsadchuk с неправильным telegram_id (не 425855744)
    const { data: dimaDeleted, error: dimaDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('username', 'DimaOsadchuk')
      .eq('is_admin', true)
      .neq('telegram_id', 425855744)
      .select();

    if (dimaDeleteError) {
      console.log('❌ Ошибка удаления дубликатов @DimaOsadchuk:', dimaDeleteError.message);
    } else {
      console.log(`✅ Удалено дубликатов @DimaOsadchuk: ${dimaDeleted?.length || 0}`);
    }

    console.log('\n🎯 ИСПРАВЛЕНИЕ TELEGRAM_ID ЗАВЕРШЕНО!');
    console.log('Теперь админ бот будет отправлять уведомления на правильные telegram_id');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запуск исправления
fixAdminTelegramIds().catch(console.error);