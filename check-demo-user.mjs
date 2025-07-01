import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkAndUpdateDemoUser() {
  console.log('🔍 Проверка пользователя Demo User (ID 48)...\n');
  
  // 1. Получаем данные пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 48)
    .single();
    
  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError);
    return;
  }
  
  console.log('✅ Пользователь найден:');
  console.log('  • ID:', user.id);
  console.log('  • Username:', user.username);
  console.log('  • Telegram ID:', user.telegram_id);
  console.log('  • Ref Code:', user.ref_code);
  console.log('  • Текущий баланс UNI:', user.balance_uni || 0);
  console.log('  • Текущий баланс TON:', user.balance_ton || 0);
  console.log('\n');
  
  // 2. Начисляем токены
  console.log('💰 Начисление токенов...\n');
  
  const newBalanceUni = (user.balance_uni || 0) + 1000;
  const newBalanceTon = (user.balance_ton || 0) + 1000;
  
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      balance_uni: newBalanceUni,
      balance_ton: newBalanceTon
    })
    .eq('id', 48)
    .select()
    .single();
    
  if (updateError) {
    console.error('❌ Ошибка обновления баланса:', updateError);
    return;
  }
  
  console.log('✅ Баланс успешно обновлен:');
  console.log('  • Новый баланс UNI:', updatedUser.balance_uni);
  console.log('  • Новый баланс TON:', updatedUser.balance_ton);
  console.log('\n');
  
  // 3. Создаем транзакции для истории
  console.log('📝 Создание записей транзакций...\n');
  
  const transactions = [
    {
      user_id: 48,
      amount_uni: 1000,
      amount_ton: 0,
      transaction_type: 'DEPOSIT',
      status: 'completed',
      description: 'Техническое начисление 1000 UNI для тестирования'
    },
    {
      user_id: 48,
      amount_uni: 0,
      amount_ton: 1000,
      transaction_type: 'DEPOSIT',
      status: 'completed',
      description: 'Техническое начисление 1000 TON для тестирования'
    }
  ];
  
  const { data: createdTransactions, error: transError } = await supabase
    .from('transactions')
    .insert(transactions)
    .select();
    
  if (transError) {
    console.error('❌ Ошибка создания транзакций:', transError);
  } else {
    console.log('✅ Транзакции созданы успешно');
    console.log('  • Количество записей:', createdTransactions.length);
  }
  
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
  console.log('════════════════════════════════════════');
  console.log('1. ✅ Пользователь Demo User (ID 48) найден');
  console.log('2. ✅ Username:', user.username);
  console.log('3. ✅ Ref Code:', user.ref_code);
  console.log('4. ✅ Начислено 1000 UNI (новый баланс:', updatedUser.balance_uni + ')');
  console.log('5. ✅ Начислено 1000 TON (новый баланс:', updatedUser.balance_ton + ')');
  console.log('6. ✅ Транзакции записаны в историю');
  console.log('════════════════════════════════════════');
}

checkAndUpdateDemoUser().catch(console.error);