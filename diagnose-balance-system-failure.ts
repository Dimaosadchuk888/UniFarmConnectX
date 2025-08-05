/**
 * ДИАГНОСТИКА СБОЯ СИСТЕМЫ БАЛАНСОВ
 * Анализируем почему депозиты не обновили балансы пользователей 255 и 251
 */

import { supabase } from './core/supabase.js';

async function diagnoseBalanceSystemFailure() {
  console.log('🔍 ДИАГНОСТИКА СБОЯ СИСТЕМЫ БАЛАНСОВ');
  
  try {
    // 1. Проверяем депозитные транзакции детально
    console.log('\n📊 ДЕТАЛЬНЫЙ АНАЛИЗ ДЕПОЗИТОВ:');
    const { data: deposits } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', [255, 251])
      .in('type', ['TON_DEPOSIT', 'FARMING_DEPOSIT'])
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (deposits) {
      deposits.forEach(tx => {
        console.log(`\n--- ДЕПОЗИТ ID ${tx.id} ---`);
        console.log(`User: ${tx.user_id}`);
        console.log(`Type: ${tx.type}`);
        console.log(`Amount: ${tx.amount} ${tx.currency}`);
        console.log(`Status: ${tx.status}`);
        console.log(`Created: ${tx.created_at}`);
        console.log(`Updated: ${tx.updated_at}`);
        console.log(`Description: ${tx.description}`);
        if (tx.metadata) {
          console.log(`Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
        }
      });
    }
    
    // 2. Проверяем логи обработки транзакций
    console.log('\n🔍 ПОИСК BALANCE_UPDATE ОПЕРАЦИЙ:');
    const { data: balanceUpdates } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', [255, 251])
      .eq('type', 'BALANCE_UPDATE')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (balanceUpdates && balanceUpdates.length > 0) {
      console.log(`Найдено ${balanceUpdates.length} BALANCE_UPDATE операций:`);
      balanceUpdates.forEach(tx => {
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.amount} ${tx.currency} | ${tx.description}`);
      });
    } else {
      console.log('❌ НЕТ BALANCE_UPDATE ОПЕРАЦИЙ! Система не обрабатывает депозиты!');
    }
    
    // 3. Проверяем есть ли duplicate prevention логи
    console.log('\n🔍 ПРОВЕРКА ДУБЛИКАТОВ И ОШИБОК:');
    const { data: duplicateCheck } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', [255, 251])
      .eq('status', 'duplicate')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    
    if (duplicateCheck && duplicateCheck.length > 0) {
      console.log('⚠️ НАЙДЕНЫ ДУБЛИКАТЫ:');
      duplicateCheck.forEach(tx => {
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${tx.amount} ${tx.currency} | DUPLICATE`);
      });
    }
    
    // 4. Проверяем текущие балансы пользователей детально
    console.log('\n💰 ДЕТАЛЬНАЯ ПРОВЕРКА БАЛАНСОВ:');
    const { data: user255 } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 255)
      .single();
      
    const { data: user251 } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 251)
      .single();
    
    if (user255) {
      console.log(`\n--- USER 255 ---`);
      console.log(`ID: ${user255.id}`);
      console.log(`Telegram ID: ${user255.telegram_id}`);
      console.log(`UNI Balance: ${user255.balance_uni}`);
      console.log(`TON Balance: ${user255.balance_ton}`);
      console.log(`Created: ${user255.created_at}`);
      console.log(`Updated: ${user255.updated_at}`);
    }
    
    if (user251) {
      console.log(`\n--- USER 251 ---`);
      console.log(`ID: ${user251.id}`);
      console.log(`Telegram ID: ${user251.telegram_id}`);
      console.log(`UNI Balance: ${user251.balance_uni}`);
      console.log(`TON Balance: ${user251.balance_ton}`);
      console.log(`Created: ${user251.created_at}`);
      console.log(`Updated: ${user251.updated_at}`);
    }
    
    // 5. Подсчитываем ожидаемые балансы
    console.log('\n🧮 РАСЧЕТ ОЖИДАЕМЫХ БАЛАНСОВ:');
    
    const { data: user255AllTx } = await supabase
      .from('transactions')
      .select('type, amount, currency, status')
      .eq('user_id', 255)
      .eq('status', 'completed');
    
    const { data: user251AllTx } = await supabase
      .from('transactions')
      .select('type, amount, currency, status')
      .eq('user_id', 251)
      .eq('status', 'completed');
    
    // Подсчет для User 255
    let user255ExpectedUNI = 0;
    let user255ExpectedTON = 0;
    
    if (user255AllTx) {
      user255AllTx.forEach(tx => {
        const amount = parseFloat(tx.amount);
        if (tx.currency === 'UNI') {
          if (['TON_DEPOSIT', 'FARMING_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(tx.type)) {
            user255ExpectedUNI += amount;
          } else if (['WITHDRAWAL', 'FARMING_WITHDRAWAL'].includes(tx.type)) {
            user255ExpectedUNI -= amount;
          }
        } else if (tx.currency === 'TON') {
          if (['TON_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(tx.type)) {
            user255ExpectedTON += amount;
          } else if (['WITHDRAWAL'].includes(tx.type)) {
            user255ExpectedTON -= amount;
          }
        }
      });
    }
    
    // Подсчет для User 251
    let user251ExpectedUNI = 0;
    let user251ExpectedTON = 0;
    
    if (user251AllTx) {
      user251AllTx.forEach(tx => {
        const amount = parseFloat(tx.amount);
        if (tx.currency === 'UNI') {
          if (['TON_DEPOSIT', 'FARMING_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(tx.type)) {
            user251ExpectedUNI += amount;
          } else if (['WITHDRAWAL', 'FARMING_WITHDRAWAL'].includes(tx.type)) {
            user251ExpectedUNI -= amount;
          }
        } else if (tx.currency === 'TON') {
          if (['TON_DEPOSIT', 'FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(tx.type)) {
            user251ExpectedTON += amount;
          } else if (['WITHDRAWAL'].includes(tx.type)) {
            user251ExpectedTON -= amount;
          }
        }
      });
    }
    
    console.log(`\nUser 255 - Ожидаемые балансы:`);
    console.log(`UNI: ${user255ExpectedUNI} (текущий: ${user255?.balance_uni || 0})`);
    console.log(`TON: ${user255ExpectedTON} (текущий: ${user255?.balance_ton || 0})`);
    
    console.log(`\nUser 251 - Ожидаемые балансы:`);
    console.log(`UNI: ${user251ExpectedUNI} (текущий: ${user251?.balance_uni || 0})`);
    console.log(`TON: ${user251ExpectedTON} (текущий: ${user251?.balance_ton || 0})`);
    
    // 6. Поиск системных ошибок
    console.log('\n🚨 ПОИСК СИСТЕМНЫХ ПРОБЛЕМ:');
    
    const user255BalanceDeficit = {
      uni: user255ExpectedUNI - (user255?.balance_uni || 0),
      ton: user255ExpectedTON - (user255?.balance_ton || 0)
    };
    
    const user251BalanceDeficit = {
      uni: user251ExpectedUNI - (user251?.balance_uni || 0),
      ton: user251ExpectedTON - (user251?.balance_ton || 0)
    };
    
    if (user255BalanceDeficit.uni !== 0 || user255BalanceDeficit.ton !== 0) {
      console.log(`❌ User 255 ДЕФИЦИТ БАЛАНСА:`);
      console.log(`   UNI: ${user255BalanceDeficit.uni}`);
      console.log(`   TON: ${user255BalanceDeficit.ton}`);
    }
    
    if (user251BalanceDeficit.uni !== 0 || user251BalanceDeficit.ton !== 0) {
      console.log(`❌ User 251 ДЕФИЦИТ БАЛАНСА:`);
      console.log(`   UNI: ${user251BalanceDeficit.uni}`);
      console.log(`   TON: ${user251BalanceDeficit.ton}`);
    }
    
    console.log('\n✅ Диагностика завершена');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

diagnoseBalanceSystemFailure();