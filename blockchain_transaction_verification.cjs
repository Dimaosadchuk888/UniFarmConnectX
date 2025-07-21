const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function blockchainTransactionVerification() {
  console.log('=== ВЕРИФИКАЦИЯ БЛОКЧЕЙН ТРАНЗАКЦИЙ ===\n');
  
  try {
    // 1. Анализ всех TON депозитов в системе
    console.log('🔍 1. Полный анализ TON депозитов в системе...');
    
    const { data: allTonDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['TON_DEPOSIT', 'FARMING_REWARD'])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
      
    if (depositError) {
      console.error('❌ Ошибка получения TON депозитов:', depositError);
    } else {
      console.log(`📊 Всего TON транзакций в системе: ${allTonDeposits?.length || 0}`);
      
      const depositStats = {
        total: allTonDeposits?.length || 0,
        byType: {},
        byUser: {},
        totalVolume: 0,
        largeDeposits: [],
        recentDeposits: []
      };
      
      allTonDeposits?.forEach(tx => {
        depositStats.totalVolume += parseFloat(tx.amount);
        depositStats.byType[tx.type] = (depositStats.byType[tx.type] || 0) + 1;
        depositStats.byUser[tx.user_id] = (depositStats.byUser[tx.user_id] || 0) + 1;
        
        // Поиск крупных депозитов (>0.1 TON)
        if (parseFloat(tx.amount) > 0.1) {
          depositStats.largeDeposits.push({
            id: tx.id,
            user_id: tx.user_id,
            amount: tx.amount,
            type: tx.type,
            created_at: tx.created_at,
            description: tx.description
          });
        }
        
        // Недавние депозиты (последние 24 часа)
        const txTime = new Date(tx.created_at);
        const now = new Date();
        if ((now - txTime) < 24 * 60 * 60 * 1000) {
          depositStats.recentDeposits.push({
            id: tx.id,
            user_id: tx.user_id,
            amount: tx.amount,
            created_at: tx.created_at
          });
        }
      });
      
      console.log(`💰 Общий объем TON: ${depositStats.totalVolume.toFixed(6)}`);
      console.log(`📈 По типам:`);
      Object.entries(depositStats.byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} транзакций`);
      });
      
      console.log(`💎 Крупные депозиты (>0.1 TON): ${depositStats.largeDeposits.length}`);
      if (depositStats.largeDeposits.length > 0) {
        depositStats.largeDeposits.forEach(tx => {
          console.log(`   User ${tx.user_id}: ${tx.amount} TON, ${tx.created_at}`);
          console.log(`   Description: ${tx.description}`);
        });
      }
      
      console.log(`⏰ Депозиты за последние 24 часа: ${depositStats.recentDeposits.length}`);
      if (depositStats.recentDeposits.length > 0) {
        depositStats.recentDeposits.forEach(tx => {
          console.log(`   User ${tx.user_id}: ${tx.amount} TON, ${tx.created_at}`);
        });
      }
    }
    
    // 2. Поиск транзакций с metadata содержащими hash
    console.log('\n🔍 2. Поиск транзакций с блокчейн хешами...');
    
    const { data: hashTransactions, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (hashError) {
      console.error('❌ Ошибка поиска транзакций с metadata:', hashError);
    } else {
      console.log(`📊 Транзакций с metadata: ${hashTransactions?.length || 0}`);
      
      const hashAnalysis = {
        withTransactionHash: [],
        withBlockchainData: [],
        suspiciousMetadata: []
      };
      
      hashTransactions?.forEach(tx => {
        if (tx.metadata) {
          const metadata = tx.metadata;
          
          // Поиск транзакционных хешей
          if (metadata.transaction_hash || metadata.txHash || metadata.hash) {
            hashAnalysis.withTransactionHash.push({
              id: tx.id,
              user_id: tx.user_id,
              amount: tx.amount,
              hash: metadata.transaction_hash || metadata.txHash || metadata.hash,
              created_at: tx.created_at
            });
          }
          
          // Поиск других блокчейн данных
          if (metadata.boc || metadata.cell || metadata.address) {
            hashAnalysis.withBlockchainData.push({
              id: tx.id,
              user_id: tx.user_id,
              metadata: metadata,
              created_at: tx.created_at
            });
          }
          
          // Проверка на подозрительные metadata
          if (Object.keys(metadata).length > 10) {
            hashAnalysis.suspiciousMetadata.push({
              id: tx.id,
              user_id: tx.user_id,
              metadataKeys: Object.keys(metadata),
              created_at: tx.created_at
            });
          }
        }
      });
      
      console.log(`🔗 Транзакций с хешами: ${hashAnalysis.withTransactionHash.length}`);
      if (hashAnalysis.withTransactionHash.length > 0) {
        hashAnalysis.withTransactionHash.slice(0, 5).forEach(tx => {
          console.log(`   User ${tx.user_id}: ${tx.amount} TON, Hash: ${tx.hash?.substring(0, 10)}...`);
        });
      }
      
      console.log(`⛓️ Транзакций с блокчейн данными: ${hashAnalysis.withBlockchainData.length}`);
      console.log(`⚠️ Подозрительных metadata: ${hashAnalysis.suspiciousMetadata.length}`);
    }
    
    // 3. Проверка пользователей с TON кошельками
    console.log('\n🔍 3. Анализ пользователей с TON кошельками...');
    
    const { data: walletUsers, error: walletError } = await supabase
      .from('users')
      .select('id, telegram_id, username, ton_wallet_address, balance_ton, created_at')
      .not('ton_wallet_address', 'is', null)
      .order('created_at', { ascending: false });
      
    if (walletError) {
      console.error('❌ Ошибка получения пользователей с кошельками:', walletError);
    } else {
      console.log(`👛 Пользователей с TON кошельками: ${walletUsers?.length || 0}`);
      
      const walletStats = {
        total: walletUsers?.length || 0,
        withBalance: 0,
        totalBalance: 0,
        recentWallets: [],
        duplicateAddresses: {}
      };
      
      walletUsers?.forEach(user => {
        if (parseFloat(user.balance_ton) > 0) {
          walletStats.withBalance++;
          walletStats.totalBalance += parseFloat(user.balance_ton);
        }
        
        // Поиск дублирующих адресов
        const addr = user.ton_wallet_address;
        if (addr) {
          if (!walletStats.duplicateAddresses[addr]) {
            walletStats.duplicateAddresses[addr] = [];
          }
          walletStats.duplicateAddresses[addr].push(user.id);
        }
        
        // Недавно подключенные кошельки
        const userTime = new Date(user.created_at);
        const now = new Date();
        if ((now - userTime) < 7 * 24 * 60 * 60 * 1000) { // 7 дней
          walletStats.recentWallets.push(user);
        }
      });
      
      console.log(`💰 Пользователей с балансом TON: ${walletStats.withBalance}/${walletStats.total}`);
      console.log(`💎 Общий баланс пользователей: ${walletStats.totalBalance.toFixed(6)} TON`);
      
      // Поиск дублирующих адресов
      const duplicates = Object.entries(walletStats.duplicateAddresses)
        .filter(([addr, users]) => users.length > 1);
        
      if (duplicates.length > 0) {
        console.log(`⚠️ Дублирующие кошельки: ${duplicates.length}`);
        duplicates.forEach(([addr, users]) => {
          console.log(`   ${addr.substring(0, 20)}...: Users ${users.join(', ')}`);
        });
      }
      
      console.log(`📅 Недавно подключенных кошельков (7 дней): ${walletStats.recentWallets.length}`);
      if (walletStats.recentWallets.length > 0) {
        walletStats.recentWallets.slice(0, 5).forEach(user => {
          console.log(`   User ${user.id}: ${user.username}, ${user.created_at}`);
        });
      }
    }
    
    // 4. Специальная проверка транзакции d1077cd0
    console.log('\n🔍 4. Специальная проверка транзакции d1077cd0...');
    
    const searchVariants = [
      'd1077cd0',
      '1077cd0',
      'd1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
      '1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b'
    ];
    
    for (const variant of searchVariants) {
      console.log(`🔍 Поиск варианта: ${variant}`);
      
      // Поиск в description
      const { data: descTx, error: descError } = await supabase
        .from('transactions')
        .select('*')
        .ilike('description', `%${variant}%`);
        
      if (!descError && descTx?.length > 0) {
        console.log(`   ✅ Найдено в description: ${descTx.length} транзакций`);
        descTx.forEach(tx => {
          console.log(`     User ${tx.user_id}: ${tx.amount} ${tx.currency}, ${tx.created_at}`);
        });
      }
      
      // Поиск в metadata
      const { data: metaTx, error: metaError } = await supabase
        .from('transactions')
        .select('*')
        .like('metadata::text', `%${variant}%`);
        
      if (!metaError && metaTx?.length > 0) {
        console.log(`   ✅ Найдено в metadata: ${metaTx.length} транзакций`);
        metaTx.forEach(tx => {
          console.log(`     User ${tx.user_id}: ${tx.amount} ${tx.currency}, ${tx.created_at}`);
        });
      }
    }
    
    console.log('\n=== ВЕРИФИКАЦИЯ БЛОКЧЕЙН ТРАНЗАКЦИЙ ЗАВЕРШЕНА ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка верификации:', error);
  }
}

blockchainTransactionVerification();