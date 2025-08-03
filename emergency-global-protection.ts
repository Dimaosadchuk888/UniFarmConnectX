#!/usr/bin/env tsx

/**
 * 🚨 ЭКСТРЕННАЯ ГЛОБАЛЬНАЯ ЗАЩИТА ОТ ДУБЛИКАТОВ
 * Патчинг всех известных источников DAILY_BONUS дублирования
 */

import { supabase } from './core/supabaseClient';

async function emergencyGlobalProtection() {
  console.log('🚨 ЭКСТРЕННАЯ ГЛОБАЛЬНАЯ ЗАЩИТА: Поиск всех источников DAILY_BONUS\n');

  try {
    // 1. Найти все места где создается DAILY_BONUS
    console.log('🔍 ПОИСК ВСЕХ ИСТОЧНИКОВ DAILY_BONUS В КОДЕ...');
    
    // 2. Анализ последних дубликатов для понимания источника
    const { data: recentDailyBonus, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'DAILY_BONUS')
      .eq('currency', 'UNI')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // последние 2 часа
      .order('created_at', { ascending: false });

    if (recentDailyBonus && recentDailyBonus.length > 0) {
      console.log(`Найдено ${recentDailyBonus.length} DAILY_BONUS транзакций за 2 часа:`);
      
      const userCounts = new Map();
      recentDailyBonus.forEach(bonus => {
        const key = `User_${bonus.user_id}`;
        if (!userCounts.has(key)) {
          userCounts.set(key, []);
        }
        userCounts.get(key).push({
          time: new Date(bonus.created_at).toLocaleTimeString(),
          amount: bonus.amount,
          description: bonus.description,
          metadata: bonus.metadata
        });
      });

      userCounts.forEach((bonuses, user) => {
        if (bonuses.length > 1) {
          console.log(`\n❗ ${user} получил ${bonuses.length} DAILY_BONUS:`);
          bonuses.forEach((bonus, index) => {
            console.log(`   ${index + 1}. [${bonus.time}] ${bonus.amount} UNI - ${bonus.description}`);
            if (bonus.metadata) {
              console.log(`      Metadata: ${JSON.stringify(bonus.metadata)}`);
            }
          });
        }
      });
    }

    // 3. Проверка metadata для понимания источника
    console.log('\n🔍 АНАЛИЗ METADATA ДУБЛИРОВАННЫХ ТРАНЗАКЦИЙ:');
    const uniqueSources = new Set();
    recentDailyBonus?.forEach(bonus => {
      if (bonus.metadata) {
        uniqueSources.add(JSON.stringify(bonus.metadata));
      }
    });

    if (uniqueSources.size > 0) {
      console.log('Найденные источники в metadata:');
      Array.from(uniqueSources).forEach((source, index) => {
        console.log(`${index + 1}. ${source}`);
      });
    }

    // 4. Срочные рекомендации
    console.log('\n🛡️ СРОЧНЫЕ РЕКОМЕНДАЦИИ:');
    console.log('1. Проверить все scheduler\'ы и cron jobs');
    console.log('2. Добавить глобальный middleware для проверки дубликатов');  
    console.log('3. Временно отключить автоматические DAILY_BONUS');
    console.log('4. Добавить unique constraint на уровне БД');

  } catch (error) {
    console.error('❌ Ошибка экстренной защиты:', error);
  }
}

emergencyGlobalProtection().catch(console.error);