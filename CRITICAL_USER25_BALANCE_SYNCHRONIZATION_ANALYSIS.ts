#!/usr/bin/env tsx

/**
 * 🔍 АНАЛИЗ ПРОБЛЕМЫ СИНХРОНИЗАЦИИ БАЛАНСОВ
 * 
 * Проблема: Пользователи жалуются на непредсказуемое поведение балансов:
 * - Депозит зачисляется, потом исчезает
 * - Баланс может не списаться
 * - Баланс может списаться полностью
 * - Баланс может вернуться обратно
 * 
 * Цель: найти причины рассинхронизации БЕЗ изменения кода
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function analyzeBalanceSynchronization() {
  console.log('🔍 АНАЛИЗ ПРОБЛЕМ СИНХРОНИЗАЦИИ БАЛАНСОВ');
  console.log('=' .repeat(80));
  
  const report: string[] = [];
  report.push('🔍 ТЕХНИЧЕСКОЕ РАССЛЕДОВАНИЕ ПРОБЛЕМ СИНХРОНИЗАЦИИ БАЛАНСОВ');
  report.push('='.repeat(70));
  report.push('');
  
  try {
    // 1. ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА USER 25 В ТАБЛИЦЕ USERS
    console.log('1️⃣ Проверка текущего баланса User 25 в таблице users...');
    
    const { data: user25Balance, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, created_at')
      .eq('id', 25)
      .single();

    if (balanceError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ БАЛАНСА: ${balanceError.message}`);
    } else {
      report.push('1️⃣ ТЕКУЩИЙ БАЛАНС USER 25 В БАЗЕ ДАННЫХ:');
      report.push(`   User ID: ${user25Balance.id}`);
      report.push(`   UNI Balance: ${user25Balance.balance_uni}`);
      report.push(`   TON Balance: ${user25Balance.balance_ton}`);
      report.push(`   Account Created: ${user25Balance.created_at}`);
      report.push('');
    }

    // 2. АНАЛИЗ ПОСЛЕДНИХ ИЗМЕНЕНИЙ БАЛАНСА TON
    console.log('2️⃣ Анализ последних изменений TON баланса...');
    
    const { data: recentTonTx, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', '25')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-27T00:00:00')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tonError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ TON ТРАНЗАКЦИЙ: ${tonError.message}`);
    } else {
      report.push('2️⃣ ПОСЛЕДНИЕ TON ТРАНЗАКЦИИ USER 25:');
      if (recentTonTx && recentTonTx.length > 0) {
        let runningBalance = 0;
        report.push('   Хронологический анализ изменений баланса:');
        
        recentTonTx.reverse().forEach((tx: any, index: number) => {
          runningBalance += tx.amount;
          report.push(`   [${index + 1}] ${tx.created_at.slice(11, 19)} | ${tx.type} | ${tx.amount > 0 ? '+' : ''}${tx.amount} TON | Running: ${runningBalance.toFixed(6)} TON`);
          
          // Выделить подозрительные паттерны
          if (tx.amount > 0 && tx.type === 'DEPOSIT') {
            report.push(`       ✅ ДЕПОЗИТ: ${tx.description.slice(0, 50)}...`);
          }
          if (tx.amount < 0) {
            report.push(`       ⚠️  СПИСАНИЕ: ${tx.description.slice(0, 50)}...`);
          }
        });
        
        report.push(`   📊 ИТОГОВЫЙ РАСЧЕТНЫЙ БАЛАНС: ${runningBalance.toFixed(6)} TON`);
        if (user25Balance) {
          const difference = Math.abs(runningBalance - user25Balance.balance_ton);
          if (difference > 0.000001) {
            report.push(`   ⚠️  РАСХОЖДЕНИЕ С БАЗОЙ: ${difference.toFixed(6)} TON`);
            report.push(`   ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА СИНХРОНИЗАЦИИ ОБНАРУЖЕНА!`);
          } else {
            report.push(`   ✅ БАЛАНС СИНХРОНИЗИРОВАН КОРРЕКТНО`);
          }
        }
      } else {
        report.push('   ❌ TON ТРАНЗАКЦИИ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // 3. АНАЛИЗ ДУБЛИРУЮЩИХСЯ ТРАНЗАКЦИЙ
    console.log('3️⃣ Поиск дублирующихся транзакций...');
    
    const { data: duplicateTx, error: dupError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', '25')
      .not('tx_hash_unique', 'is', null)
      .gte('created_at', '2025-07-26T00:00:00')
      .order('created_at', { ascending: false });

    if (dupError) {
      report.push(`❌ ОШИБКА ПОИСКА ДУБЛИКАТОВ: ${dupError.message}`);
    } else {
      report.push('3️⃣ АНАЛИЗ ДУБЛИРУЮЩИХСЯ ТРАНЗАКЦИЙ:');
      if (duplicateTx && duplicateTx.length > 0) {
        const hashGroups: { [key: string]: any[] } = {};
        duplicateTx.forEach(tx => {
          const hash = tx.tx_hash_unique;
          if (!hashGroups[hash]) hashGroups[hash] = [];
          hashGroups[hash].push(tx);
        });
        
        let duplicatesFound = 0;
        Object.entries(hashGroups).forEach(([hash, txs]) => {
          if (txs.length > 1) {
            duplicatesFound++;
            report.push(`   ⚠️  ДУБЛИКАТ #${duplicatesFound}: Hash ${hash.slice(0, 20)}... (${txs.length} копий)`);
            txs.forEach((tx, i) => {
              report.push(`      Копия ${i + 1}: ID ${tx.id}, ${tx.amount} ${tx.currency}, ${tx.created_at.slice(0, 19)}`);
            });
            report.push('');
          }
        });
        
        if (duplicatesFound === 0) {
          report.push('   ✅ ДУБЛИКАТЫ НЕ НАЙДЕНЫ - СИСТЕМА ДЕДУПЛИКАЦИИ РАБОТАЕТ');
        } else {
          report.push(`   ❌ НАЙДЕНО ${duplicatesFound} ГРУПП ДУБЛИКАТОВ!`);
          report.push('   ⚠️  ДУБЛИКАТЫ МОГУТ ВЫЗЫВАТЬ НЕСТАБИЛЬНОСТЬ БАЛАНСОВ');
        }
      } else {
        report.push('   ❌ ТРАНЗАКЦИИ С ХЭШАМИ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // 4. ПРОВЕРКА CONSISTENCY МЕЖДУ ТРАНЗАКЦИЯМИ И БАЛАНСОМ
    console.log('4️⃣ Проверка консистентности данных...');
    
    const { data: allUserTx, error: allTxError } = await supabase
      .from('transactions')
      .select('currency, amount, type')
      .eq('user_id', '25')
      .eq('status', 'completed');

    if (allTxError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ ВСЕХ ТРАНЗАКЦИЙ: ${allTxError.message}`);
    } else {
      report.push('4️⃣ ПРОВЕРКА КОНСИСТЕНТНОСТИ ДАННЫХ:');
      if (allUserTx && allUserTx.length > 0) {
        const uniSum = allUserTx
          .filter(tx => tx.currency === 'UNI')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        const tonSum = allUserTx
          .filter(tx => tx.currency === 'TON')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        report.push(`   📊 СУММА ВСЕХ UNI ТРАНЗАКЦИЙ: ${uniSum.toFixed(8)} UNI`);
        report.push(`   📊 СУММА ВСЕХ TON ТРАНЗАКЦИЙ: ${tonSum.toFixed(8)} TON`);
        
        if (user25Balance) {
          const uniDiff = Math.abs(uniSum - user25Balance.balance_uni);
          const tonDiff = Math.abs(tonSum - user25Balance.balance_ton);
          
          report.push(`   📊 ТЕКУЩИЙ БАЛАНС UNI: ${user25Balance.balance_uni} UNI`);
          report.push(`   📊 ТЕКУЩИЙ БАЛАНС TON: ${user25Balance.balance_ton} TON`);
          
          if (uniDiff > 0.001) {
            report.push(`   ❌ РАСХОЖДЕНИЕ UNI: ${uniDiff.toFixed(8)} UNI`);
          } else {
            report.push(`   ✅ UNI БАЛАНС КОНСИСТЕНТЕН`);
          }
          
          if (tonDiff > 0.000001) {
            report.push(`   ❌ РАСХОЖДЕНИЕ TON: ${tonDiff.toFixed(8)} TON`);
          } else {
            report.push(`   ✅ TON БАЛАНС КОНСИСТЕНТЕН`);
          }
        }
      }
      report.push('');
    }

    // 5. ПРОВЕРКА НЕДАВНИХ ИЗМЕНЕНИЙ В СИСТЕМЕ
    console.log('5️⃣ Проверка недавних изменений в системе...');
    
    const { data: recentSystemTx, error: systemError } = await supabase
      .from('transactions')
      .select('user_id, type, amount, currency, created_at, description')
      .gte('created_at', '2025-07-27T14:30:00')
      .lte('created_at', '2025-07-27T15:00:00')
      .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'WITHDRAWAL', 'TON_WITHDRAWAL'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (systemError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ СИСТЕМНЫХ ТРАНЗАКЦИЙ: ${systemError.message}`);
    } else {
      report.push('5️⃣ СИСТЕМНЫЕ ДЕПОЗИТЫ/ВЫВОДЫ ЗА ПЕРИОД 14:30-15:00:');
      if (recentSystemTx && recentSystemTx.length > 0) {
        const affectedUsers = new Set();
        recentSystemTx.forEach((tx: any) => {
          affectedUsers.add(tx.user_id);
          report.push(`   ${tx.created_at.slice(11, 19)} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency}`);
          if (tx.user_id === '25') {
            report.push(`       ⚠️  КАСАЕТСЯ USER 25: ${tx.description.slice(0, 60)}...`);
          }
        });
        
        report.push(`   📊 ЗАТРОНУТО ПОЛЬЗОВАТЕЛЕЙ: ${affectedUsers.size}`);
        report.push(`   📊 ОБЩИЙ СИСТЕМНЫЙ ТРАФИК: ${recentSystemTx.length} транзакций за 30 минут`);
      } else {
        report.push('   ❌ СИСТЕМНЫЕ ТРАНЗАКЦИИ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // ФИНАЛЬНЫЙ ДИАГНОЗ
    report.push('🎯 ДИАГНОЗ ПРОБЛЕМЫ И РЕКОМЕНДАЦИИ:');
    report.push('=' .repeat(50));
    
    // Анализируем найденные проблемы
    let hasConsistencyIssues = false;
    let hasDuplicates = false;
    let hasSystemLoad = false;
    
    if (user25Balance && recentTonTx) {
      const calculatedBalance = recentTonTx.reduce((sum: number, tx: any) => sum + tx.amount, 0);
      hasConsistencyIssues = Math.abs(calculatedBalance - user25Balance.balance_ton) > 0.000001;
    }
    
    if (duplicateTx) {
      const hashGroups: { [key: string]: any[] } = {};
      duplicateTx.forEach(tx => {
        const hash = tx.tx_hash_unique;
        if (!hashGroups[hash]) hashGroups[hash] = [];
        hashGroups[hash].push(tx);
      });
      hasDuplicates = Object.values(hashGroups).some(group => group.length > 1);
    }
    
    hasSystemLoad = (recentSystemTx?.length || 0) > 20;
    
    // Рекомендации без изменения кода
    if (hasConsistencyIssues) {
      report.push('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: РАССИНХРОНИЗАЦИЯ ДАННЫХ');
      report.push('   РЕКОМЕНДАЦИИ БЕЗ ИЗМЕНЕНИЯ КОДА:');
      report.push('   1. Перезапустить все балансовые кеши');
      report.push('   2. Принудительно обновить WebSocket соединения');
      report.push('   3. Очистить кеш балансов в Redis/памяти');
      report.push('   4. Пересчитать балансы из транзакций');
    }
    
    if (hasDuplicates) {
      report.push('❌ ПРОБЛЕМА ДУБЛИКАТОВ ОБНАРУЖЕНА');
      report.push('   РЕКОМЕНДАЦИИ:');
      report.push('   1. Удалить дублирующиеся транзакции вручную');
      report.push('   2. Пересчитать балансы после очистки');
      report.push('   3. Мониторить новые дубликаты');
    }
    
    if (hasSystemLoad) {
      report.push('⚠️  ВЫСОКАЯ НАГРУЗКА НА СИСТЕМУ');
      report.push('   РЕКОМЕНДАЦИИ:');
      report.push('   1. Оптимизировать частоту обновлений WebSocket');
      report.push('   2. Добавить rate limiting для обновлений балансов');
      report.push('   3. Использовать batch updates вместо individual');
    }
    
    report.push('');
    report.push('📋 ОБЩИЕ РЕКОМЕНДАЦИИ ДЛЯ СТАБИЛИЗАЦИИ:');
    report.push('   1. Добавить heartbeat проверки синхронизации');
    report.push('   2. Реализовать auto-reconciliation балансов');
    report.push('   3. Добавить мониторинг расхождений в real-time');
    report.push('   4. Уведомлять админа о критических рассинхронизациях');
    report.push('   5. Внедрить механизм самовосстановления балансов');

    // Сохраняем отчет
    const reportContent = report.join('\n');
    const filename = `USER25_BALANCE_SYNC_ANALYSIS_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.md`;
    
    fs.writeFileSync(filename, reportContent, 'utf8');
    console.log(`📄 Отчет сохранен: ${filename}`);
    
    console.log('\n' + reportContent);
    
    return {
      success: true,
      reportFile: filename,
      hasConsistencyIssues,
      hasDuplicates,
      hasSystemLoad
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
    throw error;
  }
}

// Запуск анализа
async function main() {
  try {
    const result = await analyzeBalanceSynchronization();
    console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН');
    console.log('Результат:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ АНАЛИЗ ПРОВАЛЕН:', error);
    process.exit(1);
  }
}

main();

export { analyzeBalanceSynchronization };