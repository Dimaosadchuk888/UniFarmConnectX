#!/usr/bin/env node

/**
 * Мониторинг результатов исправления планировщиков
 * Проверяет стабилизацию интервалов после внедрения изменений
 */

const { supabase } = require('./core/supabase');

async function monitorSchedulerResults() {
  console.log('📊 МОНИТОРИНГ РЕЗУЛЬТАТОВ ИСПРАВЛЕНИЯ ПЛАНИРОВЩИКОВ\n');
  
  try {
    // 1. Проверяем последние транзакции за разные периоды
    const periods = [
      { name: '5 минут', minutes: 5 },
      { name: '15 минут', minutes: 15 },
      { name: '30 минут', minutes: 30 },
      { name: '60 минут', minutes: 60 }
    ];
    
    console.log('🔍 АНАЛИЗ ИНТЕРВАЛОВ ПО ПЕРИОДАМ:\n');
    
    for (const period of periods) {
      const cutoffTime = new Date(Date.now() - period.minutes * 60 * 1000).toISOString();
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, created_at, user_id, amount_ton, amount_uni, type')
        .eq('type', 'FARMING_REWARD')
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`❌ Ошибка для периода ${period.name}:`, error.message);
        continue;
      }
      
      const count = transactions?.length || 0;
      const expectedCount = Math.floor(period.minutes / 5); // Ожидается каждые 5 минут
      
      console.log(`📊 За последние ${period.name}:`);
      console.log(`   Транзакций: ${count} (ожидается: ~${expectedCount})`);
      
      if (count >= 2) {
        // Рассчитываем интервалы
        const intervals = [];
        for (let i = 0; i < transactions.length - 1; i++) {
          const current = new Date(transactions[i].created_at);
          const next = new Date(transactions[i + 1].created_at);
          const diffMinutes = (current - next) / (1000 * 60);
          intervals.push(diffMinutes);
        }
        
        if (intervals.length > 0) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const minInterval = Math.min(...intervals);
          const maxInterval = Math.max(...intervals);
          
          console.log(`   Средний интервал: ${avgInterval.toFixed(2)} минут`);
          console.log(`   Мин/Макс: ${minInterval.toFixed(2)} - ${maxInterval.toFixed(2)} минут`);
          
          // Оценка стабильности
          if (avgInterval >= 4.5 && avgInterval <= 5.5) {
            console.log(`   ✅ СТАБИЛЬНО (близко к 5 минутам)`);
          } else if (avgInterval < 2) {
            console.log(`   🚨 ПРОБЛЕМА: Слишком частые транзакции`);
          } else {
            console.log(`   ⚠️ ОТКЛОНЕНИЕ от целевых 5 минут`);
          }
        }
      } else if (count === 0 && period.minutes >= 10) {
        console.log(`   ⚠️ НЕТ ТРАНЗАКЦИЙ (возможна остановка планировщика)`);
      }
      
      console.log('');
    }
    
    // 2. Проверяем тип и источник недавних транзакций
    console.log('🔍 АНАЛИЗ ПОСЛЕДНИХ 10 ТРАНЗАКЦИЙ:\n');
    
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('id, created_at, user_id, amount_ton, amount_uni, type, metadata')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentError) {
      console.error('❌ Ошибка получения последних транзакций:', recentError.message);
    } else if (recentTx && recentTx.length > 0) {
      recentTx.forEach((tx, index) => {
        const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
        const tonAmount = parseFloat(tx.amount_ton || '0');
        const uniAmount = parseFloat(tx.amount_uni || '0');
        
        let source = 'Unknown';
        if (tonAmount > 0 && uniAmount === 0) {
          source = 'TON Boost';
        } else if (uniAmount > 0 && tonAmount === 0) {
          source = 'UNI Farming';
        } else if (tonAmount > 0 && uniAmount > 0) {
          source = 'Mixed';
        }
        
        console.log(`${index + 1}. ID ${tx.id} | User ${tx.user_id} | ${time}`);
        console.log(`   ${source}: TON=${tx.amount_ton}, UNI=${tx.amount_uni}`);
        
        if (tx.metadata?.original_type) {
          console.log(`   Type: ${tx.metadata.original_type}`);
        }
      });
    } else {
      console.log('❌ Нет недавних транзакций FARMING_REWARD');
    }
    
    // 3. Проверяем активность пользователей
    console.log('\n🔍 ПРОВЕРКА АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ:\n');
    
    // UNI Farming активные пользователи
    const { data: uniFarmers, error: uniError } = await supabase
      .from('users')
      .select('id, username, uni_farming_active, uni_deposit_amount')
      .eq('uni_farming_active', true)
      .gt('uni_deposit_amount', 0);
      
    if (!uniError && uniFarmers) {
      console.log(`📊 UNI Farming активных пользователей: ${uniFarmers.length}`);
      if (uniFarmers.length > 0) {
        const totalDeposit = uniFarmers.reduce((sum, user) => sum + parseFloat(user.uni_deposit_amount || '0'), 0);
        console.log(`   Общий депозит: ${totalDeposit.toLocaleString()} UNI`);
        console.log(`   Средний депозит: ${(totalDeposit / uniFarmers.length).toLocaleString()} UNI`);
      }
    }
    
    // TON Boost активные пользователи
    const { data: tonUsers, error: tonError } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_boost_package')
      .not('ton_boost_package', 'is', null)
      .gte('balance_ton', 10);
      
    if (!tonError && tonUsers) {
      console.log(`📊 TON Boost активных пользователей: ${tonUsers.length}`);
      if (tonUsers.length > 0) {
        const totalBalance = tonUsers.reduce((sum, user) => sum + parseFloat(user.balance_ton || '0'), 0);
        console.log(`   Общий баланс: ${totalBalance.toFixed(2)} TON`);
        console.log(`   Средний баланс: ${(totalBalance / tonUsers.length).toFixed(2)} TON`);
      }
    }
    
    // 4. Финальная оценка
    console.log('\n📊 ОЦЕНКА РЕЗУЛЬТАТОВ ИСПРАВЛЕНИЯ:\n');
    
    // Получаем самые свежие данные за 10 минут
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentTxCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', tenMinutesAgo);
      
    const recentCount = recentTxCount?.length || 0;
    
    if (recentCount === 0) {
      console.log('⚠️ НЕТ ТРАНЗАКЦИЙ за последние 10 минут');
      console.log('   Возможно планировщики остановлены или система перезапускается');
    } else if (recentCount <= 4) { // Максимум 2 цикла по 5 минут
      console.log('✅ НОРМАЛЬНАЯ АКТИВНОСТЬ');
      console.log(`   ${recentCount} транзакций за 10 минут - соответствует расписанию`);
    } else {
      console.log('🚨 ПОВЫШЕННАЯ АКТИВНОСТЬ');
      console.log(`   ${recentCount} транзакций за 10 минут - возможно дублирование не устранено`);
    }
    
    console.log('\n✅ Мониторинг завершен');
    
  } catch (error) {
    console.error('❌ Ошибка мониторинга:', error.message);
  }
}

// Запуск мониторинга
monitorSchedulerResults();