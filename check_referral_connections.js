import { supabase } from './core/supabase.js';

async function checkReferralConnections() {
  console.log('🔍 ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ');
  
  // Проверяем пользователя 184
  const { data: user184, error: error184 } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code, referred_by')
    .eq('id', 184)
    .single();
    
  console.log('👤 Пользователь 184:', user184);
  if (error184) console.error('❌ Ошибка:', error184);
  
  // Проверяем пользователей 187-190
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id, username, ref_code, referred_by')
    .in('id', [187, 188, 189, 190])
    .order('id');
    
  console.log('👥 Пользователи 187-190:', users);
  if (usersError) console.error('❌ Ошибка:', usersError);
  
  // Проверяем таблицу referrals
  const { data: referrals, error: referralsError } = await supabase
    .from('referrals')
    .select('*')
    .or('inviter_id.eq.184,user_id.eq.184');
    
  console.log('🔗 Записи в referrals для пользователя 184:', referrals);
  if (referralsError) console.error('❌ Ошибка:', referralsError);
  
  // Общее количество записей в referrals
  const { count, error: countError } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true });
    
  console.log('📊 Общее количество записей в referrals:', count);
  if (countError) console.error('❌ Ошибка:', countError);
  
  // Проверяем последние транзакции REFERRAL_REWARD
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'REFERRAL_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('💰 Последние реферальные транзакции пользователя 184:', transactions);
  if (transError) console.error('❌ Ошибка:', transError);
}

checkReferralConnections().catch(console.error);