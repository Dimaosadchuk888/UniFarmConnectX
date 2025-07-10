#!/usr/bin/env node

/**
 * Проверка последних транзакций farming
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkRecentTransactions() {
  console.log('=== ПРОВЕРКА ПОСЛЕДНИХ FARMING ТРАНЗАКЦИЙ ===');
  console.log(new Date().toLocaleString('ru-RU'));
  console.log('');

  try {
    // Проверяем последние 20 транзакций FARMING_REWARD
    const { data: recentTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Ошибка получения транзакций:', error);
      return;
    }

    console.log(`📊 Найдено ${recentTransactions?.length || 0} последних FARMING_REWARD транзакций`);
    console.log('');

    if (recentTransactions && recentTransactions.length > 0) {
      console.log('Последние транзакции:');
      console.log('=====================================');
      
      recentTransactions.forEach((tx, index) => {
        const isUni = parseFloat(tx.amount_uni || '0') > 0;
        const isTon = parseFloat(tx.amount_ton || '0') > 0;
        
        console.log(`\n${index + 1}. Транзакция ID: ${tx.id}`);
        console.log(`   User ID: ${tx.user_id}`);
        console.log(`   Тип: ${isUni ? 'UNI Farming' : isTon ? 'TON Boost' : 'Unknown'}`);
        console.log(`   Сумма: ${isUni ? tx.amount_uni + ' UNI' : tx.amount_ton + ' TON'}`);
        console.log(`   Создана: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`   Описание: ${tx.description || 'Нет описания'}`);
      });

      // Проверяем время последней транзакции
      const lastTransaction = recentTransactions[0];
      const lastTransactionTime = new Date(lastTransaction.created_at);
      const timeSinceLastTransaction = Date.now() - lastTransactionTime.getTime();
      const minutesSince = Math.floor(timeSinceLastTransaction / (1000 * 60));

      console.log('\n=====================================');
      console.log(`⏰ Время с последней транзакции: ${minutesSince} минут`);
      
      if (minutesSince > 10) {
        console.log('⚠️  ВНИМАНИЕ: Прошло более 10 минут с последней транзакции!');
        console.log('   Scheduler может не работать.');
      } else {
        console.log('✅ Транзакции создаются регулярно');
      }

    } else {
      console.log('❌ Транзакции FARMING_REWARD не найдены!');
    }

    // Проверяем транзакции за последний час
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: lastHourTransactions, error: hourError } = await supabase
      .from('transactions')
      .select('user_id, amount_uni, amount_ton')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', oneHourAgo.toISOString());

    if (!hourError && lastHourTransactions) {
      const uniCount = lastHourTransactions.filter(tx => parseFloat(tx.amount_uni || '0') > 0).length;
      const tonCount = lastHourTransactions.filter(tx => parseFloat(tx.amount_ton || '0') > 0).length;
      const uniqueUsers = new Set(lastHourTransactions.map(tx => tx.user_id)).size;

      console.log('\n📈 Статистика за последний час:');
      console.log(`   UNI Farming транзакций: ${uniCount}`);
      console.log(`   TON Boost транзакций: ${tonCount}`);
      console.log(`   Уникальных пользователей: ${uniqueUsers}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запуск проверки
checkRecentTransactions().catch(console.error);