#!/usr/bin/env npx tsx

/**
 * ДИАГНОСТИКА ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ
 * Проверка TON пополнений и TON Boost пакетов без изменения кода
 * 
 * ЦЕЛИ:
 * 1. Проверить фиксацию TON пополнений в БД
 * 2. Диагностировать TON Boost пакеты и корректность полей
 * 3. Найти причину исчезающих балансов после пополнения
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 ДИАГНОСТИКА ЦЕЛОСТНОСТИ БАЗЫ ДАННЫХ');
console.log('='.repeat(60));
console.log(`📅 Время: ${new Date().toLocaleString('ru-RU')}`);
console.log('🎯 Цель: Проверить TON пополнения и TON Boost пакеты в БД\n');

async function checkDatabaseIntegrity() {
  try {
    // ==========================================
    // БЛОК 1: ПРОВЕРКА TON ПОПОЛНЕНИЙ В БД
    // ==========================================
    console.log('1️⃣ ПРОВЕРКА TON ПОПОЛНЕНИЙ В БАЗЕ ДАННЫХ');
    console.log('-'.repeat(50));

    // 1.1 Найдем последние TON_DEPOSIT транзакции
    const { data: tonDeposits, error: depositError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, metadata, status, created_at, updated_at')
      .eq('type', 'TON_DEPOSIT')
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Последние 7 дней
      .order('created_at', { ascending: false })
      .limit(20);

    if (!depositError && tonDeposits && tonDeposits.length > 0) {
      console.log(`💰 Найдено ${tonDeposits.length} TON_DEPOSIT транзакций за последние 7 дней:`);
      
      tonDeposits.forEach(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        const txHash = metadata.tx_hash ? metadata.tx_hash.substring(0, 20) + '...' : 'НЕТ';
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON, Status: ${tx.status}, TX_Hash: ${txHash}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        
        // Проверяем обновлялась ли транзакция
        if (tx.created_at !== tx.updated_at) {
          console.log(`      ⚠️  Транзакция обновлялась: ${new Date(tx.updated_at).toLocaleString('ru-RU')}`);
        }
      });
    } else {
      console.log('❌ TON_DEPOSIT транзакции за последние 7 дней не найдены');
      console.log(`   Ошибка: ${depositError?.message || 'НЕТ'}`);
    }

    // 1.2 Проверим соответствие TON депозитов и балансов пользователей
    console.log('\n📊 ПРОВЕРКА СООТВЕТСТВИЯ TON ДЕПОЗИТОВ И БАЛАНСОВ:');
    
    if (tonDeposits && tonDeposits.length > 0) {
      const userIds = [...new Set(tonDeposits.map(tx => tx.user_id))];
      
      console.log(`👥 Проверяем балансы ${userIds.length} пользователей с недавними депозитами:`);
      
      for (const userId of userIds.slice(0, 5)) {
        // Получаем текущий баланс пользователя
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, username, balance_ton, ton_boost_package, updated_at')
          .eq('id', userId)
          .single();

        if (!userError && user) {
          // Считаем сумму депозитов этого пользователя
          const userDeposits = tonDeposits.filter(tx => tx.user_id === userId && tx.status === 'completed');
          const totalDeposited = userDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount_ton || '0'), 0);
          
          console.log(`   User ${userId} (@${user.username}):`);
          console.log(`      Текущий баланс: ${user.balance_ton} TON`);
          console.log(`      Сумма депозитов: ${totalDeposited} TON`);
          console.log(`      TON Boost пакет: ${user.ton_boost_package || 'НЕТ'}`);
          console.log(`      Обновлен: ${new Date(user.updated_at).toLocaleString('ru-RU')}`);
          
          if (totalDeposited > 0 && parseFloat(user.balance_ton || '0') < totalDeposited) {
            console.log(`      🚨 ПРОБЛЕМА: Баланс меньше суммы депозитов!`);
          }
        } else {
          console.log(`   User ${userId}: ❌ НЕ НАЙДЕН в БД`);
        }
      }
    }

    // 1.3 Проверка удаленных/откатанных транзакций
    console.log('\n🔄 ПРОВЕРКА ОТМЕНЕННЫХ/УДАЛЕННЫХ ТРАНЗАКЦИЙ:');
    
    const { data: failedDeposits, error: failedError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, status, created_at')
      .eq('type', 'TON_DEPOSIT')
      .neq('status', 'completed')
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!failedError && failedDeposits && failedDeposits.length > 0) {
      console.log(`❌ Найдено ${failedDeposits.length} неуспешных TON депозитов:`);
      failedDeposits.forEach(tx => {
        console.log(`   ID: ${tx.id}, User: ${tx.user_id}, Amount: ${tx.amount_ton} TON, Status: ${tx.status}, Time: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
      });
    } else {
      console.log('✅ Неуспешные TON депозиты не найдены');
    }

    // ==========================================
    // БЛОК 2: ДИАГНОСТИКА TON BOOST ПАКЕТОВ
    // ==========================================
    console.log('\n\n2️⃣ ДИАГНОСТИКА TON BOOST ПАКЕТОВ');
    console.log('-'.repeat(50));

    // 2.1 Проверка структуры ton_farming_data
    console.log('🌾 ПРОВЕРКА СТРУКТУРЫ TON_FARMING_DATA:');
    
    const { data: farmingStructure, error: structureError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(1);

    if (!structureError && farmingStructure) {
      console.log('✅ Таблица ton_farming_data доступна');
      if (farmingStructure.length > 0) {
        const fields = Object.keys(farmingStructure[0]);
        console.log(`   Поля: ${fields.join(', ')}`);
      }
    } else {
      console.log('❌ Таблица ton_farming_data недоступна');
      console.log(`   Ошибка: ${structureError?.message || 'НЕТ'}`);
    }

    // 2.2 Анализ всех активных TON Boost пакетов
    const { data: allBoostData, error: boostDataError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_active, boost_package_id, boost_expires_at, created_at, updated_at')
      .eq('boost_active', true)
      .order('updated_at', { ascending: false });

    if (!boostDataError && allBoostData) {
      console.log(`\n🎯 Активные TON Boost пакеты: ${allBoostData.length}`);
      
      allBoostData.forEach(data => {
        console.log(`   User ${data.user_id}:`);
        console.log(`      Farming Balance: ${data.farming_balance}`);
        console.log(`      Farming Rate: ${data.farming_rate}`);
        console.log(`      Package ID: ${data.boost_package_id}`);
        console.log(`      Expires: ${data.boost_expires_at ? new Date(data.boost_expires_at).toLocaleString('ru-RU') : 'Никогда'}`);
        console.log(`      Created: ${new Date(data.created_at).toLocaleString('ru-RU')}`);
        console.log(`      Updated: ${new Date(data.updated_at).toLocaleString('ru-RU')}`);
        console.log('');
      });
    } else {
      console.log('❌ Активные TON Boost пакеты не найдены');
    }

    // 2.3 Проверка соответствия между users и ton_farming_data
    console.log('🔗 ПРОВЕРКА СООТВЕТСТВИЯ USERS ↔ TON_FARMING_DATA:');
    
    const { data: usersWithBoost, error: usersBoostError } = await supabase
      .from('users')
      .select('id, username, ton_boost_package, ton_boost_rate, balance_ton')
      .not('ton_boost_package', 'is', null);

    if (!usersBoostError && usersWithBoost) {
      console.log(`👥 Пользователи с ton_boost_package в users: ${usersWithBoost.length}`);
      
      for (const user of usersWithBoost) {
        // Ищем соответствующую запись в ton_farming_data
        const { data: farmingRecord, error: farmingRecordError } = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', user.id)
          .single();

        console.log(`   User ${user.id} (@${user.username}):`);
        console.log(`      users.ton_boost_package: ${user.ton_boost_package}`);
        console.log(`      users.ton_boost_rate: ${user.ton_boost_rate}`);
        console.log(`      users.balance_ton: ${user.balance_ton}`);
        
        if (!farmingRecordError && farmingRecord) {
          console.log(`      ✅ farming_data найдена:`);
          console.log(`         boost_package_id: ${farmingRecord.boost_package_id}`);
          console.log(`         farming_rate: ${farmingRecord.farming_rate}`);
          console.log(`         farming_balance: ${farmingRecord.farming_balance}`);
          console.log(`         boost_active: ${farmingRecord.boost_active}`);
          
          // Проверяем соответствие
          if (user.ton_boost_package !== farmingRecord.boost_package_id) {
            console.log(`      🚨 НЕСООТВЕТСТВИЕ: Package ID не совпадает!`);
          }
          if (parseFloat(user.ton_boost_rate || '0') !== parseFloat(farmingRecord.farming_rate || '0')) {
            console.log(`      🚨 НЕСООТВЕТСТВИЕ: Rate не совпадает!`);
          }
        } else {
          console.log(`      ❌ farming_data НЕ НАЙДЕНА`);
          console.log(`         Ошибка: ${farmingRecordError?.message || 'НЕТ'}`);
        }
        console.log('');
      }
    } else {
      console.log('❌ Пользователи с TON Boost в users не найдены');
    }

    // ==========================================  
    // БЛОК 3: АНАЛИЗ RECENT BOOST PURCHASES
    // ==========================================
    console.log('\n3️⃣ АНАЛИЗ НЕДАВНИХ ПОКУПОК BOOST ПАКЕТОВ');
    console.log('-'.repeat(50));

    // Ищем транзакции покупки boost пакетов (отрицательные суммы)
    const { data: boostPurchases, error: purchaseError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, description, metadata, status, created_at')
      .lt('amount_ton', 0) // Отрицательные (списания)
      .or('description.ilike.%boost%,description.ilike.%пакет%,type.ilike.%boost%')
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!purchaseError && boostPurchases && boostPurchases.length > 0) {
      console.log(`💳 Найдено ${boostPurchases.length} покупок boost пакетов за 7 дней:`);
      
      for (const purchase of boostPurchases) {
        const metadata = typeof purchase.metadata === 'string' ? JSON.parse(purchase.metadata || '{}') : (purchase.metadata || {});
        
        console.log(`   Покупка ID: ${purchase.id}`);
        console.log(`      User: ${purchase.user_id}`);
        console.log(`      Amount: ${purchase.amount_ton} TON`);
        console.log(`      Type: ${purchase.type}`);
        console.log(`      Description: ${purchase.description}`);
        console.log(`      Status: ${purchase.status}`);
        console.log(`      Time: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
        
        // Проверяем была ли активация после покупки
        const { data: farmingAfterPurchase, error: farmingAfterError } = await supabase
          .from('ton_farming_data')
          .select('boost_active, boost_package_id, farming_balance, updated_at')
          .eq('user_id', purchase.user_id)
          .single();

        if (!farmingAfterError && farmingAfterPurchase) {
          console.log(`      ✅ Farming данные после покупки:`);
          console.log(`         boost_active: ${farmingAfterPurchase.boost_active}`);
          console.log(`         boost_package_id: ${farmingAfterPurchase.boost_package_id}`);
          console.log(`         farming_balance: ${farmingAfterPurchase.farming_balance}`);
          console.log(`         updated: ${new Date(farmingAfterPurchase.updated_at).toLocaleString('ru-RU')}`);
        } else {
          console.log(`      ❌ Farming данные после покупки НЕ НАЙДЕНЫ`);
        }
        console.log('');
      }
    } else {
      console.log('📦 Покупки boost пакетов за последние 7 дней не найдены');
    }

    // ==========================================
    // БЛОК 4: ФИНАЛЬНЫЕ ВЫВОДЫ
    // ==========================================
    console.log('\n4️⃣ ФИНАЛЬНЫЕ ВЫВОДЫ ДИАГНОСТИКИ');
    console.log('-'.repeat(50));

    console.log('📋 РЕЗЮМЕ ПРОВЕРКИ:');
    console.log(`   • TON депозитов за 7 дней: ${tonDeposits?.length || 0}`);
    console.log(`   • Активных TON Boost пакетов: ${allBoostData?.length || 0}`);
    console.log(`   • Пользователей с boost в users: ${usersWithBoost?.length || 0}`);
    console.log(`   • Покупок boost за 7 дней: ${boostPurchases?.length || 0}`);
    
    console.log('\n🎯 КРИТИЧЕСКИЕ НАХОДКИ:');
    if (tonDeposits && tonDeposits.length === 0) {
      console.log('   🚨 НЕТ TON ДЕПОЗИТОВ за последние 7 дней - возможная проблема!');
    }
    if (allBoostData && allBoostData.length > 0 && (!usersWithBoost || usersWithBoost.length === 0)) {
      console.log('   🚨 НЕСООТВЕТСТВИЕ: Есть farming_data, но нет boost в users!');
    }
    if (usersWithBoost && usersWithBoost.length > 0 && (!allBoostData || allBoostData.length === 0)) {
      console.log('   🚨 НЕСООТВЕТСТВИЕ: Есть boost в users, но нет farming_data!');
    }

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

checkDatabaseIntegrity();