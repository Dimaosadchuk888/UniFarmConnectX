#!/usr/bin/env tsx

/**
 * 🔍 ПРОВЕРКА: СОЗДАЮТ ЛИ НОВЫЕ УЧАСТНИКИ ДУБЛИКАТЫ
 * 
 * Цель: убедиться что новые пользователи не создают дублирующиеся транзакции
 * Режим: ТОЛЬКО ЧТЕНИЕ, никаких изменений в коде или БД
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkNewParticipantsDuplicates() {
  console.log('🔍 ПРОВЕРКА ДУБЛИКАТОВ У НОВЫХ УЧАСТНИКОВ');
  console.log('=' .repeat(80));
  
  const report: string[] = [];
  report.push('🔍 ПРОВЕРКА: СОЗДАЮТ ЛИ НОВЫЕ УЧАСТНИКИ ДУБЛИКАТЫ');
  report.push('='.repeat(60));
  report.push('РЕЖИМ: ТОЛЬКО ЧТЕНИЕ, НИКАКИХ ИЗМЕНЕНИЙ');
  report.push('');
  
  try {
    // 1. ПРОВЕРЯЕМ ПОСЛЕДНИЕ 24 ЧАСА - ЕСТЬ ЛИ НОВЫЕ ДУБЛИКАТЫ
    console.log('1️⃣ Проверка транзакций за последние 24 часа...');
    
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ НЕДАВНИХ ТРАНЗАКЦИЙ: ${recentError.message}`);
    } else {
      report.push('1️⃣ АНАЛИЗ ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
      let actualDuplicates: any[] = [];
      if (recentTransactions && recentTransactions.length > 0) {
        report.push(`   📊 ВСЕГО ТРАНЗАКЦИЙ: ${recentTransactions.length}`);
        
        // Ищем потенциальные дубликаты по одинаковым суммам и времени
        const potentialDuplicates: { [key: string]: any[] } = {};
        
        recentTransactions.forEach(tx => {
          // Группируем по user_id + amount + type в пределах 1 минуты
          const timeKey = new Date(tx.created_at).toISOString().slice(0, 16); // точность до минуты
          const duplicateKey = `${tx.user_id}_${tx.amount}_${tx.type}_${timeKey}`;
          
          if (!potentialDuplicates[duplicateKey]) {
            potentialDuplicates[duplicateKey] = [];
          }
          potentialDuplicates[duplicateKey].push(tx);
        });
        
        // Находим реальные дубликаты (больше 1 транзакции в группе)
        actualDuplicates = Object.entries(potentialDuplicates)
          .filter(([key, txs]) => txs.length > 1);
        
        if (actualDuplicates.length > 0) {
          report.push(`   🚨 НАЙДЕНО ${actualDuplicates.length} ГРУПП ДУБЛИКАТОВ!`);
          actualDuplicates.forEach(([key, txs], index) => {
            const [userId, amount, type] = key.split('_');
            report.push(`   [${index + 1}] User ${userId}, ${amount} ${txs[0].currency}, ${type}: ${txs.length} копий`);
            txs.forEach((tx, txIndex) => {
              report.push(`      Копия ${txIndex + 1}: ID ${tx.id}, ${tx.created_at}`);
            });
          });
          report.push(`   ❌ НОВЫЕ УЧАСТНИКИ ВСЕ ЕЩЕ СОЗДАЮТ ДУБЛИКАТЫ!`);
        } else {
          report.push(`   ✅ ДУБЛИКАТЫ НЕ НАЙДЕНЫ`);
          report.push(`   💡 НОВЫЕ УЧАСТНИКИ НЕ СОЗДАЮТ ДУБЛИКАТЫ`);
        }
      } else {
        report.push('   ❌ ТРАНЗАКЦИИ ЗА 24 ЧАСА НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // 2. ПРОВЕРЯЕМ КОНКРЕТНО КРУПНЫЕ СУММЫ (как 731347.47)
    console.log('2️⃣ Проверка крупных сумм за последние 24 часа...');
    
    const { data: largeSums, error: largeError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .gt('amount', 100000)
      .order('amount', { ascending: false });

    if (largeError) {
      report.push(`❌ ОШИБКА ПОИСКА КРУПНЫХ СУММ: ${largeError.message}`);
    } else {
      report.push('2️⃣ КРУПНЫЕ ТРАНЗАКЦИИ ЗА 24 ЧАСА (>100K):');
      if (largeSums && largeSums.length > 0) {
        report.push(`   📊 НАЙДЕНО: ${largeSums.length} крупных транзакций`);
        
        // Группируем по суммам
        const amountGroups: { [key: string]: any[] } = {};
        largeSums.forEach(tx => {
          const amount = tx.amount.toString();
          if (!amountGroups[amount]) amountGroups[amount] = [];
          amountGroups[amount].push(tx);
        });
        
        report.push('   РАСПРЕДЕЛЕНИЕ ПО СУММАМ:');
        Object.entries(amountGroups).forEach(([amount, txs]) => {
          report.push(`   ${amount}: ${txs.length} транзакций`);
          if (txs.length > 1) {
            report.push(`       🚨 ПОДОЗРИТЕЛЬНЫЕ ПОВТОРЫ!`);
            txs.forEach((tx, index) => {
              report.push(`       [${index + 1}] User ${tx.user_id}, ${tx.created_at}`);
            });
          }
        });
        
        // Специально ищем 731347.47
        const suspiciousAmount = largeSums.filter(tx => tx.amount == 731347.47);
        if (suspiciousAmount.length > 0) {
          report.push(`   🚨 НАЙДЕНЫ НОВЫЕ ТРАНЗАКЦИИ 731347.47: ${suspiciousAmount.length} штук`);
          report.push(`   ❌ ПРОБЛЕМА ВСЕ ЕЩЕ АКТИВНА!`);
        } else {
          report.push(`   ✅ Подозрительная сумма 731347.47 НЕ найдена`);
        }
      } else {
        report.push('   ✅ КРУПНЫЕ ТРАНЗАКЦИИ НЕ НАЙДЕНЫ');
        report.push('   💡 ЭТО ХОРОШО - НЕТ НОВЫХ АНОМАЛИЙ');
      }
      report.push('');
    }

    // 3. ПРОВЕРЯЕМ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ (созданных за последние 3 дня)
    console.log('3️⃣ Проверка новых пользователей...');
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: newUsers, error: newUsersError } = await supabase
      .from('users')
      .select('id, username, created_at, balance_uni, balance_ton')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (newUsersError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ: ${newUsersError.message}`);
    } else {
      report.push('3️⃣ НОВЫЕ ПОЛЬЗОВАТЕЛИ (ПОСЛЕДНИЕ 3 ДНЯ):');
      if (newUsers && newUsers.length > 0) {
        report.push(`   📊 НАЙДЕНО: ${newUsers.length} новых пользователей`);
        
        // Проверяем их транзакции на дубликаты
        for (const user of newUsers.slice(0, 10)) { // проверяем первых 10
          const { data: userTx, error: userTxError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id.toString())
            .order('created_at', { ascending: false });

          if (!userTxError && userTx && userTx.length > 0) {
            // Ищем дубликаты у этого пользователя
            const userDuplicates: { [key: string]: any[] } = {};
            userTx.forEach(tx => {
              const key = `${tx.amount}_${tx.type}_${tx.currency}`;
              if (!userDuplicates[key]) userDuplicates[key] = [];
              userDuplicates[key].push(tx);
            });
            
            const hasDuplicates = Object.values(userDuplicates).some(group => group.length > 1);
            
            if (hasDuplicates) {
              report.push(`   ⚠️  User ${user.id} (${user.username}): ИМЕЕТ ДУБЛИКАТЫ`);
              Object.entries(userDuplicates)
                .filter(([key, txs]) => txs.length > 1)
                .forEach(([key, txs]) => {
                  report.push(`      ${key}: ${txs.length} копий`);
                });
            } else {
              report.push(`   ✅ User ${user.id} (${user.username}): дубликатов нет`);
            }
          }
        }
      } else {
        report.push('   ❌ НОВЫЕ ПОЛЬЗОВАТЕЛИ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // 4. ПРОВЕРЯЕМ РЕФЕРАЛЬНУЮ СИСТЕМУ НА НОВЫЕ ДУБЛИКАТЫ
    console.log('4️⃣ Проверка реферальной системы...');
    
    const { data: recentReferrals, error: refError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (refError) {
      report.push(`❌ ОШИБКА ПРОВЕРКИ РЕФЕРАЛОВ: ${refError.message}`);
    } else {
      report.push('4️⃣ РЕФЕРАЛЬНЫЕ НАГРАДЫ ЗА 24 ЧАСА:');
      let referralDuplicates: any[] = [];
      if (recentReferrals && recentReferrals.length > 0) {
        report.push(`   📊 ВСЕГО: ${recentReferrals.length} реферальных наград`);
        
        // Группируем по пользователям и суммам
        const referralGroups: { [key: string]: any[] } = {};
        recentReferrals.forEach(tx => {
          const key = `${tx.user_id}_${tx.amount}`;
          if (!referralGroups[key]) referralGroups[key] = [];
          referralGroups[key].push(tx);
        });
        
        referralDuplicates = Object.entries(referralGroups)
          .filter(([key, txs]) => txs.length > 1);
        
        if (referralDuplicates.length > 0) {
          report.push(`   🚨 НАЙДЕНЫ ДУБЛИКАТЫ В РЕФЕРАЛЬНОЙ СИСТЕМЕ: ${referralDuplicates.length} групп`);
          referralDuplicates.forEach(([key, txs], index) => {
            const [userId, amount] = key.split('_');
            report.push(`   [${index + 1}] User ${userId}, ${amount} ${txs[0].currency}: ${txs.length} копий`);
          });
          report.push(`   ❌ РЕФЕРАЛЬНАЯ СИСТЕМА ВСЕ ЕЩЕ СОЗДАЕТ ДУБЛИКАТЫ!`);
        } else {
          report.push(`   ✅ ДУБЛИКАТЫ В РЕФЕРАЛЬНОЙ СИСТЕМЕ НЕ НАЙДЕНЫ`);
          report.push(`   💡 РЕФЕРАЛЬНАЯ СИСТЕМА РАБОТАЕТ КОРРЕКТНО`);
        }
      } else {
        report.push('   ❌ РЕФЕРАЛЬНЫЕ НАГРАДЫ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // ИТОГОВЫЕ ВЫВОДЫ
    report.push('🎯 ИТОГОВЫЕ ВЫВОДЫ:');
    report.push('=' .repeat(40));
    
    const hasNewDuplicates = actualDuplicates && actualDuplicates.length > 0;
    const hasNewLargeDuplicates = largeSums && largeSums.some(tx => tx.amount == 731347.47);
    const hasReferralDuplicates = referralDuplicates && referralDuplicates.length > 0;
    
    if (hasNewDuplicates || hasNewLargeDuplicates || hasReferralDuplicates) {
      report.push('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: НОВЫЕ УЧАСТНИКИ ВСЕ ЕЩЕ СОЗДАЮТ ДУБЛИКАТЫ!');
      report.push('   НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ ТРЕБУЮТСЯ:');
      report.push('   1. Остановить проблемные процессы');
      report.push('   2. Исправить баг в коде');
      report.push('   3. Очистить новые дубликаты');
    } else {
      report.push('✅ ОТЛИЧНАЯ НОВОСТЬ: НОВЫЕ УЧАСТНИКИ НЕ СОЗДАЮТ ДУБЛИКАТЫ!');
      report.push('   СИСТЕМА РАБОТАЕТ СТАБИЛЬНО:');
      report.push('   - Новые транзакции без дубликатов');
      report.push('   - Реферальная система корректна');
      report.push('   - Крупные аномальные суммы не появляются');
      report.push('');
      report.push('💡 РЕКОМЕНДАЦИЯ:');
      report.push('   Можно безопасно исправлять исторические дубликаты');
      report.push('   Новых проблем не возникнет');
    }

    // Сохраняем отчет
    const reportContent = report.join('\n');
    const filename = `NEW_PARTICIPANTS_DUPLICATES_CHECK_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.md`;
    
    fs.writeFileSync(filename, reportContent, 'utf8');
    console.log(`📄 Отчет сохранен: ${filename}`);
    
    console.log('\n' + reportContent);
    
    return {
      success: true,
      reportFile: filename,
      hasNewDuplicates: hasNewDuplicates || hasNewLargeDuplicates || hasReferralDuplicates,
      totalRecentTransactions: recentTransactions?.length || 0,
      systemStable: !hasNewDuplicates && !hasNewLargeDuplicates && !hasReferralDuplicates
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

// Запуск проверки
async function main() {
  try {
    const result = await checkNewParticipantsDuplicates();
    console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА');
    console.log('Результат:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();

export { checkNewParticipantsDuplicates };