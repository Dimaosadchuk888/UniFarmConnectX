#!/usr/bin/env node

/**
 * КОМПЛЕКСНЫЙ АНАЛИЗ ДЕПОЗИТА 24.07.2025, 08:55
 * Расширенный поиск по всем возможным критериям
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только диагностика
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveDepositAnalysis() {
  console.log('🔍 КОМПЛЕКСНЫЙ АНАЛИЗ ДЕПОЗИТА 24.07.2025, 08:55');
  console.log('='.repeat(80));
  console.log(`📅 Анализ на: ${new Date().toLocaleString('ru-RU')}`);
  
  // Ваш blockchain код из сообщения
  const blockchainCode = 'te6cckECBAEAAL0AAfGIALKkfhrf64MMekUmJ+6y3nR73Z31+EJ1YuGvDLli2OEIA5tLO3f///iIAAAAAAADRA+weAAAARsdpjnf8k78b5awIXECygukLsVDjjIZBplNNjxVY2rOCB/S79o9Lf85frF8t4jAlEK7SYtyiVgDtr9EvQMjs7gSAQIKDsPIbQMDAgBoQgAy1qPkmESgOZMZ225Yq7Y113tDjkFCFPPWjMth0RWpoqDuaygAAAAAAAAAAAAAAAAAAAAAfBg2bg==';
  
  console.log('🎯 КРИТЕРИИ ПОИСКА ДЕПОЗИТА:');
  console.log('   Время: 24.07.2025, 08:55 (возможно MSK)');
  console.log('   Тип: UNI Farming TON deposit');
  console.log('   Blockchain: te6cck...');
  
  // Время поиска - расширяем окно до 2 часов
  const searchCenter = new Date('2025-07-24T05:55:00.000Z'); // 08:55 MSK
  const searchStart = new Date(searchCenter.getTime() - 2 * 60 * 60 * 1000); // -2 часа
  const searchEnd = new Date(searchCenter.getTime() + 2 * 60 * 60 * 1000);   // +2 часа
  
  console.log(`\n🕐 РАСШИРЕННОЕ ВРЕМЕННОЕ ОКНО (±2 часа):`);
  console.log(`   От: ${searchStart.toISOString()}`);
  console.log(`   До: ${searchEnd.toISOString()}`);
  
  // 1. ПОИСК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С ВАШИМ ИМЕНЕМ/ID
  console.log('\n1️⃣ ПОИСК ПОЛЬЗОВАТЕЛЕЙ ПО ИМЕНИ');
  console.log('-'.repeat(60));
  
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id, username, first_name, balance_ton, balance_uni, created_at')
    .order('id', { ascending: false })
    .limit(50);
  
  if (usersError) {
    console.error('❌ Ошибка получения пользователей:', usersError.message);
  } else {
    console.log(`📊 Найдено активных пользователей: ${allUsers?.length || 0}`);
    
    // Ищем пользователей которые могли делать депозит
    const candidateUsers = allUsers?.filter(user => 
      parseFloat(user.balance_ton || '0') > 0 || 
      user.username?.toLowerCase().includes('test') ||
      user.first_name?.toLowerCase().includes('user')
    ) || [];
    
    console.log(`📊 Кандидаты с TON балансом: ${candidateUsers.length}`);
    
    if (candidateUsers.length > 0) {
      console.log('\n👥 ПОЛЬЗОВАТЕЛИ С TON БАЛАНСОМ:');
      candidateUsers.slice(0, 10).forEach(user => {
        console.log(`   ID: ${user.id} | TG: ${user.telegram_id} | ${user.first_name || ''} (@${user.username || 'без username'})`);
        console.log(`   TON: ${user.balance_ton || 0} | UNI: ${user.balance_uni || 0}`);
        console.log('   ---');
      });
    }
  }
  
  // 2. ПОИСК ПО РАСШИРЕННОМУ ВРЕМЕННОМУ ОКНУ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
  console.log('\n2️⃣ РАСШИРЕННЫЙ ПОИСК ПО ВРЕМЕНИ (ВСЕ ПОЛЬЗОВАТЕЛИ)');
  console.log('-'.repeat(60));
  
  const { data: allTimeTransactions, error: allTimeError } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount_ton, amount_uni, description, created_at, metadata, currency')
    .gte('created_at', searchStart.toISOString())
    .lte('created_at', searchEnd.toISOString())
    .or('type.eq.TON_DEPOSIT,type.eq.DEPOSIT,description.ilike.%TON deposit%,description.ilike.%blockchain%,currency.eq.TON')
    .order('created_at', { ascending: false });
  
  if (allTimeError) {
    console.error('❌ Ошибка расширенного поиска:', allTimeError.message);
  } else {
    console.log(`📊 Найдено подозрительных транзакций: ${allTimeTransactions?.length || 0}`);
    
    if (allTimeTransactions && allTimeTransactions.length > 0) {
      console.log('\n📋 ПОДОЗРИТЕЛЬНЫЕ ТРАНЗАКЦИИ:');
      allTimeTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. User: ${tx.user_id} | ID: ${tx.id}`);
        console.log(`   Время: ${tx.created_at}`);
        console.log(`   Тип: ${tx.type} | Валюта: ${tx.currency || 'не указана'}`);
        console.log(`   TON: ${tx.amount_ton || '0'} | UNI: ${tx.amount_uni || '0'}`);
        console.log(`   Описание: ${(tx.description || '').substring(0, 80)}...`);
        if (tx.metadata && Object.keys(tx.metadata).length > 0) {
          console.log(`   Metadata: ${JSON.stringify(tx.metadata).substring(0, 100)}...`);
        }
        console.log('   ---');
      });
    }
  }
  
  // 3. ПОИСК ПО ЧАСТИ BLOCKCHAIN КОДА
  console.log('\n3️⃣ ПОИСК ПО BLOCKCHAIN СИГНАТУРАМ');
  console.log('-'.repeat(60));
  
  const signatures = [
    'te6cck',
    'AAfGI',
    'AAAAAAADRa+we',
    'blockchain:',
    'deposit from blockchain'
  ];
  
  for (const signature of signatures) {
    const { data: sigTransactions, error: sigError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, description, created_at, metadata')
      .or(`description.ilike.%${signature}%,metadata.ilike.%${signature}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!sigError && sigTransactions && sigTransactions.length > 0) {
      console.log(`\n🔍 НАЙДЕНО С "${signature}": ${sigTransactions.length}`);
      sigTransactions.slice(0, 5).forEach(tx => {
        console.log(`   User: ${tx.user_id} | ${tx.created_at} | ${tx.type}`);
        console.log(`   ${(tx.description || JSON.stringify(tx.metadata || {})).substring(0, 60)}...`);
      });
    }
  }
  
  // 4. АНАЛИЗ ИЗМЕНЕНИЙ БАЛАНСОВ В УКАЗАННОЕ ВРЕМЯ
  console.log('\n4️⃣ АНАЛИЗ ИЗМЕНЕНИЙ TON БАЛАНСОВ');
  console.log('-'.repeat(60));
  
  // Получаем пользователей с TON балансом и анализируем их транзакции
  const usersWithTon = allUsers?.filter(user => parseFloat(user.balance_ton || '0') > 0) || [];
  
  for (const user of usersWithTon.slice(0, 5)) {
    console.log(`\n👤 АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ${user.id} (TON: ${user.balance_ton}):`);
    
    const { data: userTransactions, error: userTxError } = await supabase
      .from('transactions')
      .select('id, type, amount_ton, amount_uni, description, created_at')
      .eq('user_id', user.id)
      .gte('created_at', searchStart.toISOString())
      .lte('created_at', searchEnd.toISOString())
      .order('created_at', { ascending: false });
    
    if (!userTxError && userTransactions && userTransactions.length > 0) {
      console.log(`   Транзакций в окне: ${userTransactions.length}`);
      
      // Ищем TON транзакции
      const tonTx = userTransactions.filter(tx => parseFloat(tx.amount_ton || '0') > 0);
      if (tonTx.length > 0) {
        console.log(`   TON транзакций: ${tonTx.length}`);
        tonTx.slice(0, 3).forEach(tx => {
          console.log(`     ${tx.created_at} | ${tx.type} | TON: ${tx.amount_ton}`);
          console.log(`     ${(tx.description || '').substring(0, 50)}...`);
        });
      }
    }
  }
  
  // 5. ДЕТАЛЬНЫЙ АНАЛИЗ ВРЕМЕНИ 08:55
  console.log('\n5️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ ВРЕМЕНИ 08:55 ±15 МИНУТ');
  console.log('-'.repeat(60));
  
  const exactStart = new Date('2025-07-24T05:40:00.000Z'); // 08:40 MSK
  const exactEnd = new Date('2025-07-24T06:10:00.000Z');   // 09:10 MSK
  
  const { data: exactTimeTransactions, error: exactError } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', exactStart.toISOString())
    .lte('created_at', exactEnd.toISOString())
    .order('created_at', { ascending: false });
  
  if (!exactError && exactTimeTransactions) {
    console.log(`📊 Всего транзакций 08:40-09:10: ${exactTimeTransactions.length}`);
    
    // Группируем по пользователям
    const userGroups = {};
    exactTimeTransactions.forEach(tx => {
      if (!userGroups[tx.user_id]) {
        userGroups[tx.user_id] = [];
      }
      userGroups[tx.user_id].push(tx);
    });
    
    console.log(`👥 Активных пользователей в это время: ${Object.keys(userGroups).length}`);
    
    // Анализируем каждого пользователя
    Object.entries(userGroups).forEach(([userId, transactions]) => {
      const tonTx = transactions.filter(tx => parseFloat(tx.amount_ton || '0') > 0);
      const totalTon = tonTx.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
      
      if (tonTx.length > 0) {
        console.log(`\n👤 User ${userId}: ${transactions.length} транзакций, ${tonTx.length} с TON (всего: ${totalTon.toFixed(6)})`);
        
        // Показываем TON транзакции этого пользователя
        tonTx.forEach(tx => {
          const timeStr = new Date(tx.created_at).toISOString().substring(11, 19);
          console.log(`     ${timeStr} | ${tx.type} | TON: ${tx.amount_ton}`);
          console.log(`     ${(tx.description || '').substring(0, 60)}...`);
        });
      }
    });
  }
  
  // 6. ИТОГОВЫЕ ВЫВОДЫ
  console.log('\n6️⃣ ИТОГОВЫЕ ВЫВОДЫ О ДЕПОЗИТЕ');
  console.log('-'.repeat(60));
  
  const candidateCount = allTimeTransactions?.length || 0;
  const tonUsersCount = usersWithTon.length;
  
  console.log('🎯 РЕЗУЛЬТАТЫ КОМПЛЕКСНОГО АНАЛИЗА:');
  console.log(`   Подозрительных транзакций в ±2 часа: ${candidateCount}`);
  console.log(`   Пользователей с TON балансом: ${tonUsersCount}`);
  console.log(`   Blockchain сигнатур найдено: проверено ${signatures.length}`);
  
  if (candidateCount === 0) {
    console.log('\n🚨 ВАШ ДЕПОЗИТ НЕ НАЙДЕН В СИСТЕМЕ!');
    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. 🔄 ROLLBACK ТРАНЗАКЦИИ:');
    console.log('   - Депозит создался но был откачен constraint нарушением');
    console.log('   - idx_tx_hash_unique_safe вызвал rollback успешной транзакции');
    console.log('   - Frontend показал депозит, но БД откатила его');
    
    console.log('\n2. 📝 НЕ СОЗДАЛАСЬ ТРАНЗАКЦИЯ:');
    console.log('   - WalletService.processTonDeposit() обновил баланс');
    console.log('   - Но НЕ создал запись в transactions');
    console.log('   - Прямой UPDATE users SET balance_ton без документирования');
    
    console.log('\n3. 🕒 НЕТОЧНОЕ ВРЕМЯ:');
    console.log('   - Депозит был в другое время');
    console.log('   - Временные зоны (MSK vs UTC) сбили поиск');
    
    console.log('\n4. 👤 ДРУГОЙ ПОЛЬЗОВАТЕЛЬ:');
    console.log('   - Депозит записался под другим user_id');
    console.log('   - Ошибка в определении пользователя');
  } else {
    console.log('\n✅ НАЙДЕНЫ СВЯЗАННЫЕ ТРАНЗАКЦИИ');
    console.log('   Требуется дополнительный анализ найденных записей');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 КОМПЛЕКСНЫЙ АНАЛИЗ ДЕПОЗИТА ЗАВЕРШЕН');
  console.log('='.repeat(80));
}

comprehensiveDepositAnalysis().catch(console.error);