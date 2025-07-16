import { supabase } from '../core/supabase.js';

async function checkUser74ReferralsSimple() {
  console.log('=== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ 74 И ЕГО РЕФЕРАЛАХ ===\n');
  
  try {
    // Получаем информацию о пользователе
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
      
    if (userError) throw userError;
    
    console.log('👤 Текущий аккаунт на Replit Preview:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Telegram ID: ${user.telegram_id}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Реферальный код: ${user.ref_code}`);
    console.log(`- Баланс UNI: ${user.balance_uni?.toLocaleString('ru-RU') || 0}`);
    console.log(`- Баланс TON: ${user.balance_ton || 0}`);
    console.log(`- Депозит UNI: ${user.uni_deposit_amount?.toLocaleString('ru-RU') || 0}`);
    console.log(`- TON Boost пакет: ${user.ton_boost_package || 'Нет'}`);
    
    // Проверяем наличие рефералов в таблице referrals
    console.log('\n📊 Проверка рефералов:');
    
    // Попробуем получить рефералов через поле inviter_id
    const { data: referralData, error: refError1 } = await supabase
      .from('referrals')
      .select('*')
      .eq('inviter_id', 74)
      .limit(5);
      
    if (!refError1 && referralData) {
      console.log(`\nНайдено записей в таблице referrals: ${referralData.length}`);
      if (referralData.length > 0) {
        console.log('Первые записи:', referralData);
      }
    } else {
      console.log('Ошибка при поиске по inviter_id:', refError1);
    }
    
    // Попробуем найти пользователей, у которых в ref_by указан ID 74
    const { data: invitedUsers, error: invitedError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, created_at')
      .eq('referred_by', 74)
      .limit(5);
      
    if (!invitedError && invitedUsers) {
      console.log(`\nПользователи с referred_by = 74: ${invitedUsers.length}`);
      if (invitedUsers.length > 0) {
        invitedUsers.forEach((u, i) => {
          console.log(`${i+1}. ${u.username} (ID: ${u.id}), Баланс: ${u.balance_uni} UNI`);
        });
      }
    } else {
      // Попробуем другие варианты полей
      const { data: invitedUsers2, error: invitedError2 } = await supabase
        .from('users')
        .select('id, username, balance_uni, balance_ton, created_at')
        .eq('inviter_id', 74)
        .limit(5);
        
      if (!invitedError2 && invitedUsers2) {
        console.log(`\nПользователи с inviter_id = 74: ${invitedUsers2.length}`);
      } else {
        console.log('\nНе удалось найти рефералов ни по одному из полей');
      }
    }
    
    // Проверим все возможные поля в таблице users
    console.log('\n🔍 Структура первого пользователя для поиска реферального поля:');
    const userKeys = Object.keys(user);
    const referralRelatedKeys = userKeys.filter(key => 
      key.includes('ref') || 
      key.includes('invit') || 
      key.includes('parent')
    );
    console.log('Поля связанные с рефералами:', referralRelatedKeys);
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkUser74ReferralsSimple();