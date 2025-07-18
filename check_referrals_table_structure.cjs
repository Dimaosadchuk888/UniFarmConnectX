// Проверка структуры таблицы referrals
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkReferralsTableStructure() {
  console.log('=== ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ REFERRALS ===');
  
  try {
    // Получаем все записи из referrals
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Ошибка получения данных:', error.message);
      return;
    }
    
    console.log(`📊 Всего записей в referrals: ${referrals.length}`);
    
    if (referrals.length > 0) {
      console.log('\n📋 Структура записи:');
      console.log(JSON.stringify(referrals[0], null, 2));
      
      console.log('\n🔍 Поля в таблице:');
      Object.keys(referrals[0]).forEach(key => {
        const value = referrals[0][key];
        console.log(`  ${key}: ${typeof value} = ${value}`);
      });
    }
    
    // Проверяем отсутствующие поля
    const requiredFields = ['user_id', 'referred_user_id', 'inviter_id', 'level', 'reward_uni', 'reward_ton', 'ref_path'];
    
    if (referrals.length > 0) {
      const existingFields = Object.keys(referrals[0]);
      const missingFields = requiredFields.filter(field => !existingFields.includes(field));
      
      if (missingFields.length > 0) {
        console.log('\n❌ Отсутствующие поля:');
        missingFields.forEach(field => console.log(`  - ${field}`));
      } else {
        console.log('\n✅ Все необходимые поля присутствуют');
      }
    }
    
    // Проверяем связи с пользователями
    if (referrals.length > 0) {
      console.log('\n🔗 Проверка связей:');
      
      const userIds = referrals.map(r => r.user_id).filter(id => id !== null);
      const uniqueUserIds = [...new Set(userIds)];
      
      console.log(`  Уникальные user_id: ${uniqueUserIds.length}`);
      console.log(`  Первые 5: ${uniqueUserIds.slice(0, 5).join(', ')}`);
      
      // Проверяем существование пользователей
      if (uniqueUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, telegram_id, username, referred_by')
          .in('id', uniqueUserIds.slice(0, 5));
          
        console.log(`  Найдено пользователей: ${users ? users.length : 0}`);
        
        if (users && users.length > 0) {
          console.log('\n👥 Первые 5 пользователей:');
          users.forEach(user => {
            console.log(`    ID ${user.id}: telegram_id=${user.telegram_id}, referred_by=${user.referred_by}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

checkReferralsTableStructure().catch(console.error);