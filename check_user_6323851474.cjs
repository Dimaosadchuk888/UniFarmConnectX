const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUser() {
  try {
    console.log('🔍 Поиск пользователя с telegram_id: 6323851474');
    
    // Поиск по точному совпадению
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, ref_code, referred_by')
      .eq('telegram_id', '6323851474');
    
    if (error) {
      console.log('❌ Ошибка поиска:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ Пользователь с telegram_id 6323851474 НЕ НАЙДЕН');
      
      // Попробуем поиск как строку
      const { data: stringData, error: stringError } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, ref_code, referred_by')
        .eq('telegram_id', '6323851474');
      
      if (!stringError && stringData && stringData.length > 0) {
        console.log('✅ Найден как строка:', stringData[0]);
      } else {
        console.log('🔍 Проверяем похожие telegram_id...');
        const { data: similarData } = await supabase
          .from('users')
          .select('id, telegram_id, username, first_name, ref_code, referred_by')
          .like('telegram_id', '%632385%');
        
        if (similarData && similarData.length > 0) {
          console.log('📋 Похожие telegram_id:');
          similarData.forEach(user => {
            console.log(`   ID: ${user.id}, telegram_id: ${user.telegram_id}, username: ${user.username}`);
          });
        } else {
          console.log('❌ Похожие пользователи не найдены');
        }
      }
      return;
    }
    
    const user = data[0];
    console.log('✅ Пользователь НАЙДЕН:');
    console.log('   ID:', user.id);
    console.log('   telegram_id:', user.telegram_id);
    console.log('   username:', user.username);
    console.log('   first_name:', user.first_name);
    console.log('   ref_code:', user.ref_code);
    console.log('   referred_by:', user.referred_by);
    
    // Проверяем, есть ли у него рефералы
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('referred_user_id')
      .eq('referrer_user_id', user.id);
    
    if (!refError && referrals) {
      console.log('   💰 Количество рефералов:', referrals.length);
    }
    
    // Проверяем, кто его пригласил
    if (user.referred_by) {
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id, username, ref_code')
        .eq('id', user.referred_by)
        .single();
      
      if (!referrerError && referrer) {
        console.log('   👤 Пригласил:', referrer.username, '(ID:', referrer.id, ', ref_code:', referrer.ref_code, ')');
      }
    } else {
      console.log('   👤 Пригласил: НЕ УКАЗАН (самостоятельная регистрация)');
    }
    
  } catch (err) {
    console.error('💥 Критическая ошибка:', err.message);
  }
}

checkUser();