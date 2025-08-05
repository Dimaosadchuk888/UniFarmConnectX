/**
 * ТЕСТ ОТОБРАЖЕНИЯ ХЕШЕЙ ТРАНЗАКЦИЙ
 * Проверяем что новое отображение хешей работает корректно
 */

import { supabase } from './core/supabaseClient';

async function testTransactionDisplay() {
  console.log('🧪 ТЕСТ ОТОБРАЖЕНИЯ ХЕШЕЙ ТРАНЗАКЦИЙ User ID 25');
  console.log('Проверяем как отображаются хеши для последних депозитов');
  console.log('='.repeat(80));

  try {
    // Получаем последние 3 депозита User ID 25
    const { data: deposits, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Ошибка получения депозитов:', error);
      return;
    }

    if (!deposits || deposits.length === 0) {
      console.log('❌ Депозиты не найдены');
      return;
    }

    console.log(`✅ Найдено ${deposits.length} депозитов для тестирования:`);
    console.log('');

    // Симулируем отображение каждого депозита
    for (let i = 0; i < deposits.length; i++) {
      const deposit = deposits[i];
      
      console.log(`${i + 1}. Депозит ID ${deposit.id}`);
      console.log(`   Время: ${deposit.created_at}`);
      console.log(`   Сумма: ${deposit.amount_ton} TON`);
      console.log(`   Тип: ${deposit.type}`);
      
      // Симулируем логику компонента TransactionItem
      const transactionHash = deposit.metadata?.tx_hash || deposit.metadata?.ton_tx_hash || deposit.transaction_hash;
      const isTonDeposit = deposit.type === 'TON_DEPOSIT';
      
      console.log(`   📋 Логика отображения:`);
      console.log(`      - transactionHash: ${transactionHash ? 'ЕСТЬ' : 'НЕТ'}`);
      console.log(`      - isTonDeposit: ${isTonDeposit}`);
      console.log(`      - Условие отображения: ${transactionHash && isTonDeposit ? '✅ ПОКАЖЕТСЯ' : '❌ НЕ ПОКАЖЕТСЯ'}`);
      
      if (transactionHash && isTonDeposit) {
        // Симулируем как хеш будет отображен в UI
        const displayHash = transactionHash.length > 16 
          ? `${transactionHash.slice(0, 8)}...${transactionHash.slice(-8)}`
          : transactionHash;
        
        const tonViewerUrl = `https://tonviewer.com/transaction/${transactionHash}`;
        
        console.log(`      ✅ Отображение в UI:`);
        console.log(`         Сокращенный хеш: "${displayHash}"`);
        console.log(`         Полный хеш: "${transactionHash}"`);
        console.log(`         TON Viewer URL: ${tonViewerUrl}`);
        console.log(`         Кнопки: [Копировать] [TON Viewer]`);
      } else {
        console.log(`      ❌ В UI НЕ ОТОБРАЗИТСЯ - нет хеша или не TON депозит`);
      }
      
      console.log('');
    }
    
    console.log('📊 ИТОГОВАЯ ПРОВЕРКА:');
    const depositsWithHashes = deposits.filter(d => 
      (d.metadata?.tx_hash || d.metadata?.ton_tx_hash || d.transaction_hash) && d.type === 'TON_DEPOSIT'
    ).length;
    
    console.log(`Депозитов с хешами: ${depositsWithHashes}/${deposits.length}`);
    console.log(`Процент отображения: ${Math.round((depositsWithHashes / deposits.length) * 100)}%`);
    
    if (depositsWithHashes === deposits.length) {
      console.log('✅ ВСЕ ДЕПОЗИТЫ БУДУТ ОТОБРАЖАТЬ ХЕШИ!');
    } else {
      console.log('⚠️ Не все депозиты будут отображать хеши');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка теста:', error);
  }
}

// Запускаем тест
testTransactionDisplay().then(() => {
  console.log('\n✅ Тест завершен');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});