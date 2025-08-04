#!/usr/bin/env tsx
/**
 * 🔍 ДЕТАЛЬНОЕ СРАВНЕНИЕ USER 25 VS ПРОБЛЕМНЫХ ПОЛЬЗОВАТЕЛЕЙ
 * Выяснение почему user 25 работает через TON_DEPOSIT, а остальные через DEPOSIT
 */

import { supabase } from './core/supabase';

async function finalDiagnosisUser255() {
  console.log('🔍 ДЕТАЛЬНОЕ СРАВНЕНИЕ АРХИТЕКТУРЫ ДЕПОЗИТОВ');
  console.log('='.repeat(80));

  try {
    // 1. Подробный анализ user 25 (успешный)
    console.log('\n1️⃣ АНАЛИЗ УСПЕШНОГО USER 25:');
    
    const { data: user25Deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .order('created_at', { ascending: true })
      .limit(10);

    console.log(`✅ User 25 - найдено депозитов: ${user25Deposits?.length || 0}`);
    
    if (user25Deposits && user25Deposits.length > 0) {
      console.log('\n📋 Первые 5 депозитов User 25:');
      user25Deposits.slice(0, 5).forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx.type}: ${tx.amount} ${tx.currency}`);
        console.log(`      created: ${tx.created_at}`);
        console.log(`      status: ${tx.status}`);
        console.log(`      tx_hash: ${tx.tx_hash_unique?.slice(0, 15) || 'НЕТ'}...`);
        console.log(`      metadata:`, tx.metadata ? Object.keys(tx.metadata) : 'НЕТ');
        console.log(`      description: ${tx.description}`);
        console.log('');
      });
    }

    // 2. Подробный анализ проблемного user 255
    console.log('\n2️⃣ АНАЛИЗ ПРОБЛЕМНОГО USER 255:');
    
    const { data: user255Deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .order('created_at', { ascending: true });

    console.log(`❌ User 255 - найдено депозитов: ${user255Deposits?.length || 0}`);
    
    if (user255Deposits && user255Deposits.length > 0) {
      console.log('\n📋 Все депозиты User 255:');
      user255Deposits.forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx.type}: ${tx.amount} ${tx.currency}`);
        console.log(`      created: ${tx.created_at}`);
        console.log(`      status: ${tx.status}`);
        console.log(`      tx_hash: ${tx.tx_hash_unique?.slice(0, 15) || 'НЕТ'}...`);
        console.log(`      metadata:`, tx.metadata ? Object.keys(tx.metadata) : 'НЕТ');
        console.log(`      description: ${tx.description}`);
        console.log('');
      });
    }

    // 3. Сравнение metadata и tx_hash паттернов
    console.log('\n3️⃣ СРАВНЕНИЕ ПАТТЕРНОВ СОЗДАНИЯ:');
    
    const user25TonDeposits = user25Deposits?.filter(tx => tx.type === 'TON_DEPOSIT') || [];
    const user255TonDeposits = user255Deposits?.filter(tx => tx.type === 'TON_DEPOSIT') || [];
    const user255RegularDeposits = user255Deposits?.filter(tx => tx.type === 'DEPOSIT') || [];

    console.log(`📊 User 25 TON_DEPOSIT: ${user25TonDeposits.length} записей`);
    console.log(`📊 User 255 TON_DEPOSIT: ${user255TonDeposits.length} записей`);
    console.log(`📊 User 255 DEPOSIT: ${user255RegularDeposits.length} записей`);

    // Анализ источников создания записей
    console.log('\n🔍 АНАЛИЗ ИСТОЧНИКОВ СОЗДАНИЯ:');
    
    if (user25TonDeposits.length > 0) {
      const sample25 = user25TonDeposits[0];
      console.log('\n✅ Образец успешного TON_DEPOSIT (User 25):');
      console.log(`   tx_hash_unique: ${sample25.tx_hash_unique}`);
      console.log(`   description: "${sample25.description}"`);
      console.log(`   metadata keys:`, sample25.metadata ? Object.keys(sample25.metadata) : 'НЕТ');
      console.log(`   amount: ${sample25.amount} vs amount_ton: ${sample25.amount_ton}`);
      console.log(`   status: ${sample25.status}`);
    }

    if (user255RegularDeposits.length > 0) {
      const sample255 = user255RegularDeposits[0];
      console.log('\n❌ Образец проблемного DEPOSIT (User 255):');
      console.log(`   tx_hash_unique: ${sample255.tx_hash_unique}`);
      console.log(`   description: "${sample255.description}"`);
      console.log(`   metadata keys:`, sample255.metadata ? Object.keys(sample255.metadata) : 'НЕТ');
      console.log(`   amount: ${sample255.amount} vs amount_ton: ${sample255.amount_ton}`);
      console.log(`   status: ${sample255.status}`);
    }

    // 4. Поиск других проблемных пользователей с похожими паттернами
    console.log('\n4️⃣ ПОИСК ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ С DEPOSIT ЗАПИСЯМИ:');
    
    const { data: otherDepositUsers } = await supabase
      .from('transactions')
      .select('user_id, type, amount, created_at, description, tx_hash_unique')
      .eq('type', 'DEPOSIT')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-01T00:00:00.000Z')
      .order('created_at', { ascending: false })
      .limit(15);

    if (otherDepositUsers) {
      console.log(`\n🔍 Другие пользователи с DEPOSIT записями:`);
      
      const userGroups = {};
      otherDepositUsers.forEach(tx => {
        if (!userGroups[tx.user_id]) {
          userGroups[tx.user_id] = [];
        }
        userGroups[tx.user_id].push(tx);
      });

      Object.entries(userGroups).forEach(([userId, deposits]) => {
        console.log(`\n👤 User ${userId}: ${deposits.length} DEPOSIT записей`);
        deposits.slice(0, 2).forEach((tx, i) => {
          console.log(`   ${i + 1}. amount: ${tx.amount}, created: ${tx.created_at.slice(0, 16)}`);
          console.log(`      description: "${tx.description}"`);
          console.log(`      tx_hash: ${tx.tx_hash_unique?.slice(0, 15) || 'НЕТ'}...`);
        });
      });
    }

    // 5. Поиск места создания DEPOSIT записей (анализ description)
    console.log('\n5️⃣ АНАЛИЗ DESCRIPTIONS ДЛЯ ОПРЕДЕЛЕНИЯ ИСТОЧНИКА:');
    
    const allDepositDescriptions = user255RegularDeposits.map(tx => tx.description).filter(Boolean);
    const allTonDepositDescriptions = user25TonDeposits.slice(0, 5).map(tx => tx.description).filter(Boolean);

    console.log('\n📝 DEPOSIT descriptions (проблемные):');
    allDepositDescriptions.forEach((desc, i) => {
      console.log(`   ${i + 1}. "${desc}"`);
    });

    console.log('\n📝 TON_DEPOSIT descriptions (успешные):');
    allTonDepositDescriptions.forEach((desc, i) => {
      console.log(`   ${i + 1}. "${desc}"`);
    });

    // 6. Временной анализ - когда создавались записи
    console.log('\n6️⃣ ВРЕМЕННОЙ АНАЛИЗ СОЗДАНИЯ:');
    
    console.log('\n⏰ User 25 TON_DEPOSIT временная последовательность:');
    user25TonDeposits.slice(0, 3).forEach((tx, i) => {
      console.log(`   ${i + 1}. ${tx.created_at} - ${tx.amount} TON`);
    });

    console.log('\n⏰ User 255 смешанные типы временная последовательность:');
    user255Deposits?.slice(0, 6).forEach((tx, i) => {
      console.log(`   ${i + 1}. ${tx.created_at} - ${tx.type} ${tx.amount} TON`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 ПРЕДВАРИТЕЛЬНЫЕ ВЫВОДЫ О РАЗЛИЧИЯХ:');
    console.log('');
    console.log('1. 📊 СТАТИСТИЧЕСКИЕ РАЗЛИЧИЯ:');
    console.log(`   - User 25: только TON_DEPOSIT записи (${user25TonDeposits.length})`);
    console.log(`   - User 255: смешанные типы (${user255TonDeposits.length} TON_DEPOSIT + ${user255RegularDeposits.length} DEPOSIT)`);
    console.log('');
    console.log('2. 🔍 КАЧЕСТВЕННЫЕ РАЗЛИЧИЯ:');
    console.log('   - Различия в descriptions могут указывать на разные источники создания');
    console.log('   - tx_hash_unique паттерны могут отличаться');
    console.log('   - metadata структуры могут быть разными');
    console.log('');
    console.log('3. ⏰ ВРЕМЕННЫЕ ПАТТЕРНЫ:');
    console.log('   - User 25: стабильное создание TON_DEPOSIT');
    console.log('   - User 255: чередование типов может указывать на разные кодовые пути');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

finalDiagnosisUser255().catch(console.error);