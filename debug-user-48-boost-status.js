/**
 * Диагностика TON Boost статуса пользователя 48
 * Проверяем все аспекты: пользователь, пакеты, транзакции, API
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wunnsvicbebssrjqedor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugUser48BoostStatus() {
  console.log('🔍 ДИАГНОСТИКА TON BOOST СТАТУСА ПОЛЬЗОВАТЕЛЯ 48\n');
  
  try {
    // 1. Проверка пользователя 48
    console.log('1️⃣ Проверка пользователя 48:');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_boost_package, ton_farming_start_timestamp')
      .eq('id', 48)
      .single();
      
    if (userError) {
      console.log('❌ Ошибка получения пользователя:', userError.message);
      return;
    }
    
    console.log('✅ Пользователь найден:', {
      id: user.id,
      username: user.username,
      balance_ton: user.balance_ton,
      ton_boost_package: user.ton_boost_package,
      ton_farming_start_timestamp: user.ton_farming_start_timestamp
    });
    
    // 2. Проверка boost_purchases таблицы
    console.log('\n2️⃣ Проверка покупок Boost пакетов:');
    const { data: purchases, error: purchasesError } = await supabase
      .from('boost_purchases')
      .select('*')
      .eq('user_id', 48)
      .order('created_at', { ascending: false });
      
    if (purchasesError) {
      console.log('❌ Ошибка получения покупок:', purchasesError.message);
    } else {
      console.log(`✅ Найдено покупок: ${purchases.length}`);
      purchases.forEach((purchase, index) => {
        console.log(`   ${index + 1}. ID: ${purchase.id}, Package: ${purchase.package_id}, Status: ${purchase.status}, Amount: ${purchase.amount}, Date: ${purchase.created_at}`);
      });
    }
    
    // 3. Проверка TON транзакций
    console.log('\n3️⃣ Проверка TON транзакций пользователя 48:');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 48)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (transError) {
      console.log('❌ Ошибка получения транзакций:', transError.message);
    } else {
      console.log(`✅ Найдено TON транзакций: ${transactions.length}`);
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. Type: ${tx.type}, Amount: ${tx.amount}, Status: ${tx.status}, Description: ${tx.description}, Date: ${tx.created_at}`);
      });
    }
    
    // 4. Проверка доступных Boost пакетов
    console.log('\n4️⃣ Проверка доступных Boost пакетов:');
    
    // Имитируем запрос к API для получения пакетов
    const packagesResponse = await fetch('http://localhost:3000/api/v2/boost/packages', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (packagesResponse.ok) {
      const packagesData = await packagesResponse.json();
      console.log('✅ Доступные пакеты:', packagesData.data?.length || 0);
      if (packagesData.data && packagesData.data.length > 0) {
        packagesData.data.forEach((pkg, index) => {
          console.log(`   ${index + 1}. ID: ${pkg.id}, Name: ${pkg.name}, Rate: ${pkg.daily_rate}%, Duration: ${pkg.duration_days} days`);
        });
      }
    } else {
      console.log('❌ Не удалось получить пакеты через API');
    }
    
    // 5. Проверка API farming-status
    console.log('\n5️⃣ Проверка API farming-status:');
    const farmingResponse = await fetch('http://localhost:3000/api/v2/boost/farming-status?user_id=48', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (farmingResponse.ok) {
      const farmingData = await farmingResponse.json();
      console.log('✅ API farming-status ответ:', JSON.stringify(farmingData, null, 2));
    } else {
      console.log('❌ Ошибка API farming-status:', farmingResponse.status);
    }
    
    // 6. Анализ проблем
    console.log('\n6️⃣ АНАЛИЗ ПРОБЛЕМ:');
    
    if (!user.ton_boost_package) {
      console.log('❌ ПРОБЛЕМА: У пользователя нет активного ton_boost_package');
    } else {
      console.log(`✅ Активный пакет: ${user.ton_boost_package}`);
    }
    
    if (!user.ton_farming_start_timestamp) {
      console.log('❌ ПРОБЛЕМА: Нет даты начала TON фарминга');
    } else {
      console.log(`✅ Дата начала фарминга: ${user.ton_farming_start_timestamp}`);
    }
    
    if (!purchases || purchases.length === 0) {
      console.log('❌ ПРОБЛЕМА: Нет записей о покупках Boost пакетов');
    } else {
      console.log(`✅ Найдено покупок: ${purchases.length}`);
    }
    
    const purchaseTransactions = transactions.filter(tx => tx.description.includes('Boost') || tx.description.includes('boost'));
    if (purchaseTransactions.length === 0) {
      console.log('❌ ПРОБЛЕМА: Нет TON транзакций о покупке Boost пакетов');
    } else {
      console.log(`✅ Найдено Boost транзакций: ${purchaseTransactions.length}`);
    }
    
  } catch (error) {
    console.error('🚫 Ошибка диагностики:', error.message);
  }
}

debugUser48BoostStatus();