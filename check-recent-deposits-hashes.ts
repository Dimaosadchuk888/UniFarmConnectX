/**
 * ПРОВЕРКА ХЕШЕЙ НЕДАВНИХ ДЕПОЗИТОВ User ID 25
 * Анализируем записались ли tx_hash в metadata недавних пополнений
 */

import { supabase } from './core/supabaseClient';

async function checkRecentDepositsHashes() {
  console.log('🔍 ПРОВЕРКА ХЕШЕЙ НЕДАВНИХ ДЕПОЗИТОВ User ID 25');
  console.log('Анализируем последние пополнения на наличие tx_hash в metadata');
  console.log('='.repeat(80));

  try {
    // Получаем последние 10 депозитов User ID 25
    const { data: recentDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (depositsError) {
      console.error('❌ Ошибка получения депозитов:', depositsError);
      return;
    }

    if (!recentDeposits || recentDeposits.length === 0) {
      console.log('❌ Депозиты не найдены');
      return;
    }

    console.log(`✅ Найдено ${recentDeposits.length} недавних депозитов User ID 25:`);
    console.log('');

    // Анализируем каждый депозит
    for (let i = 0; i < recentDeposits.length; i++) {
      const deposit = recentDeposits[i];
      const timeAgo = new Date(Date.now() - new Date(deposit.created_at).getTime()).getMinutes();
      
      console.log(`${i + 1}. Депозит ID ${deposit.id}`);
      console.log(`   Время: ${deposit.created_at} (${timeAgo} мин назад)`);
      console.log(`   Сумма: ${deposit.amount_ton} TON`);
      console.log(`   Валюта: ${deposit.currency}`);
      console.log(`   Статус: ${deposit.status}`);
      
      // Проверяем metadata
      if (deposit.metadata) {
        console.log('   ✅ Metadata присутствует:');
        
        const metadata = deposit.metadata;
        
        // Проверяем tx_hash
        if (metadata.tx_hash) {
          console.log(`   ✅ tx_hash: ${metadata.tx_hash}`);
        } else {
          console.log('   ❌ tx_hash ОТСУТСТВУЕТ');
        }
        
        // Проверяем ton_tx_hash
        if (metadata.ton_tx_hash) {
          console.log(`   ✅ ton_tx_hash: ${metadata.ton_tx_hash}`);
        } else {
          console.log('   ❌ ton_tx_hash ОТСУТСТВУЕТ');
        }
        
        // Проверяем hash_extracted
        if (metadata.hash_extracted !== undefined) {
          console.log(`   ✅ hash_extracted: ${metadata.hash_extracted}`);
        } else {
          console.log('   ❌ hash_extracted ОТСУТСТВУЕТ');
        }
        
        // Проверяем original_boc
        if (metadata.original_boc) {
          console.log(`   ✅ original_boc: ${metadata.original_boc.substring(0, 50)}...`);
        } else {
          console.log('   ❌ original_boc ОТСУТСТВУЕТ');
        }
        
        // Проверяем wallet_address
        if (metadata.wallet_address) {
          console.log(`   ✅ wallet_address: ${metadata.wallet_address}`);
        } else {
          console.log('   ❌ wallet_address ОТСУТСТВУЕТ');
        }
        
        // Проверяем source
        if (metadata.source) {
          console.log(`   ✅ source: ${metadata.source}`);
        } else {
          console.log('   ❌ source ОТСУТСТВУЕТ');
        }
        
        // Показываем полный metadata для анализа
        console.log('   📄 Полный metadata:');
        console.log('   ' + JSON.stringify(metadata, null, 6).replace(/\n/g, '\n   '));
        
      } else {
        console.log('   ❌ Metadata ПОЛНОСТЬЮ ОТСУТСТВУЕТ!');
      }
      
      console.log('');
    }
    
    // Анализ недавних депозитов (последние 30 минут)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const veryRecentDeposits = recentDeposits.filter(d => 
      new Date(d.created_at) > thirtyMinutesAgo
    );
    
    if (veryRecentDeposits.length > 0) {
      console.log('🕐 АНАЛИЗ ДЕПОЗИТОВ ЗА ПОСЛЕДНИЕ 30 МИНУТ:');
      console.log(`Найдено ${veryRecentDeposits.length} очень недавних депозитов:`);
      
      for (const deposit of veryRecentDeposits) {
        const hasHash = deposit.metadata?.tx_hash || deposit.metadata?.ton_tx_hash;
        const hashStatus = hasHash ? '✅ ЕСТЬ' : '❌ НЕТ';
        const hashValue = deposit.metadata?.tx_hash || deposit.metadata?.ton_tx_hash || 'отсутствует';
        
        console.log(`- ID ${deposit.id}: ${hashStatus} hash (${hashValue})`);
      }
    } else {
      console.log('ℹ️ Депозитов за последние 30 минут не найдено');
    }
    
    // Статистика по хешам
    console.log('\n📊 СТАТИСТИКА ПО ХЕШАМ:');
    
    const withTxHash = recentDeposits.filter(d => d.metadata?.tx_hash).length;
    const withTonTxHash = recentDeposits.filter(d => d.metadata?.ton_tx_hash).length;
    const withAnyHash = recentDeposits.filter(d => 
      d.metadata?.tx_hash || d.metadata?.ton_tx_hash
    ).length;
    const withMetadata = recentDeposits.filter(d => d.metadata).length;
    
    console.log(`Всего депозитов: ${recentDeposits.length}`);
    console.log(`С metadata: ${withMetadata}`);
    console.log(`С tx_hash: ${withTxHash}`);
    console.log(`С ton_tx_hash: ${withTonTxHash}`);
    console.log(`С любым hash: ${withAnyHash}`);
    console.log(`Без hash: ${recentDeposits.length - withAnyHash}`);
    
    if (withAnyHash < recentDeposits.length) {
      console.log('\n🚨 ПРОБЛЕМА: Не у всех депозитов есть хеши транзакций!');
      console.log('Это может быть причиной того, что хеши не отображаются в личном кабинете.');
    } else {
      console.log('\n✅ Все депозиты содержат хеши транзакций');
    }

  } catch (error) {
    console.error('💥 Критическая ошибка проверки:', error);
  }
}

// Запускаем проверку
checkRecentDepositsHashes().then(() => {
  console.log('\n✅ Проверка завершена');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});