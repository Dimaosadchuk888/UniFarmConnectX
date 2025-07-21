const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function diagnoseTonTransaction() {
  console.log('=== ДИАГНОСТИКА TON ТРАНЗАКЦИИ d1077cd0 ===\n');
  
  try {
    // 1. Поиск по hash в description
    console.log('🔍 1. Поиск транзакции по hash d1077cd0...');
    const { data: hashTransactions, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .or('description.ilike.%d1077cd0%,description.ilike.%1077cd0%,metadata->>transaction_hash.ilike.%d1077cd0%')
      .order('created_at', { ascending: false });
      
    if (hashError) {
      console.error('❌ Ошибка поиска по hash:', hashError);
    } else {
      console.log(`📊 Найдено транзакций: ${hashTransactions?.length || 0}`);
      if (hashTransactions?.length > 0) {
        hashTransactions.forEach(tx => {
          console.log(`💰 ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount} ${tx.currency}, Date: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}`);
          console.log(`🔗 Metadata: ${JSON.stringify(tx.metadata)}\n`);
        });
      }
    }
    
    // 2. Поиск всех TON депозитов за 21 июля 2025
    console.log('🔍 2. Поиск всех TON депозитов за 21 июля 2025...');
    const { data: dayDeposits, error: dayError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .in('type', ['FARMING_DEPOSIT', 'DEPOSIT'])
      .gte('created_at', '2025-07-21T00:00:00')
      .lte('created_at', '2025-07-21T23:59:59')
      .order('created_at', { ascending: false });
      
    if (dayError) {
      console.error('❌ Ошибка поиска дневных депозитов:', dayError);
    } else {
      console.log(`📊 TON депозитов за день: ${dayDeposits?.length || 0}`);
      if (dayDeposits?.length > 0) {
        dayDeposits.forEach(tx => {
          console.log(`💎 ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount} TON, Time: ${tx.created_at}`);
          console.log(`📝 Description: ${tx.description}\n`);
        });
      }
    }
    
    // 3. Поиск пользователя по адресу кошелька
    console.log('🔍 3. Поиск пользователя по адресу UQCYrMBRgAZIOkhtitO1IFHmaEBQ_NrIBFTwsj2N2jW-vsCh...');
    const targetWallet = 'UQCYrMBRgAZIOkhtitO1IFHmaEBQ_NrIBFTwsj2N2jW-vsCh';
    const shortWallet = '0:20b597c37c551332393fb87d599bad86b1402e7f06a9e9946fc3fe1c98c645e8';
    
    const { data: walletUsers, error: walletError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_wallet_address, balance_ton, created_at')
      .or(`ton_wallet_address.ilike.%${targetWallet}%,ton_wallet_address.ilike.%${shortWallet}%`);
      
    if (walletError) {
      console.error('❌ Ошибка поиска пользователей:', walletError);
    } else {
      console.log(`👤 Найдено пользователей: ${walletUsers?.length || 0}`);
      if (walletUsers?.length > 0) {
        walletUsers.forEach(user => {
          console.log(`🔑 User ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}`);
          console.log(`💰 TON Balance: ${user.balance_ton}`);
          console.log(`🏦 Wallet: ${user.ton_wallet_address}`);
          console.log(`📅 Created: ${user.created_at}\n`);
        });
      }
    }
    
    // 4. Поиск по времени около 11:56 21 июля 2025
    console.log('🔍 4. Поиск транзакций около 11:56 21 июля 2025...');
    const { data: timeTransactions, error: timeError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-21T11:50:00')
      .lte('created_at', '2025-07-21T12:05:00')
      .order('created_at', { ascending: false });
      
    if (timeError) {
      console.error('❌ Ошибка поиска по времени:', timeError);
    } else {
      console.log(`⏰ Транзакций в период 11:50-12:05: ${timeTransactions?.length || 0}`);
      if (timeTransactions?.length > 0) {
        timeTransactions.forEach(tx => {
          console.log(`⏱️ Time: ${tx.created_at}, User: ${tx.user_id}, Amount: ${tx.amount} TON`);
          console.log(`📝 Description: ${tx.description}\n`);
        });
      }
    }
    
    // 5. Проверка пользователей 25 и 227 (из предыдущих отчетов)
    console.log('🔍 5. Проверка пользователей 25 и 227...');
    const { data: suspectUsers, error: suspectError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, ton_wallet_address, created_at')
      .in('id', [25, 227]);
      
    if (suspectError) {
      console.error('❌ Ошибка проверки подозрительных пользователей:', suspectError);
    } else {
      console.log(`🕵️ Данные пользователей 25 и 227: ${suspectUsers?.length || 0}`);
      if (suspectUsers?.length > 0) {
        suspectUsers.forEach(user => {
          console.log(`👤 User ${user.id}: telegram_id=${user.telegram_id}, username=${user.username}`);
          console.log(`💰 TON Balance: ${user.balance_ton}, Wallet: ${user.ton_wallet_address}`);
          console.log(`📅 Created: ${user.created_at}\n`);
        });
      }
    }
    
    console.log('=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка диагностики:', error);
  }
}

diagnoseTonTransaction();