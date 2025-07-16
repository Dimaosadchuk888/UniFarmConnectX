import { supabase } from '../core/supabase.js';

async function checkUser74Referrals() {
  console.log('=== ПРОВЕРКА АККАУНТА USER 74 ===\n');
  
  try {
    // Получаем информацию о пользователе
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();
      
    if (userError) throw userError;
    
    console.log('👤 Информация о пользователе:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Telegram ID: ${user.telegram_id}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Реферальный код: ${user.ref_code}`);
    console.log(`- Баланс UNI: ${user.balance_uni?.toLocaleString('ru-RU') || 0}`);
    console.log(`- Баланс TON: ${user.balance_ton || 0}`);
    console.log(`- Депозит UNI: ${user.uni_deposit_amount?.toLocaleString('ru-RU') || 0}`);
    console.log(`- TON Boost пакет: ${user.ton_boost_package || 'Нет'}`);
    console.log(`- Дата регистрации: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
    
    console.log('\n📊 СТАТИСТИКА РЕФЕРАЛОВ:\n');
    
    // Получаем количество рефералов из таблицы referrals
    const { data: allReferrals, error: countError } = await supabase
      .from('referrals')
      .select('user_id')
      .eq('inviter_id', 74);
      
    if (countError) throw countError;
    const totalReferrals = allReferrals?.length || 0;
    
    console.log(`Всего рефералов: ${totalReferrals || 0}`);
    
    // Получаем активных рефералов
    const { data: referralsList, error: refError } = await supabase
      .from('referrals')
      .select('user_id')
      .eq('inviter_id', 74);
      
    if (refError) throw refError;
    
    // Получаем информацию об активных пользователях
    const userIds = referralsList?.map(r => r.user_id) || [];
    const { data: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('id')
      .in('id', userIds)
      .eq('is_active', true);
      
    if (activeError) throw activeError;
    const activeReferrals = activeUsers?.length || 0;
    
    console.log(`Активных рефералов: ${activeReferrals || 0}`);
    
    // Получаем рефералов с фармингом
    const { data: farmingUsers, error: farmingError } = await supabase
      .from('users')
      .select('id')
      .in('id', userIds)
      .gt('uni_deposit_amount', 0);
      
    if (farmingError) throw farmingError;
    const farmingReferrals = farmingUsers?.length || 0;
    
    console.log(`Рефералов с фармингом: ${farmingReferrals || 0}`);
    
    // Получаем топ 10 рефералов по балансу
    const { data: topReferrals, error: topError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, uni_deposit_amount, is_active, created_at')
      .in('id', userIds)
      .order('balance_uni', { ascending: false })
      .limit(10);
      
    if (topError) throw topError;
    
    if (topReferrals && topReferrals.length > 0) {
      console.log('\n📋 ТОП 10 РЕФЕРАЛОВ ПО БАЛАНСУ:');
      topReferrals.forEach((ref, index) => {
        console.log(`\n${index + 1}. ${ref.username || 'Без имени'} (ID: ${ref.id})`);
        console.log(`   - Баланс UNI: ${ref.balance_uni?.toLocaleString('ru-RU') || 0}`);
        console.log(`   - Баланс TON: ${ref.balance_ton || 0}`);
        console.log(`   - Депозит UNI: ${ref.uni_deposit_amount?.toLocaleString('ru-RU') || 0}`);
        console.log(`   - Активен: ${ref.is_active ? '✅' : '❌'}`);
        console.log(`   - Дата регистрации: ${new Date(ref.created_at).toLocaleDateString('ru-RU')}`);
      });
    } else {
      console.log('\nУ пользователя нет рефералов');
    }
    
    // Получаем доход от рефералов за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: referralIncome, error: incomeError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', 74)
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('currency', 'UNI');
      
    if (incomeError) throw incomeError;
    
    const totalIncome = referralIncome?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
    console.log(`\n💰 Доход от рефералов за 7 дней: ${totalIncome.toLocaleString('ru-RU')} UNI`);
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkUser74Referrals();