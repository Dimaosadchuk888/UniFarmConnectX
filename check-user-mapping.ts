import { supabase } from './core/supabaseClient';

async function checkUserMapping() {
  console.log('=== Проверка маппинга пользователей ===\n');
  
  // 1. Проверяем всех пользователей с telegram_id=999489 (это ID из JWT токена)
  const { data: usersByTelegramId } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni, created_at')
    .eq('telegram_id', 999489);
    
  console.log('Пользователи с telegram_id=999489:');
  if (usersByTelegramId && usersByTelegramId.length > 0) {
    usersByTelegramId.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Balance: ${user.balance_uni}, Created: ${user.created_at}`);
    });
  } else {
    console.log('Не найдено');
  }
  
  console.log('\n');
  
  // 2. Проверяем пользователей 74, 75, 76
  const { data: users } = await supabase
    .from('users')
    .select('id, telegram_id, username, balance_uni')
    .in('id', [74, 75, 76]);
    
  console.log('Пользователи 74, 75, 76:');
  users?.forEach(user => {
    console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}, Balance: ${user.balance_uni}`);
  });
  
  console.log('\n');
  
  // 3. Проверяем последние транзакции MISSION_REWARD
  const { data: missionTx } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, currency, description, created_at')
    .eq('type', 'MISSION_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Последние MISSION_REWARD транзакции:');
  missionTx?.forEach(tx => {
    console.log(`ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}, Desc: ${tx.description}, Time: ${tx.created_at}`);
  });
  
  process.exit(0);
}

checkUserMapping().catch(console.error);