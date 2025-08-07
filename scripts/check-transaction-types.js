import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkTransactionTypes() {
  console.log('[CheckTransactionTypes] Проверяем типы транзакций в базе данных...\n');

  try {
    // Получаем все уникальные типы транзакций
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('type')
      .limit(1000);

    if (error) {
      console.error('[ERROR] Ошибка получения транзакций:', error);
      return;
    }

    // Считаем количество каждого типа
    const typeCounts = {};
    transactions.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });

    // Сортируем по количеству
    const sortedTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a);

    console.log('📊 Типы транзакций в базе данных:\n');
    sortedTypes.forEach(([type, count]) => {
      console.log(`  ${type}: ${count} транзакций`);
    });

    // Проверяем наличие FARMING_DEPOSIT
    if (!typeCounts['FARMING_DEPOSIT']) {
      console.log('\n⚠️  Тип FARMING_DEPOSIT отсутствует в базе данных!');
      console.log('   Сейчас используется тип FARMING_REWARD с отрицательной суммой для депозитов.');
    }

    // Примеры транзакций с FARMING
    console.log('\n📝 Примеры транзакций типа FARMING_REWARD:');
    const { data: farmingExamples } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .limit(5)
      .order('created_at', { ascending: false });

    farmingExamples?.forEach(t => {
      console.log(`  - ${t.created_at}: ${t.amount_uni} UNI (${t.description})`);
    });

  } catch (error) {
    console.error('[ERROR] Общая ошибка:', error);
  }
}

checkTransactionTypes();