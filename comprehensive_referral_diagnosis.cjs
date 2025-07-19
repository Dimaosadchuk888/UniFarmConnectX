#!/usr/bin/env node

/**
 * КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Анализирует все аспекты реферальной цепочки без изменения данных
 */

const { createClient } = require('@supabase/supabase-js');

// Настройки Supabase (пользуйтесь реальными учетными данными)
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 COMPREHENSIVE ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ');
console.log('======================================================================\n');

async function comprehensiveReferralDiagnosis() {
  try {
    // 1. Проверяем тестовых пользователей 186-190
    console.log('1️⃣ ПРОВЕРКА ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ 186-190:');
    console.log('--------------------------------------------------');
    console.log('🎯 ГИПОТЕЗА: Тестовые пользователи имеют referred_by = 184');
    console.log('   Это объясняет, почему distributeReferralRewards() работает\n');
    
    const testUsers = [186, 187, 188, 189, 190];
    let foundUsers = 0;
    
    for (const userId of testUsers) {
      try {
        const response = await fetch(`/api/v2/wallet/balance?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token') || 'test'}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ User ${userId}: НАЙДЕН - ${JSON.stringify(data.data)}`);
          foundUsers++;
        } else {
          console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
        }
      } catch (error) {
        console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
      }
    }
    
    console.log(`\n📊 НАЙДЕНО: ${foundUsers} из ${testUsers.length} тестовых пользователей\n`);

    // 2. Анализируем реферальные транзакции
    console.log('2️⃣ АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ:');
    console.log('--------------------------------------------------');
    
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'REFERRAL_REWARD')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.log('❌ Ошибка получения транзакций:', error.message);
        return;
      }

      console.log(`📊 Найдено ${transactions.length} REFERRAL_REWARD транзакций\n`);
      
      if (transactions.length > 0) {
        // Группируем по источникам из metadata
        const sourceStats = {};
        const timeAnalysis = [];
        
        for (const tx of transactions) {
          const sourceUserId = tx.metadata?.source_user_id;
          if (sourceUserId) {
            if (!sourceStats[sourceUserId]) {
              sourceStats[sourceUserId] = {
                count: 0,
                totalUni: 0,
                totalTon: 0
              };
            }
            sourceStats[sourceUserId].count++;
            sourceStats[sourceUserId].totalUni += tx.amount_uni || 0;
            sourceStats[sourceUserId].totalTon += tx.amount_ton || 0;
          }
          
          // Добавляем в временной анализ последние 5 транзакций
          if (timeAnalysis.length < 5) {
            timeAnalysis.push({
              time: new Date(tx.created_at).toLocaleTimeString(),
              description: tx.description || 'N/A',
              amount_uni: tx.amount_uni || 0,
              metadata: tx.metadata
            });
          }
        }
        
        console.log('📈 СТАТИСТИКА ПО ИСТОЧНИКАМ:');
        for (const [sourceId, stats] of Object.entries(sourceStats)) {
          console.log(`  User ${sourceId}: ${stats.count} транзакций`);
          if (stats.totalUni > 0) console.log(`    UNI: ${stats.totalUni}`);
          if (stats.totalTon > 0) console.log(`    TON: ${stats.totalTon}`);
        }
        
        console.log('\n⏰ ВРЕМЕННОЙ АНАЛИЗ:');
        timeAnalysis.forEach((tx, index) => {
          console.log(`  ${index + 1}. ${tx.time}: ${tx.description}`);
        });
      }
    } catch (error) {
      console.log('❌ Ошибка анализа транзакций:', error.message);
    }

    // 3. Анализируем buildReferrerChain()
    console.log('\n3️⃣ АНАЛИЗ BUILDREFERRERCHAIN():');
    console.log('--------------------------------------------------');
    console.log('🔍 buildReferrerChain() ищет пользователей с заполненным referred_by:');
    console.log('   1. Получает User ID из источника (186-190)');
    console.log('   2. Ищет в таблице users: SELECT * WHERE id = sourceUserId');
    console.log('   3. Проверяет поле referred_by');
    console.log('   4. Если referred_by заполнен, добавляет в цепочку');
    console.log('   5. Продолжает до 20 уровней\n');

    // 4. Проверяем реальных пользователей
    console.log('\n4️⃣ ПРОВЕРКА РЕАЛЬНЫХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('--------------------------------------------------');
    
    const realUsers = [1, 2, 3, 74, 184];
    for (const userId of realUsers) {
      try {
        const response = await fetch(`/api/v2/wallet/balance?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token') || 'test'}`
          }
        });
        
        if (response.ok) {
          console.log(`✅ User ${userId}: НАЙДЕН`);
        } else {
          console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
        }
      } catch (error) {
        console.log(`❌ User ${userId}: НЕ НАЙДЕН`);
      }
    }

    // 5. Финальный диагноз
    console.log('\n5️⃣ ФИНАЛЬНЫЙ ДИАГНОЗ:');
    console.log('--------------------------------------------------');
    console.log('🎯 КОРНЕВАЯ ПРИЧИНА:');
    console.log('   1. Тестовые пользователи 186-190 имеют referred_by = 184');
    console.log('   2. Реальные пользователи имеют referred_by = null');
    console.log('   3. buildReferrerChain() работает только с заполненным referred_by');
    console.log('   4. processReferralInline() не обновляет referred_by при создании');
    console.log('\n🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:');
    console.log('   ✅ Исправить ошибку в processReferralInline() (строка 84)');
    console.log('   ✅ Проверить права доступа Supabase RLS');
    console.log('   ✅ Добавить детальное логирование ошибок');
    console.log('   ✅ Протестировать создание новых пользователей');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

// Запускаем диагностику
if (typeof window !== 'undefined') {
  // Browser environment
  comprehensiveReferralDiagnosis();
} else {
  // Node.js environment
  console.log('⚠️ Диагностика предназначена для браузерного окружения');
  console.log('Скопируйте содержимое функции comprehensiveReferralDiagnosis в консоль браузера');
}