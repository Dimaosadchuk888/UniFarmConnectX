/**
 * Скрипт для исправления telegram_id у пользователя 48
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL или SUPABASE_KEY не найдены в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTelegramId() {
  console.log('🔧 Исправляем telegram_id для пользователя 48...');

  try {
    // Проверяем текущее состояние
    const { data: currentUser, error: selectError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code')
      .eq('id', 48)
      .single();

    if (selectError) {
      console.error('❌ Ошибка при получении пользователя:', selectError);
      return;
    }

    console.log('📋 Текущее состояние пользователя:', currentUser);

    // Обновляем telegram_id на уникальное значение
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ telegram_id: 88888888 })
      .eq('id', 48)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Ошибка при обновлении telegram_id:', updateError);
      return;
    }

    console.log('✅ Telegram ID успешно обновлен:', updatedUser);

    // Проверяем, нет ли конфликтов
    const { data: conflictCheck, error: conflictError } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .or('telegram_id.eq.88888888,id.eq.43');

    if (conflictError) {
      console.error('❌ Ошибка при проверке конфликтов:', conflictError);
      return;
    }

    console.log('🔍 Проверка конфликтов:', conflictCheck);

  } catch (error) {
    console.error('❌ Непредвиденная ошибка:', error);
  }
}

fixTelegramId();