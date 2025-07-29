#!/usr/bin/env tsx

/**
 * ДИАГНОСТИКА АНОМАЛИЙ С TON БАЛАНСОМ
 * Дата: 29 июля 2025
 * 
 * Цель: Найти причину исчезновения TON средств у пользователей
 * без внесения изменений в код и БД
 */

import { supabase } from './core/supabase';

console.log('🔍 ДИАГНОСТИКА АНОМАЛИЙ TON БАЛАНСОВ - ТОЛЬКО АНАЛИЗ');
console.log('='.repeat(80));

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  currency: string;
  created_at: string;
  metadata?: any;
  tx_hash_unique?: string;
}

interface User {
  id: number;
  username?: string;
  balance_ton?: number;
  balance_uni?: number;
  ton_boost_active?: boolean;
  created_at: string;
}

async function analyzeUser25() {
  console.log('\n1️⃣ АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ID 25 (ГЛАВНЫЙ ПОДОЗРЕВАЕМЫЙ)');
  console.log('-'.repeat(70));
  
  try {
    // Получаем данные пользователя
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();
      
    if (!user) {
      console.log('❌ Пользователь ID 25 не найден');
      return;
    }
    
    console.log('👤 Пользователь 25:');
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   TON Balance: ${user.balance_ton || 0}`);
    console.log(`   UNI Balance: ${user.balance_uni || 0}`);
    console.log(`   TON Boost: ${user.ton_boost_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);
    console.log(`   Регистрация: ${user.created_at}`);
    
    // Получаем ВСЕ транзакции за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });
      
    if (!transactions) {
      console.log('❌ Ошибка получения транзакций');
      return;
    }
    
    console.log(`\n💸 Транзакций за 7 дней: ${transactions.length}`);
    
    // Анализируем TON транзакции
    const tonTransactions = transactions.filter(tx => tx.currency === 'TON');
    console.log(`   TON транзакций: ${tonTransactions.length}`);
    
    if (tonTransactions.length > 0) {
      await analyzeTonTransactionPatterns(tonTransactions);
    }
    
    // Проверяем фарминг данные
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '25');
      
    if (farmingData && farmingData.length > 0) {
      console.log('\n🌾 ДАННЫЕ ФАРМИНГА:');
      farmingData.forEach((farm: any) => {
        console.log(`   Баланс фарминга: ${farm.farming_balance}`);
        console.log(`   Активен: ${farm.boost_active ? 'ДА' : 'НЕТ'}`);
        console.log(`   Создан: ${farm.created_at}`);
      });
    } else {
      console.log('\n❌ Данные фарминга не найдены для User 25');
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа User 25:', error);
  }
}

async function analyzeTonTransactionPatterns(transactions: Transaction[]) {
  console.log('\n🔍 АНАЛИЗ ПАТТЕРНОВ TON ТРАНЗАКЦИЙ:');
  
  // Группируем по типам
  const typeGroups: Record<string, Transaction[]> = {};
  transactions.forEach(tx => {
    if (!typeGroups[tx.type]) typeGroups[tx.type] = [];
    typeGroups[tx.type].push(tx);
  });
  
  console.log('\n   📊 Распределение по типам:');
  Object.entries(typeGroups).forEach(([type, txs]) => {
    const total = txs.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    console.log(`   ${type}: ${txs.length} транзакций, сумма: ${total.toFixed(6)} TON`);
  });
  
  // Ищем подозрительные паттерны
  const suspiciousPatterns = findSuspiciousPatterns(transactions);
  if (suspiciousPatterns.length > 0) {
    console.log('\n🚨 ПОДОЗРИТЕЛЬНЫЕ ПАТТЕРНЫ:');
    suspiciousPatterns.forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern}`);
    });
  }
  
  // Анализируем временные интервалы между транзакциями
  analyzeTransactionTiming(transactions);
}

function findSuspiciousPatterns(transactions: Transaction[]): string[] {
  const patterns: string[] = [];
  
  // Поиск быстрых возвратов (депозит -> списание в течение 5 минут)
  for (let i = 0; i < transactions.length - 1; i++) {
    const current = transactions[i];
    const next = transactions[i + 1];
    
    const currentTime = new Date(current.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();
    const timeDiff = Math.abs(currentTime - nextTime) / (1000 * 60); // в минутах
    
    if (timeDiff <= 5) {
      const currentAmount = parseFloat(current.amount);
      const nextAmount = parseFloat(next.amount);
      
      // Проверяем равные суммы противоположного знака
      if (Math.abs(currentAmount + nextAmount) < 0.001) {
        patterns.push(`Быстрый возврат: ${current.type} (${current.amount}) -> ${next.type} (${next.amount}) за ${timeDiff.toFixed(1)} мин`);
      }
    }
  }
  
  // Поиск дубликатов транзакций
  const hashes = new Map<string, Transaction[]>();
  transactions.forEach(tx => {
    if (tx.tx_hash_unique) {
      if (!hashes.has(tx.tx_hash_unique)) {
        hashes.set(tx.tx_hash_unique, []);
      }
      hashes.get(tx.tx_hash_unique)!.push(tx);
    }
  });
  
  hashes.forEach((txs, hash) => {
    if (txs.length > 1) {
      patterns.push(`Дубликат tx_hash: ${hash} (${txs.length} транзакций)`);
    }
  });
  
  return patterns;
}

function analyzeTransactionTiming(transactions: Transaction[]) {
  console.log('\n⏱️ АНАЛИЗ ВРЕМЕННЫХ ИНТЕРВАЛОВ:');
  
  const intervals: number[] = [];
  for (let i = 0; i < transactions.length - 1; i++) {
    const current = new Date(transactions[i].created_at).getTime();
    const next = new Date(transactions[i + 1].created_at).getTime();
    const interval = Math.abs(current - next) / (1000 * 60); // в минутах
    intervals.push(interval);
  }
  
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);
    
    console.log(`   Средний интервал: ${avgInterval.toFixed(2)} минут`);
    console.log(`   Минимальный: ${minInterval.toFixed(2)} минут`);
    console.log(`   Максимальный: ${maxInterval.toFixed(2)} минут`);
    
    // Поиск аномально быстрых операций
    const quickOps = intervals.filter(i => i < 2);
    if (quickOps.length > 0) {
      console.log(`   🚨 Операций быстрее 2 минут: ${quickOps.length}`);
    }
  }
}

async function checkScheduledProcesses() {
  console.log('\n2️⃣ ПРОВЕРКА ЗАПЛАНИРОВАННЫХ ПРОЦЕССОВ');
  console.log('-'.repeat(70));
  
  // Проверяем какие процессы могут влиять на баланс через 1-3 минуты
  console.log('🔍 Поиск фоновых процессов, которые могут изменять баланс:');
  
  const processesToCheck = [
    'farming scheduler',
    'boost verification',
    'balance recalculation', 
    'transaction cleanup',
    'duplicate removal'
  ];
  
  processesToCheck.forEach(process => {
    console.log(`   - ${process}: ТРЕБУЕТ АНАЛИЗ КОДА`);
  });
  
  console.log('\n⚠️ ВАЖНО: Этот анализ требует проверки:');
  console.log('   - modules/scheduler/ - планировщики');
  console.log('   - server/index.ts - cron задачи');
  console.log('   - core/balanceManager.ts - пересчет балансов');
  console.log('   - modules/wallet/service.ts - обработка транзакций');
}

async function findRecentAnomalies() {
  console.log('\n3️⃣ ПОИСК НЕДАВНИХ АНОМАЛИЙ У ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ');
  console.log('-'.repeat(70));
  
  try {
    // Ищем пользователей с подозрительной активностью за последние 3 дня
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('user_id, type, amount, currency, created_at')
      .eq('currency', 'TON')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (!recentTransactions) {
      console.log('❌ Ошибка получения недавних транзакций');
      return;
    }
    
    // Группируем по пользователям
    const userGroups: Record<number, Transaction[]> = {};
    recentTransactions.forEach((tx: any) => {
      if (!userGroups[tx.user_id]) userGroups[tx.user_id] = [];
      userGroups[tx.user_id].push(tx);
    });
    
    console.log(`📊 Найдено ${Object.keys(userGroups).length} пользователей с TON активностью за 3 дня`);
    
    // Ищем пользователей с подозрительными паттернами
    const suspiciousUsers: number[] = [];
    Object.entries(userGroups).forEach(([userId, transactions]) => {
      if (transactions.length > 10) { // Много транзакций
        suspiciousUsers.push(parseInt(userId));
      }
    });
    
    if (suspiciousUsers.length > 0) {
      console.log(`🚨 Пользователи с повышенной активностью: ${suspiciousUsers.slice(0, 5).join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка поиска аномалий:', error);
  }
}

async function checkDatabaseIntegrity() {
  console.log('\n4️⃣ ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ');
  console.log('-'.repeat(70));
  
  try {
    // Проверяем несоответствия между таблицами
    const { data: usersWithTonBoost } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active')
      .eq('ton_boost_active', true);
      
    if (usersWithTonBoost) {
      console.log(`👥 Пользователей с активным TON Boost: ${usersWithTonBoost.length}`);
      
      for (const user of usersWithTonBoost.slice(0, 3)) {
        const { data: farmingData } = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', user.id.toString());
          
        if (!farmingData || farmingData.length === 0) {
          console.log(`🚨 АНОМАЛИЯ: User ${user.id} имеет ton_boost_active=true но НЕТ записи в ton_farming_data`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки целостности:', error);
  }
}

async function main() {
  try {
    await analyzeUser25();
    await checkScheduledProcesses();
    await findRecentAnomalies();
    await checkDatabaseIntegrity();
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 ВЫВОДЫ ДИАГНОСТИКИ:');
    console.log('✅ Анализ User ID 25 завершен');
    console.log('⚠️ Требуется дополнительная проверка фоновых процессов');
    console.log('🔍 Проверьте планировщики и cron задачи на предмет автоматического отката транзакций');
    console.log('📊 Рекомендуется мониторинг транзакций в реальном времени');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

main().catch(console.error);