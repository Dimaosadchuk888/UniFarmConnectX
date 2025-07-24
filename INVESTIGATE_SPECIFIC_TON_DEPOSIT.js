#!/usr/bin/env node

/**
 * ИССЛЕДОВАНИЕ КОНКРЕТНОГО TON ДЕПОЗИТА
 * Анализ депозита от 24.07.2025, 08:55 с blockchain кодом
 * БЕЗ ИЗМЕНЕНИЙ КОДА - только поиск и анализ
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSpecificTonDeposit() {
  console.log('🔍 ИССЛЕДОВАНИЕ КОНКРЕТНОГО TON ДЕПОЗИТА');
  console.log('='.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);
  console.log('⚠️  БЕЗ ИЗМЕНЕНИЙ КОДА - поиск депозита от 24.07.2025, 08:55');
  
  const targetDepositInfo = {
    date: '24.07.2025, 08:55',
    blockchainCode: 'te6cckECBAEAAL0AAfGIALKkfhrf64MMekUmJ+6y3nR73Z31+EJ1YuGvDLli2OEIA5tLO3f///iIAAAAAAADRA+weAAAARsdpjnf8k78b5awIXECygukLsVDjjIZBplNNjxVY2rOCB/S79o9Lf85frF8t4jAlEK7SYtyiVgDtr9EvQMjs7gSAQIKDsPIbQMDAgBoQgAy1qPkmESgOZMZ225Yq7Y113tDjkFCFPPWjMth0RWpoqDuaygAAAAAAAAAAAAAAAAAAAAAfBg2bg==',
    type: 'UNI Farming TON deposit'
  };
  
  console.log('🎯 ДАННЫЕ ДЕПОЗИТА ДЛЯ ПОИСКА:');
  console.log(`   Дата: ${targetDepositInfo.date}`);
  console.log(`   Тип: ${targetDepositInfo.type}`);
  console.log(`   Blockchain код: ${targetDepositInfo.blockchainCode.substring(0, 50)}...`);
  
  // Преобразуем дату в UTC для поиска
  const searchDate = new Date('2025-07-24T05:55:00.000Z'); // 08:55 MSK = 05:55 UTC
  const searchStart = new Date(searchDate.getTime() - 10 * 60 * 1000); // -10 минут
  const searchEnd = new Date(searchDate.getTime() + 10 * 60 * 1000);   // +10 минут
  
  console.log(`\n🕐 ВРЕМЕННОЕ ОКНО ПОИСКА:`);
  console.log(`   От: ${searchStart.toISOString()}`);
  console.log(`   До: ${searchEnd.toISOString()}`);
  
  // Получаем ID текущего пользователя из контекста
  const currentUserId = 184; // Используем тестового пользователя из предыдущих запросов
  
  // 1. ПОИСК ПО ВРЕМЕНИ И ОПИСАНИЮ
  console.log('\n1️⃣ ПОИСК ТРАНЗАКЦИЙ ПО ВРЕМЕННОМУ ОКНУ');
  console.log('-'.repeat(60));
  
  const { data: timeBasedTransactions, error: timeError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', currentUserId)
    .gte('created_at', searchStart.toISOString())
    .lte('created_at', searchEnd.toISOString())
    .order('created_at', { ascending: false });
  
  if (timeError) {
    console.error('❌ Ошибка поиска по времени:', timeError.message);
  } else {
    console.log(`📊 Найдено транзакций в временном окне: ${timeBasedTransactions?.length || 0}`);
    
    if (timeBasedTransactions && timeBasedTransactions.length > 0) {
      console.log('\n📋 ТРАНЗАКЦИИ В УКАЗАННОЕ ВРЕМЯ:');
      timeBasedTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.id}`);
        console.log(`   Время: ${tx.created_at}`);
        console.log(`   Тип: ${tx.type}`);
        console.log(`   TON: ${tx.amount_ton || '0'}`);
        console.log(`   UNI: ${tx.amount_uni || '0'}`);
        console.log(`   Описание: ${tx.description || 'нет'}`);
        console.log(`   Статус: ${tx.status}`);
        console.log(`   Metadata: ${JSON.stringify(tx.metadata || {})}`);
        console.log('   ---');
      });
    }
  }
  
  // 2. ПОИСК ПО BLOCKCHAIN КОДУ В METADATA
  console.log('\n2️⃣ ПОИСК ПО BLOCKCHAIN КОДУ В METADATA');
  console.log('-'.repeat(60));
  
  const blockchainCodePart = targetDepositInfo.blockchainCode.substring(0, 30);
  
  const { data: metadataTransactions, error: metadataError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(100); // Берем последние 100 транзакций для проверки
  
  if (metadataError) {
    console.error('❌ Ошибка поиска по metadata:', metadataError.message);
  } else {
    const matchingTransactions = [];
    
    if (metadataTransactions) {
      metadataTransactions.forEach(tx => {
        const metadata = tx.metadata || {};
        const description = tx.description || '';
        
        // Ищем blockchain код в различных местах
        const metadataString = JSON.stringify(metadata).toLowerCase();
        const descriptionString = description.toLowerCase();
        const blockchainCodeLower = targetDepositInfo.blockchainCode.toLowerCase();
        
        if (metadataString.includes(blockchainCodePart.toLowerCase()) ||
            descriptionString.includes(blockchainCodePart.toLowerCase()) ||
            metadataString.includes('te6cck') ||
            descriptionString.includes('te6cck')) {
          matchingTransactions.push(tx);
        }
      });
    }
    
    console.log(`📊 Найдено транзакций с blockchain кодом: ${matchingTransactions.length}`);
    
    if (matchingTransactions.length > 0) {
      console.log('\n📋 ТРАНЗАКЦИИ С BLOCKCHAIN КОДОМ:');
      matchingTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.id}`);
        console.log(`   Время: ${tx.created_at}`);
        console.log(`   Тип: ${tx.type}`);
        console.log(`   TON: ${tx.amount_ton || '0'}`);
        console.log(`   Описание: ${tx.description || 'нет'}`);
        console.log(`   Metadata: ${JSON.stringify(tx.metadata || {}).substring(0, 100)}...`);
        console.log('   ---');
      });
    }
  }
  
  // 3. ПОИСК ПО ОПИСАНИЮ "TON deposit"
  console.log('\n3️⃣ ПОИСК ПО ОПИСАНИЮ "TON deposit"');
  console.log('-'.repeat(60));
  
  const { data: descriptionTransactions, error: descError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', currentUserId)
    .or('description.ilike.%TON deposit%,description.ilike.%blockchain%,type.eq.TON_DEPOSIT,type.eq.DEPOSIT')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (descError) {
    console.error('❌ Ошибка поиска по описанию:', descError.message);
  } else {
    console.log(`📊 Найдено транзакций с "TON deposit": ${descriptionTransactions?.length || 0}`);
    
    if (descriptionTransactions && descriptionTransactions.length > 0) {
      console.log('\n📋 TON DEPOSIT ТРАНЗАКЦИИ:');
      descriptionTransactions.slice(0, 10).forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.id}`);
        console.log(`   Время: ${tx.created_at}`);
        console.log(`   Тип: ${tx.type}`);
        console.log(`   TON: ${tx.amount_ton || '0'}`);
        console.log(`   Описание: ${tx.description || 'нет'}`);
        console.log('   ---');
      });
    }
  }
  
  // 4. ПРОВЕРКА ИЗМЕНЕНИЙ БАЛАНСА В УКАЗАННОЕ ВРЕМЯ
  console.log('\n4️⃣ АНАЛИЗ ИЗМЕНЕНИЙ БАЛАНСА ПОЛЬЗОВАТЕЛЯ');
  console.log('-'.repeat(60));
  
  // Получаем текущий баланс
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('balance_ton, balance_uni, updated_at')
    .eq('id', currentUserId)
    .single();
  
  if (userError) {
    console.error('❌ Ошибка получения пользователя:', userError.message);
  } else {
    console.log(`📊 ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ${currentUserId}:`);
    console.log(`   TON баланс: ${currentUser?.balance_ton || 0}`);
    console.log(`   UNI баланс: ${currentUser?.balance_uni || 0}`);
    console.log(`   Последнее обновление: ${currentUser?.updated_at}`);
    
    // Сравниваем время последнего обновления с временем депозита
    if (currentUser?.updated_at) {
      const lastUpdate = new Date(currentUser.updated_at);
      const timeDiff = Math.abs(lastUpdate.getTime() - searchDate.getTime());
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      
      console.log(`   Разница с временем депозита: ${minutesDiff} минут`);
      
      if (minutesDiff < 30) {
        console.log('✅ Время обновления баланса близко к времени депозита');
      } else {
        console.log('⚠️  Время обновления баланса не совпадает с депозитом');
      }
    }
  }
  
  // 5. ИТОГОВЫЙ АНАЛИЗ
  console.log('\n5️⃣ ИТОГОВЫЙ АНАЛИЗ ДЕПОЗИТА');
  console.log('-'.repeat(60));
  
  const foundInTimeWindow = timeBasedTransactions?.length || 0;
  const foundWithBlockchain = (metadataTransactions?.filter(tx => {
    const metadataString = JSON.stringify(tx.metadata || {}).toLowerCase();
    const descriptionString = (tx.description || '').toLowerCase();
    return metadataString.includes('te6cck') || descriptionString.includes('te6cck');
  }) || []).length;
  const foundTonDeposits = descriptionTransactions?.length || 0;
  
  console.log('🎯 РЕЗУЛЬТАТЫ ПОИСКА:');
  console.log(`   Транзакций в временном окне 08:55: ${foundInTimeWindow}`);
  console.log(`   Транзакций с blockchain кодом: ${foundWithBlockchain}`);
  console.log(`   Всего TON deposit транзакций: ${foundTonDeposits}`);
  
  if (foundInTimeWindow === 0 && foundWithBlockchain === 0) {
    console.log('\n🚨 ДЕПОЗИТ НЕ НАЙДЕН В СИСТЕМЕ!');
    console.log('   Возможные причины:');
    console.log('   1. Депозит не был обработан системой');
    console.log('   2. Депозит был создан и затем удален/откачен');
    console.log('   3. Депозит записан под другим user_id');
    console.log('   4. Время депозита отличается от указанного');
    console.log('   5. Депозит обработался но БЕЗ создания транзакции');
  } else {
    console.log('\n✅ НАЙДЕНЫ СВЯЗАННЫЕ ТРАНЗАКЦИИ');
    console.log('   Депозит присутствует в системе в той или иной форме');
  }
  
  // 6. ПРОВЕРКА ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (если не найден у текущего)
  if (foundInTimeWindow === 0) {
    console.log('\n6️⃣ РАСШИРЕННЫЙ ПОИСК ПО ВСЕМ ПОЛЬЗОВАТЕЛЯМ');
    console.log('-'.repeat(60));
    
    const { data: allTimeTransactions, error: allTimeError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, amount_uni, description, created_at, metadata')
      .gte('created_at', searchStart.toISOString())
      .lte('created_at', searchEnd.toISOString())
      .order('created_at', { ascending: false });
    
    if (allTimeError) {
      console.error('❌ Ошибка расширенного поиска:', allTimeError.message);
    } else {
      console.log(`📊 Всего транзакций в временном окне: ${allTimeTransactions?.length || 0}`);
      
      if (allTimeTransactions && allTimeTransactions.length > 0) {
        console.log('\n📋 ВСЕ ТРАНЗАКЦИИ В УКАЗАННОЕ ВРЕМЯ:');
        allTimeTransactions.forEach((tx, index) => {
          console.log(`${index + 1}. User: ${tx.user_id} | ID: ${tx.id}`);
          console.log(`   Время: ${tx.created_at}`);
          console.log(`   Тип: ${tx.type}`);
          console.log(`   TON: ${tx.amount_ton || '0'} | UNI: ${tx.amount_uni || '0'}`);
          console.log(`   Описание: ${(tx.description || '').substring(0, 50)}...`);
          console.log('   ---');
        });
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 ИССЛЕДОВАНИЕ КОНКРЕТНОГО ДЕПОЗИТА ЗАВЕРШЕНО');
  console.log('='.repeat(80));
}

investigateSpecificTonDeposit().catch(console.error);