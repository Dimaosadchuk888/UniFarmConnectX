#!/usr/bin/env tsx

/**
 * 🔍 БЕЗОПАСНАЯ ПРОВЕРКА ИСТОЧНИКА ДУБЛИКАТОВ USER 233
 * 
 * Цель: выяснить откуда User 233 получил 731,347 UNI и почему это дублировалось
 * Режим: ТОЛЬКО ЧТЕНИЕ, никаких изменений
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkUser233DuplicateSource() {
  console.log('🔍 БЕЗОПАСНАЯ ПРОВЕРКА ИСТОЧНИКА ДУБЛИКАТОВ USER 233');
  console.log('=' .repeat(80));
  
  const report: string[] = [];
  report.push('🔍 ИССЛЕДОВАНИЕ ИСТОЧНИКА ДУБЛИКАТОВ USER 233');
  report.push('='.repeat(50));
  report.push('РЕЖИМ: ТОЛЬКО ЧТЕНИЕ, НИКАКИХ ИЗМЕНЕНИЙ');
  report.push('');
  
  try {
    // 1. АНАЛИЗ USER 233 - КТО ОН И ОТКУДА ДЕНЬГИ
    console.log('1️⃣ Анализ User 233...');
    
    const { data: user233, error: user233Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 233)
      .single();

    if (user233Error) {
      report.push(`❌ USER 233 НЕ НАЙДЕН: ${user233Error.message}`);
    } else {
      report.push('1️⃣ ДАННЫЕ USER 233:');
      report.push(`   User ID: ${user233.id}`);
      report.push(`   Username: ${user233.username}`);
      report.push(`   First Name: ${user233.first_name}`);
      report.push(`   UNI Balance: ${user233.balance_uni} UNI`);
      report.push(`   TON Balance: ${user233.balance_ton} TON`);
      report.push(`   UNI Deposit: ${user233.uni_deposit_amount}`);
      report.push(`   Referred By: ${user233.referred_by}`);
      report.push(`   Ref Code: ${user233.ref_code}`);
      report.push(`   Created: ${user233.created_at}`);
      report.push(`   Is Admin: ${user233.is_admin}`);
      
      if (user233.balance_uni > 1000000) {
        report.push(`   🚨 USER 233 ТОЖЕ ИМЕЕТ АНОМАЛЬНЫЙ БАЛАНС!`);
      }
      report.push('');
    }

    // 2. АНАЛИЗ ТРАНЗАКЦИЙ USER 233 - ОТКУДА 731K UNI
    console.log('2️⃣ Анализ транзакций User 233...');
    
    const { data: user233Tx, error: tx233Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', '233')
      .gt('amount', 100000)
      .order('created_at', { ascending: false });

    if (tx233Error) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ ТРАНЗАКЦИЙ USER 233: ${tx233Error.message}`);
    } else {
      report.push('2️⃣ КРУПНЫЕ ТРАНЗАКЦИИ USER 233 (>100K):');
      if (user233Tx && user233Tx.length > 0) {
        user233Tx.forEach((tx: any, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | ${tx.type} | ${tx.amount} ${tx.currency}`);
          report.push(`       Description: ${tx.description}`);
          
          if (tx.amount == 731347.47) {
            report.push(`       🎯 ЭТО ИСТОЧНИК ДУБЛИКАТОВ! Проверяем происхождение...`);
          }
        });
      } else {
        report.push('   ❌ КРУПНЫЕ ТРАНЗАКЦИИ НЕ НАЙДЕНЫ');
        report.push('   ⚠️  USER 233 НЕ ПОЛУЧАЛ КРУПНЫЕ СУММЫ НАПРЯМУЮ');
      }
      report.push('');
    }

    // 3. ПОИСК ВСЕХ ТРАНЗАКЦИЙ С СУММОЙ 731347.47
    console.log('3️⃣ Поиск всех транзакций с суммой 731347.47...');
    
    const { data: duplicateTx, error: dupError } = await supabase
      .from('transactions')
      .select('*')
      .eq('amount', '731347.47')
      .order('created_at', { ascending: true });

    if (dupError) {
      report.push(`❌ ОШИБКА ПОИСКА ДУБЛИКАТОВ: ${dupError.message}`);
    } else {
      report.push('3️⃣ ВСЕ ТРАНЗАКЦИИ С СУММОЙ 731347.47 UNI:');
      if (duplicateTx && duplicateTx.length > 0) {
        report.push(`   📊 ВСЕГО НАЙДЕНО: ${duplicateTx.length} транзакций`);
        report.push(`   💰 ОБЩАЯ СУММА: ${(duplicateTx.length * 731347.47).toLocaleString()} UNI`);
        report.push('');
        
        // Группируем по пользователям
        const userGroups: { [key: string]: any[] } = {};
        duplicateTx.forEach(tx => {
          if (!userGroups[tx.user_id]) userGroups[tx.user_id] = [];
          userGroups[tx.user_id].push(tx);
        });
        
        report.push('   РАСПРЕДЕЛЕНИЕ ПО ПОЛЬЗОВАТЕЛЯМ:');
        Object.entries(userGroups).forEach(([userId, txs]) => {
          report.push(`   User ${userId}: ${txs.length} транзакций = ${(txs.length * 731347.47).toLocaleString()} UNI`);
        });
        report.push('');
        
        // Показываем первые несколько для анализа паттерна
        report.push('   ХРОНОЛОГИЯ ДУБЛИКАТОВ (первые 10):');
        duplicateTx.slice(0, 10).forEach((tx: any, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | User ${tx.user_id} | ${tx.description.slice(0, 60)}...`);
        });
        
        // Анализ временных интервалов
        if (duplicateTx.length > 1) {
          const firstTime = new Date(duplicateTx[0].created_at);
          const lastTime = new Date(duplicateTx[duplicateTx.length - 1].created_at);
          const duration = lastTime.getTime() - firstTime.getTime();
          const avgInterval = duration / (duplicateTx.length - 1);
          
          report.push('');
          report.push('   ⏱️  ВРЕМЕННОЙ АНАЛИЗ:');
          report.push(`   Первая транзакция: ${firstTime.toISOString()}`);
          report.push(`   Последняя: ${lastTime.toISOString()}`);
          report.push(`   Общая продолжительность: ${Math.round(duration / 1000 / 60)} минут`);
          report.push(`   Средний интервал: ${Math.round(avgInterval / 1000)} секунд`);
          
          if (avgInterval < 60000) { // меньше минуты
            report.push(`   🚨 ПОДОЗРИТЕЛЬНО ЧАСТЫЕ ДУБЛИКАТЫ! Возможно баг в коде`);
          }
        }
      } else {
        report.push('   ❌ ТРАНЗАКЦИИ С ТАКОЙ СУММОЙ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // 4. ПРОВЕРКА АКТИВНОСТИ ДУБЛИКАТОВ СЕЙЧАС
    console.log('4️⃣ Проверка активности дубликатов...');
    
    const { data: recentDuplicates, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('amount', '731347.47')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // последний час
      .order('created_at', { ascending: false });

    if (recentError) {
      report.push(`❌ ОШИБКА ПРОВЕРКИ НЕДАВНИХ ДУБЛИКАТОВ: ${recentError.message}`);
    } else {
      report.push('4️⃣ АКТИВНОСТЬ ДУБЛИКАТОВ В ПОСЛЕДНИЙ ЧАС:');
      if (recentDuplicates && recentDuplicates.length > 0) {
        report.push(`   🚨 НАЙДЕНО ${recentDuplicates.length} НОВЫХ ДУБЛИКАТОВ!`);
        report.push(`   ⚠️  ИСТОЧНИК ДУБЛИКАТОВ ВСЕ ЕЩЕ АКТИВЕН!`);
        recentDuplicates.forEach((tx: any, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | User ${tx.user_id}`);
        });
      } else {
        report.push('   ✅ НОВЫХ ДУБЛИКАТОВ НЕ НАЙДЕНО');
        report.push('   💡 ИСТОЧНИК ДУБЛИКАТОВ НЕАКТИВЕН ИЛИ ИСПРАВЛЕН');
      }
      report.push('');
    }

    // 5. АНАЛИЗ РЕФЕРАЛЬНОЙ СИСТЕМЫ
    console.log('5️⃣ Анализ реферальной системы...');
    
    const { data: referralAnalysis, error: refError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .gt('amount', 100000)
      .order('created_at', { ascending: false })
      .limit(50);

    if (refError) {
      report.push(`❌ ОШИБКА АНАЛИЗА РЕФЕРАЛЬНОЙ СИСТЕМЫ: ${refError.message}`);
    } else {
      report.push('5️⃣ АНАЛИЗ КРУПНЫХ РЕФЕРАЛЬНЫХ НАГРАД:');
      if (referralAnalysis && referralAnalysis.length > 0) {
        // Группируем по суммам
        const amountGroups: { [key: string]: number } = {};
        referralAnalysis.forEach(tx => {
          const amount = tx.amount.toString();
          amountGroups[amount] = (amountGroups[amount] || 0) + 1;
        });
        
        report.push('   РАСПРЕДЕЛЕНИЕ ПО СУММАМ:');
        Object.entries(amountGroups)
          .sort(([,a], [,b]) => b - a)
          .forEach(([amount, count]) => {
            report.push(`   ${amount} UNI: ${count} транзакций`);
            if (count > 5) {
              report.push(`       🚨 ПОДОЗРИТЕЛЬНО МНОГО ПОВТОРОВ!`);
            }
          });
      } else {
        report.push('   ❌ КРУПНЫЕ РЕФЕРАЛЬНЫЕ НАГРАДЫ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // ВЫВОДЫ И РЕКОМЕНДАЦИИ
    report.push('🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ:');
    report.push('=' .repeat(40));
    
    const hasRecentDuplicates = recentDuplicates && recentDuplicates.length > 0;
    const totalDuplicates = duplicateTx ? duplicateTx.length : 0;
    const totalImpact = totalDuplicates * 731347.47;
    
    // Создаем userGroups если дубликаты найдены
    let userGroups: { [key: string]: any[] } = {};
    if (duplicateTx && duplicateTx.length > 0) {
      duplicateTx.forEach(tx => {
        if (!userGroups[tx.user_id]) userGroups[tx.user_id] = [];
        userGroups[tx.user_id].push(tx);
      });
    }
    
    if (hasRecentDuplicates) {
      report.push('🚨 КРИТИЧЕСКАЯ СИТУАЦИЯ: ДУБЛИКАТЫ ВСЕ ЕЩЕ СОЗДАЮТСЯ!');
      report.push('   НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:');
      report.push('   1. Остановить реферальную систему');
      report.push('   2. Найти и исправить баг в коде');
      report.push('   3. Заблокировать создание новых транзакций');
    } else {
      report.push('✅ ХОРОШАЯ НОВОСТЬ: Новые дубликаты не создаются');
      report.push('   ИСТОЧНИК ПРОБЛЕМЫ: Исторические дубликаты');
    }
    
    report.push('');
    report.push('📊 МАСШТАБ ПРОБЛЕМЫ:');
    report.push(`   Всего дубликатов: ${totalDuplicates}`);
    report.push(`   Общий ущерб: ${totalImpact.toLocaleString()} UNI`);
    report.push(`   Затронуто пользователей: ${Object.keys(userGroups).length}`);
    
    report.push('');
    report.push('📋 ПЛАН ДЕЙСТВИЙ:');
    if (hasRecentDuplicates) {
      report.push('   ПРИОРИТЕТ 1: Остановить создание новых дубликатов');
      report.push('   ПРИОРИТЕТ 2: Исследовать баг в реферальной системе');
      report.push('   ПРИОРИТЕТ 3: Очистить исторические дубликаты');
    } else {
      report.push('   ПРИОРИТЕТ 1: Создать backup данных');
      report.push('   ПРИОРИТЕТ 2: Пометить дубликаты для удаления');
      report.push('   ПРИОРИТЕТ 3: Пересчитать балансы пользователей');
      report.push('   ПРИОРИТЕТ 4: Внедрить мониторинг дубликатов');
    }

    // Сохраняем отчет
    const reportContent = report.join('\n');
    const filename = `USER233_DUPLICATE_SOURCE_ANALYSIS_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.md`;
    
    fs.writeFileSync(filename, reportContent, 'utf8');
    console.log(`📄 Отчет сохранен: ${filename}`);
    
    console.log('\n' + reportContent);
    
    return {
      success: true,
      reportFile: filename,
      hasRecentDuplicates,
      totalDuplicates,
      totalImpact,
      affectedUsers: Object.keys(userGroups || {}).length
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
    throw error;
  }
}

// Запуск анализа
async function main() {
  try {
    const result = await checkUser233DuplicateSource();
    console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН');
    console.log('Результат:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ АНАЛИЗ ПРОВАЛЕН:', error);
    process.exit(1);
  }
}

main();

export { checkUser233DuplicateSource };