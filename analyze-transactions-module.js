/**
 * Полная проверка модуля транзакций UniFarm
 * Анализ структуры таблицы и всех типов транзакций
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_KEY должны быть установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTransactionsModule() {
  console.log('🟨 ПОЛНАЯ ПРОВЕРКА МОДУЛЯ ТРАНЗАКЦИЙ UNIFARM');
  console.log('='.repeat(60));
  
  try {
    // 1. Получение структуры таблицы transactions
    console.log('\n📄 АНАЛИЗ СТРУКТУРЫ ТАБЛИЦЫ transactions:');
    console.log('-'.repeat(40));
    
    const { data: sampleTransaction, error: sampleError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError && sampleError.code !== 'PGRST116') {
      console.error('❌ Ошибка получения структуры:', sampleError);
      return;
    }
    
    if (sampleTransaction) {
      console.log('✅ Поля таблицы transactions:');
      Object.keys(sampleTransaction).forEach(field => {
        console.log(`   • ${field}: ${typeof sampleTransaction[field]} (значение: ${sampleTransaction[field]})`);
      });
    } else {
      console.log('⚠️  Таблица transactions пуста, получаем структуру другим способом');
    }
    
    // 2. Получение общей статистики
    console.log('\n📊 ОБЩАЯ СТАТИСТИКА ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(40));
    
    const { count: totalCount, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Ошибка подсчета общего количества:', countError);
    } else {
      console.log(`✅ Общее количество транзакций: ${totalCount}`);
    }
    
    // 3. Анализ типов транзакций
    console.log('\n📋 АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(40));
    
    // Получаем все транзакции для анализа типов
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('id, type, amount_uni, amount_ton, currency, status, description, created_at, user_id, metadata, source, tx_hash, source_user_id, action')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Ошибка получения транзакций:', allError);
      return;
    }
    
    if (!allTransactions || allTransactions.length === 0) {
      console.log('⚠️  Транзакции не найдены в базе данных');
      return;
    }
    
    // Группировка по типам
    const typeStats = {};
    allTransactions.forEach(tx => {
      if (!typeStats[tx.type]) {
        typeStats[tx.type] = {
          count: 0,
          totalAmount: 0,
          currencies: new Set(),
          statuses: new Set(),
          examples: []
        };
      }
      
      typeStats[tx.type].count++;
      typeStats[tx.type].currencies.add(tx.currency);
      typeStats[tx.type].statuses.add(tx.status);
      
      // Сохраняем первые 3 примера
      if (typeStats[tx.type].examples.length < 3) {
        const primaryAmount = tx.amount_uni > 0 ? tx.amount_uni : tx.amount_ton;
        const primaryCurrency = tx.amount_uni > 0 ? 'UNI' : 'TON';
        
        typeStats[tx.type].examples.push({
          id: tx.id,
          amount: primaryAmount,
          currency: primaryCurrency,
          description: tx.description,
          created_at: tx.created_at,
          user_id: tx.user_id
        });
      }
    });
    
    // 4. Детальный анализ каждого типа
    const expectedTypes = [
      'DAILY_BONUS',
      'MISSION_REWARD', 
      'WITHDRAWAL',
      'DEPOSIT',
      'REFERRAL_REWARD',
      'FARMING_REWARD',
      'TON_BOOST_INCOME',
      'PURCHASE_PACKAGE'
    ];
    
    console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПО ТИПАМ:');
    console.log('-'.repeat(40));
    
    for (const expectedType of expectedTypes) {
      const stats = typeStats[expectedType];
      
      console.log(`\n📌 ${expectedType}:`);
      
      if (stats) {
        console.log(`   ✅ Найдено записей: ${stats.count}`);
        console.log(`   💰 Валюты: ${Array.from(stats.currencies).join(', ')}`);
        console.log(`   📊 Статусы: ${Array.from(stats.statuses).join(', ')}`);
        
        if (stats.examples.length > 0) {
          console.log(`   📝 Примеры записей:`);
          stats.examples.forEach((example, index) => {
            console.log(`      ${index + 1}. user_id=${example.user_id}, amount=${example.amount} ${example.currency}`);
            console.log(`         description: "${example.description}"`);
            console.log(`         created_at: ${example.created_at}`);
          });
        }
      } else {
        console.log(`   ❌ Записи НЕ НАЙДЕНЫ`);
      }
    }
    
    // 5. Дополнительные типы (не из ожидаемого списка)
    console.log('\n🆕 ДОПОЛНИТЕЛЬНЫЕ ТИПЫ ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(40));
    
    const additionalTypes = Object.keys(typeStats).filter(type => !expectedTypes.includes(type));
    
    if (additionalTypes.length > 0) {
      additionalTypes.forEach(type => {
        const stats = typeStats[type];
        console.log(`📌 ${type}: ${stats.count} записей`);
      });
    } else {
      console.log('✅ Все типы соответствуют ожидаемым');
    }
    
    // 6. Проверка проблемных записей
    console.log('\n🚨 ПРОВЕРКА ПРОБЛЕМНЫХ ЗАПИСЕЙ:');
    console.log('-'.repeat(40));
    
    // Проверка записей с amount = 0
    const zeroAmountTx = allTransactions.filter(tx => 
      (tx.amount_uni === 0 || tx.amount_uni === '0') && 
      (tx.amount_ton === 0 || tx.amount_ton === '0')
    );
    
    console.log(`📊 Транзакции с нулевыми суммами: ${zeroAmountTx.length}`);
    
    // Проверка записей без описания
    const noDescriptionTx = allTransactions.filter(tx => !tx.description || tx.description.trim() === '');
    console.log(`📊 Транзакции без описания: ${noDescriptionTx.length}`);
    
    // Проверка записей с некорректными статусами
    const validStatuses = ['completed', 'pending', 'failed', 'cancelled'];
    const invalidStatusTx = allTransactions.filter(tx => !validStatuses.includes(tx.status));
    console.log(`📊 Транзакции с некорректными статусами: ${invalidStatusTx.length}`);
    
    // 7. Анализ активности по пользователям
    console.log('\n👥 АНАЛИЗ АКТИВНОСТИ ПО ПОЛЬЗОВАТЕЛЯМ:');
    console.log('-'.repeat(40));
    
    const userStats = {};
    allTransactions.forEach(tx => {
      if (!userStats[tx.user_id]) {
        userStats[tx.user_id] = {
          totalTransactions: 0,
          types: new Set()
        };
      }
      userStats[tx.user_id].totalTransactions++;
      userStats[tx.user_id].types.add(tx.type);
    });
    
    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1].totalTransactions - a[1].totalTransactions)
      .slice(0, 5);
    
    console.log('🏆 ТОП-5 пользователей по количеству транзакций:');
    topUsers.forEach(([userId, stats], index) => {
      console.log(`   ${index + 1}. User ID ${userId}: ${stats.totalTransactions} транзакций (типы: ${Array.from(stats.types).join(', ')})`);
    });
    
    // 8. Финальный отчет
    console.log('\n✅ ФИНАЛЬНЫЙ ОТЧЕТ:');
    console.log('='.repeat(60));
    
    const foundTypes = Object.keys(typeStats);
    const missingTypes = expectedTypes.filter(type => !foundTypes.includes(type));
    
    console.log(`📊 Всего найдено типов транзакций: ${foundTypes.length}`);
    console.log(`📊 Общее количество записей: ${totalCount}`);
    console.log(`📊 Активных пользователей: ${Object.keys(userStats).length}`);
    
    if (missingTypes.length > 0) {
      console.log(`⚠️  Отсутствующие типы: ${missingTypes.join(', ')}`);
    } else {
      console.log('✅ Все ожидаемые типы транзакций присутствуют');
    }
    
    // Оценка готовности модуля
    const readinessScore = ((foundTypes.length / expectedTypes.length) * 100).toFixed(1);
    console.log(`\n🎯 ГОТОВНОСТЬ МОДУЛЯ ТРАНЗАКЦИЙ: ${readinessScore}%`);
    
    if (readinessScore >= 90) {
      console.log('🟢 Система создает транзакции корректно по всем направлениям');
    } else if (readinessScore >= 70) {
      console.log('🟡 Система работает хорошо, но есть области для улучшения');
    } else {
      console.log('🔴 Система требует доработки критически важных типов транзакций');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

// Запуск анализа
analyzeTransactionsModule().catch(console.error);