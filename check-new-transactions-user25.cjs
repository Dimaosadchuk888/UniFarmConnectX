/**
 * НЕМЕДЛЕННАЯ ПРОВЕРКА НОВЫХ ТРАНЗАКЦИЙ USER 25
 * Поиск 2 новых TON депозитов
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNewTransactionsUser25() {
  console.log('🚀 ПОИСК НОВЫХ TON ТРАНЗАКЦИЙ USER 25');
  console.log('='.repeat(45));
  
  const userId = 25;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  try {
    // 1. Получаем текущий баланс
    const { data: user } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, last_active')
      .eq('id', userId)
      .single();
    
    console.log('👤 CURRENT STATE USER 25:');
    console.log(`   TON баланс: ${user.balance_ton}`);
    console.log(`   UNI баланс: ${user.balance_uni}`);
    console.log(`   Последняя активность: ${user.last_active}`);
    
    // 2. Ищем все транзакции за последние 10 минут
    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log(`\n📊 ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЕ 10 МИНУТ (${recentTx?.length || 0}):`);
    
    if (recentTx && recentTx.length > 0) {
      recentTx.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000) % 60;
        
        console.log(`\n   ${i + 1}. ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Валюта: ${tx.currency}`);
        console.log(`      Сумма: ${tx.amount}`);
        console.log(`      Время: ${time.toLocaleString()} (${minutesAgo}:${secondsAgo.toString().padStart(2, '0')} назад)`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Статус: ${tx.status}`);
        
        // Выделяем TON депозиты
        if (tx.currency === 'TON' && (tx.type === 'DEPOSIT' || tx.description.includes('deposit'))) {
          console.log(`      🎯 НОВЫЙ TON ДЕПОЗИТ НАЙДЕН!`);
        }
        
        if (tx.metadata) {
          console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
        }
      });
    } else {
      console.log('   ❌ Новые транзакции не найдены');
    }
    
    // 3. Специальный поиск TON депозитов
    const { data: tonDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log(`\n💎 TON ДЕПОЗИТЫ ЗА 10 МИНУТ (${tonDeposits?.length || 0}):`);
    
    if (tonDeposits && tonDeposits.length > 0) {
      tonDeposits.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const secondsAgo = Math.floor((Date.now() - time.getTime()) / 1000);
        console.log(`   ${i + 1}. ${tx.amount} TON - ${tx.description} (${secondsAgo} сек назад)`);
      });
      console.log('✅ НОВЫЕ TON ДЕПОЗИТЫ ОБНАРУЖЕНЫ!');
    } else {
      console.log('   ❌ Новые TON депозиты НЕ найдены');
      console.log('   🤔 Если отправили депозиты - они не записались в backend');
    }
    
    // 4. Проверяем общую активность TON депозитов в системе
    const { data: systemTonDeposits } = await supabase
      .from('transactions')
      .select('id, user_id, amount, created_at, description')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });
    
    console.log(`\n🌐 ВСЕ TON ДЕПОЗИТЫ В СИСТЕМЕ ЗА 10 МИНУТ (${systemTonDeposits?.length || 0}):`);
    
    if (systemTonDeposits && systemTonDeposits.length > 0) {
      systemTonDeposits.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.amount} TON (${minutesAgo} мин назад) - ${tx.description.substring(0, 50)}...`);
        
        if (tx.user_id === userId) {
          console.log(`      🎯 ЭТО ВАШ ДЕПОЗИТ!`);
        }
      });
    } else {
      console.log('   ❌ НИ ОДНОГО TON депозита в системе за 10 минут');
      console.log('   🚨 КРИТИЧНО: Система не обрабатывает TON депозиты!');
    }
    
    // 5. Последние транзакции в системе (любые)
    const { data: latestSystem } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('\n🔄 ПОСЛЕДНИЕ 10 ТРАНЗАКЦИЙ В СИСТЕМЕ:');
    if (latestSystem) {
      latestSystem.forEach((tx, i) => {
        const time = new Date(tx.created_at);
        const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
        console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.type} ${tx.amount} ${tx.currency} (${minutesAgo} мин назад)`);
      });
    }
    
    console.log('\n🎯 РЕЗУЛЬТАТ ПРОВЕРКИ:');
    if (tonDeposits && tonDeposits.length >= 2) {
      console.log('✅ Обе транзакции найдены - система работает!');
    } else if (tonDeposits && tonDeposits.length === 1) {
      console.log('⚠️ Найдена только 1 транзакция из 2');
    } else {
      console.log('❌ Новые транзакции НЕ найдены - проблема с backend записью');
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка проверки:', error.message);
  }
}

checkNewTransactionsUser25().catch(console.error);