import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function analyzeActualProblem() {
  console.log('🔍 АНАЛИЗ РЕАЛЬНОЙ ПРОБЛЕМЫ ДУБЛИКАТОВ');
  console.log('=' .repeat(80));

  try {
    // 1. Ищем реальные дубликаты TON_DEPOSIT с одинаковым tx_hash_unique
    console.log('\n1️⃣ ПОИСК ДУБЛИКАТОВ TON_DEPOSIT С ОДИНАКОВЫМ TX_HASH:');
    
    const { data: tonDeposits, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_DEPOSIT')
      .not('tx_hash_unique', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('❌ Ошибка получения TON_DEPOSIT:', error);
      return;
    }

    console.log(`Найдено ${tonDeposits?.length || 0} TON_DEPOSIT транзакций с tx_hash_unique`);

    // Группируем по tx_hash_unique для поиска дубликатов
    const hashGroups = {};
    tonDeposits?.forEach(tx => {
      const hash = tx.tx_hash_unique;
      if (!hashGroups[hash]) hashGroups[hash] = [];
      hashGroups[hash].push(tx);
    });

    // Ищем группы с дубликатами
    let duplicateGroups = 0;
    let totalDuplicates = 0;
    Object.entries(hashGroups).forEach(([hash, transactions]) => {
      if (transactions.length > 1) {
        duplicateGroups++;
        totalDuplicates += transactions.length;
        
        console.log(`\n🚨 ДУБЛИКАТ TON_DEPOSIT #${duplicateGroups}:`);
        console.log(`   TX Hash: ${hash.substring(0, 20)}...`);
        console.log(`   Количество: ${transactions.length} транзакций`);
        
        transactions.forEach((tx, i) => {
          console.log(`   ${i + 1}. ID: ${tx.id} | User: ${tx.user_id} | ${tx.created_at}`);
          console.log(`      Статус: ${tx.status} | Сумма: ${tx.amount_ton} TON`);
          console.log(`      Описание: ${tx.description}`);
          console.log(`      Метаданные: ${JSON.stringify(tx.metadata)}`);
        });
      }
    });

    console.log(`\n📊 ИТОГО TON_DEPOSIT ДУБЛИКАТОВ:`);
    console.log(`   Групп дубликатов: ${duplicateGroups}`);
    console.log(`   Всего дубликатов: ${totalDuplicates}`);

    // 2. Проверим BOC дубликаты
    console.log('\n2️⃣ ПОИСК BOC ДУБЛИКАТОВ (СУФФИКСЫ):');
    
    const bocHashes = tonDeposits
      ?.filter(tx => tx.tx_hash_unique && tx.tx_hash_unique.startsWith('te6'))
      .map(tx => ({
        id: tx.id,
        user_id: tx.user_id,
        full_hash: tx.tx_hash_unique,
        base_boc: tx.tx_hash_unique.replace(/_\d{13}_[a-z0-9]+$/, ''),
        created_at: tx.created_at,
        status: tx.status
      })) || [];

    console.log(`Найдено ${bocHashes.length} BOC хешей`);

    // Группируем по базовому BOC
    const bocGroups = {};
    bocHashes.forEach(tx => {
      const baseBoc = tx.base_boc;
      if (!bocGroups[baseBoc]) bocGroups[baseBoc] = [];
      bocGroups[baseBoc].push(tx);
    });

    let bocDuplicates = 0;
    Object.entries(bocGroups).forEach(([baseBoc, transactions]) => {
      if (transactions.length > 1) {
        bocDuplicates++;
        console.log(`\n🚨 BOC ДУБЛИКАТ #${bocDuplicates}:`);
        console.log(`   Базовый BOC: ${baseBoc.substring(0, 30)}...`);
        console.log(`   Количество: ${transactions.length} транзакций`);
        
        transactions.forEach((tx, i) => {
          const suffix = tx.full_hash.replace(baseBoc, '');
          console.log(`   ${i + 1}. ID: ${tx.id} | User: ${tx.user_id} | ${tx.created_at.substring(11, 19)}`);
          console.log(`      Суффикс: ${suffix}`);
          console.log(`      Статус: ${tx.status}`);
        });
      }
    });

    console.log(`\n📊 ИТОГО BOC ДУБЛИКАТОВ: ${bocDuplicates}`);

    // 3. Анализ временных паттернов дубликатов
    console.log('\n3️⃣ АНАЛИЗ ВРЕМЕННЫХ ПАТТЕРНОВ:');
    
    if (duplicateGroups > 0 || bocDuplicates > 0) {
      const allDuplicateGroups = [
        ...Object.values(hashGroups).filter(group => group.length > 1),
        ...Object.values(bocGroups).filter(group => group.length > 1)
      ];

      const timeGaps = [];
      allDuplicateGroups.forEach(group => {
        for (let i = 1; i < group.length; i++) {
          const gap = Math.abs(
            new Date(group[i].created_at).getTime() - 
            new Date(group[i-1].created_at).getTime()
          ) / 1000;
          timeGaps.push(gap);
        }
      });

      if (timeGaps.length > 0) {
        const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
        const minGap = Math.min(...timeGaps);
        const maxGap = Math.max(...timeGaps);
        
        console.log(`Временные промежутки между дубликатами:`);
        console.log(`  Среднее: ${avgGap.toFixed(2)} секунд`);
        console.log(`  Минимум: ${minGap.toFixed(2)} секунд`);
        console.log(`  Максимум: ${maxGap.toFixed(2)} секунд`);
      }
    }

    // 4. Финальный вывод
    console.log('\n4️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    
    if (duplicateGroups === 0 && bocDuplicates === 0) {
      console.log('✅ НЕТ ДУБЛИКАТОВ TON_DEPOSIT с одинаковым tx_hash_unique!');
      console.log('🤔 Проблема может быть в другом месте...');
      console.log('💡 Возможно, дубликаты в других типах транзакций или без tx_hash_unique');
    } else {
      console.log(`🚨 НАЙДЕНЫ ДУБЛИКАТЫ TON_DEPOSIT:`);
      console.log(`   ${duplicateGroups} групп дубликатов по tx_hash_unique`);
      console.log(`   ${bocDuplicates} групп дубликатов по BOC`);
      console.log(`   ✅ ТЕОРИЯ ПОЛЬЗОВАТЕЛЯ ПОДТВЕРЖДЕНА!`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

analyzeActualProblem().catch(console.error);