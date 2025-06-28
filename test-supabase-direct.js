#!/usr/bin/env node

/**
 * Прямой анализ Supabase базы данных
 * Проверка всех таблиц и полей напрямую через Supabase клиент
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function analyzeSupabaseDatabase() {
  console.log('=== ПРЯМОЙ АНАЛИЗ БАЗЫ ДАННЫХ SUPABASE ===\n');
  console.log('URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
  console.log('Дата:', new Date().toLocaleString('ru-RU'));
  console.log('='.repeat(60) + '\n');

  const report = [];

  // 1. АНАЛИЗ ТАБЛИЦЫ USERS
  console.log('📊 1. ТАБЛИЦА USERS');
  console.log('-'.repeat(40));
  
  try {
    // Получаем несколько пользователей
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (error) {
      report.push('✖ Таблица users: Ошибка доступа - ' + error.message);
    } else if (!users || users.length === 0) {
      report.push('✖ Таблица users: Пустая таблица, нет записей');
    } else {
      report.push(`✔ Таблица users: Активна, ${users.length} записей найдено`);
      
      // Анализируем структуру
      const user = users[0];
      const fields = Object.keys(user);
      console.log('Найденные поля:', fields.join(', '));
      
      // Проверяем критические поля
      const criticalFields = ['id', 'telegram_id', 'username', 'ref_code', 'balance_uni', 'balance_ton'];
      const missingFields = criticalFields.filter(f => !fields.includes(f));
      
      if (missingFields.length > 0) {
        report.push(`✖ Таблица users: Отсутствуют критические поля: ${missingFields.join(', ')}`);
      } else {
        report.push('✔ Таблица users: Все критические поля присутствуют');
      }
      
      // Проверяем заполненность ref_code
      const usersWithRefCode = users.filter(u => u.ref_code && u.ref_code.trim() !== '');
      if (usersWithRefCode.length === users.length) {
        report.push('✔ Реферальные коды: Генерируются для всех пользователей');
      } else {
        report.push(`❓ Реферальные коды: Только у ${usersWithRefCode.length}/${users.length} пользователей`);
      }
      
      // Проверяем farming поля
      if ('uni_farming_start_timestamp' in user) {
        report.push('✔ Farming поля: Присутствуют в таблице users');
      } else {
        report.push('❓ Farming поля: Возможно хранятся в другой таблице');
      }
    }
  } catch (error) {
    report.push('✖ Таблица users: Критическая ошибка - ' + error.message);
  }

  // 2. АНАЛИЗ ТАБЛИЦЫ TRANSACTIONS
  console.log('\n💰 2. ТАБЛИЦА TRANSACTIONS');
  console.log('-'.repeat(40));
  
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      report.push('✖ Таблица transactions: Ошибка доступа - ' + error.message);
    } else if (!transactions || transactions.length === 0) {
      report.push('❓ Таблица transactions: Пустая, нет истории операций');
    } else {
      report.push(`✔ Таблица transactions: Активна, ${transactions.length} записей`);
      
      // Анализируем типы транзакций
      const types = [...new Set(transactions.map(t => t.type))];
      console.log('Типы транзакций:', types.join(', '));
      
      // Проверяем депозиты
      const deposits = transactions.filter(t => 
        t.type === 'DEPOSIT' || 
        t.type === 'TON_DEPOSIT' || 
        t.type === 'UNI_DEPOSIT'
      );
      
      if (deposits.length > 0) {
        report.push(`✔ Депозиты: Фиксируются в БД (${deposits.length} найдено)`);
      } else {
        report.push('✖ Депозиты: Не найдены в истории транзакций');
      }
      
      // Проверяем структуру
      const tx = transactions[0];
      if (tx.user_id && tx.amount_uni !== undefined && tx.amount_ton !== undefined) {
        report.push('✔ Структура транзакций: Корректная (user_id, amount_uni, amount_ton)');
      } else {
        report.push('❓ Структура транзакций: Возможны проблемы с полями');
      }
    }
  } catch (error) {
    report.push('✖ Таблица transactions: Критическая ошибка - ' + error.message);
  }

  // 3. АНАЛИЗ ТАБЛИЦЫ BOOST_PURCHASES
  console.log('\n🚀 3. ТАБЛИЦА BOOST_PURCHASES');
  console.log('-'.repeat(40));
  
  try {
    const { data: boosts, error } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('status', 'active')
      .limit(10);
    
    if (error) {
      report.push('✖ Таблица boost_purchases: Ошибка доступа - ' + error.message);
    } else if (!boosts || boosts.length === 0) {
      report.push('❓ Таблица boost_purchases: Пустая или нет активных пакетов');
      
      // Проверяем все записи
      const { data: allBoosts } = await supabase
        .from('boost_purchases')
        .select('*')
        .limit(1);
      
      if (!allBoosts || allBoosts.length === 0) {
        report.push('✖ TON Boost покупки: Не фиксируются в БД');
      }
    } else {
      report.push(`✔ Таблица boost_purchases: Активна, ${boosts.length} активных пакетов`);
      
      const boost = boosts[0];
      if (boost.user_id && boost.package_id && boost.amount && boost.rate) {
        report.push('✔ Структура Boost: Корректная (user_id, package_id, amount, rate)');
      } else {
        report.push('❓ Структура Boost: Возможны проблемы с полями');
      }
    }
  } catch (error) {
    report.push('✖ Таблица boost_purchases: Критическая ошибка - ' + error.message);
  }

  // 4. АНАЛИЗ РЕФЕРАЛЬНОЙ СИСТЕМЫ
  console.log('\n👥 4. РЕФЕРАЛЬНАЯ СИСТЕМА');
  console.log('-'.repeat(40));
  
  try {
    // Проверяем связи через referred_by
    const { data: referrals, error } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .not('referred_by', 'is', null)
      .limit(10);
    
    if (error) {
      report.push('✖ Реферальная система: Ошибка проверки - ' + error.message);
    } else if (!referrals || referrals.length === 0) {
      report.push('❓ Реферальные связи: Не найдены (возможно, нет рефералов)');
    } else {
      report.push(`✔ Реферальные связи: Работают через referred_by (${referrals.length} связей)`);
    }
    
    // Проверяем старую таблицу referrals
    const { data: oldReferrals, error: oldError } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);
    
    if (!oldError && oldReferrals) {
      report.push('❓ Таблица referrals: Существует (возможно дублирование с referred_by)');
    }
  } catch (error) {
    report.push('✖ Реферальная система: Критическая ошибка - ' + error.message);
  }

  // 5. АНАЛИЗ FARMING ДАННЫХ
  console.log('\n🌾 5. FARMING ДАННЫЕ');
  console.log('-'.repeat(40));
  
  try {
    // Проверяем farming поля в users
    const { data: farmers, error } = await supabase
      .from('users')
      .select('id, uni_farming_start_timestamp, uni_deposit_amount, ton_farming_balance')
      .not('uni_deposit_amount', 'eq', '0')
      .limit(10);
    
    if (error) {
      report.push('✖ Farming данные: Ошибка доступа - ' + error.message);
    } else if (!farmers || farmers.length === 0) {
      report.push('❓ Активные фермеры: Не найдены (нет депозитов)');
    } else {
      report.push(`✔ Farming данные: Хранятся в users (${farmers.length} активных)`);
    }
    
    // Проверяем таблицу farming_sessions
    const { data: sessions } = await supabase
      .from('farming_sessions')
      .select('*')
      .limit(1);
    
    if (sessions && sessions.length > 0) {
      report.push('❓ Таблица farming_sessions: Существует (возможно дублирование)');
    }
  } catch (error) {
    report.push('✖ Farming данные: Критическая ошибка - ' + error.message);
  }

  // 6. АНАЛИЗ МИССИЙ
  console.log('\n🎯 6. СИСТЕМА МИССИЙ');
  console.log('-'.repeat(40));
  
  try {
    const { data: missions, error } = await supabase
      .from('missions')
      .select('*')
      .limit(20);
    
    if (error) {
      report.push('✖ Таблица missions: Ошибка доступа - ' + error.message);
    } else if (!missions || missions.length === 0) {
      report.push('✖ Таблица missions: Пустая, миссии не настроены');
    } else {
      report.push(`✔ Таблица missions: Активна, ${missions.length} миссий`);
    }
    
    // Проверяем прогресс
    const { data: progress, error: progressError } = await supabase
      .from('mission_progress')
      .select('*')
      .limit(10);
    
    if (progressError) {
      report.push('✖ Таблица mission_progress: Ошибка доступа - ' + progressError.message);
    } else if (!progress || progress.length === 0) {
      report.push('✖ Прогресс миссий: Не отслеживается в БД');
    } else {
      report.push(`✔ Прогресс миссий: Отслеживается (${progress.length} записей)`);
    }
  } catch (error) {
    report.push('✖ Система миссий: Критическая ошибка - ' + error.message);
  }

  // ИТОГОВЫЙ ОТЧЁТ
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЁТ\n');
  
  const working = report.filter(r => r.startsWith('✔'));
  const notWorking = report.filter(r => r.startsWith('✖'));
  const suspicious = report.filter(r => r.startsWith('❓'));
  
  console.log('✔ ЧТО РАБОТАЕТ:');
  working.forEach(item => console.log(item));
  
  console.log('\n✖ ЧТО НЕ РАБОТАЕТ:');
  notWorking.forEach(item => console.log(item));
  
  console.log('\n❓ ПОДОЗРИТЕЛЬНЫЕ МОМЕНТЫ:');
  suspicious.forEach(item => console.log(item));
  
  console.log('\n' + '='.repeat(60));
  
  // Дополнительные проверки
  console.log('\n🔍 ДОПОЛНИТЕЛЬНЫЙ АНАЛИЗ:');
  
  // Проверяем все таблицы
  try {
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tables) {
      console.log('\nВсе таблицы в БД:', tables.map(t => t.table_name).join(', '));
    }
  } catch (error) {
    console.log('Не удалось получить список таблиц');
  }
}

// Запускаем анализ
analyzeSupabaseDatabase().catch(console.error);