#!/usr/bin/env tsx

/**
 * 🔍 ПРОВЕРКА RACE CONDITIONS В REFERRAL_REWARD
 * Анализ временных паттернов для понимания источника дубликатов
 */

import { supabase } from './core/supabaseClient';

async function checkReferralRaceConditions() {
  console.log('🔍 АНАЛИЗ RACE CONDITIONS В REFERRAL_REWARD\n');

  try {
    // 1. Найти все REFERRAL_REWARD дубликаты за последние 30 минут
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentReferrals, error } = await supabase
      .from('transactions')
      .select('user_id, amount_ton, created_at, description, metadata')
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (!recentReferrals || recentReferrals.length === 0) {
      console.log('Нет REFERRAL_REWARD транзакций за последние 30 минут');
      return;
    }

    console.log(`Найдено ${recentReferrals.length} REFERRAL_REWARD транзакций за 30 минут\n`);

    // 2. Группируем по пользователям и ищем дубликаты
    const userReferrals = new Map();
    
    recentReferrals.forEach(referral => {
      const key = `${referral.user_id}_${referral.amount_ton}`;
      if (!userReferrals.has(key)) {
        userReferrals.set(key, []);
      }
      userReferrals.get(key).push({
        time: new Date(referral.created_at).toLocaleTimeString(),
        description: referral.description,
        metadata: referral.metadata,
        created_at: referral.created_at
      });
    });

    // 3. Анализируем дубликаты и временные интервалы
    let duplicatesFound = 0;
    const timeGaps = [];

    userReferrals.forEach((referrals, userKey) => {
      if (referrals.length > 1) {
        duplicatesFound++;
        console.log(`\n❗ ДУБЛИКАТ: ${userKey}`);
        
        // Сортируем по времени
        referrals.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        referrals.forEach((ref, index) => {
          console.log(`   ${index + 1}. [${ref.time}] ${ref.description}`);
          if (ref.metadata) {
            console.log(`      Metadata: ${JSON.stringify(ref.metadata)}`);
          }
        });

        // Вычисляем интервалы между дубликатами
        if (referrals.length === 2) {
          const gap = new Date(referrals[1].created_at).getTime() - new Date(referrals[0].created_at).getTime();
          const gapMinutes = Math.round(gap / (1000 * 60));
          timeGaps.push(gapMinutes);
          console.log(`      ⏱️ Интервал между дубликатами: ${gapMinutes} минут`);
        }
      }
    });

    // 4. Анализ временных паттернов
    if (timeGaps.length > 0) {
      console.log('\n📊 АНАЛИЗ ВРЕМЕННЫХ ИНТЕРВАЛОВ:');
      const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
      const minGap = Math.min(...timeGaps);
      const maxGap = Math.max(...timeGaps);
      
      console.log(`Средний интервал: ${avgGap.toFixed(1)} минут`);
      console.log(`Минимальный интервал: ${minGap} минут`);
      console.log(`Максимальный интервал: ${maxGap} минут`);
      
      // Проверяем на систематические интервалы
      const commonIntervals = timeGaps.filter(gap => Math.abs(gap - 10) <= 2 || Math.abs(gap - 5) <= 1);
      if (commonIntervals.length > 0) {
        console.log(`⚠️ Найдены систематические интервалы (~5-10 минут): ${commonIntervals.length} случаев`);
        console.log('Это указывает на scheduler или cron job!');
      }
    }

    // 5. Проверка источников дубликатов
    console.log('\n🔍 АНАЛИЗ ИСТОЧНИКОВ ДУБЛИКАТОВ:');
    const sources = new Map();
    
    recentReferrals.forEach(ref => {
      if (ref.metadata?.source_user_id) {
        const sourceKey = `Source_${ref.metadata.source_user_id}`;
        if (!sources.has(sourceKey)) {
          sources.set(sourceKey, 0);
        }
        sources.set(sourceKey, sources.get(sourceKey) + 1);
      }
    });

    sources.forEach((count, source) => {
      if (count > 20) { // Больше 20 транзакций от одного источника за 30 минут = подозрительно
        console.log(`⚠️ ${source}: ${count} транзакций за 30 минут (возможный источник дублирования)`);
      }
    });

    // 6. Рекомендации
    console.log('\n🛡️ РЕКОМЕНДАЦИИ:');
    if (duplicatesFound > 0) {
      console.log(`❌ Найдено ${duplicatesFound} типов дублированных REFERRAL_REWARD`);
      console.log('1. Проверить защиту в modules/referral/service.ts');
      console.log('2. Искать race conditions в scheduler\'ах');
      console.log('3. Добавить unique constraints в БД');
      
      if (timeGaps.some(gap => gap <= 1)) {
        console.log('⚠️ КРИТИЧНО: Найдены дубликаты с интервалом < 1 минуты - race condition!');
      }
    } else {
      console.log('✅ Дубликатов за последние 30 минут не найдено');
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

checkReferralRaceConditions().catch(console.error);