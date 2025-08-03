#!/usr/bin/env tsx

/**
 * 🔍 ПРОДАКШН МОНИТОРИНГ: Проверка эффективности исправлений
 * Безопасный скрипт для отслеживания дубликатов после исправлений
 */

import { supabase } from './core/supabaseClient';

async function productionMonitoring() {
  console.log('🔍 ПРОДАКШН МОНИТОРИНГ: Проверка дубликатов\n');

  try {
    // 1. Проверяем дубликаты за последний час (после исправлений)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    console.log('📊 АНАЛИЗ ДУБЛИКАТОВ ЗА ПОСЛЕДНИЙ ЧАС:');
    
    // Группируем транзакции для поиска дубликатов
    const { data: recentTransactions, error } = await supabase
      .from('transactions')
      .select('user_id, type, amount, amount_uni, amount_ton, currency, created_at, description')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (recentTransactions && recentTransactions.length > 0) {
      console.log(`Всего транзакций за час: ${recentTransactions.length}`);
      
      // Анализируем дубликаты
      const duplicateMap = new Map();
      
      recentTransactions.forEach(tx => {
        const key = `${tx.user_id}_${tx.type}_${tx.amount_uni || tx.amount_ton || tx.amount}_${tx.currency}`;
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key).push({
          time: new Date(tx.created_at).toLocaleTimeString(),
          description: tx.description
        });
      });

      let duplicatesFound = 0;
      duplicateMap.forEach((transactions, key) => {
        if (transactions.length > 1) {
          duplicatesFound++;
          console.log(`\n❗ ДУБЛИКАТ: ${key}`);
          transactions.forEach((tx, index) => {
            console.log(`   ${index + 1}. [${tx.time}] ${tx.description}`);
          });
        }
      });

      if (duplicatesFound === 0) {
        console.log('✅ ОТЛИЧНО: Дубликатов за последний час не найдено!');
      } else {
        console.log(`\n⚠️ Найдено ${duplicatesFound} типов дублированных транзакций`);
      }
    }

    // 2. Проверяем конкретно User 25 (если проблема была с ним)
    console.log('\n👤 ПРОВЕРКА USER 25:');
    const { data: user25Recent, error: user25Error } = await supabase
      .from('transactions')
      .select('type, amount_uni, amount_ton, created_at, description')
      .eq('user_id', 25)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (user25Recent && user25Recent.length > 0) {
      console.log(`Транзакций User 25 за час: ${user25Recent.length}`);
      user25Recent.forEach((tx, index) => {
        const time = new Date(tx.created_at).toLocaleTimeString();
        console.log(`${index + 1}. [${time}] ${tx.type} | UNI: ${tx.amount_uni} | TON: ${tx.amount_ton}`);
      });
    } else {
      console.log('Транзакций User 25 за последний час не найдено');
    }

    // 3. Проверяем DAILY_BONUS конкретно
    console.log('\n🎁 АНАЛИЗ DAILY_BONUS ТРАНЗАКЦИЙ:');
    const { data: dailyBonuses, error: bonusError } = await supabase
      .from('transactions')
      .select('user_id, amount, created_at, description')
      .eq('type', 'DAILY_BONUS')
      .eq('currency', 'UNI')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (dailyBonuses && dailyBonuses.length > 0) {
      console.log(`DAILY_BONUS транзакций за час: ${dailyBonuses.length}`);
      
      // Группируем по пользователям и сумме
      const bonusMap = new Map();
      dailyBonuses.forEach(bonus => {
        const key = `User_${bonus.user_id}_${bonus.amount}`;
        if (!bonusMap.has(key)) {
          bonusMap.set(key, []);
        }
        bonusMap.get(key).push({
          time: new Date(bonus.created_at).toLocaleTimeString(),
          description: bonus.description
        });
      });

      let bonusDuplicates = 0;
      bonusMap.forEach((bonuses, key) => {
        if (bonuses.length > 1) {
          bonusDuplicates++;
          console.log(`❗ ДУБЛИРОВАННЫЙ BONUS: ${key}`);
          bonuses.forEach((bonus, index) => {
            console.log(`   ${index + 1}. [${bonus.time}] ${bonus.description}`);
          });
        }
      });

      if (bonusDuplicates === 0) {
        console.log('✅ ОТЛИЧНО: Дублированных DAILY_BONUS не найдено!');
      } else {
        console.log(`⚠️ Найдено ${bonusDuplicates} дублированных DAILY_BONUS`);
      }
    } else {
      console.log('DAILY_BONUS транзакций за час не найдено');
    }

    // 4. Общая статистика
    console.log('\n📈 ОБЩАЯ СТАТИСТИКА ИСПРАВЛЕНИЙ:');
    console.log('- ✅ Добавлена проверка дубликатов в awardUniBonus()');
    console.log('- ✅ Создан DeduplicationHelper для безопасных проверок');
    console.log('- ✅ Добавлено логирование предотвращенных дубликатов');
    console.log('- 🔄 Мониторинг активен');

  } catch (error) {
    console.error('❌ Ошибка мониторинга:', error);
  }
}

productionMonitoring().catch(console.error);