// Проверка новых пользователей после исправления динамического импорта
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRecentUsersReferrals() {
  console.log('=== ПРОВЕРКА НОВЫХ ПОЛЬЗОВАТЕЛЕЙ ПОСЛЕ ИСПРАВЛЕНИЯ ===');
  
  try {
    // Получаем всех пользователей, созданных после 18 июля 2025
    const { data: recentUsers, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .gte('created_at', '2025-07-18T06:00:00')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('❌ Ошибка получения новых пользователей:', error.message);
      return;
    }
    
    console.log(`📊 Найдено ${recentUsers.length} новых пользователей после 18 июля 06:00`);
    
    if (recentUsers.length === 0) {
      console.log('⚠️  Новых пользователей нет. Это нормально - система еще не тестировалась после исправления.');
      return;
    }
    
    // Анализируем каждого пользователя
    console.log('\n📋 Анализ новых пользователей:');
    
    let usersWithReferrals = 0;
    let usersWithoutReferrals = 0;
    let usersWithReferralRecords = 0;
    let usersWithoutReferralRecords = 0;
    
    for (const user of recentUsers) {
      console.log(`\n👤 Пользователь ID ${user.id}:`);
      console.log(`   telegram_id: ${user.telegram_id}`);
      console.log(`   username: ${user.username}`);
      console.log(`   referred_by: ${user.referred_by}`);
      console.log(`   created_at: ${user.created_at}`);
      
      if (user.referred_by) {
        usersWithReferrals++;
        console.log('   ✅ Имеет реферала');
        
        // Проверяем запись в referrals
        const { data: referralRecord } = await supabase
          .from('referrals')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (referralRecord) {
          usersWithReferralRecords++;
          console.log('   ✅ Запись в referrals есть');
          console.log(`   📋 Создана: ${referralRecord.created_at}`);
          
          // Проверяем временную разницу
          const userTime = new Date(user.created_at);
          const referralTime = new Date(referralRecord.created_at);
          const timeDiff = Math.abs(referralTime - userTime);
          
          console.log(`   ⏱️  Разница во времени: ${timeDiff}ms`);
          
          if (timeDiff < 5000) {
            console.log('   ✅ Записи созданы синхронно (разница < 5 сек)');
          } else {
            console.log('   ❌ Записи созданы с задержкой (разница > 5 сек)');
          }
        } else {
          usersWithoutReferralRecords++;
          console.log('   ❌ Запись в referrals отсутствует');
        }
      } else {
        usersWithoutReferrals++;
        console.log('   ⚠️  Нет реферала');
      }
    }
    
    console.log('\n📊 СТАТИСТИКА:');
    console.log(`Всего новых пользователей: ${recentUsers.length}`);
    console.log(`С рефералами: ${usersWithReferrals}`);
    console.log(`Без рефералов: ${usersWithoutReferrals}`);
    console.log(`С записями в referrals: ${usersWithReferralRecords}`);
    console.log(`Без записей в referrals: ${usersWithoutReferralRecords}`);
    
    // Вычисляем эффективность
    if (usersWithReferrals > 0) {
      const efficiency = (usersWithReferralRecords / usersWithReferrals) * 100;
      console.log(`\n📈 ЭФФЕКТИВНОСТЬ РЕФЕРАЛЬНОЙ СИСТЕМЫ: ${efficiency.toFixed(1)}%`);
      
      if (efficiency === 100) {
        console.log('✅ ИДЕАЛЬНАЯ РАБОТА - все рефералы сохранены!');
      } else if (efficiency >= 80) {
        console.log('✅ ХОРОШАЯ РАБОТА - большинство рефералов сохранены');
      } else if (efficiency >= 50) {
        console.log('⚠️  СРЕДНЯЯ РАБОТА - половина рефералов теряется');
      } else {
        console.log('❌ ПЛОХАЯ РАБОТА - большинство рефералов теряется');
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка диагностики:', error.message);
  }
}

checkRecentUsersReferrals().catch(console.error);