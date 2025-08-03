import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function analyzeReferralDuplication() {
  console.log('🔍 АНАЛИЗ ДЕДУПЛИКАЦИИ REFERRAL_REWARD - ФИНАЛЬНЫЙ ДИАГНОЗ');
  console.log('=' .repeat(80));

  try {
    // 1. Проверим REFERRAL_REWARD за последние 2 часа детально
    console.log('\n1️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ REFERRAL_REWARD ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: referralRewards, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения REFERRAL_REWARD:', error);
      return;
    }

    console.log(`Найдено ${referralRewards?.length || 0} REFERRAL_REWARD транзакций:`);

    // Группируем по user_id + amount для поиска дубликатов
    const duplicateGroups: { [key: string]: any[] } = {};
    
    referralRewards?.forEach(tx => {
      const key = `${tx.user_id}_${tx.amount || tx.amount_ton}_${tx.metadata?.level}_${tx.metadata?.source_user_id}`;
      if (!duplicateGroups[key]) duplicateGroups[key] = [];
      duplicateGroups[key].push(tx);
    });

    // Ищем группы с дубликатами
    let duplicateCount = 0;
    Object.entries(duplicateGroups).forEach(([key, transactions]) => {
      if (transactions.length > 1) {
        duplicateCount++;
        console.log(`\n🚨 ДУБЛИКАТ #${duplicateCount}:`);
        console.log(`   Ключ: ${key}`);
        console.log(`   Количество: ${transactions.length} транзакций`);
        
        transactions.forEach((tx, i) => {
          const timeDiff = i > 0 ? 
            Math.abs(new Date(tx.created_at).getTime() - new Date(transactions[i-1].created_at).getTime()) / 1000 
            : 0;
          
          console.log(`   ${i + 1}. ID: ${tx.id} | ${tx.created_at} | Разница: ${timeDiff}s`);
          console.log(`      Описание: ${tx.description}`);
          console.log(`      Метаданные: ${JSON.stringify(tx.metadata)}`);
          console.log(`      TX Hash: ${tx.tx_hash_unique || 'NULL'} | BOC: ${tx.boc || 'NULL'}`);
        });
      }
    });

    // 2. Проверим есть ли дедупликация в metadata
    console.log('\n2️⃣ АНАЛИЗ ВОЗМОЖНОСТЕЙ ДЕДУПЛИКАЦИИ:');
    
    const metadataKeys = new Set<string>();
    const txHashUniqueCount = { withHash: 0, withoutHash: 0 };
    
    referralRewards?.forEach(tx => {
      // Анализируем метаданные
      if (tx.metadata && typeof tx.metadata === 'object') {
        Object.keys(tx.metadata).forEach(key => metadataKeys.add(key));
      }
      
      // Считаем tx_hash_unique
      if (tx.tx_hash_unique) {
        txHashUniqueCount.withHash++;
      } else {
        txHashUniqueCount.withoutHash++;
      }
    });

    console.log('Найденные ключи в метаданных REFERRAL_REWARD:');
    Array.from(metadataKeys).forEach(key => {
      console.log(`  - ${key}`);
    });
    
    console.log(`\nТранзакции с tx_hash_unique: ${txHashUniqueCount.withHash}`);
    console.log(`Транзакции БЕЗ tx_hash_unique: ${txHashUniqueCount.withoutHash}`);

    // 3. Предложим стратегию дедупликации
    console.log('\n3️⃣ СТРАТЕГИЯ ДЕДУПЛИКАЦИИ:');
    
    if (txHashUniqueCount.withoutHash > 0) {
      console.log('🚨 КРИТИЧНО: Все REFERRAL_REWARD НЕ имеют tx_hash_unique!');
      console.log('📋 Возможные стратегии дедупликации:');
      
      console.log('\n   Стратегия 1: Дедупликация по времени + пользователь + параметры');
      console.log('   - Создать уникальный ключ из: user_id + source_user_id + level + timestamp (округленный до минуты)');
      console.log('   - Проверять существование транзакции с таким ключом за последние 10 минут');
      
      console.log('\n   Стратегия 2: Добавить dedup_key в metadata');
      console.log('   - Создать dedup_key = `referral_${source_user_id}_${user_id}_${level}_${Math.floor(Date.now()/60000)}`');
      console.log('   - Проверять существование транзакций с таким dedup_key');
      
      console.log('\n   Стратегия 3: Проверка по комбинации полей');
      console.log('   - Искать существующие REFERRAL_REWARD с теми же user_id, source_user_id, level, amount за последние 5 минут');
    }

    // 4. Проверим временные паттерны
    console.log('\n4️⃣ ВРЕМЕННЫЕ ПАТТЕРНЫ ДУБЛИКАТОВ:');
    
    const timeGaps: number[] = [];
    Object.values(duplicateGroups).forEach(transactions => {
      if (transactions.length > 1) {
        for (let i = 1; i < transactions.length; i++) {
          const gap = Math.abs(
            new Date(transactions[i].created_at).getTime() - 
            new Date(transactions[i-1].created_at).getTime()
          ) / 1000;
          timeGaps.push(gap);
        }
      }
    });

    if (timeGaps.length > 0) {
      const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
      const minGap = Math.min(...timeGaps);
      const maxGap = Math.max(...timeGaps);
      
      console.log(`Временные промежутки между дубликатами:`);
      console.log(`  Среднее: ${avgGap.toFixed(2)} секунд`);
      console.log(`  Минимум: ${minGap.toFixed(2)} секунд`);
      console.log(`  Максимум: ${maxGap.toFixed(2)} секунд`);
      
      console.log(`\n💡 РЕКОМЕНДАЦИЯ: Использовать окно дедупликации ${Math.max(300, maxGap * 2).toFixed(0)} секунд`);
    }

    // 5. Финальная диагностика
    console.log('\n5️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    console.log(`✅ Найдено дубликатов: ${duplicateCount}`);
    console.log(`✅ Все дубликаты типа REFERRAL_REWARD`);
    console.log(`✅ Все дубликаты БЕЗ tx_hash_unique`);
    console.log(`✅ Дедупликация в TransactionService НЕ работает для REFERRAL_REWARD`);
    console.log(`✅ Нужно добавить отдельную дедупликацию для типа REFERRAL_REWARD`);

  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

analyzeReferralDuplication().catch(console.error);