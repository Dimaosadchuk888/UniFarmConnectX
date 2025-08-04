#!/usr/bin/env tsx
/**
 * 🔍 ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА USER 255
 * Смотрим текущее состояние баланса и активность
 */

import { supabase } from './core/supabase';

async function checkUser255Balance() {
  console.log('🔍 ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ USER 255');
  console.log('='.repeat(80));

  try {
    // 1. Текущий баланс
    console.log('\n1️⃣ ТЕКУЩИЙ БАЛАНС USER 255:');
    
    const { data: balance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 255)
      .single();
      
    if (balance) {
      console.log(`💰 UNI баланс: ${balance.uni_balance}`);
      console.log(`💎 TON баланс: ${balance.ton_balance}`);
      console.log(`📅 Последнее обновление: ${balance.updated_at}`);
      console.log(`🆔 User ID: ${balance.user_id}`);
      
      const lastUpdate = new Date(balance.updated_at);
      const minutesAgo = Math.round((Date.now() - lastUpdate.getTime()) / (1000 * 60));
      console.log(`⏱️ Обновлен ${minutesAgo} минут назад`);
    } else {
      console.log('❌ Баланс не найден');
    }
    
    // 2. Последние транзакции
    console.log('\n2️⃣ ПОСЛЕДНИЕ 10 ТРАНЗАКЦИЙ USER 255:');
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (transactions && transactions.length > 0) {
      console.log(`📊 Найдено транзакций: ${transactions.length}`);
      
      transactions.forEach((tx, i) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        const amount = tx.currency === 'TON' ? tx.amount_ton : tx.amount_uni;
        
        console.log(`\n   ${i + 1}. TX #${tx.id}:`);
        console.log(`      💰 ${amount} ${tx.currency}`);
        console.log(`      🎯 ${tx.type} - ${tx.status}`);
        console.log(`      📅 ${tx.created_at.slice(0, 19)} (${timeAgo} мин назад)`);
        
        if (tx.currency === 'TON' && parseFloat(amount) === 1.1) {
          console.log(`      🎯 ДЕПОЗИТ 1.1 TON НАЙДЕН!`);
        }
        
        if (timeAgo < 60) {
          console.log(`      🔥 СВЕЖАЯ ТРАНЗАКЦИЯ!`);
        }
      });
    }
    
    // 3. Проверяем все новые TON транзакции
    console.log('\n3️⃣ ВСЕ НОВЫЕ TON ТРАНЗАКЦИИ (последние 2 часа):');
    
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: newTonTx } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', twoHoursAgo)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (newTonTx && newTonTx.length > 0) {
      console.log(`📊 Новых TON транзакций за 2 часа: ${newTonTx.length}`);
      
      const user255Transactions = newTonTx.filter(tx => tx.user_id === 255);
      const otherUserTransactions = newTonTx.filter(tx => tx.user_id !== 255);
      
      console.log(`🎯 User 255: ${user255Transactions.length} транзакций`);
      console.log(`👥 Другие пользователи: ${otherUserTransactions.length} транзакций`);
      
      if (user255Transactions.length > 0) {
        console.log('\n📋 Транзакции User 255:');
        user255Transactions.forEach((tx, i) => {
          const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
          console.log(`   ${i + 1}. ${tx.amount_ton} TON - ${tx.type} - ${tx.status} (${timeAgo} мин назад)`);
        });
      }
      
      if (otherUserTransactions.length > 0) {
        console.log('\n📋 Транзакции других пользователей (для сравнения):');
        otherUserTransactions.slice(0, 5).forEach((tx, i) => {
          const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
          console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.amount_ton} TON - ${tx.type} - ${tx.status} (${timeAgo} мин назад)`);
        });
      }
    }
    
    // 4. Проверяем статистику депозитов
    console.log('\n4️⃣ СТАТИСТИКА ДЕПОЗИТОВ СИСТЕМЫ:');
    
    const { data: recentDeposits } = await supabase
      .from('transactions')
      .select('user_id, amount_ton, status, created_at')
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });
      
    if (recentDeposits && recentDeposits.length > 0) {
      const completedCount = recentDeposits.filter(tx => tx.status === 'completed').length;
      const pendingCount = recentDeposits.filter(tx => tx.status === 'pending').length;
      const failedCount = recentDeposits.filter(tx => tx.status === 'failed').length;
      
      console.log(`📊 Депозитов за 2 часа: ${recentDeposits.length}`);
      console.log(`✅ Успешных: ${completedCount}`);
      console.log(`⏳ В обработке: ${pendingCount}`);
      console.log(`❌ Неудачных: ${failedCount}`);
      console.log(`📈 Успешность: ${Math.round(completedCount / recentDeposits.length * 100)}%`);
      
      // Проверяем есть ли проблемы с обработкой
      if (pendingCount > 0) {
        console.log('\n⚠️ Есть депозиты в статусе pending:');
        const pendingDeposits = recentDeposits.filter(tx => tx.status === 'pending');
        pendingDeposits.forEach((tx, i) => {
          const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
          console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.amount_ton} TON (${timeAgo} мин в pending)`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ИТОГИ ПРОВЕРКИ:');
    
    if (balance) {
      console.log(`💰 Текущий TON баланс User 255: ${balance.ton_balance}`);
      console.log(`📅 Последнее обновление: ${balance.updated_at}`);
    }
    
    const hasNewTonTx = newTonTx?.some(tx => 
      tx.user_id === 255 && 
      parseFloat(tx.amount_ton) === 1.1 &&
      Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60)) < 60
    );
    
    if (hasNewTonTx) {
      console.log('✅ Депозит 1.1 TON найден в базе');
    } else {
      console.log('❌ Депозит 1.1 TON НЕ найден в базе');
      console.log('🔍 Возможные причины:');
      console.log('   - Транзакция еще обрабатывается блокчейном');
      console.log('   - Проблема с webhook получением депозитов');
      console.log('   - Депозит заблокирован дедупликацией');
      console.log('   - Неправильная сумма или адрес');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА ПРОВЕРКИ БАЛАНСА:', error);
  }
}

checkUser255Balance().catch(console.error);