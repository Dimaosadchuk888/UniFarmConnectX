/**
 * Проверка транзакций для пользователя ID=1
 * Анализ расхождения между API и реальными данными
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_KEY должны быть установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser1Transactions() {
  console.log('🔍 ПРОВЕРКА ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЯ ID=1');
  console.log('='.repeat(50));
  
  try {
    // 1. Проверяем существование пользователя ID=1
    console.log('\n👤 ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ ID=1:');
    console.log('-'.repeat(30));
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (userError) {
      console.log(`❌ Пользователь ID=1 не найден: ${userError.message}`);
    } else {
      console.log('✅ Пользователь ID=1 найден:');
      console.log(`   • ID: ${user.id}`);
      console.log(`   • Username: ${user.username}`);
      console.log(`   • Telegram ID: ${user.telegram_id}`);
      console.log(`   • Balance UNI: ${user.balance_uni}`);
      console.log(`   • Balance TON: ${user.balance_ton}`);
    }
    
    // 2. Проверяем транзакции пользователя ID=1
    console.log('\n💼 ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ ID=1:');
    console.log('-'.repeat(30));
    
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 1)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (txError) {
      console.error(`❌ Ошибка получения транзакций: ${txError.message}`);
    } else if (!transactions || transactions.length === 0) {
      console.log('❌ Транзакции для пользователя ID=1 НЕ НАЙДЕНЫ');
    } else {
      console.log(`✅ Найдено ${transactions.length} транзакций:`);
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount_uni || tx.amount_ton}, Date: ${tx.created_at}`);
      });
    }
    
    // 3. Проверяем общее количество транзакций по всем пользователям
    console.log('\n📊 ОБЩАЯ СТАТИСТИКА ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(30));
    
    const { count: totalTx, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`❌ Ошибка подсчета: ${countError.message}`);
    } else {
      console.log(`✅ Всего транзакций в системе: ${totalTx}`);
    }
    
    // 4. Проверяем последние транзакции по всем пользователям
    console.log('\n🔍 ПОСЛЕДНИЕ ТРАНЗАКЦИИ В СИСТЕМЕ:');
    console.log('-'.repeat(30));
    
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_uni, amount_ton, description, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error(`❌ Ошибка: ${recentError.message}`);
    } else {
      console.log('📋 Последние 5 транзакций:');
      recentTx.forEach((tx, index) => {
        console.log(`   ${index + 1}. User ${tx.user_id}: ${tx.type} - ${tx.amount_uni || tx.amount_ton} - ${tx.created_at}`);
      });
    }
    
    // 5. Анализ пользователей с транзакциями
    console.log('\n👥 ПОЛЬЗОВАТЕЛИ С ТРАНЗАКЦИЯМИ:');
    console.log('-'.repeat(30));
    
    const { data: userStats, error: statsError } = await supabase
      .from('transactions')
      .select('user_id, id')
      .order('user_id');
    
    if (statsError) {
      console.error(`❌ Ошибка: ${statsError.message}`);
    } else {
      const userCounts = {};
      userStats.forEach(tx => {
        userCounts[tx.user_id] = (userCounts[tx.user_id] || 0) + 1;
      });
      
      const sortedUsers = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      console.log('🏆 ТОП-10 пользователей по количеству транзакций:');
      sortedUsers.forEach(([userId, count], index) => {
        console.log(`   ${index + 1}. User ID ${userId}: ${count} транзакций`);
      });
      
      // Проверяем есть ли пользователь ID=1 в списке
      if (userCounts[1]) {
        console.log(`\n✅ Пользователь ID=1 имеет ${userCounts[1]} транзакций`);
      } else {
        console.log('\n❌ Пользователь ID=1 НЕ имеет транзакций');
      }
    }
    
    // 6. Проверка API структуры vs Database структуры
    console.log('\n🔧 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    console.log('-'.repeat(30));
    
    if (recentTx && recentTx.length > 0) {
      const sampleTx = recentTx[0];
      console.log('📋 Структура транзакции в БД:');
      console.log('   • id:', typeof sampleTx.id);
      console.log('   • user_id:', typeof sampleTx.user_id);
      console.log('   • type:', typeof sampleTx.type);
      console.log('   • amount_uni:', typeof sampleTx.amount_uni);
      console.log('   • amount_ton:', typeof sampleTx.amount_ton);
      console.log('   • description:', typeof sampleTx.description);
      console.log('   • created_at:', typeof sampleTx.created_at);
      
      console.log('\n📋 Frontend ожидает структуру:');
      console.log('   • id: number');
      console.log('   • type: string');
      console.log('   • amount: number (НЕ amount_uni/amount_ton)');
      console.log('   • currency: string');
      console.log('   • status: string');
      console.log('   • description: string');
      console.log('   • createdAt: string (НЕ created_at)');
      console.log('   • timestamp: number');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запуск проверки
checkUser1Transactions().catch(console.error);