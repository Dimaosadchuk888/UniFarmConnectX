/**
 * СРОЧНАЯ ПРОВЕРКА: Где деньги пользователей 255 и 251?
 * Проверяем их последние депозиты и балансы БЕЗ JWT
 */

import { supabase } from './core/supabase.js';

async function urgentCheckMissingDeposits() {
  console.log('🚨 СРОЧНАЯ ПРОВЕРКА: Депозиты пользователей 255 и 251');
  
  try {
    
    // 1. Проверяем последние транзакции пользователя 255
    console.log('\n📊 ПОЛЬЗОВАТЕЛЬ 255 - Последние транзакции:');
    const { data: user255Transactions, error: error255 } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, status, description, created_at, metadata')
      .eq('user_id', 255)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error255) {
      console.error('❌ Ошибка получения транзакций пользователя 255:', error255);
      return;
    }
    
    user255Transactions?.forEach(tx => {
      console.log(`${tx.created_at} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.status} | ${tx.description}`);
    });
    
    // 2. Проверяем последние транзакции пользователя 251
    console.log('\n📊 ПОЛЬЗОВАТЕЛЬ 251 - Последние транзакции:');
    const { data: user251Transactions, error: error251 } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, status, description, created_at, metadata')
      .eq('user_id', 251)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error251) {
      console.error('❌ Ошибка получения транзакций пользователя 251:', error251);
      return;
    }
    
    user251Transactions?.forEach(tx => {
      console.log(`${tx.created_at} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.status} | ${tx.description}`);
    });
    
    // 3. Проверяем текущие балансы
    console.log('\n💰 ТЕКУЩИЕ БАЛАНСЫ:');
    const { data: user255Balance } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('telegram_id', 255)
      .single();
      
    const { data: user251Balance } = await supabase
      .from('users')
      .select('balance_uni, balance_ton')
      .eq('telegram_id', 251)
      .single();
    
    console.log(`Пользователь 255: UNI=${user255Balance?.balance_uni || 0}, TON=${user255Balance?.balance_ton || 0}`);
    console.log(`Пользователь 251: UNI=${user251Balance?.balance_uni || 0}, TON=${user251Balance?.balance_ton || 0}`);
    
    // 4. Проверяем депозиты за последний час
    console.log('\n⏰ ДЕПОЗИТЫ ЗА ПОСЛЕДНИЙ ЧАС:');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentDeposits } = await supabase
      .from('transactions')
      .select('user_id, type, amount, currency, status, description, created_at, metadata')
      .in('user_id', [255, 251])
      .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    if (!recentDeposits || recentDeposits.length === 0) {
      console.log('❌ НЕТ ДЕПОЗИТОВ ЗА ПОСЛЕДНИЙ ЧАС!');
    } else {
      recentDeposits.forEach(tx => {
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.status}`);
      });
    }
    
    // 5. Проверяем FAILED транзакции
    console.log('\n❌ НЕУДАЧНЫЕ ТРАНЗАКЦИИ:');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: failedTx } = await supabase
      .from('transactions')
      .select('user_id, type, amount, currency, status, description, created_at, metadata')
      .in('user_id', [255, 251])
      .eq('status', 'failed')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });
    
    if (failedTx && failedTx.length > 0) {
      failedTx.forEach(tx => {
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency} | FAILED | ${tx.description}`);
      });
    } else {
      console.log('✅ Нет неудачных транзакций за последние 24 часа');
    }
    console.log('\n✅ Проверка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  }
}

urgentCheckMissingDeposits();