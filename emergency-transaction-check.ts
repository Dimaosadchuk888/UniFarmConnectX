import { supabase } from './core/supabaseClient';

async function emergencyTransactionCheck() {
  console.log('🚨 ЭКСТРЕННАЯ ПРОВЕРКА СИСТЕМЫ ТРАНЗАКЦИЙ');
  console.log('='.repeat(60));

  try {
    // 1. Проверяем последние транзакции за последний час
    console.log('\n1️⃣ ПОСЛЕДНИЕ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС:');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentError) {
      console.log('❌ ОШИБКА получения транзакций:', recentError.message);
    } else {
      console.log(`📊 Транзакций за последний час: ${recentTx?.length || 0}`);
      
      if (recentTx && recentTx.length > 0) {
        console.log('\n🕐 ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
        recentTx.slice(0, 10).forEach((tx, idx) => {
          const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
          console.log(`   ${idx + 1}. User ${tx.user_id}: [${timeAgo} мин назад] ${tx.type}`);
          console.log(`      Amount: ${tx.amount_ton || tx.amount_uni || tx.amount} ${tx.currency}`);
          console.log(`      Description: ${(tx.description || '').substring(0, 50)}...`);
        });
      } else {
        console.log('❌ НИ ОДНОЙ ТРАНЗАКЦИИ ЗА ПОСЛЕДНИЙ ЧАС!');
      }
    }

    // 2. Проверяем последнюю активность по типам транзакций
    console.log('\n2️⃣ ПОСЛЕДНЯЯ АКТИВНОСТЬ ПО ТИПАМ:');
    const txTypes = ['FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'DEPOSIT', 'TON_DEPOSIT'];
    
    for (const type of txTypes) {
      const { data: lastTx, error: typeError } = await supabase
        .from('transactions')
        .select('created_at, user_id')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!typeError && lastTx && lastTx.length > 0) {
        const timeAgo = Math.round((Date.now() - new Date(lastTx[0].created_at).getTime()) / (1000 * 60));
        console.log(`   ${type}: ${timeAgo} минут назад (User ${lastTx[0].user_id})`);
      } else {
        console.log(`   ${type}: НЕ НАЙДЕНО или ОЧЕНЬ ДАВНО`);
      }
    }

    // 3. Проверяем, работают ли scheduler'ы (по частоте транзакций)
    console.log('\n3️⃣ ПРОВЕРКА РАБОТЫ SCHEDULER\'ОВ:');
    const last10Minutes = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: farmingRewards, error: farmingError } = await supabase
      .from('transactions')
      .select('id')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', last10Minutes);

    const { data: referralRewards, error: referralError } = await supabase
      .from('transactions')
      .select('id')
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', last10Minutes);

    if (!farmingError && !referralError) {
      console.log(`   FARMING_REWARD за 10 мин: ${farmingRewards?.length || 0}`);
      console.log(`   REFERRAL_REWARD за 10 мин: ${referralRewards?.length || 0}`);
      
      if ((farmingRewards?.length || 0) === 0 && (referralRewards?.length || 0) === 0) {
        console.log('🚨 КРИТИЧНО: Scheduler\'ы НЕ РАБОТАЮТ!');
      } else {
        console.log('✅ Scheduler\'ы работают нормально');
      }
    }

    // 4. Проверяем статус подключения к Supabase
    console.log('\n4️⃣ ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ:');
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (dbError) {
      console.log('❌ ПРОБЛЕМА с подключением к БД:', dbError.message);
    } else {
      console.log('✅ Подключение к Supabase работает');
    }

    // 5. Проверяем последнюю активность пользователей
    console.log('\n5️⃣ АКТИВНОСТЬ ПОЛЬЗОВАТЕЛЕЙ:');
    const { data: activeUsers, error: userError } = await supabase
      .from('transactions')
      .select('user_id')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (!userError && activeUsers) {
      const uniqueUsers = [...new Set(activeUsers.map(tx => tx.user_id))];
      console.log(`   Активных пользователей за час: ${uniqueUsers.length}`);
      console.log(`   Топ активные: ${uniqueUsers.slice(0, 5).join(', ')}`);
    }

    // 6. Проверяем, когда была последняя транзакция вообще
    console.log('\n6️⃣ ПОСЛЕДНЯЯ ТРАНЗАКЦИЯ В СИСТЕМЕ:');
    const { data: lastTransaction, error: lastError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!lastError && lastTransaction && lastTransaction.length > 0) {
      const tx = lastTransaction[0];
      const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
      console.log(`   ID: ${tx.id}`);
      console.log(`   User: ${tx.user_id}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ${tx.amount_ton || tx.amount_uni || tx.amount} ${tx.currency}`);
      console.log(`   Время: ${timeAgo} минут назад`);
      console.log(`   Создана: ${tx.created_at}`);
    }

    // 7. ДИАГНОЗ
    console.log('\n7️⃣ ЭКСТРЕННЫЙ ДИАГНОЗ:');
    const lastTxTime = lastTransaction && lastTransaction.length > 0 ? 
      Math.round((Date.now() - new Date(lastTransaction[0].created_at).getTime()) / (1000 * 60)) : null;

    if (lastTxTime === null) {
      console.log('🚨 КРИТИЧНО: В системе НЕТ транзакций вообще!');
    } else if (lastTxTime > 60) {
      console.log(`🚨 КРИТИЧНО: Последняя транзакция была ${lastTxTime} минут назад!`);
      console.log('   Возможные причины:');
      console.log('   - Остановились scheduler\'ы');
      console.log('   - Проблемы с сервером');
      console.log('   - Ошибки в коде обработки транзакций');
    } else if (lastTxTime > 10) {
      console.log(`⚠️  ВНИМАНИЕ: Последняя транзакция была ${lastTxTime} минут назад`);
      console.log('   Система работает медленнее обычного');
    } else {
      console.log(`✅ Система работает: последняя транзакция ${lastTxTime} минут назад`);
    }

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при проверке:', error);
  }
}

emergencyTransactionCheck().catch(console.error);