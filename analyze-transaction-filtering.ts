/**
 * Анализ проблемы с отображением UNI транзакций
 * БЕЗ изменения кода - только диагностика
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTransactionFiltering() {
  console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ ОТОБРАЖЕНИЯ UNI ТРАНЗАКЦИЙ ===\n');
  console.log('Дата анализа:', new Date().toISOString());
  console.log('---------------------------------------------------\n');

  try {
    // 1. Проверяем общее количество транзакций
    console.log('1. ОБЩАЯ СТАТИСТИКА ТРАНЗАКЦИЙ:\n');
    
    const { data: allTransactions, count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Всего транзакций в БД: ${totalCount}\n`);

    // 2. Проверяем транзакции с currency полем
    console.log('2. АНАЛИЗ ПОЛЯ CURRENCY:\n');
    
    const { data: withCurrency } = await supabase
      .from('transactions')
      .select('currency, id')
      .not('currency', 'is', null)
      .limit(5);
    
    const { count: currencyCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .not('currency', 'is', null);
    
    console.log(`Транзакций с заполненным currency: ${currencyCount}`);
    console.log('Примеры значений currency:', withCurrency?.map(t => t.currency).join(', ') || 'нет');
    
    // 3. Проверяем транзакции с amount_uni > 0
    console.log('\n3. АНАЛИЗ ПОЛЯ AMOUNT_UNI:\n');
    
    const { data: uniTransactions, count: uniCount } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, currency, created_at', { count: 'exact' })
      .gt('amount_uni', 0)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`Транзакций с amount_uni > 0: ${uniCount}`);
    console.log('\nПримеры UNI транзакций:');
    uniTransactions?.forEach(t => {
      console.log(`  ID ${t.id}: type=${t.type}, amount_uni=${t.amount_uni}, currency=${t.currency || 'NULL'}`);
    });

    // 4. Проверяем транзакции с amount_ton > 0
    console.log('\n4. АНАЛИЗ ПОЛЯ AMOUNT_TON:\n');
    
    const { data: tonTransactions, count: tonCount } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, currency, created_at', { count: 'exact' })
      .gt('amount_ton', 0)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`Транзакций с amount_ton > 0: ${tonCount}`);
    console.log('\nПримеры TON транзакций:');
    tonTransactions?.forEach(t => {
      console.log(`  ID ${t.id}: type=${t.type}, amount_ton=${t.amount_ton}, currency=${t.currency || 'NULL'}`);
    });

    // 5. Проверяем фильтр который используется в коде
    console.log('\n5. ТЕСТИРОВАНИЕ ФИЛЬТРА ИЗ КОДА:\n');
    
    // Фильтр для UNI: currency='UNI' ИЛИ amount_uni > 0
    const { data: filteredUni, count: filteredUniCount } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, currency', { count: 'exact' })
      .or('currency.eq.UNI,amount_uni.gt.0')
      .limit(10);
    
    console.log(`Результат фильтра 'currency.eq.UNI,amount_uni.gt.0': ${filteredUniCount} транзакций`);
    
    // Фильтр для TON: currency='TON' ИЛИ amount_ton > 0
    const { data: filteredTon, count: filteredTonCount } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, currency', { count: 'exact' })
      .or('currency.eq.TON,amount_ton.gt.0')
      .limit(10);
    
    console.log(`Результат фильтра 'currency.eq.TON,amount_ton.gt.0': ${filteredTonCount} транзакций`);

    // 6. Проверяем конкретного пользователя
    console.log('\n6. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ 184:\n');
    
    const userId = 184;
    
    // Все транзакции пользователя
    const { count: userTotal } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    console.log(`Всего транзакций у пользователя ${userId}: ${userTotal}`);
    
    // UNI транзакции пользователя
    const { data: userUniTx, count: userUniCount } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, currency, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .or('currency.eq.UNI,amount_uni.gt.0')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`UNI транзакций (с фильтром): ${userUniCount}`);
    if (userUniTx && userUniTx.length > 0) {
      console.log('Последние UNI транзакции:');
      userUniTx.forEach(t => {
        console.log(`  ${t.created_at.slice(0, 19)} - ${t.type}: ${t.amount_uni} UNI (currency=${t.currency || 'NULL'})`);
      });
    }
    
    // TON транзакции пользователя
    const { data: userTonTx, count: userTonCount } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, currency, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .or('currency.eq.TON,amount_ton.gt.0')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`\nTON транзакций (с фильтром): ${userTonCount}`);
    if (userTonTx && userTonTx.length > 0) {
      console.log('Последние TON транзакции:');
      userTonTx.forEach(t => {
        console.log(`  ${t.created_at.slice(0, 19)} - ${t.type}: ${t.amount_ton} TON (currency=${t.currency || 'NULL'})`);
      });
    }

    // 7. Проверяем транзакции с обоими amount > 0
    console.log('\n7. ТРАНЗАКЦИИ С ОБОИМИ AMOUNT > 0:\n');
    
    const { data: bothAmounts, count: bothCount } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, amount_ton, currency', { count: 'exact' })
      .gt('amount_uni', 0)
      .gt('amount_ton', 0)
      .limit(5);
    
    console.log(`Транзакций с amount_uni > 0 И amount_ton > 0: ${bothCount}`);
    if (bothAmounts && bothAmounts.length > 0) {
      console.log('Примеры:');
      bothAmounts.forEach(t => {
        console.log(`  ID ${t.id}: UNI=${t.amount_uni}, TON=${t.amount_ton}, currency=${t.currency || 'NULL'}`);
      });
    }

    // 8. Анализ типов транзакций
    console.log('\n8. АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ:\n');
    
    const { data: types } = await supabase
      .from('transactions')
      .select('type')
      .eq('user_id', userId);
    
    const typeCount = new Map<string, number>();
    types?.forEach(t => {
      typeCount.set(t.type, (typeCount.get(t.type) || 0) + 1);
    });
    
    console.log('Распределение по типам:');
    Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} транзакций`);
      });

    // 9. Проверяем новое поле amount
    console.log('\n9. АНАЛИЗ НОВОГО ПОЛЯ AMOUNT:\n');
    
    const { data: withAmount, count: amountCount } = await supabase
      .from('transactions')
      .select('id, amount, currency', { count: 'exact' })
      .not('amount', 'is', null)
      .limit(5);
    
    console.log(`Транзакций с заполненным amount: ${amountCount}`);
    if (withAmount && withAmount.length > 0) {
      console.log('Примеры:');
      withAmount.forEach(t => {
        console.log(`  ID ${t.id}: amount=${t.amount}, currency=${t.currency}`);
      });
    }

    // 10. ВЫВОДЫ
    console.log('\n10. ВЫВОДЫ И РЕКОМЕНДАЦИИ:\n');
    
    if (uniCount === 0) {
      console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет транзакций с amount_uni > 0');
      console.log('   Это означает, что UNI транзакции не записываются правильно в БД');
    } else if (filteredUniCount === 0) {
      console.log('❌ ПРОБЛЕМА С ФИЛЬТРОМ: Фильтр не находит UNI транзакции');
      console.log('   Проверьте синтаксис фильтра в коде');
    } else if (userUniCount === 0) {
      console.log('⚠️ У пользователя 184 нет UNI транзакций');
      console.log('   Возможно, нужно проверить другого пользователя');
    } else {
      console.log('✅ Фильтрация работает, транзакции есть в БД');
      console.log('   Проблема может быть в frontend отображении');
    }
    
    console.log('\nДОПОЛНИТЕЛЬНЫЕ НАБЛЮДЕНИЯ:');
    
    if (currencyCount === 0) {
      console.log('- Поле currency не заполнено ни в одной транзакции');
      console.log('  Система полагается только на amount_uni/amount_ton');
    } else if (currencyCount < totalCount! / 2) {
      console.log('- Поле currency заполнено только частично');
      console.log('  Возможно, это новое поле и старые транзакции его не имеют');
    }
    
    if (bothCount! > 0) {
      console.log('- Есть транзакции с обоими amount > 0');
      console.log('  Это может вызывать проблемы с определением валюты');
    }
    
    if (amountCount! > 0) {
      console.log('- Используется новое поле amount');
      console.log('  Возможен конфликт между старой и новой схемой');
    }

  } catch (error) {
    console.error('Ошибка анализа:', error);
  }
}

// Запускаем анализ
analyzeTransactionFiltering()
  .then(() => {
    console.log('\n=== АНАЛИЗ ЗАВЕРШЕН ===\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });