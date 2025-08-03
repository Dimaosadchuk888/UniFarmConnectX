/**
 * Исследование дублирования транзакций для пользователя 25
 * Анализ проблемы: одна TON транзакция записана дважды
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BOC_FROM_USER = "te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKBInUgIq8dqMECzNwPyJ9eQjP329kuNZ3s0H41Z4miUDu4lsRhsaiGoplRRzfR9yKPZUoFjb+vQbut8XmenPdAAFNTRi7RHqnaAAAG7gAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKh3NZQAAAAAAAAAAAAAAAAAABMb2Yz";

async function investigateDuplicateTransactions() {
  console.log('\n=== ИССЛЕДОВАНИЕ ДУБЛИРОВАНИЯ ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЯ 25 ===\n');

  try {
    // 1. Получить все транзакции пользователя 25 за последние 24 часа
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения транзакций:', error);
      return;
    }

    console.log(`📊 Найдено транзакций за последние 24 часа: ${transactions?.length || 0}`);

    if (!transactions || transactions.length === 0) {
      console.log('⚠️ Транзакции не найдены');
      return;
    }

    // 2. Анализ TON депозитов
    const tonDeposits = transactions.filter(t => 
      t.type === 'TON_DEPOSIT' || t.type === 'DEPOSIT'
    );

    console.log(`\n💰 TON депозиты: ${tonDeposits.length}`);
    
    tonDeposits.forEach((tx, index) => {
      console.log(`\n--- TON Депозит ${index + 1} ---`);
      console.log(`ID: ${tx.id}`);
      console.log(`Тип: ${tx.type}`);
      console.log(`Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`Статус: ${tx.status}`);
      console.log(`Описание: ${tx.description}`);
      console.log(`TX Hash: ${tx.tx_hash || 'отсутствует'}`);
      console.log(`BOC Data: ${tx.boc_data ? 'присутствует' : 'отсутствует'}`);
      if (tx.boc_data) {
        console.log(`BOC длина: ${tx.boc_data.length} символов`);
        console.log(`BOC начало: ${tx.boc_data.substring(0, 50)}...`);
      }
      console.log(`Создан: ${tx.created_at}`);
      console.log(`Обновлен: ${tx.updated_at}`);
    });

    // 3. Поиск дубликатов по BOC данным
    console.log(`\n🔍 АНАЛИЗ ДУБЛИКАТОВ:`);
    
    const bocMatches = tonDeposits.filter(tx => 
      tx.boc_data && tx.boc_data.includes(BOC_FROM_USER.substring(0, 50))
    );

    console.log(`Транзакций с указанным BOC: ${bocMatches.length}`);

    // 4. Поиск дубликатов по времени создания
    const timeGroups = new Map();
    tonDeposits.forEach(tx => {
      const timeKey = new Date(tx.created_at).getTime();
      const hourKey = Math.floor(timeKey / (5 * 60 * 1000)); // группировка по 5-минутным интервалам
      
      if (!timeGroups.has(hourKey)) {
        timeGroups.set(hourKey, []);
      }
      timeGroups.get(hourKey).push(tx);
    });

    console.log(`\n⏰ ГРУППИРОВКА ПО ВРЕМЕНИ (5-минутные интервалы):`);
    timeGroups.forEach((txs, timeKey) => {
      if (txs.length > 1) {
        console.log(`\n🚨 ПОТЕНЦИАЛЬНЫЙ ДУБЛИКАТ - Интервал ${timeKey}:`);
        txs.forEach(tx => {
          console.log(`  - ID ${tx.id}: ${tx.amount} ${tx.currency} (${tx.created_at})`);
          console.log(`    Hash: ${tx.tx_hash || 'нет'}`);
          console.log(`    BOC: ${tx.boc_data ? 'есть' : 'нет'}`);
        });
      }
    });

    // 5. Анализ идентичных сумм
    console.log(`\n💵 АНАЛИЗ ИДЕНТИЧНЫХ СУММ:`);
    const amountGroups = new Map();
    tonDeposits.forEach(tx => {
      const key = `${tx.amount}_${tx.currency}`;
      if (!amountGroups.has(key)) {
        amountGroups.set(key, []);
      }
      amountGroups.get(key).push(tx);
    });

    amountGroups.forEach((txs, amountKey) => {
      if (txs.length > 1) {
        console.log(`\n🔄 Одинаковая сумма ${amountKey}:`);
        txs.forEach(tx => {
          console.log(`  - ID ${tx.id} (${tx.created_at})`);
        });
      }
    });

    // 6. Проверка текущего баланса пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance_ton, balance_uni')
      .eq('id', 25)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения баланса пользователя:', userError);
    } else {
      console.log(`\n💰 ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ 25:`);
      console.log(`TON: ${user.balance_ton || 0}`);
      console.log(`UNI: ${user.balance_uni || 0}`);
    }

    // 7. Рекомендации
    console.log(`\n📋 АНАЛИЗ И РЕКОМЕНДАЦИИ:`);
    console.log(`1. Всего TON депозитов: ${tonDeposits.length}`);
    console.log(`2. Дубликатов по времени: ${Array.from(timeGroups.values()).filter(txs => txs.length > 1).length}`);
    console.log(`3. Дубликатов по сумме: ${Array.from(amountGroups.values()).filter(txs => txs.length > 1).length}`);
    
    if (tonDeposits.length > 1) {
      console.log(`\n⚠️ ПРОБЛЕМА ПОДТВЕРЖДЕНА: Обнаружено ${tonDeposits.length} депозита на 1 TON`);
      console.log(`\n🔧 ВЕРОЯТНЫЕ ПРИЧИНЫ:`);
      console.log(`- Система обрабатывает транзакции и по BOC, и по hash одновременно`);
      console.log(`- Дублирование в логике обработки блокчейн событий`);
      console.log(`- Отсутствие проверки уникальности по обоим параметрам`);
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запуск анализа
investigateDuplicateTransactions().then(() => {
  console.log('\n✅ Анализ завершен');
  process.exit(0);
}).catch(error => {
  console.error('❌ Фатальная ошибка:', error);
  process.exit(1);
});