/**
 * ПРОВЕРКА ПОСЛЕДНЕЙ TON АКТИВНОСТИ
 * Какие аккаунты имеют новые транзакции, включая User 25 и 227
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestTonActivity() {
  console.log('🔍 ПРОВЕРКА ПОСЛЕДНЕЙ TON АКТИВНОСТИ');
  console.log('='.repeat(40));
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  try {
    // 1. Все TON транзакции за последние 5 минут
    const { data: allTonTx, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log(`📊 ВСЕ TON ТРАНЗАКЦИИ ЗА 5 МИНУТ (${allTonTx?.length || 0}):`);
    
    if (allTonTx && allTonTx.length > 0) {
      // Группируем по пользователям
      const userActivity = {};
      
      allTonTx.forEach(tx => {
        if (!userActivity[tx.user_id]) {
          userActivity[tx.user_id] = [];
        }
        userActivity[tx.user_id].push(tx);
      });
      
      console.log(`\n👥 АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ (${Object.keys(userActivity).length}):`);
      
      Object.keys(userActivity).forEach(userId => {
        const transactions = userActivity[userId];
        const isTargetUser = userId === '25' || userId === '227';
        const marker = isTargetUser ? '🎯' : '  ';
        
        console.log(`\n${marker} USER ${userId} (${transactions.length} транзакций):`);
        
        if (isTargetUser) {
          console.log(`   ⭐ ЦЕЛЕВОЙ ПОЛЬЗОВАТЕЛЬ! ⭐`);
        }
        
        transactions.forEach((tx, i) => {
          const time = new Date(tx.created_at);
          const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
          const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000) % 60;
          
          console.log(`      ${i + 1}. ID: ${tx.id}`);
          console.log(`         Тип: ${tx.type}`);
          console.log(`         Сумма: ${tx.amount} TON`);
          console.log(`         Время: ${time.toLocaleString()} (${minutesAgo}:${secondsAgo.toString().padStart(2, '0')} назад)`);
          console.log(`         Описание: ${tx.description}`);
          console.log(`         Статус: ${tx.status}`);
          
          if (tx.type === 'DEPOSIT' || tx.description.includes('deposit')) {
            console.log(`         💰 ДЕПОЗИТ ОБНАРУЖЕН!`);
          }
        });
      });
      
      // Специальная проверка User 25 и 227
      console.log('\n🎯 СПЕЦИАЛЬНАЯ ПРОВЕРКА ЦЕЛЕВЫХ ПОЛЬЗОВАТЕЛЕЙ:');
      
      if (userActivity['25']) {
        console.log(`✅ USER 25: ${userActivity['25'].length} транзакций найдено`);
        const deposits25 = userActivity['25'].filter(tx => tx.type === 'DEPOSIT');
        if (deposits25.length > 0) {
          console.log(`   💰 ДЕПОЗИТЫ USER 25: ${deposits25.length} штук`);
        }
      } else {
        console.log(`❌ USER 25: транзакции не найдены`);
      }
      
      if (userActivity['227']) {
        console.log(`✅ USER 227: ${userActivity['227'].length} транзакций найдено`);
        const deposits227 = userActivity['227'].filter(tx => tx.type === 'DEPOSIT');
        if (deposits227.length > 0) {
          console.log(`   💰 ДЕПОЗИТЫ USER 227: ${deposits227.length} штук`);
        }
      } else {
        console.log(`❌ USER 227: транзакции не найдены`);
      }
      
    } else {
      console.log('   ❌ TON транзакции за 5 минут не найдены');
    }
    
    // 2. Последние 20 транзакций в системе (любые)
    const { data: latestAny } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at, description')
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log('\n🔄 ПОСЛЕДНИЕ 20 ТРАНЗАКЦИЙ В СИСТЕМЕ:');
    if (latestAny) {
      latestAny.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        const isTarget = tx.user_id === 25 || tx.user_id === 227;
        const marker = isTarget ? '🎯' : '  ';
        
        console.log(`${marker} ${i + 1}. User ${tx.user_id}: ${tx.type} ${tx.amount} ${tx.currency} (${minutesAgo} мин назад)`);
        
        if (tx.currency === 'TON' && isTarget) {
          console.log(`      ⭐ TON транзакция целевого пользователя: ${tx.description.substring(0, 60)}...`);
        }
      });
    }
    
    // 3. Текущие балансы User 25 и 227
    console.log('\n💰 ТЕКУЩИЕ БАЛАНСЫ ЦЕЛЕВЫХ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const { data: users } = await supabase
      .from('users')
      .select('id, username, balance_ton, balance_uni, last_active')
      .in('id', [25, 227]);
    
    if (users) {
      users.forEach(user => {
        const lastActiveTime = user.last_active ? new Date(user.last_active) : null;
        const minutesAgo = lastActiveTime ? Math.floor((Date.now() - lastActiveTime.getTime()) / 1000 / 60) : 'неизвестно';
        
        console.log(`\n   USER ${user.id} (${user.username}):`);
        console.log(`      TON баланс: ${user.balance_ton}`);
        console.log(`      UNI баланс: ${user.balance_uni}`);
        console.log(`      Последняя активность: ${minutesAgo} мин назад`);
      });
    }
    
    console.log('\n🏁 ИТОГИ ПРОВЕРКИ:');
    const hasUser25Activity = allTonTx && allTonTx.some(tx => tx.user_id === 25);
    const hasUser227Activity = allTonTx && allTonTx.some(tx => tx.user_id === 227);
    
    if (hasUser25Activity) {
      console.log('✅ USER 25: Новая TON активность обнаружена');
    } else {
      console.log('❌ USER 25: Новая TON активность НЕ найдена');
    }
    
    if (hasUser227Activity) {
      console.log('✅ USER 227: Новая TON активность обнаружена');
    } else {
      console.log('❌ USER 227: Новая TON активность НЕ найдена');
    }
    
    if (!hasUser25Activity && !hasUser227Activity) {
      console.log('🚨 НИ ОДИН из целевых пользователей не имеет новых TON транзакций');
      console.log('   Проблема frontend-backend рассинхронизации подтверждается');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка проверки:', error.message);
  }
}

checkLatestTonActivity().catch(console.error);