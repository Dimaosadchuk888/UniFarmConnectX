#!/usr/bin/env node

// Диагностика вызова getUserByTelegramId в tonDeposit контроллере
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugTonDepositCall() {
  console.log('🔍 ДИАГНОСТИКА ВЫЗОВА getUserByTelegramId в tonDeposit\n');
  
  try {
    // Тестируем точно те же telegram_id, которые используются в реальных вызовах
    console.log('1️⃣ ТЕСТ: telegram_id = 425855744 (User 25)');
    const { data: user25, error: error25 } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, balance_ton')
      .eq('telegram_id', 425855744)
      .single();
      
    console.log('Результат для telegram_id 425855744:', {
      user: user25,
      error: error25?.message
    });
    
    console.log('\n2️⃣ ТЕСТ: telegram_id = 25 (User 227)');
    const { data: user227, error: error227 } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, balance_ton')
      .eq('telegram_id', 25)
      .single();
      
    console.log('Результат для telegram_id 25:', {
      user: user227,
      error: error227?.message
    });
    
    // Проверим что происходит если передать неправильный telegram_id
    console.log('\n3️⃣ ТЕСТ: Несуществующий telegram_id = 999999999');
    const { data: userNone, error: errorNone } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .eq('telegram_id', 999999999)
      .single();
      
    console.log('Результат для несуществующего telegram_id:', {
      user: userNone,
      error: errorNone?.message,
      errorCode: errorNone?.code
    });
    
    // Проверим последние депозиты User 25
    console.log('\n4️⃣ ПОСЛЕДНИЕ ДЕПОЗИТЫ User 25 (telegram_id: 425855744):');
    const { data: user25Deposits } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, created_at')
      .eq('user_id', 25)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    user25Deposits?.forEach(tx => {
      console.log(`- TX ${tx.id}: ${tx.amount_ton} TON, ${tx.description.substring(0, 30)}... (${tx.created_at})`);
    });
    
    console.log('\n5️⃣ ПОСЛЕДНИЕ ДЕПОЗИТЫ User 227 (telegram_id: 25):');
    const { data: user227Deposits } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, description, created_at')
      .eq('user_id', 227)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    user227Deposits?.forEach(tx => {
      console.log(`- TX ${tx.id}: ${tx.amount_ton} TON, ${tx.description.substring(0, 30)}... (${tx.created_at})`);
    });
    
    // КРИТИЧЕСКИЙ ВОПРОС: Кто из них делал депозиты недавно?
    console.log('\n6️⃣ АНАЛИЗ: Кто должен получать новые депозиты?');
    console.log('User 25 (telegram_id: 425855744) создан:', '2025-06-16 - СТАРШЕ, реальный пользователь');
    console.log('User 227 (telegram_id: 25) создан:', '2025-07-19 - НОВЕЕ, подозрительный telegram_id');
    
    console.log('\n🔍 ГИПОТЕЗА:');
    console.log('Telegram отправляет telegram_id=25 вместо telegram_id=425855744');
    console.log('Это означает проблему на уровне Telegram Web App или JWT токена');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

debugTonDepositCall().then(() => {
  console.log('\n✅ Диагностика завершена');
  process.exit(0);
}).catch(error => {
  console.error('💥 Неожиданная ошибка:', error);
  process.exit(1);
});