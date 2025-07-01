import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkBalance() {
  console.log('🔍 Проверяю баланс Demo User (ID 48) после перезапуска сервера...\n');
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, telegram_id, ref_code, balance_uni, balance_ton')
    .eq('id', 48)
    .single();
    
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log('✅ РЕЗУЛЬТАТ ПРОВЕРКИ:');
  console.log('════════════════════════════════════════');
  console.log('  • ID:', user.id);
  console.log('  • Username:', user.username);
  console.log('  • Telegram ID:', user.telegram_id);
  console.log('  • Ref Code:', user.ref_code);
  console.log('  • Баланс UNI:', user.balance_uni);
  console.log('  • Баланс TON:', user.balance_ton);
  console.log('════════════════════════════════════════');
  
  if (user.balance_uni === 1000 && user.balance_ton === 1000) {
    console.log('\n✅ БАЛАНСЫ УСПЕШНО СОХРАНЕНЫ В БАЗЕ ДАННЫХ!');
  }
}

checkBalance().catch(console.error);