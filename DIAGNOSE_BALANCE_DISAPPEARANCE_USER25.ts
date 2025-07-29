import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseBalanceDisappearance() {
  console.log('\n🔍 ДИАГНОСТИКА: Почему баланс исчезает и появляется?');
  console.log('='.repeat(70));
  console.log(`📅 ${new Date().toLocaleString('ru-RU')}`);

  const userId = 25; // User ID 25 с проблемой

  try {
    // 1. Текущий баланс в БД
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance_ton, balance_uni, updated_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError);
      return;
    }

    console.log('\n📊 ТЕКУЩИЙ БАЛАНС В БД:');
    console.log(`   TON: ${user.balance_ton}`);
    console.log(`   UNI: ${user.balance_uni}`);
    console.log(`   Последнее обновление: ${user.updated_at || 'N/A'}`);

    // 2. Последние транзакции за 10 минут
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false });

    console.log('\n📝 ПОСЛЕДНИЕ ТРАНЗАКЦИИ (10 минут):');
    if (recentTx && recentTx.length > 0) {
      recentTx.forEach(tx => {
        const time = new Date(tx.created_at).toLocaleTimeString('ru-RU');
        console.log(`   ${time}: ${tx.type} ${tx.amount} ${tx.currency} (ID: ${tx.id})`);
      });
    } else {
      console.log('   Нет транзакций за последние 10 минут');
    }

    // 3. Проверяем сумму всех транзакций
    const { data: allTx, error: allTxError } = await supabase
      .from('transactions')
      .select('amount, currency, type')
      .eq('user_id', userId)
      .eq('status', 'completed');

    let calculatedTonBalance = 0;
    let calculatedUniBalance = 0;

    if (allTx) {
      allTx.forEach(tx => {
        const amount = parseFloat(tx.amount);
        const isIncome = [
          'FARMING_REWARD', 'REFERRAL_REWARD', 'TON_DEPOSIT', 
          'UNI_DEPOSIT', 'MISSION_REWARD', 'DAILY_BONUS'
        ].includes(tx.type);
        
        const isExpense = [
          'WITHDRAWAL', 'BOOST_PURCHASE', 'BOOST_PAYMENT'
        ].includes(tx.type);

        if (tx.currency === 'TON') {
          if (isIncome) calculatedTonBalance += amount;
          if (isExpense) calculatedTonBalance -= amount;
        } else if (tx.currency === 'UNI') {
          if (isIncome) calculatedUniBalance += amount;
          if (isExpense) calculatedUniBalance -= amount;
        }
      });
    }

    console.log('\n🧮 РАСЧЕТНЫЙ БАЛАНС (сумма транзакций):');
    console.log(`   TON: ${calculatedTonBalance.toFixed(6)} (БД: ${user.balance_ton})`);
    console.log(`   UNI: ${calculatedUniBalance.toFixed(6)} (БД: ${user.balance_uni})`);
    
    const tonDiff = Math.abs(parseFloat(user.balance_ton) - calculatedTonBalance);
    const uniDiff = Math.abs(parseFloat(user.balance_uni) - calculatedUniBalance);
    
    if (tonDiff > 0.01) {
      console.log(`\n🚨 РАСХОЖДЕНИЕ TON: ${tonDiff.toFixed(6)}`);
    }
    if (uniDiff > 0.01) {
      console.log(`\n🚨 РАСХОЖДЕНИЕ UNI: ${uniDiff.toFixed(6)}`);
    }

    // 4. Проверяем активные процессы
    console.log('\n⚙️ ВОЗМОЖНЫЕ ПРИЧИНЫ ИСЧЕЗНОВЕНИЯ БАЛАНСА:');
    console.log('1. ❌ UnifiedTransactionService.updateUserBalance() - ОТКЛЮЧЕН');
    console.log('   → Транзакции создаются, но баланс НЕ обновляется автоматически');
    console.log('2. ❌ TransactionsService.recalculateUserBalance() - ОТКЛЮЧЕН');
    console.log('   → Автоматический пересчет балансов заблокирован');
    console.log('3. ⚠️  WebSocket обновления могут показывать устаревшие данные');
    console.log('4. ⚠️  Клиентский кеш (10 сек) может конфликтовать с real-time обновлениями');
    console.log('5. ⚠️  Race condition между несколькими системами обновления');

    // 5. Мониторинг изменений в реальном времени
    console.log('\n⏱️  МОНИТОРИНГ ИЗМЕНЕНИЙ (30 секунд)...');
    
    let previousTonBalance = parseFloat(user.balance_ton);
    let previousUniBalance = parseFloat(user.balance_uni);
    let changeDetected = false;

    const monitorInterval = setInterval(async () => {
      const { data: currentUser } = await supabase
        .from('users')
        .select('balance_ton, balance_uni')
        .eq('id', userId)
        .single();

      if (currentUser) {
        const currentTon = parseFloat(currentUser.balance_ton);
        const currentUni = parseFloat(currentUser.balance_uni);

        if (Math.abs(currentTon - previousTonBalance) > 0.000001 ||
            Math.abs(currentUni - previousUniBalance) > 0.000001) {
          changeDetected = true;
          console.log(`\n🔄 ИЗМЕНЕНИЕ ОБНАРУЖЕНО в ${new Date().toLocaleTimeString('ru-RU')}:`);
          console.log(`   TON: ${previousTonBalance} → ${currentTon} (${currentTon > previousTonBalance ? '+' : ''}${(currentTon - previousTonBalance).toFixed(6)})`);
          console.log(`   UNI: ${previousUniBalance} → ${currentUni} (${currentUni > previousUniBalance ? '+' : ''}${(currentUni - previousUniBalance).toFixed(6)})`);
          
          previousTonBalance = currentTon;
          previousUniBalance = currentUni;
        }
      }
    }, 2000); // Проверка каждые 2 секунды

    // Останавливаем мониторинг через 30 секунд
    setTimeout(() => {
      clearInterval(monitorInterval);
      if (!changeDetected) {
        console.log('\n✅ Изменений баланса не обнаружено за период мониторинга');
      }
      console.log('\n🏁 Диагностика завершена');
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем диагностику
diagnoseBalanceDisappearance();