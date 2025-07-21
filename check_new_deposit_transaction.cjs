#!/usr/bin/env node
/**
 * Проверка создания новой транзакции после исправления
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkNewTransaction() {
  console.log('🔍 Проверка новых FARMING_DEPOSIT транзакций для User 184...\n');

  try {
    // Проверяем последние транзакции User 184
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, description, created_at')
      .eq('user_id', 184)
      .eq('type', 'FARMING_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Ошибка запроса транзакций:', error);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log('⚠️ НЕТ FARMING_DEPOSIT транзакций для User 184');
      
      // Проверим последние транзакции любого типа
      const { data: allTransactions, error: allError } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount, currency, description, created_at')
        .eq('user_id', 184)
        .order('created_at', { ascending: false })
        .limit(3);

      if (allError) {
        console.error('❌ Ошибка запроса всех транзакций:', allError);
        return;
      }

      console.log('\n📋 Последние транзакции User 184:');
      allTransactions?.forEach((tx, i) => {
        console.log(`${i + 1}. ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}`);
        console.log(`   Description: ${tx.description}`);
        console.log(`   Created: ${tx.created_at}\n`);
      });

      return;
    }

    console.log(`✅ Найдено ${transactions.length} FARMING_DEPOSIT транзакций:\n`);

    transactions.forEach((tx, i) => {
      console.log(`${i + 1}. Transaction ID: ${tx.id}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Created: ${tx.created_at}`);
      
      // Проверим дату создания - ожидаем недавнюю транзакцию
      const created = new Date(tx.created_at);
      const now = new Date();
      const diffMinutes = (now - created) / (1000 * 60);
      
      if (diffMinutes < 10) {
        console.log(`   🟢 НОВАЯ ТРАНЗАКЦИЯ (создана ${diffMinutes.toFixed(1)} минут назад)`);
      } else {
        console.log(`   🟡 Старая транзакция (создана ${diffMinutes.toFixed(1)} минут назад)`);
      }
      console.log('');
    });

    // Проверим данные фарминга User 184
    const { data: farmingData, error: farmingError } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount, uni_farming_active')
      .eq('id', 184)
      .single();

    if (farmingError) {
      console.error('❌ Ошибка запроса данных фарминга:', farmingError);
      return;
    }

    console.log('📊 Текущие данные User 184:');
    console.log(`   Balance UNI: ${farmingData.balance_uni}`);
    console.log(`   Deposit Amount: ${farmingData.uni_deposit_amount}`);
    console.log(`   Farming Active: ${farmingData.uni_farming_active}`);

  } catch (error) {
    console.error('❌ Исключение при проверке:', error);
  }
}

checkNewTransaction();