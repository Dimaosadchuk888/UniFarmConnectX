#!/usr/bin/env node
/**
 * ДИАГНОСТИКА ПЛАНИРОВЩИКА - ИСТОЧНИК ДУБЛИРУЮЩИХ ТРАНЗАКЦИЙ
 * Мониторинг в реальном времени без изменения кода
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

let isMonitoring = false;
let lastTransactionId = 0;
let transactionBuffer = [];

async function getLatestTransactions(limit = 10) {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, currency, created_at, description')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return error ? [] : data;
}

async function analyzeTransactionPatterns() {
  console.log('🔍 АНАЛИЗ ПАТТЕРНОВ ТРАНЗАКЦИЙ');
  
  const transactions = await getLatestTransactions(50);
  
  if (transactions.length === 0) {
    console.log('⚠️  Нет транзакций для анализа');
    return;
  }

  // Группируем транзакции по времени (с точностью до минуты)
  const timeGroups = {};
  const duplicateGroups = {};

  transactions.forEach(tx => {
    const minute = tx.created_at.substring(0, 16); // YYYY-MM-DDTHH:MM
    if (!timeGroups[minute]) timeGroups[minute] = [];
    timeGroups[minute].push(tx);

    // Ищем потенциальные дубли
    const key = `${tx.user_id}-${tx.type}-${tx.amount}-${tx.currency}`;
    if (!duplicateGroups[key]) duplicateGroups[key] = [];
    duplicateGroups[key].push(tx);
  });

  console.log('\n📊 АНАЛИЗ ВРЕМЕННЫХ ПАТТЕРНОВ:');
  Object.keys(timeGroups).sort().reverse().slice(0, 10).forEach(minute => {
    const group = timeGroups[minute];
    if (group.length > 5) { // Много транзакций в одну минуту
      console.log(`🚨 ${minute}: ${group.length} транзакций`);
      
      // Анализируем детали
      const byType = {};
      group.forEach(tx => {
        if (!byType[tx.type]) byType[tx.type] = 0;
        byType[tx.type]++;
      });
      
      Object.keys(byType).forEach(type => {
        console.log(`   ${type}: ${byType[type]} шт.`);
      });
    }
  });

  console.log('\n🔍 ПОИСК ДУБЛИРУЮЩИХ ТРАНЗАКЦИЙ:');
  let foundDuplicates = false;
  Object.keys(duplicateGroups).forEach(key => {
    const group = duplicateGroups[key];
    if (group.length > 1) {
      foundDuplicates = true;
      const [userId, type, amount, currency] = key.split('-');
      console.log(`⚠️  Найдено ${group.length} одинаковых транзакций:`);
      console.log(`   User ${userId}, ${type}, ${amount} ${currency}`);
      
      // Анализируем временные интервалы между дублями
      if (group.length >= 2) {
        const times = group.map(tx => new Date(tx.created_at)).sort();
        for (let i = 1; i < times.length; i++) {
          const diff = (times[i] - times[i-1]) / 1000; // секунды
          console.log(`   Интервал: ${diff} секунд`);
          
          if (diff >= 1 && diff <= 3) {
            console.log(`   🎯 ПОДОЗРИТЕЛЬНО: Интервал ${diff}с соответствует наблюдаемой проблеме!`);
          }
        }
      }
    }
  });

  if (!foundDuplicates) {
    console.log('✅ Дублирующих транзакций не найдено в последних 50');
  }
}

async function startRealTimeMonitoring() {
  console.log('📡 ЗАПУСК REAL-TIME МОНИТОРИНГА');
  console.log('🔄 Отслеживание новых транзакций каждые 10 секунд...');
  console.log('💡 Нажмите Ctrl+C для остановки');

  // Получаем последнюю транзакцию как отправную точку
  const latest = await getLatestTransactions(1);
  if (latest.length > 0) {
    lastTransactionId = latest[0].id;
    console.log(`📍 Начинаем мониторинг с ID: ${lastTransactionId}`);
  }

  isMonitoring = true;
  monitorLoop();
}

async function monitorLoop() {
  if (!isMonitoring) return;

  try {
    // Ищем новые транзакции
    const { data: newTransactions } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at, description')
      .gt('id', lastTransactionId)
      .order('created_at', { ascending: true });

    if (newTransactions && newTransactions.length > 0) {
      console.log(`\n🆕 НОВЫЕ ТРАНЗАКЦИИ: ${newTransactions.length} шт.`);
      
      newTransactions.forEach(tx => {
        const time = new Date(tx.created_at).toLocaleTimeString();
        console.log(`   ID ${tx.id}: User ${tx.user_id}, ${tx.type}, ${tx.amount} ${tx.currency} (${time})`);
        
        // Добавляем в буфер для анализа паттернов
        transactionBuffer.push({
          ...tx,
          timestamp: Date.now()
        });

        lastTransactionId = Math.max(lastTransactionId, tx.id);
      });

      // Анализируем буфер на предмет быстрых дублей
      analyzeRecentBuffer();
      
      // Очищаем старые записи из буфера (старше 5 минут)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      transactionBuffer = transactionBuffer.filter(tx => tx.timestamp > fiveMinutesAgo);
    }

  } catch (error) {
    console.error('❌ Ошибка мониторинга:', error.message);
  }

  // Следующая проверка через 10 секунд
  setTimeout(monitorLoop, 10000);
}

function analyzeRecentBuffer() {
  if (transactionBuffer.length < 2) return;

  // Группируем по пользователям и типам
  const groups = {};
  transactionBuffer.forEach(tx => {
    const key = `${tx.user_id}-${tx.type}-${tx.currency}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });

  // Ищем быстрые дубли
  Object.keys(groups).forEach(key => {
    const group = groups[key];
    if (group.length >= 2) {
      // Сортируем по времени
      group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      for (let i = 1; i < group.length; i++) {
        const prev = group[i-1];
        const curr = group[i];
        const diffMs = new Date(curr.created_at) - new Date(prev.created_at);
        const diffSec = diffMs / 1000;
        
        if (diffSec <= 5 && prev.amount === curr.amount) {
          console.log(`🚨 ДУБЛИКАТ ОБНАРУЖЕН!`);
          console.log(`   User ${curr.user_id}: ${curr.type} ${curr.amount} ${curr.currency}`);
          console.log(`   Интервал: ${diffSec.toFixed(1)} секунд`);
          console.log(`   ID: ${prev.id} → ${curr.id}`);
          
          if (diffSec >= 1 && diffSec <= 2) {
            console.log(`   🎯 ТОЧНОЕ СОВПАДЕНИЕ с наблюдаемой проблемой!`);
          }
        }
      }
    }
  });
}

async function runFullDiagnostics() {
  console.log('🚀 ЗАПУСК ПОЛНОЙ ДИАГНОСТИКИ ПЛАНИРОВЩИКА');
  console.log('📋 План:');
  console.log('   1. Анализ паттернов существующих транзакций');
  console.log('   2. Real-time мониторинг новых транзакций');
  console.log('   3. Детекция дублирующих транзакций');
  console.log('   4. Анализ временных интервалов\n');

  // 1. Анализ существующих паттернов
  await analyzeTransactionPatterns();

  console.log('\n' + '='.repeat(60));
  
  // 2. Запуск real-time мониторинга
  await startRealTimeMonitoring();
}

// Обработка завершения
process.on('SIGINT', () => {
  isMonitoring = false;
  console.log('\n🛑 Мониторинг остановлен');
  console.log('📊 ИТОГОВЫЕ ВЫВОДЫ:');
  console.log(`   - Отслежено транзакций в буфере: ${transactionBuffer.length}`);
  console.log(`   - Последний ID: ${lastTransactionId}`);
  console.log('✅ Диагностика планировщика завершена');
  process.exit(0);
});

runFullDiagnostics();