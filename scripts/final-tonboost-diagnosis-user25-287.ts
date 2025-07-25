#!/usr/bin/env tsx
/**
 * ФИНАЛЬНАЯ ДИАГНОСТИКА TON BOOST для пользователей ID 25 и ID 287
 * Техническое задание: Точечная проверка логики начислений и списаний
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только диагностика
 */

import { supabase } from '../core/supabase';

async function finalTonBoostDiagnosis() {
  console.log('🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА TON BOOST - ПОЛЬЗОВАТЕЛИ ID 25 и ID 287');
  console.log('================================================================');
  console.log(`Дата диагностики: ${new Date().toLocaleString('ru-RU')}\n`);

  const targetUsers = [25, 287];

  for (const userId of targetUsers) {
    console.log(`\n┌─ ДИАГНОСТИКА ПОЛЬЗОВАТЕЛЯ ID ${userId} ─┐`);
    console.log('│'.padEnd(50, ' ') + '│');

    // 🔹 1. ФИКСАЦИЯ ДЕПОЗИТА - проверка транзакций покупки
    console.log('🔹 1. ФИКСАЦИЯ ДЕПОЗИТА');
    console.log('─'.repeat(30));
    
    const { data: boostPurchases } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('type.eq.BOOST_PURCHASE,description.ilike.%boost%,description.ilike.%Boost%')
      .order('created_at', { ascending: false });

    if (boostPurchases && boostPurchases.length > 0) {
      console.log(`✅ Найдено ${boostPurchases.length} транзакций покупки TON Boost:`);
      boostPurchases.forEach(tx => {
        console.log(`   • ID: ${tx.id} | ${tx.created_at}`);
        console.log(`     Тип: ${tx.type} | Сумма: ${tx.amount || tx.amount_ton} ${tx.currency}`);
        console.log(`     Статус: ${tx.status} | Подтверждена: ${tx.is_confirmed ? 'ДА' : 'НЕТ'}`);
        console.log(`     Описание: ${tx.description}`);
        if (tx.metadata) {
          console.log(`     Метаданные:`, JSON.stringify(tx.metadata, null, 2));
        }
        console.log('');
      });
    } else {
      console.log('❌ Транзакции покупки TON Boost не найдены');
    }

    // 🔹 2. АКТИВАЦИЯ BOOST-ПАКЕТА
    console.log('🔹 2. АКТИВАЦИЯ BOOST-ПАКЕТА');
    console.log('─'.repeat(30));

    // Проверяем таблицу пользователей
    const { data: userData } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate, ton_boost_start_timestamp, balance_ton')
      .eq('id', userId)
      .single();

    if (userData) {
      console.log('✅ Данные пользователя в таблице users:');
      console.log(`   • TON Boost Package: ${userData.ton_boost_package || 'НЕТ'}`);
      console.log(`   • TON Boost Package ID: ${userData.ton_boost_package_id || 'НЕТ'}`);
      console.log(`   • TON Boost Rate: ${userData.ton_boost_rate || 'НЕТ'}`);
      console.log(`   • Дата начала: ${userData.ton_boost_start_timestamp || 'НЕТ'}`);
      console.log(`   • Баланс TON: ${userData.balance_ton || 0}`);
    }

    // Проверяем ton_farming_data
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId);

    if (farmingData && farmingData.length > 0) {
      console.log('\n✅ Записи в ton_farming_data:');
      farmingData.forEach(data => {
        console.log(`   • Package ID: ${data.boost_package_id}`);
        console.log(`   • Активен: ${data.boost_active ? 'ДА' : 'НЕТ'}`);
        console.log(`   • Баланс фарминга: ${data.farming_balance}`);
        console.log(`   • Дата начала: ${data.start_date}`);
        console.log(`   • Дата окончания: ${data.end_date}`);
        console.log(`   • Ставка фарминга: ${data.farming_rate}`);
        console.log('');
      });
    } else {
      console.log('❌ Записи в ton_farming_data не найдены');
    }

    // 🔹 3. ПЛАНИРОВЩИК НАЧИСЛЕНИЙ
    console.log('🔹 3. ПЛАНИРОВЩИК НАЧИСЛЕНИЙ');
    console.log('─'.repeat(30));

    // Проверяем последние начисления TON
    const { data: tonIncomes } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tonIncomes && tonIncomes.length > 0) {
      console.log(`✅ Найдено ${tonIncomes.length} начислений TON от планировщика:`);
      tonIncomes.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.created_at}`);
        console.log(`      Сумма: ${tx.amount_ton} TON`);
        console.log(`      Описание: ${tx.description}`);
        if (tx.metadata?.original_type) {
          console.log(`      Оригинальный тип: ${tx.metadata.original_type}`);
        }
      });

      // Анализ частоты начислений
      if (tonIncomes.length >= 2) {
        const lastTime = new Date(tonIncomes[0].created_at);
        const prevTime = new Date(tonIncomes[1].created_at);
        const intervalMinutes = (lastTime.getTime() - prevTime.getTime()) / (1000 * 60);
        console.log(`\n   📊 Интервал между последними начислениями: ${intervalMinutes.toFixed(1)} минут`);
        
        const timeSinceLastIncome = (Date.now() - lastTime.getTime()) / (1000 * 60);
        console.log(`   ⏱️ Время с последнего начисления: ${timeSinceLastIncome.toFixed(1)} минут`);
        
        if (timeSinceLastIncome > 10) {
          console.log('   ⚠️ ПРОБЛЕМА: Планировщик не работает более 10 минут!');
        } else {
          console.log('   ✅ Планировщик работает нормально');
        }
      }
    } else {
      console.log('❌ Начисления TON от планировщика не найдены');
    }

    // 🔹 4. ПОВТОРНЫЙ ВОЗВРАТ СРЕДСТВ
    console.log('\n🔹 4. АНАЛИЗ ВОЗВРАТА СРЕДСТВ');
    console.log('─'.repeat(30));

    // Ищем транзакции, которые могут выглядеть как возврат
    const { data: allTonTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('currency.eq.TON,amount_ton.gt.0')
      .order('created_at', { ascending: false })
      .limit(50);

    if (allTonTx && allTonTx.length > 0) {
      console.log('📊 АНАЛИЗ ВСЕХ TON ТРАНЗАКЦИЙ за последнее время:');
      
      const transactionTypes = new Map();
      let totalTonIn = 0;
      let totalTonOut = 0;
      
      allTonTx.forEach(tx => {
        const amount = parseFloat(tx.amount_ton || tx.amount || '0');
        const type = tx.type;
        
        transactionTypes.set(type, (transactionTypes.get(type) || 0) + 1);
        
        if (type === 'BOOST_PURCHASE' || type === 'WITHDRAWAL') {
          totalTonOut += amount;
        } else {
          totalTonIn += amount;
        }
      });

      console.log('\n   Типы транзакций:');
      for (const [type, count] of transactionTypes) {
        console.log(`   • ${type}: ${count} транзакций`);
      }
      
      console.log(`\n   💰 Общий приход TON: ${totalTonIn.toFixed(6)}`);
      console.log(`   💸 Общий расход TON: ${totalTonOut.toFixed(6)}`);
      console.log(`   📈 Баланс изменений: ${(totalTonIn - totalTonOut).toFixed(6)}`);

      // Ищем подозрительные паттерны
      console.log('\n   🔍 ПОИСК ПОДОЗРИТЕЛЬНЫХ ПАТТЕРНОВ:');
      
      const boostPurchases = allTonTx.filter(tx => 
        tx.type === 'BOOST_PURCHASE' || 
        (tx.description && tx.description.toLowerCase().includes('boost'))
      );
      
      const farmingRewards = allTonTx.filter(tx => 
        tx.type === 'FARMING_REWARD' && 
        (tx.currency === 'TON' || parseFloat(tx.amount_ton || '0') > 0)
      );

      console.log(`   • Покупок Boost: ${boostPurchases.length}`);
      console.log(`   • Начислений TON: ${farmingRewards.length}`);
      
      if (boostPurchases.length > 0 && farmingRewards.length > boostPurchases.length * 2) {
        console.log('   ⚠️ ПОДОЗРЕНИЕ: Начислений значительно больше покупок!');
        console.log(`   📊 Соотношение: ${farmingRewards.length} начислений на ${boostPurchases.length} покупок`);
      }

      // Показываем последние 5 транзакций для детального анализа
      console.log('\n   📝 Последние 5 TON транзакций:');
      allTonTx.slice(0, 5).forEach((tx, i) => {
        console.log(`   ${i + 1}. [${tx.created_at}] ${tx.type}`);
        console.log(`      Сумма: ${tx.amount_ton || tx.amount} TON`);
        console.log(`      Описание: ${tx.description || 'Нет описания'}`);
      });
    }

    // 🔹 5. КЭШИРОВАНИЕ / ОТЛОЖЕННЫЕ ЗАПИСИ
    console.log('\n🔹 5. ПРОВЕРКА АКТУАЛЬНОСТИ ДАННЫХ');
    console.log('─'.repeat(30));

    // Проверяем последнюю активность пользователя
    const { data: recentActivity } = await supabase
      .from('transactions')
      .select('created_at, type, description')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentActivity && recentActivity.length > 0) {
      const lastActivity = new Date(recentActivity[0].created_at);
      const timeSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60);
      
      console.log(`✅ Последняя активность: ${lastActivity.toLocaleString('ru-RU')}`);
      console.log(`⏱️ Время с последней активности: ${timeSinceActivity.toFixed(1)} минут`);
      
      if (timeSinceActivity < 60) {
        console.log('✅ Данные актуальны (активность менее часа назад)');
      } else {
        console.log('⚠️ Данные могут быть устаревшими (активность более часа назад)');
      }
    }

    console.log('│'.padEnd(50, ' ') + '│');
    console.log(`└${'─'.repeat(48)}┘\n`);
  }

  // ИТОГОВАЯ СВОДКА
  console.log('\n🏁 ИТОГОВАЯ СВОДКА ДИАГНОСТИКИ');
  console.log('═'.repeat(50));

  for (const userId of targetUsers) {
    console.log(`\n📋 ПОЛЬЗОВАТЕЛЬ ID ${userId}:`);
    
    // Получаем ключевые данные для итогового анализа
    const { data: summary } = await supabase
      .from('users')
      .select('id, ton_boost_package, balance_ton')
      .eq('id', userId)
      .single();

    const { data: lastTonIncome } = await supabase
      .from('transactions')
      .select('created_at, amount_ton')
      .eq('user_id', userId)
      .eq('type', 'FARMING_REWARD')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: boostPurchaseCount } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .or('type.eq.BOOST_PURCHASE,description.ilike.%boost%');

    if (summary) {
      console.log(`   • Boost пакет: ${summary.ton_boost_package || 'НЕТ'}`);
      console.log(`   • Баланс TON: ${summary.balance_ton || 0}`);
      console.log(`   • Покупок Boost: ${boostPurchaseCount?.length || 0}`);
      
      if (lastTonIncome && lastTonIncome.length > 0) {
        const timeSince = (Date.now() - new Date(lastTonIncome[0].created_at).getTime()) / (1000 * 60);
        console.log(`   • Последнее начисление: ${timeSince.toFixed(1)} минут назад`);
        console.log(`   • Сумма последнего начисления: ${lastTonIncome[0].amount_ton} TON`);
      } else {
        console.log(`   • Начисления: НЕТ`);
      }
    }
  }

  console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log(`Время выполнения: ${new Date().toLocaleString('ru-RU')}`);
}

// Запуск диагностики
finalTonBoostDiagnosis()
  .then(() => {
    console.log('\n🎯 Диагностика выполнена успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка диагностики:', error);
    process.exit(1);
  });