import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function investigateDuplicationRootCause() {
  console.log('🔍 РАССЛЕДОВАНИЕ КОРНЯ ПРОБЛЕМЫ ДУБЛИРОВАНИЯ TON ДЕПОЗИТОВ');
  console.log('=' .repeat(80));

  try {
    // 1. Проверим последние депозиты пользователя 184
    console.log('\n1️⃣ ПОСЛЕДНИЕ TON ДЕПОЗИТЫ ПОЛЬЗОВАТЕЛЯ 184:');
    const { data: recentDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .in('type', ['TON_DEPOSIT', 'DEPOSIT'])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);

    if (depositsError) {
      console.error('❌ Ошибка получения депозитов:', depositsError);
      return;
    }

    console.log(`Найдено ${recentDeposits?.length || 0} депозитов:`);
    recentDeposits?.forEach((tx, i) => {
      console.log(`${i + 1}. ID: ${tx.id} | Сумма: ${tx.amount || tx.amount_ton} TON | Время: ${tx.created_at}`);
      console.log(`   Hash: ${tx.tx_hash || 'нет'} | BOC: ${tx.boc || 'нет'}`);
      console.log(`   Описание: ${tx.description}`);
    });

    // 2. Ищем точные дубликаты по всем критериям
    console.log('\n2️⃣ ПОИСК ТОЧНЫХ ДУБЛИКАТОВ:');
    if (recentDeposits && recentDeposits.length >= 2) {
      const latest = recentDeposits[0];
      const secondLatest = recentDeposits[1];
      
      console.log('Сравнение двух последних транзакций:');
      console.log('Транзакция 1:', {
        id: latest.id,
        amount: latest.amount || latest.amount_ton,
        tx_hash: latest.tx_hash,
        boc: latest.boc,
        created_at: latest.created_at
      });
      console.log('Транзакция 2:', {
        id: secondLatest.id,
        amount: secondLatest.amount || secondLatest.amount_ton,
        tx_hash: secondLatest.tx_hash,
        boc: secondLatest.boc,
        created_at: secondLatest.created_at
      });

      // Проверим идентичность
      const sameAmount = (latest.amount || latest.amount_ton) === (secondLatest.amount || secondLatest.amount_ton);
      const sameHash = latest.tx_hash === secondLatest.tx_hash;
      const sameBoc = latest.boc === secondLatest.boc;
      const timeDiff = Math.abs(new Date(latest.created_at).getTime() - new Date(secondLatest.created_at).getTime()) / 1000;

      console.log('\n🔍 АНАЛИЗ ДУБЛИРОВАНИЯ:');
      console.log(`Одинаковая сумма: ${sameAmount ? '✅ ДА' : '❌ НЕТ'}`);
      console.log(`Одинаковый tx_hash: ${sameHash ? '✅ ДА' : '❌ НЕТ'}`);
      console.log(`Одинаковый BOC: ${sameBoc ? '✅ ДА' : '❌ НЕТ'}`);
      console.log(`Разница во времени: ${timeDiff} секунд`);

      if (sameAmount && (sameHash || sameBoc) && timeDiff < 60) {
        console.log('🚨 НАЙДЕН ДУБЛИКАТ! Две транзакции идентичны');
      }
    }

    // 3. Проверим уникальные ограничения в БД
    console.log('\n3️⃣ ПРОВЕРКА УНИКАЛЬНЫХ ОГРАНИЧЕНИЙ БД:');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_table_constraints', { table_name: 'transactions' });

    if (!constraintsError && constraints) {
      console.log('Найденные ограничения:');
      constraints.forEach((constraint: any) => {
        console.log(`- ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

    // 4. Проверим дубликаты по BOC или tx_hash за последние сутки
    console.log('\n4️⃣ ПРОВЕРКА ДУБЛИКАТОВ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: duplicatesBoc, error: bocError } = await supabase
      .from('transactions')
      .select('boc, tx_hash, amount, amount_ton, created_at, user_id')
      .eq('user_id', 184)
      .eq('currency', 'TON')
      .gte('created_at', yesterday)
      .not('boc', 'is', null);

    if (!bocError && duplicatesBoc) {
      console.log(`Найдено ${duplicatesBoc.length} транзакций с BOC за 24 часа:`);
      
      // Группируем по BOC
      const bocGroups = duplicatesBoc.reduce((acc: any, tx: any) => {
        const boc = tx.boc;
        if (!acc[boc]) acc[boc] = [];
        acc[boc].push(tx);
        return acc;
      }, {});

      Object.entries(bocGroups).forEach(([boc, txs]: [string, any]) => {
        if (txs.length > 1) {
          console.log(`🚨 ДУБЛИКАТ BOC найден: ${boc}`);
          txs.forEach((tx: any, i: number) => {
            console.log(`  ${i + 1}. Сумма: ${tx.amount || tx.amount_ton} | Время: ${tx.created_at}`);
          });
        }
      });
    }

    // 5. Проверим работу системы дедупликации
    console.log('\n5️⃣ ПРОВЕРКА СИСТЕМЫ ДЕДУПЛИКАЦИИ:');
    
    // Проверим, есть ли функция extractBaseBoc в коде
    const fs = require('fs');
    const transactionServicePath = './core/TransactionService.ts';
    
    if (fs.existsSync(transactionServicePath)) {
      const content = fs.readFileSync(transactionServicePath, 'utf8');
      const hasExtractBaseBoc = content.includes('extractBaseBoc');
      const hasDeduplicationLogic = content.includes('duplicate') || content.includes('дубликат');
      
      console.log(`extractBaseBoc функция найдена: ${hasExtractBaseBoc ? '✅' : '❌'}`);
      console.log(`Логика дедупликации найдена: ${hasDeduplicationLogic ? '✅' : '❌'}`);
    }

    // 6. Проверим текущий баланс пользователя
    console.log('\n6️⃣ ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ:');
    const { data: userBalance, error: balanceError } = await supabase
      .from('users')
      .select('balance_ton, ton_farming_balance')
      .eq('id', 184)
      .single();

    if (!balanceError && userBalance) {
      console.log(`TON баланс: ${userBalance.balance_ton}`);
      console.log(`TON фарминг баланс: ${userBalance.ton_farming_balance}`);
    }

  } catch (error) {
    console.error('❌ Критическая ошибка расследования:', error);
  }
}

investigateDuplicationRootCause().catch(console.error);