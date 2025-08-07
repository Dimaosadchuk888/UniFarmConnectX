import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testNewDepositType() {
  console.log('[TestNewDepositType] Проверяем новый тип транзакций FARMING_DEPOSIT...\n');

  try {
    // Проверяем последние транзакции
    const { data: recentTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['FARMING_DEPOSIT', 'FARMING_REWARD'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[ERROR] Ошибка получения транзакций:', error);
      return;
    }

    // Группируем по типам
    const grouped = {};
    recentTransactions.forEach(t => {
      if (!grouped[t.type]) grouped[t.type] = [];
      grouped[t.type].push(t);
    });

    console.log('📊 Последние транзакции по типам:\n');
    
    // Проверяем FARMING_DEPOSIT
    if (grouped['FARMING_DEPOSIT']) {
      console.log(`✅ Найдено ${grouped['FARMING_DEPOSIT'].length} транзакций типа FARMING_DEPOSIT:`);
      grouped['FARMING_DEPOSIT'].slice(0, 3).forEach(t => {
        console.log(`  - ${t.created_at}: User ${t.user_id}, ${t.amount_uni} UNI - ${t.description}`);
      });
    } else {
      console.log('⚠️  Транзакций типа FARMING_DEPOSIT пока не найдено');
      console.log('   Это нормально - они появятся после первого депозита с новым кодом');
    }

    // Показываем примеры FARMING_REWARD
    if (grouped['FARMING_REWARD']) {
      console.log(`\n📈 Транзакции типа FARMING_REWARD (${grouped['FARMING_REWARD'].length} штук):`);
      
      // Ищем депозиты (отрицательные суммы)
      const deposits = grouped['FARMING_REWARD'].filter(t => parseFloat(t.amount_uni) < 0);
      if (deposits.length > 0) {
        console.log(`\n  💰 Старые депозиты (отрицательные суммы): ${deposits.length}`);
        deposits.slice(0, 2).forEach(t => {
          console.log(`    - ${t.created_at}: User ${t.user_id}, ${t.amount_uni} UNI`);
        });
      }
      
      // Показываем обычные начисления
      const rewards = grouped['FARMING_REWARD'].filter(t => parseFloat(t.amount_uni) > 0);
      console.log(`\n  📊 Начисления фарминга: ${rewards.length}`);
      rewards.slice(0, 2).forEach(t => {
        console.log(`    - ${t.created_at}: User ${t.user_id}, +${t.amount_uni} UNI`);
      });
    }

    console.log('\n✅ Тест завершен!');
    console.log('   После следующего депозита должны появиться транзакции типа FARMING_DEPOSIT');

  } catch (error) {
    console.error('[ERROR] Общая ошибка:', error);
  }
}

testNewDepositType();