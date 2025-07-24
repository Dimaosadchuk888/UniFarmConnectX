#!/usr/bin/env node

/**
 * ПРОИЗВОДСТВЕННАЯ ДИАГНОСТИКА: User #25 TON баланс
 * Запускается ТОЛЬКО в Production окружении
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только диагностика
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Production окружение использует эти переменные
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ОШИБКА: Production переменные окружения не найдены');
  console.error('Нужны: SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function productionUser25Diagnostic() {
  console.log('🏭 PRODUCTION ДИАГНОСТИКА: User #25 TON баланс');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log(`🔗 Database: ${supabaseUrl.substring(0, 30)}...`);
  console.log('⚠️  РЕЖИМ: БЕЗ ИЗМЕНЕНИЙ КОДА - только чтение данных');
  
  // 1. ПРОВЕРКА СУЩЕСТВОВАНИЯ User #25
  console.log('\n1️⃣ ПРОИЗВОДСТВЕННАЯ ПРОВЕРКА User #25');
  console.log('-'.repeat(60));
  
  const { data: user25, error: userError } = await supabase
    .from('users')
    .select('id, username, telegram_id, balance_ton, balance_uni, created_at, referral_code')
    .eq('id', 25)
    .single();

  if (userError) {
    console.error('❌ User #25 НЕ НАЙДЕН в Production БД:', userError.message);
    
    // Попробуем найти по telegram_id или username
    console.log('\n🔍 ПОИСК User #25 по другим критериям...');
    
    const { data: userByName } = await supabase
      .from('users')
      .select('id, username, telegram_id, balance_ton')
      .ilike('username', '%DimaOsadchuk%')
      .limit(5);
    
    if (userByName && userByName.length > 0) {
      console.log('👤 Найдены пользователи с похожим именем:');
      userByName.forEach(u => {
        console.log(`   ID:${u.id} | @${u.username} | TG:${u.telegram_id} | TON:${u.balance_ton}`);
      });
    }
    
    return;
  }

  console.log('✅ User #25 НАЙДЕН в Production БД!');
  console.log(`👤 Username: @${user25.username}`);
  console.log(`📞 Telegram ID: ${user25.telegram_id}`);
  console.log(`💰 TON Balance: ${user25.balance_ton}`);
  console.log(`🪙 UNI Balance: ${user25.balance_uni}`);
  console.log(`🔗 Referral Code: ${user25.referral_code}`);
  console.log(`📅 Создан: ${user25.created_at}`);

  // 2. ПОЛНАЯ ИСТОРИЯ TON ТРАНЗАКЦИЙ User #25
  console.log('\n2️⃣ ПОЛНАЯ ИСТОРИЯ TON ТРАНЗАКЦИЙ User #25');
  console.log('-'.repeat(60));
  
  const { data: allTransactions, error: txError } = await supabase
    .from('transactions')
    .select('id, type, amount_ton, amount_uni, currency, description, status, created_at, metadata')
    .eq('user_id', 25)
    .order('created_at', { ascending: true });

  if (txError) {
    console.error('❌ Ошибка получения транзакций:', txError.message);
    return;
  }

  console.log(`📊 ВСЕГО транзакций User #25: ${allTransactions.length}`);
  
  // Фильтруем TON транзакции
  const tonTransactions = allTransactions.filter(tx => 
    parseFloat(tx.amount_ton || 0) > 0 || 
    tx.currency === 'TON' ||
    tx.description?.includes('TON')
  );
  
  console.log(`🪙 TON транзакций: ${tonTransactions.length}`);

  if (tonTransactions.length > 0) {
    console.log('\n📋 ДЕТАЛЬНАЯ ИСТОРИЯ TON ТРАНЗАКЦИЙ:');
    console.log('Дата       | ID     | Тип           | Сумма TON | Статус    | Описание');
    console.log('-'.repeat(90));
    
    let runningBalance = 0;
    tonTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount_ton || 0);
      const date = tx.created_at.split('T')[0];
      const time = tx.created_at.split('T')[1].substring(0, 5);
      
      if (tx.type === 'FARMING_REWARD' || tx.type === 'REFERRAL_REWARD') {
        runningBalance += amount;
      } else if (tx.type?.includes('WITHDRAWAL')) {
        runningBalance -= amount;
      } else {
        runningBalance += amount;
      }
      
      console.log(`${date} ${time} | ${String(tx.id).padEnd(6)} | ${String(tx.type).padEnd(13)} | ${String(amount).padEnd(9)} | ${String(tx.status).padEnd(9)} | ${(tx.description || '').substring(0, 40)}...`);
    });
    
    console.log('-'.repeat(90));
    console.log(`📊 РАСЧЕТНЫЙ БАЛАНС ПО ТРАНЗАКЦИЯМ: ${runningBalance.toFixed(6)} TON`);
    console.log(`💰 ФАКТИЧЕСКИЙ БАЛАНС В БД: ${user25.balance_ton} TON`);
    
    const discrepancy = parseFloat(user25.balance_ton) - runningBalance;
    console.log(`⚠️  РАСХОЖДЕНИЕ: ${discrepancy.toFixed(6)} TON`);
    
    if (Math.abs(discrepancy) > 0.001) {
      console.log('🚨 ОБНАРУЖЕНО РАСХОЖДЕНИЕ БАЛАНСОВ!');
    } else {
      console.log('✅ Балансы совпадают');
    }
  }

  // 3. АНАЛИЗ BLOCKCHAIN ДЕПОЗИТОВ
  console.log('\n3️⃣ АНАЛИЗ BLOCKCHAIN ДЕПОЗИТОВ');
  console.log('-'.repeat(60));
  
  const blockchainDeposits = allTransactions.filter(tx => 
    tx.description?.includes('blockchain') ||
    tx.description?.includes('deposit') ||
    tx.type === 'TON_DEPOSIT' ||
    tx.type === 'FARMING_REWARD'
  );
  
  console.log(`🔗 Blockchain/Deposit транзакций: ${blockchainDeposits.length}`);
  
  if (blockchainDeposits.length > 0) {
    console.log('\n📋 ДЕТАЛИ BLOCKCHAIN ДЕПОЗИТОВ:');
    blockchainDeposits.slice(0, 10).forEach(tx => {
      console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[0]} | ${tx.type}`);
      console.log(`  TON: ${tx.amount_ton} | Статус: ${tx.status}`);
      console.log(`  Описание: ${tx.description}`);
      if (tx.metadata) {
        console.log(`  Metadata: ${JSON.stringify(tx.metadata)}`);
      }
      console.log('  ---');
    });
  }

  // 4. ПОИСК ОПЕРАЦИЙ СПИСАНИЯ
  console.log('\n4️⃣ ПОИСК ОПЕРАЦИЙ СПИСАНИЯ TON');
  console.log('-'.repeat(60));
  
  const debitTransactions = allTransactions.filter(tx => {
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    
    return desc.includes('withdraw') ||
           desc.includes('списание') ||
           desc.includes('вывод') ||
           desc.includes('subtract') ||
           type.includes('withdrawal') ||
           type.includes('deduct') ||
           type.includes('fee');
  });
  
  console.log(`💸 Операций списания: ${debitTransactions.length}`);
  
  if (debitTransactions.length > 0) {
    console.log('\n📋 ДЕТАЛИ ОПЕРАЦИЙ СПИСАНИЯ:');
    debitTransactions.forEach(tx => {
      console.log(`• ID:${tx.id} | ${tx.created_at.split('T')[0]} | ${tx.type}`);
      console.log(`  TON: -${tx.amount_ton} | Описание: ${tx.description}`);
      console.log('  ---');
    });
  }

  // 5. ИТОГОВЫЙ ДИАГНОЗ
  console.log('\n5️⃣ ИТОГОВЫЙ ДИАГНОЗ User #25');
  console.log('='.repeat(60));
  
  console.log(`✅ Пользователь существует в Production БД`);
  console.log(`📊 Общих транзакций: ${allTransactions.length}`);
  console.log(`🪙 TON транзакций: ${tonTransactions.length}`);
  console.log(`💰 Текущий баланс: ${user25.balance_ton} TON`);
  console.log(`🔗 Blockchain депозитов: ${blockchainDeposits.length}`);
  console.log(`💸 Операций списания: ${debitTransactions.length}`);
  
  if (tonTransactions.length === 0) {
    console.log('\n🚨 КРИТИЧНАЯ ПРОБЛЕМА: TON транзакции отсутствуют!');
    console.log('   Баланс 0.31 TON существует без подтверждающих транзакций');
    console.log('   Возможные причины:');
    console.log('   • Транзакции были удалены из БД');
    console.log('   • Неправильная миграция данных');
    console.log('   • Ошибка в логике создания транзакций');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 РЕЗУЛЬТАТ ПРОИЗВОДСТВЕННОЙ ДИАГНОСТИКИ ЗАВЕРШЕН');
  console.log('='.repeat(80));
}

// Запускаем только если это Production окружение
if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT) {
  productionUser25Diagnostic().catch(console.error);
} else {
  console.log('⚠️  Скрипт предназначен только для Production окружения');
  console.log('   Для запуска в Production разверните приложение и выполните диагностику');
}