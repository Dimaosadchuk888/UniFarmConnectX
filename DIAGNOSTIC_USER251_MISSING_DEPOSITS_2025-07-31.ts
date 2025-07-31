#!/usr/bin/env tsx
/**
 * 🔍 ДИАГНОСТИКА ПРОПАВШИХ ДЕПОЗИТОВ USER 251
 * Анализ всех транзакций и балансов без изменения кода
 * Дата: 31.07.2025
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 НАЧИНАЕМ ДИАГНОСТИКУ ПРОПАВШИХ ДЕПОЗИТОВ USER 251');
console.log('='.repeat(60));

async function diagnoseUser251Deposits() {
  try {
    // 1. Получаем информацию о пользователе 251
    console.log('\n1️⃣ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ 251:');
    const { data: user251, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 251)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя 251:', userError);
      return;
    }

    console.log(`👤 Пользователь: ${user251.first_name} ${user251.last_name} (@${user251.username})`);
    console.log(`🆔 Telegram ID: ${user251.telegram_id}`);
    console.log(`💰 Текущий UNI баланс: ${user251.balance_uni || 0}`);
    console.log(`💎 Текущий TON баланс: ${user251.balance_ton || 0}`);
    console.log(`📅 Создан: ${user251.created_at}`);
    console.log(`⏰ Обновлен: ${user251.updated_at}`);

    // 2. Анализируем все транзакции пользователя 251
    console.log('\n2️⃣ АНАЛИЗ ВСЕХ ТРАНЗАКЦИЙ USER 251:');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 251)
      .order('created_at', { ascending: false });

    if (transError) {
      console.error('❌ Ошибка получения транзакций:', transError);
      return;
    }

    console.log(`📊 Общее количество транзакций: ${transactions.length}`);

    // Группируем транзакции по типам
    const transactionsByType = transactions.reduce((acc, tx) => {
      const type = tx.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(tx);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n📈 ТРАНЗАКЦИИ ПО ТИПАМ:');
    Object.entries(transactionsByType).forEach(([type, txList]) => {
      console.log(`  ${type}: ${txList.length} транзакций`);
      
      // Показываем детали для депозитов
      if (type.includes('DEPOSIT') || type.includes('TON_DEPOSIT')) {
        console.log('    💰 ДЕПОЗИТЫ:');
        txList.forEach(tx => {
          console.log(`      - ${tx.created_at}: ${tx.amount} ${tx.currency} (${tx.status}) - ${tx.description || 'Без описания'}`);
        });
      }
    });

    // 3. Ищем недавние депозиты (последние 7 дней)
    console.log('\n3️⃣ НЕДАВНИЕ ДЕПОЗИТЫ (ПОСЛЕДНИЕ 7 ДНЕЙ):');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentDeposits = transactions.filter(tx => 
      (tx.type.includes('DEPOSIT') || tx.type === 'TON_DEPOSIT') &&
      new Date(tx.created_at) > sevenDaysAgo
    );

    if (recentDeposits.length === 0) {
      console.log('🔍 Депозиты за последние 7 дней НЕ НАЙДЕНЫ');
    } else {
      console.log(`📥 Найдено ${recentDeposits.length} недавних депозитов:`);
      recentDeposits.forEach(deposit => {
        console.log(`  📅 ${deposit.created_at}`);
        console.log(`  💰 Сумма: ${deposit.amount} ${deposit.currency}`);
        console.log(`  📝 Статус: ${deposit.status}`);
        console.log(`  🏷️ Описание: ${deposit.description || 'Нет описания'}`);
        console.log(`  🔗 Hash: ${deposit.hash || 'Нет hash'}`);
        console.log(`  📊 Metadata: ${JSON.stringify(deposit.metadata || {}, null, 2)}`);
        console.log('  ' + '-'.repeat(40));
      });
    }

    // 4. Проверяем баланс расчетно по транзакциям
    console.log('\n4️⃣ РАСЧЕТ БАЛАНСА ПО ТРАНЗАКЦИЯМ:');
    let calculatedUNI = 0;
    let calculatedTON = 0;

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount || 0);
      const currency = tx.currency;
      
      // Определяем, прибавляем или вычитаем
      const isCredit = ['DEPOSIT', 'TON_DEPOSIT', 'REFERRAL_REWARD', 'FARMING_REWARD', 
                       'MISSION_REWARD', 'DAILY_BONUS', 'ADMIN_COMPENSATION', 'MANUAL_DEPOSIT'].includes(tx.type);
      const isDebit = ['WITHDRAWAL', 'BOOST_PURCHASE', 'withdrawal_fee'].includes(tx.type);

      if (currency === 'UNI') {
        if (isCredit) calculatedUNI += amount;
        if (isDebit) calculatedUNI -= amount;
      } else if (currency === 'TON') {
        if (isCredit) calculatedTON += amount;
        if (isDebit) calculatedTON -= amount;
      }
    });

    console.log(`🧮 Расчетный UNI баланс: ${calculatedUNI.toFixed(6)}`);
    console.log(`🧮 Расчетный TON баланс: ${calculatedTON.toFixed(6)}`);
    console.log(`📊 Актуальный UNI баланс: ${user251.balance_uni || 0}`);
    console.log(`📊 Актуальный TON баланс: ${user251.balance_ton || 0}`);

    // 5. Проверяем расхождения
    const uniDiff = Math.abs(calculatedUNI - parseFloat(user251.balance_uni || 0));
    const tonDiff = Math.abs(calculatedTON - parseFloat(user251.balance_ton || 0));

    console.log('\n5️⃣ АНАЛИЗ РАСХОЖДЕНИЙ:');
    if (uniDiff > 0.01) {
      console.log(`⚠️ РАСХОЖДЕНИЕ UNI: ${uniDiff.toFixed(6)} (возможная проблема)`);
    } else {
      console.log(`✅ UNI баланс соответствует транзакциям`);
    }

    if (tonDiff > 0.01) {
      console.log(`⚠️ РАСХОЖДЕНИЕ TON: ${tonDiff.toFixed(6)} (возможная проблема)`);
    } else {
      console.log(`✅ TON баланс соответствует транзакциям`);
    }

    // 6. Проверяем TON Boost статус
    console.log('\n6️⃣ TON BOOST СТАТУС:');
    console.log(`🚀 TON Boost активен: ${user251.ton_boost_active ? 'ДА' : 'НЕТ'}`);
    console.log(`📦 TON Boost пакет: ${user251.ton_boost_package || 'Не выбран'}`);
    console.log(`📈 TON Boost курс: ${user251.ton_boost_rate || 0}%`);

    // 7. Проверяем данные фарминга
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 251)
      .single();

    console.log('\n7️⃣ ДАННЫЕ ФАРМИНГА:');
    if (farmingError || !farmingData) {
      console.log('❌ Данные фарминга НЕ НАЙДЕНЫ');
    } else {
      console.log(`💰 Farming баланс: ${farmingData.farming_balance || 0} TON`);
      console.log(`📈 Farming курс: ${farmingData.farming_rate || 0} TON/сек`);
      console.log(`✅ Boost активен: ${farmingData.boost_active ? 'ДА' : 'НЕТ'}`);
      console.log(`📅 Последнее обновление: ${farmingData.updated_at || 'Неизвестно'}`);
    }

    // 8. Итоговый анализ
    console.log('\n8️⃣ ИТОГОВЫЙ АНАЛИЗ:');
    if (recentDeposits.length === 0) {
      console.log('🔍 РЕЗУЛЬТАТ: Недавних депозитов у User 251 НЕ ОБНАРУЖЕНО');
      console.log('💡 Возможные причины:');
      console.log('   • Депозиты были сделаны более 7 дней назад');
      console.log('   • Депозиты не были записаны в базу данных');
      console.log('   • Проблема с интеграцией TON Connect → Backend');
    } else {
      console.log(`✅ РЕЗУЛЬТАТ: Найдено ${recentDeposits.length} недавних депозитов`);
      
      if (tonDiff > 0.01) {
        console.log('⚠️ ПРОБЛЕМА: Расхождение между расчетным и фактическим TON балансом');
        console.log(`   Разница: ${tonDiff.toFixed(6)} TON`);
        console.log('💡 Возможные причины:');
        console.log('   • Депозиты записаны в транзакции, но не обновили баланс');
        console.log('   • Автоматическая коррекция балансов (rollback)');
        console.log('   • Проблема с BalanceManager или синхронизацией');
      }
    }

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запускаем диагностику
diagnoseUser251Deposits().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 ДИАГНОСТИКА ЗАВЕРШЕНА');
  process.exit(0);
});