#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!
);

console.log('\n🔍 ПРОВЕРКА РЕАЛЬНЫХ ТРАНЗАКЦИЙ И ПОПОЛНЕНИЙ');
console.log('='.repeat(60));

async function checkRealTransactions() {
  try {
    // 1. Все типы транзакций за последние 24 часа
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('type')
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!allError && allTransactions) {
      const typeStats: { [key: string]: number } = {};
      allTransactions.forEach(tx => {
        typeStats[tx.type] = (typeStats[tx.type] || 0) + 1;
      });

      console.log('\n📊 СТАТИСТИКА ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
      Object.entries(typeStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
    }

    // 2. Ищем любые транзакции с TON > 0 (пополнения)
    console.log('\n💰 ПОИСК РЕАЛЬНЫХ TON ПОПОЛНЕНИЙ:');
    
    const { data: tonPositive, error: tonError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, description, metadata, created_at, status')
      .gt('amount_ton', 0.01) // Больше 0.01 TON
      .neq('type', 'FARMING_REWARD') // Исключаем доходы
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!tonError && tonPositive && tonPositive.length > 0) {
      console.log(`✅ Найдено ${tonPositive.length} крупных TON пополнений:`);
      tonPositive.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Type: ${tx.type}, Amount: ${tx.amount_ton} TON, Status: ${tx.status}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        if (metadata.tx_hash) {
          console.log(`      TX Hash: ${metadata.tx_hash.substring(0, 40)}...`);
        }
      });
    } else {
      console.log('❌ Крупные TON пополнения не найдены');
    }

    // 3. Проверяем балансы пользователей с наибольшими TON балансами
    console.log('\n👑 TOP 10 ПОЛЬЗОВАТЕЛЕЙ ПО TON БАЛАНСУ:');
    
    const { data: topUsers, error: topError } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_boost_package, updated_at')
      .gt('balance_ton', 0)
      .order('balance_ton', { ascending: false })
      .limit(10);

    if (!topError && topUsers) {
      topUsers.forEach(user => {
        console.log(`   User ${user.id} (@${user.username}): ${user.balance_ton} TON, Boost: ${user.ton_boost_package || 'НЕТ'}, Update: ${new Date(user.updated_at).toLocaleString('ru-RU')}`);
      });
    }

    // 4. Ищем все транзакции User #25 за расширенный период
    console.log('\n🎯 ВСЕ ТРАНЗАКЦИИ USER #25 ЗА ПОСЛЕДНИЕ 30 ДНЕЙ:');
    
    const { data: user25All, error: user25AllError } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, amount_uni, description, status, created_at')
      .eq('user_id', 25)
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!user25AllError && user25All) {
      console.log(`📋 Всего транзакций User #25: ${user25All.length}`);
      
      // Группируем по типам
      const user25Stats: { [key: string]: number } = {};
      let totalTonIn = 0;
      let totalTonOut = 0;
      
      user25All.forEach(tx => {
        user25Stats[tx.type] = (user25Stats[tx.type] || 0) + 1;
        if (tx.amount_ton) {
          if (parseFloat(tx.amount_ton) > 0) {
            totalTonIn += parseFloat(tx.amount_ton);
          } else {
            totalTonOut += Math.abs(parseFloat(tx.amount_ton));
          }
        }
      });

      console.log('📊 Типы транзакций User #25:');
      Object.entries(user25Stats).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      
      console.log(`💰 TON движение User #25:`);
      console.log(`   Входящие: +${totalTonIn.toFixed(6)} TON`);
      console.log(`   Исходящие: -${totalTonOut.toFixed(6)} TON`);
      console.log(`   Чистый баланс: ${(totalTonIn - totalTonOut).toFixed(6)} TON`);

      // Показываем первые 10 транзакций
      console.log('\n📜 Последние 10 транзакций User #25:');
      user25All.slice(0, 10).forEach(tx => {
        const amount = tx.amount_ton ? `${tx.amount_ton} TON` : (tx.amount_uni ? `${tx.amount_uni} UNI` : '0');
        console.log(`   ${tx.id}: ${tx.type} | ${amount} | ${tx.status} | ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        if (tx.description) {
          console.log(`      Описание: ${tx.description}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkRealTransactions();
