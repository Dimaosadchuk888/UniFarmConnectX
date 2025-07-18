/**
 * Диагностика проблемы отображения партнеров
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debugReferralIssue() {
  console.log('\n🔍 ДИАГНОСТИКА ПРОБЛЕМЫ ОТОБРАЖЕНИЯ ПАРТНЕРОВ');
  console.log('='.repeat(60));

  try {
    // 1. Найти нового пользователя по ref_code
    const { data: newUser } = await supabase
      .from('users')
      .select('*')
      .eq('ref_code', 'REF_1752843456275_sowqic')
      .single();

    console.log('\n📊 НОВЫЙ ПОЛЬЗОВАТЕЛЬ:');
    if (newUser) {
      console.log(`ID: ${newUser.id}`);
      console.log(`Telegram ID: ${newUser.telegram_id}`);
      console.log(`Username: ${newUser.username}`);
      console.log(`Ref Code: ${newUser.ref_code}`);
      console.log(`Referred By: ${newUser.referred_by}`);
      console.log(`Created: ${newUser.created_at}`);
    } else {
      console.log('❌ Пользователь не найден!');
      return;
    }

    // 2. Найти реферера (должен быть User 184)
    const { data: referrer } = await supabase
      .from('users')
      .select('*')
      .eq('id', 184)
      .single();

    console.log('\n📊 РЕФЕРЕР (User 184):');
    if (referrer) {
      console.log(`ID: ${referrer.id}`);
      console.log(`Telegram ID: ${referrer.telegram_id}`);
      console.log(`Username: ${referrer.username}`);
      console.log(`Ref Code: ${referrer.ref_code}`);
    }

    // 3. Проверить таблицу referrals
    const { data: referralRecord } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', newUser.id);

    console.log('\n📊 ЗАПИСЬ В ТАБЛИЦЕ REFERRALS:');
    if (referralRecord && referralRecord.length > 0) {
      referralRecord.forEach(ref => {
        console.log(`User ID: ${ref.user_id}`);
        console.log(`Referrer ID: ${ref.referrer_id}`);
        console.log(`Referred User ID: ${ref.referred_user_id}`);
        console.log(`Level: ${ref.level}`);
        console.log(`Created: ${ref.created_at}`);
      });
    } else {
      console.log('❌ Записи в таблице referrals НЕ НАЙДЕНЫ!');
    }

    // 4. Проверить что должно возвращать API для команды
    const { data: teamMembers } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_user:users!referrals_user_id_fkey(
          id,
          username,
          telegram_id,
          ref_code,
          created_at
        )
      `)
      .eq('referrer_id', 184);

    console.log('\n📊 КОМАНДА РЕФЕРЕРА (что должно отображаться):');
    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach(member => {
        console.log(`Level ${member.level}: ${member.referred_user?.username || 'Unknown'} (ID: ${member.referred_user?.id})`);
      });
    } else {
      console.log('❌ Команда пуста!');
    }

    // 5. Найти все связанные данные
    console.log('\n📊 АНАЛИЗ ДАННЫХ:');
    console.log(`Новый пользователь создан: ${newUser ? 'ДА' : 'НЕТ'}`);
    console.log(`Поле referred_by заполнено: ${newUser?.referred_by ? 'ДА' : 'НЕТ'}`);
    console.log(`Запись в referrals создана: ${referralRecord && referralRecord.length > 0 ? 'ДА' : 'НЕТ'}`);
    console.log(`Команда содержит нового члена: ${teamMembers && teamMembers.length > 0 ? 'ДА' : 'НЕТ'}`);

    return {
      newUser,
      referrer,
      referralRecord,
      teamMembers
    };

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
    return null;
  }
}

debugReferralIssue().then((result) => {
  if (result) {
    console.log('\n✅ Диагностика завершена');
    console.log('🎯 Следующий шаг: анализ API endpoints для команды');
  }
}).catch(error => {
  console.error('❌ Ошибка:', error);
});