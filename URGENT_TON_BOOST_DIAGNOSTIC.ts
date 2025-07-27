#!/usr/bin/env tsx

/**
 * 🚨 СРОЧНАЯ ДИАГНОСТИКА TON BOOST ДЕПОЗИТОВ
 * 
 * Анализируем куда попали новые TON Boost покупки за последний час
 * и почему они не активировались в планировщике
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function urgentDiagnostic() {
  console.log('🚨 СРОЧНАЯ ДИАГНОСТИКА TON BOOST ДЕПОЗИТОВ');
  console.log('=' .repeat(60));
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  try {
    // 1. ПРОВЕРЯЕМ НОВЫЕ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС
    console.log('1️⃣ Поиск новых TON Boost транзакций за последний час...');
    console.log(`Период поиска: ${oneHourAgo} - ${new Date().toISOString()}`);
    
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', oneHourAgo)
      .or('type.eq.BOOST_PURCHASE,description.ilike.%boost%,description.ilike.%TON%')
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ ТРАНЗАКЦИЙ:', txError.message);
      return;
    }

    console.log(`\n📊 НАЙДЕНО ${recentTransactions?.length || 0} транзакций за час:`);
    
    const boostTransactions = recentTransactions?.filter(tx => 
      tx.type === 'BOOST_PURCHASE' || 
      tx.description?.toLowerCase().includes('boost') ||
      tx.description?.toLowerCase().includes('ton')
    ) || [];

    console.log(`💰 TON Boost связанных: ${boostTransactions.length}`);
    
    boostTransactions.forEach(tx => {
      console.log(`\nТранзакция ID ${tx.id}:`);
      console.log(`   User: ${tx.user_id}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Created: ${tx.created_at}`);
      if (tx.metadata) {
        console.log(`   Metadata:`, JSON.stringify(tx.metadata, null, 4));
      }
    });

    // 2. ПРОВЕРЯЕМ СТАТУС TON BOOST В ТАБЛИЦЕ USERS
    console.log('\n2️⃣ Проверка статуса TON Boost в таблице users...');
    
    const affectedUserIds = [...new Set(boostTransactions.map(tx => tx.user_id))];
    console.log(`Пользователи для проверки: ${affectedUserIds.join(', ')}`);

    if (affectedUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, ton_boost_package, ton_boost_rate, ton_boost_active, ton_boost_package_id, balance_ton')
        .in('id', affectedUserIds)
        .order('id');

      if (usersError) {
        console.error('❌ ОШИБКА ПОЛУЧЕНИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ:', usersError.message);
      } else {
        console.log('\n👥 СТАТУС ПОЛЬЗОВАТЕЛЕЙ:');
        usersData?.forEach(user => {
          console.log(`\nUser ${user.id} (@${user.username}):`);
          console.log(`   TON Balance: ${user.balance_ton}`);
          console.log(`   TON Boost Package: ${user.ton_boost_package || 'НЕТ'}`);
          console.log(`   TON Boost Package ID: ${user.ton_boost_package_id || 'НЕТ'}`);
          console.log(`   TON Boost Rate: ${user.ton_boost_rate || 'НЕТ'}`);
          console.log(`   TON Boost Active: ${user.ton_boost_active ? 'ДА' : 'НЕТ'}`);
        });
      }
    }

    // 3. ПРОВЕРЯЕМ TON_FARMING_DATA ЗАПИСИ
    console.log('\n3️⃣ Проверка ton_farming_data для активных пользователей...');
    
    if (affectedUserIds.length > 0) {
      const { data: farmingData, error: farmingError } = await supabase
        .from('ton_farming_data')
        .select('*')
        .in('user_id', affectedUserIds.map(id => id.toString()))
        .order('user_id');

      if (farmingError) {
        console.error('❌ ОШИБКА ПОЛУЧЕНИЯ TON_FARMING_DATA:', farmingError.message);
      } else {
        console.log(`\n🌾 TON_FARMING_DATA записей найдено: ${farmingData?.length || 0}`);
        
        farmingData?.forEach(data => {
          console.log(`\nFarming Data User ${data.user_id}:`);
          console.log(`   Farming Balance: ${data.farming_balance}`);
          console.log(`   Farming Rate: ${data.farming_rate}`);
          console.log(`   Boost Package ID: ${data.boost_package_id}`);
          console.log(`   Created: ${data.created_at}`);
          console.log(`   Updated: ${data.updated_at}`);
        });

        // Проверяем, каких пользователей НЕТ в ton_farming_data
        const farmingUserIds = farmingData?.map(d => d.user_id) || [];
        const missingUsers = affectedUserIds.filter(id => !farmingUserIds.includes(id.toString()));
        
        if (missingUsers.length > 0) {
          console.log(`\n⚠️  ОТСУТСТВУЮТ В TON_FARMING_DATA: ${missingUsers.join(', ')}`);
          console.log('   ☝️  ЭТИ ПОЛЬЗОВАТЕЛИ НЕ ПОЛУЧАЮТ ДОХОДЫ!');
        }
      }
    }

    // 4. ПРОВЕРЯЕМ ПЛАНИРОВЩИК - КТО АКТИВЕН
    console.log('\n4️⃣ Анализ планировщика - кто должен получать доходы...');
    
    // Эмулируем логику планировщика
    const { data: activeUsers, error: activeError } = await supabase
      .from('users')
      .select(`
        id, username, 
        ton_boost_package, ton_boost_rate, ton_boost_active,
        ton_farming_data!inner(user_id, farming_balance, farming_rate)
      `)
      .eq('ton_boost_active', true)
      .not('ton_boost_package', 'is', null)
      .order('id');

    if (activeError) {
      console.error('❌ ОШИБКА ПРОВЕРКИ ПЛАНИРОВЩИКА:', activeError.message);
    } else {
      console.log(`\n📈 АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ В ПЛАНИРОВЩИКЕ: ${activeUsers?.length || 0}`);
      
      activeUsers?.forEach(user => {
        console.log(`User ${user.id}: ${user.ton_boost_package} (${user.ton_boost_rate}/сек)`);
      });
    }

    // 5. ДИАГНОСТИКА ПРОБЛЕМ
    console.log('\n5️⃣ ДИАГНОСТИКА ПРОБЛЕМ И РЕКОМЕНДАЦИИ...');
    
    const problems = [];
    const solutions = [];

    // Проверяем каждого пользователя с покупками
    for (const userId of affectedUserIds) {
      const userTransactions = boostTransactions.filter(tx => tx.user_id === userId);
      const hasBoostPurchase = userTransactions.some(tx => 
        tx.type === 'BOOST_PURCHASE' && tx.status === 'completed'
      );
      
      if (hasBoostPurchase) {
        // Проверяем активацию в users
        const userData = await supabase
          .from('users')
          .select('ton_boost_active, ton_boost_package, ton_boost_rate')
          .eq('id', userId)
          .single();

        // Проверяем запись в ton_farming_data
        const farmingData = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', userId.toString())
          .single();

        if (!userData.data?.ton_boost_active) {
          problems.push(`User ${userId}: TON Boost не активирован в таблице users`);
          solutions.push(`User ${userId}: Активировать ton_boost_active = true в users`);
        }

        if (farmingData.error) {
          problems.push(`User ${userId}: Отсутствует запись в ton_farming_data`);
          solutions.push(`User ${userId}: Создать запись в ton_farming_data с farming_balance и farming_rate`);
        }
      }
    }

    if (problems.length > 0) {
      console.log('\n🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      problems.forEach((problem, index) => {
        console.log(`${index + 1}. ${problem}`);
      });

      console.log('\n🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ:');
      solutions.forEach((solution, index) => {
        console.log(`${index + 1}. ${solution}`);
      });
    } else {
      console.log('\n✅ Критических проблем не обнаружено');
    }

    // 6. СВОДКА
    console.log('\n6️⃣ ФИНАЛЬНАЯ СВОДКА...');
    
    return {
      total_transactions_hour: recentTransactions?.length || 0,
      boost_transactions: boostTransactions.length,
      affected_users: affectedUserIds,
      problems_found: problems.length,
      active_in_scheduler: activeUsers?.length || 0,
      missing_from_farming_data: affectedUserIds.filter(id => 
        !farmingData?.some(d => d.user_id === id.toString())
      )
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await urgentDiagnostic();
    
    console.log('\n📋 РЕЗУЛЬТАТ ДИАГНОСТИКИ:');
    console.log(`- Транзакций за час: ${result.total_transactions_hour}`);
    console.log(`- TON Boost покупок: ${result.boost_transactions}`);
    console.log(`- Затронутых пользователей: ${result.affected_users.length}`);
    console.log(`- Активных в планировщике: ${result.active_in_scheduler}`);
    console.log(`- Проблем обнаружено: ${result.problems_found}`);
    
    if (result.problems_found > 0) {
      console.log('\n⚠️  ТРЕБУЕТСЯ РУЧНОЕ ИСПРАВЛЕНИЕ для активации планировщика');
    } else {
      console.log('\n✅ Система работает корректно');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ДИАГНОСТИКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();