#!/usr/bin/env node
/**
 * ДИАГНОСТИКА USER 25 И USER 228 В ПРОДАКШНЕ
 * Проверка TON пополнений через TonConnect для конкретных пользователей
 * БЕЗ ИЗМЕНЕНИЙ В КОДЕ
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkProductionUsers() {
  console.log('🔍 ДИАГНОСТИКА USER 25 И USER 228 В ПРОДАКШНЕ\n');
  
  const targetUsers = [25, 228];
  
  for (const userId of targetUsers) {
    console.log(`\n🎯 ===== АНАЛИЗ USER ${userId} =====`);
    
    try {
      // 1. Проверяем существование пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, telegram_id, username, balance_ton, balance_uni, created_at')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.log(`❌ User ${userId} НЕ НАЙДЕН в базе данных`);
        console.log('   Ошибка:', userError?.message || 'User не существует');
        continue;
      }

      console.log(`✅ User ${userId} найден:`);
      console.log(`   Telegram ID: ${user.telegram_id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   TON баланс: ${user.balance_ton}`);
      console.log(`   UNI баланс: ${user.balance_uni}`);
      console.log(`   Создан: ${new Date(user.created_at).toLocaleString()}`);

      // 2. Анализ ВСЕХ транзакций пользователя
      const { data: allTransactions, error: txError } = await supabase
        .from('transactions')
        .select('id, type, amount, currency, description, created_at, metadata, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error(`❌ Ошибка получения транзакций User ${userId}:`, txError);
        continue;
      }

      console.log(`\n📊 НАЙДЕНО ${allTransactions.length} транзакций User ${userId}:`);
      
      // Группируем по валютам и типам
      const txByType = {};
      const tonTransactions = [];
      const uniTransactions = [];
      
      allTransactions.forEach(tx => {
        const key = `${tx.type}_${tx.currency}`;
        if (!txByType[key]) txByType[key] = 0;
        txByType[key]++;
        
        if (tx.currency === 'TON') tonTransactions.push(tx);
        if (tx.currency === 'UNI') uniTransactions.push(tx);
      });

      console.log('\n📈 Статистика по типам:');
      Object.entries(txByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} транзакций`);
      });

      // 3. ДЕТАЛЬНЫЙ АНАЛИЗ TON ТРАНЗАКЦИЙ
      console.log(`\n💎 АНАЛИЗ ${tonTransactions.length} TON ТРАНЗАКЦИЙ:`);
      
      if (tonTransactions.length === 0) {
        console.log('   🚨 НЕТ TON ТРАНЗАКЦИЙ У ЭТОГО ПОЛЬЗОВАТЕЛЯ!');
        console.log('   📋 Возможные причины:');
        console.log('      - Пользователь не делал TON пополнения');
        console.log('      - TonConnect не создает транзакции для этого пользователя');
        console.log('      - Проблема в backend обработке');
      } else {
        // Ищем депозиты/пополнения
        const deposits = tonTransactions.filter(tx => 
          tx.type === 'DEPOSIT' || 
          tx.type === 'TON_DEPOSIT' ||
          tx.description?.includes('deposit') ||
          tx.description?.includes('пополнение')
        );
        
        const referrals = tonTransactions.filter(tx => tx.type === 'REFERRAL_REWARD');
        const farming = tonTransactions.filter(tx => tx.type === 'FARMING_REWARD');
        
        console.log(`   📥 Депозиты/пополнения: ${deposits.length}`);
        console.log(`   🤝 Реферальные награды: ${referrals.length}`);
        console.log(`   🌾 Фарминг награды: ${farming.length}`);
        
        // Показываем последние 5 TON транзакций
        console.log('\n   🔍 Последние 5 TON транзакций:');
        tonTransactions.slice(0, 5).forEach((tx, i) => {
          console.log(`      ${i + 1}. ID ${tx.id}: ${tx.amount} TON`);
          console.log(`         Тип: ${tx.type}`);
          console.log(`         Статус: ${tx.status}`);
          console.log(`         Описание: ${tx.description || 'нет'}`);
          console.log(`         Время: ${new Date(tx.created_at).toLocaleString()}`);
          if (tx.metadata) {
            console.log(`         Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
          }
        });
      }

      // 4. ПОИСК TON ПОПОЛНЕНИЙ В ДРУГИХ ФОРМАТАХ
      console.log('\n🔍 ПОИСК СКРЫТЫХ TON ПОПОЛНЕНИЙ:');
      
      // Ищем по описанию
      const possibleDeposits = allTransactions.filter(tx =>
        tx.description && (
          tx.description.includes('TON') ||
          tx.description.includes('deposit') ||
          tx.description.includes('пополнение') ||
          tx.description.includes('TonConnect') ||
          tx.description.includes('blockchain')
        )
      );
      
      console.log(`   🔍 Транзакции с упоминанием TON/deposit: ${possibleDeposits.length}`);
      possibleDeposits.forEach(tx => {
        console.log(`      ID ${tx.id}: ${tx.amount} ${tx.currency} - ${tx.description}`);
      });

      // 5. ПРОВЕРКА METADATA НА НАЛИЧИЕ TON CONNECT
      const tonConnectTx = allTransactions.filter(tx =>
        tx.metadata && (
          JSON.stringify(tx.metadata).includes('ton') ||
          JSON.stringify(tx.metadata).includes('TonConnect') ||
          JSON.stringify(tx.metadata).includes('wallet')
        )
      );
      
      console.log(`   🔍 Транзакции с TON Connect metadata: ${tonConnectTx.length}`);
      tonConnectTx.forEach(tx => {
        console.log(`      ID ${tx.id}: ${tx.type} - ${JSON.stringify(tx.metadata)}`);
      });

      // 6. ИСТОРИЯ ИЗМЕНЕНИЙ БАЛАНСА TON
      console.log('\n📈 ИСТОРИЯ ИЗМЕНЕНИЙ TON БАЛАНСА:');
      
      const tonTxSorted = tonTransactions.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      let runningBalance = 0;
      tonTxSorted.forEach((tx, i) => {
        const amount = parseFloat(tx.amount);
        if (tx.type === 'DEPOSIT' || tx.type === 'TON_DEPOSIT' || tx.type === 'REFERRAL_REWARD' || tx.type === 'FARMING_REWARD') {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }
        
        if (i < 10) { // Показываем первые 10
          console.log(`      ${new Date(tx.created_at).toLocaleString()}: ${amount > 0 ? '+' : ''}${amount} TON (баланс: ${runningBalance.toFixed(6)})`);
        }
      });
      
      console.log(`   📊 Текущий расчетный баланс: ${runningBalance.toFixed(6)} TON`);
      console.log(`   💰 Реальный баланс в БД: ${user.balance_ton} TON`);
      
      if (Math.abs(runningBalance - parseFloat(user.balance_ton)) > 0.000001) {
        console.log('   ⚠️ РАСХОЖДЕНИЕ между расчетным и реальным балансом!');
      }

    } catch (error) {
      console.error(`❌ Ошибка анализа User ${userId}:`, error.message);
    }
  }

  // 7. ОБЩИЙ АНАЛИЗ ПРОДАКШН СИСТЕМЫ
  console.log('\n\n🎯 ===== ОБЩИЙ АНАЛИЗ ПРОДАКШН СИСТЕМЫ =====');
  
  try {
    // Проверяем все TON депозиты в системе
    const { data: allTonDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, description, created_at, metadata')
      .eq('currency', 'TON')
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (depositsError) {
      console.error('❌ Ошибка получения TON депозитов:', depositsError);
    } else {
      console.log(`📊 НАЙДЕНО ${allTonDeposits.length} TON ДЕПОЗИТОВ в системе:`);
      
      const userDeposits = {};
      allTonDeposits.forEach(tx => {
        if (!userDeposits[tx.user_id]) userDeposits[tx.user_id] = 0;
        userDeposits[tx.user_id] += parseFloat(tx.amount);
      });
      
      console.log('\n📈 TON депозиты по пользователям:');
      Object.entries(userDeposits).forEach(([userId, total]) => {
        console.log(`   User ${userId}: ${total} TON`);
      });
      
      if (!userDeposits[25] && !userDeposits[228]) {
        console.log('\n🚨 КРИТИЧЕСКАЯ НАХОДКА:');
        console.log('   User 25 и User 228 НЕ ИМЕЮТ TON депозитов в системе!');
        console.log('   Это подтверждает проблему с TonConnect интеграцией');
      }
    }

    // Проверяем последние TonConnect активности
    console.log('\n🔍 ПОИСК TONCONNECT АКТИВНОСТЕЙ:');
    const { data: tonConnectTx, error: tcError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, description, created_at, metadata')
      .or('description.ilike.%TonConnect%,description.ilike.%ton_connect%,description.ilike.%blockchain%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tonConnectTx && tonConnectTx.length > 0) {
      console.log(`   ✅ Найдено ${tonConnectTx.length} TonConnect транзакций:`);
      tonConnectTx.forEach(tx => {
        console.log(`      User ${tx.user_id}: ${tx.amount} ${tx.currency} - ${tx.description}`);
      });
    } else {
      console.log('   🚨 TonConnect транзакции НЕ НАЙДЕНЫ');
    }

  } catch (error) {
    console.error('❌ Ошибка общего анализа:', error.message);
  }

  console.log('\n🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('📋 БЕЗ ИЗМЕНЕНИЙ В КОДЕ - ТОЛЬКО АНАЛИЗ ДАННЫХ');
}

checkProductionUsers();