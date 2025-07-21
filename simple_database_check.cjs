const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function simpleDatabaseCheck() {
  console.log('=== ПРОСТАЯ ПРОВЕРКА БАЗЫ ДАННЫХ ===\n');
  
  try {
    // 1. Проверка подключения через простой запрос
    console.log('🔍 1. Проверка подключения к базе данных...');
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (connectionError) {
      console.error('❌ Ошибка подключения к базе:', connectionError);
      return;
    } else {
      console.log('✅ Подключение к базе данных работает');
    }
    
    // 2. Быстрая проверка типов транзакций
    console.log('\n🔍 2. Проверка типов транзакций...');
    
    const { data: typeSample, error: typeError } = await supabase
      .from('transactions')
      .select('type')
      .limit(20);
      
    if (typeError) {
      console.error('❌ Ошибка получения типов:', typeError);
    } else {
      const uniqueTypes = [...new Set(typeSample?.map(t => t.type) || [])];
      console.log(`📋 Найденные типы транзакций: ${uniqueTypes.join(', ')}`);
    }
    
    // 3. Проверка недавних интервалов
    console.log('\n🔍 3. Анализ недавних интервалов транзакций...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTxs, error: recentError } = await supabase
      .from('transactions')
      .select('user_id, type, created_at')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: true })
      .limit(100);
      
    if (recentError) {
      console.error('❌ Ошибка получения недавних транзакций:', recentError);
    } else {
      console.log(`📊 Транзакций за последний час: ${recentTxs?.length || 0}`);
      
      if (recentTxs && recentTxs.length > 1) {
        // Простой анализ интервалов
        const intervals = [];
        for (let i = 1; i < Math.min(recentTxs.length, 20); i++) {
          const prev = new Date(recentTxs[i-1].created_at);
          const curr = new Date(recentTxs[i].created_at);
          const intervalMinutes = (curr - prev) / (1000 * 60);
          intervals.push(intervalMinutes);
        }
        
        if (intervals.length > 0) {
          const avgInterval = (intervals.reduce((sum, val) => sum + val, 0) / intervals.length).toFixed(2);
          const minInterval = Math.min(...intervals).toFixed(2);
          const maxInterval = Math.max(...intervals).toFixed(2);
          
          console.log(`⏱️ Интервалы между транзакциями:`);
          console.log(`   Минимальный: ${minInterval} минут`);
          console.log(`   Средний: ${avgInterval} минут`);
          console.log(`   Максимальный: ${maxInterval} минут`);
          
          if (parseFloat(minInterval) < 2.0) {
            console.log(`🚨 АНОМАЛИЯ: Найдены интервалы менее 2 минут!`);
          }
          
          if (parseFloat(avgInterval) < 4.0 || parseFloat(avgInterval) > 6.0) {
            console.log(`⚠️ ОТКЛОНЕНИЕ: Средний интервал ${avgInterval} минут (ожидается ~5)`);
          }
        }
      }
    }
    
    // 4. Проверка TON депозитов простым способом
    console.log('\n🔍 4. Проверка TON депозитов...');
    
    // Попытка найти TON_DEPOSIT
    const { data: tonDeposits, error: tonError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, created_at')
      .eq('type', 'TON_DEPOSIT')
      .limit(5);
      
    if (tonError) {
      console.log('❌ TON_DEPOSIT тип НЕ поддерживается:', tonError.message);
    } else if (!tonDeposits || tonDeposits.length === 0) {
      console.log('⚠️ TON_DEPOSIT поддерживается, но транзакций нет');
    } else {
      console.log(`✅ Найдено ${tonDeposits.length} TON_DEPOSIT транзакций`);
    }
    
    // Поиск TON транзакций других типов
    const { data: tonTxs, error: tonTxError } = await supabase
      .from('transactions')
      .select('type, count(*)')
      .eq('currency', 'TON')
      .limit(10);
      
    if (!tonTxError && tonTxs) {
      console.log('📊 TON транзакции по типам:');
      tonTxs.forEach(tx => {
        console.log(`   ${tx.type}: ${tx.count} транзакций`);
      });
    }
    
    // 5. Проверка User 228
    console.log('\n🔍 5. Проверка User 228...');
    
    const { data: user228, error: user228Error } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni')
      .eq('id', 228)
      .single();
      
    if (user228Error) {
      console.log('❌ User 228 не найден:', user228Error.message);
    } else {
      console.log(`👤 User 228: ${user228.username}, TON: ${user228.balance_ton}, UNI: ${user228.balance_uni}`);
      
      // Последние транзакции User 228
      const { data: user228Txs, error: user228TxError } = await supabase
        .from('transactions')
        .select('type, amount, currency, created_at')
        .eq('user_id', 228)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!user228TxError && user228Txs) {
        console.log('📊 Последние транзакции User 228:');
        user228Txs.forEach(tx => {
          console.log(`   ${tx.type}: ${tx.amount} ${tx.currency}, ${tx.created_at}`);
        });
      }
    }
    
    console.log('\n=== ПРОСТАЯ ПРОВЕРКА ЗАВЕРШЕНА ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

simpleDatabaseCheck();