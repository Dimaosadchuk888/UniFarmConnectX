#!/usr/bin/env node

/**
 * СКРИПТ МОНИТОРИНГА ДЕПОЗИТОВ В РЕАЛЬНОМ ВРЕМЕНИ
 * Отслеживает создание/удаление транзакций и изменения балансов
 * ТОЛЬКО МОНИТОРИНГ - НЕ ИЗМЕНЯЕТ ДАННЫЕ
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function startMonitoring() {
  console.log('🔍 МОНИТОРИНГ ДЕПОЗИТОВ В РЕАЛЬНОМ ВРЕМЕНИ');
  console.log('='.repeat(60));
  console.log(`📅 Запуск: ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  ТОЛЬКО МОНИТОРИНГ - НЕ ИЗМЕНЯЕТ ДАННЫЕ');
  
  // Получаем базовое состояние
  const { data: initialUsers } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni')
    .gt('balance_ton', 0)
    .order('id');
  
  console.log(`\n📊 Отслеживаем ${initialUsers?.length || 0} пользователей с TON балансом`);
  
  const userBalances = {};
  initialUsers?.forEach(user => {
    userBalances[user.id] = {
      ton: parseFloat(user.balance_ton || '0'),
      uni: parseFloat(user.balance_uni || '0')
    };
  });
  
  // Подписываемся на изменения в таблице users
  const usersChannel = supabase
    .channel('users-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users',
      filter: 'balance_ton.gt.0'
    }, (payload) => {
      const { new: newRecord, old: oldRecord } = payload;
      const userId = newRecord.id;
      
      const oldTon = parseFloat(oldRecord?.balance_ton || '0');
      const newTon = parseFloat(newRecord?.balance_ton || '0');
      const oldUni = parseFloat(oldRecord?.balance_uni || '0');
      const newUni = parseFloat(newRecord?.balance_uni || '0');
      
      const tonChange = newTon - oldTon;
      const uniChange = newUni - oldUni;
      
      if (Math.abs(tonChange) > 0.000001 || Math.abs(uniChange) > 0.01) {
        console.log(`\n🔄 ИЗМЕНЕНИЕ БАЛАНСА User ${userId}:`);
        console.log(`   TON: ${oldTon.toFixed(6)} → ${newTon.toFixed(6)} (${tonChange > 0 ? '+' : ''}${tonChange.toFixed(6)})`);
        console.log(`   UNI: ${oldUni.toFixed(2)} → ${newUni.toFixed(2)} (${uniChange > 0 ? '+' : ''}${uniChange.toFixed(2)})`);
        console.log(`   Время: ${new Date().toLocaleString('ru-RU')}`);
        
        // Обновляем локальный кэш
        userBalances[userId] = { ton: newTon, uni: newUni };
      }
    })
    .subscribe();
  
  // Подписываемся на изменения в таблице transactions
  const transactionsChannel = supabase
    .channel('transactions-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'transactions'
    }, (payload) => {
      const tx = payload.new;
      const tonAmount = parseFloat(tx.amount_ton || '0');
      const uniAmount = parseFloat(tx.amount_uni || '0');
      
      if (tonAmount > 0 || uniAmount > 0) {
        console.log(`\n✅ НОВАЯ ТРАНЗАКЦИЯ:`);
        console.log(`   User: ${tx.user_id} | ID: ${tx.id}`);
        console.log(`   Тип: ${tx.type}`);
        console.log(`   TON: ${tonAmount.toFixed(6)} | UNI: ${uniAmount.toFixed(2)}`);
        console.log(`   Описание: ${(tx.description || '').substring(0, 50)}...`);
        console.log(`   Время: ${new Date().toLocaleString('ru-RU')}`);
      }
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'transactions'
    }, (payload) => {
      const tx = payload.old;
      console.log(`\n❌ УДАЛЕНА ТРАНЗАКЦИЯ:`);
      console.log(`   User: ${tx.user_id} | ID: ${tx.id}`);
      console.log(`   Тип: ${tx.type}`);
      console.log(`   Время: ${new Date().toLocaleString('ru-RU')}`);
      console.log(`   🚨 ВОЗМОЖНАЯ ПРИЧИНА ИСЧЕЗАЮЩИХ ДЕПОЗИТОВ!`);
    })
    .subscribe();
  
  console.log('\n🎯 МОНИТОРИНГ АКТИВЕН. Отслеживаем:');
  console.log('   • Изменения балансов пользователей');
  console.log('   • Создание новых транзакций');
  console.log('   • Удаление транзакций (исчезающие депозиты)');
  console.log('\n⏸️  Нажмите Ctrl+C для остановки');
  
  // Периодически выводим статистику
  setInterval(async () => {
    const now = new Date();
    if (now.getSeconds() === 0) { // Каждую минуту
      console.log(`\n📊 ${now.toLocaleTimeString('ru-RU')} | Мониторинг активен`);
      
      // Показываем последнюю активность
      const { data: recentTx } = await supabase
        .from('transactions')
        .select('created_at, type, user_id')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (recentTx && recentTx.length > 0) {
        const lastTx = recentTx[0];
        const timeDiff = Math.floor((now.getTime() - new Date(lastTx.created_at).getTime()) / 1000);
        console.log(`   Последняя транзакция: ${timeDiff}с назад (User ${lastTx.user_id}, ${lastTx.type})`);
      }
    }
  }, 1000);
  
  // Обработка завершения
  process.on('SIGINT', () => {
    console.log('\n\n📋 ЗАВЕРШЕНИЕ МОНИТОРИНГА');
    console.log(`   Время работы: ${new Date().toLocaleString('ru-RU')}`);
    usersChannel.unsubscribe();
    transactionsChannel.unsubscribe();
    process.exit(0);
  });
}

startMonitoring().catch(console.error);