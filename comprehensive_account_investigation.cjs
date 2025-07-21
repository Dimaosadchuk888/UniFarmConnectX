#!/usr/bin/env node
/**
 * КОМПЛЕКСНОЕ ИССЛЕДОВАНИЕ АУТЕНТИФИКАЦИИ ПО ВСЕМ АККАУНТАМ
 * Анализ проблемы с TON депозитами на системном уровне
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://xvwzpqjfkrlpvwvmgqpn.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d3pwcWpma3JscHZ3dm1ncXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MzUwNzMsImV4cCI6MjA0ODIxMTA3M30.j1wJVkGd91hC-k9O-_HhcK-7y7OqHoJ5CyMJRr5g6Zo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveAccountInvestigation() {
  console.log('🔍 КОМПЛЕКСНОЕ ИССЛЕДОВАНИЕ АУТЕНТИФИКАЦИИ');
  console.log('='.repeat(60));
  
  // 1. АНАЛИЗ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
  console.log('\n1️⃣ АНАЛИЗ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ В СИСТЕМЕ');
  
  try {
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .order('created_at', { ascending: true });
    
    if (usersError) {
      console.log(`❌ Ошибка получения пользователей: ${usersError.message}`);
      return;
    }
    
    console.log(`📊 Всего пользователей в системе: ${allUsers.length}`);
    console.log('\n📋 ДЕТАЛИ ПО КАЖДОМУ ПОЛЬЗОВАТЕЛЮ:');
    
    const userMap = new Map();
    const telegramIdMap = new Map();
    const usernameMap = new Map();
    
    allUsers.forEach((user, index) => {
      const uniBalance = parseFloat(user.balance_uni || 0);
      const tonBalance = parseFloat(user.balance_ton || 0);
      const createdDate = new Date(user.created_at).toLocaleDateString('ru-RU');
      
      console.log(`\n${index + 1}. User #${user.id}`);
      console.log(`   Telegram ID: ${user.telegram_id}`);
      console.log(`   Username: ${user.username || 'NULL'}`);
      console.log(`   UNI Balance: ${uniBalance.toFixed(6)}`);
      console.log(`   TON Balance: ${tonBalance.toFixed(6)}`);
      console.log(`   Создан: ${createdDate}`);
      
      // Заполняем мапы для поиска дубликатов
      userMap.set(user.id, user);
      
      if (telegramIdMap.has(user.telegram_id)) {
        telegramIdMap.get(user.telegram_id).push(user);
      } else {
        telegramIdMap.set(user.telegram_id, [user]);
      }
      
      if (user.username) {
        if (usernameMap.has(user.username)) {
          usernameMap.get(user.username).push(user);
        } else {
          usernameMap.set(user.username, [user]);
        }
      }
    });
    
    // 2. АНАЛИЗ ДУБЛИКАТОВ
    console.log('\n2️⃣ АНАЛИЗ ДУБЛИКАТОВ И КОНФЛИКТОВ');
    
    console.log('\n🔍 ДУБЛИКАТЫ ПО TELEGRAM_ID:');
    let telegramDuplicates = 0;
    telegramIdMap.forEach((users, telegramId) => {
      if (users.length > 1) {
        telegramDuplicates++;
        console.log(`❗ Telegram ID ${telegramId}: ${users.length} аккаунтов`);
        users.forEach(user => {
          console.log(`   - User #${user.id} (username: ${user.username || 'NULL'})`);
        });
      }
    });
    
    if (telegramDuplicates === 0) {
      console.log('✅ Дубликатов по telegram_id НЕ НАЙДЕНО');
    }
    
    console.log('\n🔍 ДУБЛИКАТЫ ПО USERNAME:');
    let usernameDuplicates = 0;
    usernameMap.forEach((users, username) => {
      if (users.length > 1) {
        usernameDuplicates++;
        console.log(`❗ Username "${username}": ${users.length} аккаунтов`);
        users.forEach(user => {
          console.log(`   - User #${user.id} (telegram_id: ${user.telegram_id})`);
        });
      }
    });
    
    if (usernameDuplicates === 0) {
      console.log('✅ Дубликатов по username НЕ НАЙДЕНО');
    }
    
    // 3. АНАЛИЗ TON ТРАНЗАКЦИЙ
    console.log('\n3️⃣ АНАЛИЗ TON ТРАНЗАКЦИЙ');
    
    const { data: tonTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, amount_ton, type, currency, description, metadata, created_at')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false });
    
    if (txError) {
      console.log(`❌ Ошибка получения TON транзакций: ${txError.message}`);
    } else {
      console.log(`📊 Всего TON транзакций: ${tonTransactions.length}`);
      
      if (tonTransactions.length > 0) {
        console.log('\n📋 ПОСЛЕДНИЕ 10 TON ТРАНЗАКЦИЙ:');
        tonTransactions.slice(0, 10).forEach((tx, index) => {
          const amount = parseFloat(tx.amount_ton || 0);
          const date = new Date(tx.created_at).toLocaleString('ru-RU');
          const user = userMap.get(tx.user_id);
          const txHash = tx.metadata?.tx_hash || 'N/A';
          
          console.log(`\n${index + 1}. Transaction #${tx.id}`);
          console.log(`   User: #${tx.user_id} (telegram_id: ${user?.telegram_id})`);
          console.log(`   Amount: ${amount.toFixed(6)} TON`);
          console.log(`   Type: ${tx.type}`);
          console.log(`   Description: ${tx.description}`);
          console.log(`   TX Hash: ${txHash}`);
          console.log(`   Date: ${date}`);
        });
      } else {
        console.log('⚠️ TON транзакций в системе НЕТ!');
      }
    }
    
    // 4. АНАЛИЗ ПРОБЛЕМНЫХ АККАУНТОВ 25 И 227
    console.log('\n4️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ АККАУНТОВ #25 И #227');
    
    const user25 = userMap.get(25);
    const user227 = userMap.get(227);
    
    if (user25) {
      console.log('\n📋 USER #25:');
      console.log(`   Telegram ID: ${user25.telegram_id}`);
      console.log(`   Username: ${user25.username || 'NULL'}`);
      console.log(`   TON Balance: ${parseFloat(user25.balance_ton || 0).toFixed(6)}`);
      console.log(`   UNI Balance: ${parseFloat(user25.balance_uni || 0).toFixed(6)}`);
      
      // Транзакции для user 25
      const user25Transactions = tonTransactions.filter(tx => tx.user_id === 25);
      console.log(`   TON Транзакций: ${user25Transactions.length}`);
      if (user25Transactions.length > 0) {
        user25Transactions.forEach(tx => {
          console.log(`     - ${tx.description} (${parseFloat(tx.amount_ton || 0).toFixed(6)} TON)`);
        });
      }
    } else {
      console.log('\n❌ USER #25 НЕ НАЙДЕН');
    }
    
    if (user227) {
      console.log('\n📋 USER #227:');
      console.log(`   Telegram ID: ${user227.telegram_id}`);
      console.log(`   Username: ${user227.username || 'NULL'}`);
      console.log(`   TON Balance: ${parseFloat(user227.balance_ton || 0).toFixed(6)}`);
      console.log(`   UNI Balance: ${parseFloat(user227.balance_uni || 0).toFixed(6)}`);
      
      // Транзакции для user 227
      const user227Transactions = tonTransactions.filter(tx => tx.user_id === 227);
      console.log(`   TON Транзакций: ${user227Transactions.length}`);
      if (user227Transactions.length > 0) {
        user227Transactions.forEach(tx => {
          console.log(`     - ${tx.description} (${parseFloat(tx.amount_ton || 0).toFixed(6)} TON)`);
        });
      }
    } else {
      console.log('\n❌ USER #227 НЕ НАЙДЕН');
    }
    
    // 5. ПОИСК USERNAME КОНФЛИКТА
    if (user25 && user227 && user25.username === user227.username) {
      console.log(`\n🚨 КОНФЛИКТ USERNAME ПОДТВЕРЖДЕН:`);
      console.log(`   User #25 и User #227 имеют одинаковый username: "${user25.username}"`);
      console.log(`   Это объясняет проблему getUserByUsername() - система не знает какого пользователя выбрать!`);
    }
    
    // 6. АНАЛИЗ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n5️⃣ АНАЛИЗ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ');
    
    const activeUsers = allUsers.filter(user => {
      const uniBalance = parseFloat(user.balance_uni || 0);
      const tonBalance = parseFloat(user.balance_ton || 0);
      return uniBalance > 0 || tonBalance > 0;
    });
    
    console.log(`📊 Активных пользователей (с балансом > 0): ${activeUsers.length}`);
    
    activeUsers.forEach((user, index) => {
      const uniBalance = parseFloat(user.balance_uni || 0);
      const tonBalance = parseFloat(user.balance_ton || 0);
      console.log(`${index + 1}. User #${user.id} - UNI: ${uniBalance.toFixed(2)}, TON: ${tonBalance.toFixed(6)}`);
    });
    
    // 7. ТЕСТИРОВАНИЕ АУТЕНТИФИКАЦИИ ДЛЯ КАЖДОГО ПОЛЬЗОВАТЕЛЯ
    console.log('\n6️⃣ ТЕСТИРОВАНИЕ АУТЕНТИФИКАЦИИ');
    
    console.log('\n🔍 ПРОВЕРКА getUserByTelegramId ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const uniqueTelegramIds = Array.from(telegramIdMap.keys());
    
    for (const telegramId of uniqueTelegramIds.slice(0, 10)) { // Проверяем первых 10
      try {
        const { data: foundUser, error } = await supabase
          .from('users')
          .select('id, telegram_id, username')
          .eq('telegram_id', telegramId)
          .single();
        
        if (error && error.code === 'PGRST116') {
          console.log(`❌ Telegram ID ${telegramId}: MULTIPLE ROWS - ${telegramIdMap.get(telegramId).length} пользователей`);
        } else if (error) {
          console.log(`❌ Telegram ID ${telegramId}: ERROR - ${error.message}`);
        } else if (foundUser) {
          console.log(`✅ Telegram ID ${telegramId}: User #${foundUser.id} (${foundUser.username || 'NULL'})`);
        } else {
          console.log(`⚠️ Telegram ID ${telegramId}: НЕ НАЙДЕН`);
        }
      } catch (error) {
        console.log(`💥 Telegram ID ${telegramId}: EXCEPTION - ${error.message}`);
      }
    }
    
    // 8. ФИНАЛЬНЫЙ ВЫВОД
    console.log('\n7️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ');
    
    console.log('\n🎯 СТАТИСТИКА ПРОБЛЕМЫ:');
    console.log(`   - Всего пользователей: ${allUsers.length}`);
    console.log(`   - Дубликатов telegram_id: ${telegramDuplicates}`);
    console.log(`   - Дубликатов username: ${usernameDuplicates}`);
    console.log(`   - TON транзакций: ${tonTransactions.length}`);
    console.log(`   - Активных пользователей: ${activeUsers.length}`);
    
    console.log('\n🚨 ТОЧКИ ОТКАЗА В ЦЕПОЧКЕ:');
    
    if (telegramDuplicates > 0) {
      console.log('❗ НАЙДЕНЫ ДУБЛИКАТЫ TELEGRAM_ID - getUserByTelegramId() может возвращать wrong user');
    }
    
    if (usernameDuplicates > 0) {
      console.log('❗ НАЙДЕНЫ ДУБЛИКАТЫ USERNAME - getUserByUsername() не знает какого пользователя выбрать');
    }
    
    if (tonTransactions.length === 0) {
      console.log('🚨 КРИТИЧНО: НИ ОДНОЙ TON ТРАНЗАКЦИИ НЕ СОЗДАНО - processTonDeposit() никогда не работал!');
    }
    
    console.log('\n💡 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:');
    console.log('1. Исправить дубликаты telegram_id/username');
    console.log('2. Добавить логирование в tonDeposit() controller');
    console.log('3. Протестировать аутентификацию с разными аккаунтами');
    console.log('4. Создать fallback механизм для неизвестных пользователей');
    
  } catch (error) {
    console.log(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
  }
}

// Запуск исследования
comprehensiveAccountInvestigation()
  .then(() => console.log('\n✅ Комплексное исследование завершено'))
  .catch(error => console.error('\n❌ Ошибка исследования:', error));