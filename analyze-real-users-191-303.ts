import { supabase } from './core/supabaseClient';

async function analyzeRealUsers191To303() {
  console.log('🔍 АНАЛИЗ РЕАЛЬНЫХ ПОЛЬЗОВАТЕЛЕЙ 191-303');
  console.log('='.repeat(60));

  try {
    // 1. Детальный анализ каждого проблемного пользователя 191-303
    console.log('\n1️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ ПРОБЛЕМНЫХ ПОЛЬЗОВАТЕЛЕЙ 191-303:');
    
    const { data: realUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .gte('id', 191)
      .lte('id', 303)
      .order('id', { ascending: true });

    if (!usersError && realUsers) {
      console.log(`📊 Всего реальных пользователей 191-303: ${realUsers.length}`);
      
      // Категоризируем пользователей по проблемам
      const categories = {
        tonBalanceNoBoost: [], // Есть TON баланс, но нет активного Boost
        tonBoostNoBalance: [], // Активный Boost, но нет TON баланса
        bothActive: [], // И баланс, и Boost активны
        neitherActive: [] // Ни баланса, ни Boost
      };
      
      realUsers.forEach(user => {
        const hasTonBalance = user.balance_ton > 0;
        const hasTonBoost = user.ton_boost_active;
        
        if (hasTonBalance && !hasTonBoost) {
          categories.tonBalanceNoBoost.push(user);
        } else if (!hasTonBalance && hasTonBoost) {
          categories.tonBoostNoBalance.push(user);
        } else if (hasTonBalance && hasTonBoost) {
          categories.bothActive.push(user);
        } else {
          categories.neitherActive.push(user);
        }
      });
      
      console.log('\n📈 КАТЕГОРИЗАЦИЯ ПРОБЛЕМ:');
      console.log(`   ❌ TON баланс БЕЗ Boost: ${categories.tonBalanceNoBoost.length} пользователей`);
      console.log(`   ⚠️ TON Boost БЕЗ баланса: ${categories.tonBoostNoBalance.length} пользователей`);
      console.log(`   ✅ И баланс И Boost: ${categories.bothActive.length} пользователей`);
      console.log(`   ⚪ Ни баланса ни Boost: ${categories.neitherActive.length} пользователей`);
      
      // Детально анализируем самую проблемную категорию
      if (categories.tonBalanceNoBoost.length > 0) {
        console.log('\n🚨 КРИТИЧЕСКИЕ СЛУЧАИ (TON баланс БЕЗ Boost):');
        categories.tonBalanceNoBoost.forEach((user, idx) => {
          console.log(`   ${idx + 1}. User ${user.id}:`);
          console.log(`      TON Balance: ${user.balance_ton}`);
          console.log(`      Создан: ${user.created_at}`);
          console.log(`      Username: ${user.username || 'НЕТ'}`);
          console.log(`      First Name: ${user.first_name || 'НЕТ'}`);
          console.log('      ---');
        });
      }
    }

    // 2. Проверяем ton_farming_data для пользователей 191-303
    console.log('\n2️⃣ ПРОВЕРКА TON_FARMING_DATA для 191-303:');
    
    const { data: farmingData191_303, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .order('user_id', { ascending: true });

    if (!farmingError) {
      if (farmingData191_303 && farmingData191_303.length > 0) {
        console.log(`🌾 Записей в ton_farming_data для 191-303: ${farmingData191_303.length}`);
        
        farmingData191_303.forEach((farm, idx) => {
          console.log(`   ${idx + 1}. User ${farm.user_id}:`);
          console.log(`      Farming Balance: ${farm.farming_balance}`);
          console.log(`      Boost Active: ${farm.boost_active}`);
          console.log(`      Package: ${farm.boost_package_id || 'НЕТ'}`);
          console.log(`      Rate: ${farm.farming_rate || 'НЕТ'}`);
          console.log(`      Created: ${farm.created_at}`);
          console.log('      ---');
        });
      } else {
        console.log('❌ НИ ОДНОЙ записи в ton_farming_data для пользователей 191-303!');
      }
    }

    // 3. Анализ транзакций пользователей 191-303
    console.log('\n3️⃣ АНАЛИЗ ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЕЙ 191-303:');
    
    const { data: transactions191_303, error: txError } = await supabase
      .from('transactions')
      .select('user_id, type, amount_ton, amount_uni, amount, currency, created_at, description')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!txError && transactions191_303 && transactions191_303.length > 0) {
      console.log(`💰 Транзакций для пользователей 191-303: ${transactions191_303.length}`);
      
      // Группируем по типам
      const txByType: { [key: string]: any[] } = {};
      const txByUser: { [key: number]: any[] } = {};
      
      transactions191_303.forEach(tx => {
        const type = tx.type || 'UNKNOWN';
        if (!txByType[type]) txByType[type] = [];
        txByType[type].push(tx);
        
        if (!txByUser[tx.user_id]) txByUser[tx.user_id] = [];
        txByUser[tx.user_id].push(tx);
      });
      
      console.log('\n📊 ТРАНЗАКЦИИ ПО ТИПАМ:');
      Object.keys(txByType).forEach(type => {
        console.log(`   ${type}: ${txByType[type].length} транзакций`);
      });
      
      console.log('\n👥 АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ (с транзакциями):');
      const activeUserIds = Object.keys(txByUser).map(Number).sort((a, b) => a - b);
      activeUserIds.slice(0, 10).forEach(userId => {
        const userTx = txByUser[userId];
        const tonTx = userTx.filter(tx => tx.amount_ton > 0 || tx.currency === 'TON');
        console.log(`   User ${userId}: ${userTx.length} транзакций, ${tonTx.length} TON транзакций`);
      });
      
      // Ищем пользователей БЕЗ транзакций
      if (realUsers) {
        const usersWithoutTx = realUsers.filter(user => !txByUser[user.id]);
        if (usersWithoutTx.length > 0) {
          console.log(`\n❌ ПОЛЬЗОВАТЕЛИ БЕЗ ТРАНЗАКЦИЙ: ${usersWithoutTx.length}`);
          usersWithoutTx.slice(0, 10).forEach(user => {
            console.log(`   User ${user.id}: TON=${user.balance_ton}, Boost=${user.ton_boost_active}`);
          });
        }
      }
    } else {
      console.log('❌ НИ ОДНОЙ транзакции для пользователей 191-303!');
    }

    // 4. Временной анализ - когда возникли проблемы
    console.log('\n4️⃣ ВРЕМЕННОЙ АНАЛИЗ ПРОБЛЕМ:');
    
    if (realUsers) {
      // Группируем по датам создания
      const usersByDate: { [key: string]: any[] } = {};
      realUsers.forEach(user => {
        const date = user.created_at.split('T')[0];
        if (!usersByDate[date]) usersByDate[date] = [];
        usersByDate[date].push(user);
      });
      
      console.log('\n📅 ПОЛЬЗОВАТЕЛИ ПО ДАТАМ СОЗДАНИЯ:');
      Object.keys(usersByDate).sort().forEach(date => {
        const dayUsers = usersByDate[date];
        const problemUsers = dayUsers.filter(u => u.balance_ton > 0 && !u.ton_boost_active);
        console.log(`   ${date}: ${dayUsers.length} пользователей, ${problemUsers.length} проблемных`);
      });
    }

    // 5. Поиск паттернов в проблемных аккаунтах
    console.log('\n5️⃣ ПОИСК ПАТТЕРНОВ В ПРОБЛЕМНЫХ АККАУНТАХ:');
    
    if (realUsers) {
      const problemUsers = realUsers.filter(u => u.balance_ton > 0 && !u.ton_boost_active);
      
      if (problemUsers.length > 0) {
        console.log(`\n🔍 АНАЛИЗ ${problemUsers.length} ПРОБЛЕМНЫХ АККАУНТОВ:`);
        
        // Анализ ID последовательности
        const problemIds = problemUsers.map(u => u.id).sort((a, b) => a - b);
        console.log(`   ID диапазон: ${problemIds[0]} - ${problemIds[problemIds.length - 1]}`);
        
        // Анализ TON балансов
        const balances = problemUsers.map(u => u.balance_ton);
        const avgBalance = balances.reduce((sum, bal) => sum + bal, 0) / balances.length;
        const maxBalance = Math.max(...balances);
        const minBalance = Math.min(...balances);
        
        console.log(`   TON балансы: мин=${minBalance.toFixed(6)}, макс=${maxBalance.toFixed(6)}, среднее=${avgBalance.toFixed(6)}`);
        
        // Проверяем схожие балансы (возможно массовая операция)
        const roundedBalances: { [key: string]: number } = {};
        balances.forEach(bal => {
          const rounded = Math.round(bal);
          roundedBalances[rounded] = (roundedBalances[rounded] || 0) + 1;
        });
        
        console.log('   Схожие балансы:');
        Object.keys(roundedBalances).forEach(balance => {
          if (roundedBalances[balance] > 1) {
            console.log(`     ~${balance} TON: ${roundedBalances[balance]} пользователей`);
          }
        });
      }
    }

    // 6. Итоговый диагноз для реальных пользователей 191-303
    console.log('\n6️⃣ ИТОГОВЫЙ ДИАГНОЗ ДЛЯ РЕАЛЬНЫХ ПОЛЬЗОВАТЕЛЕЙ 191-303:');
    
    console.log('\n🎯 ГЛАВНЫЕ ПРОБЛЕМЫ:');
    console.log('   1. Пользователи с TON балансом, но неактивным TON Boost');
    console.log('   2. Отсутствие записей в ton_farming_data');
    console.log('   3. Неполное выполнение депозитных операций');
    console.log('   4. Отсутствие транзакций у части пользователей');
    
    console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('   1. Восстановить записи в ton_farming_data для проблемных пользователей');
    console.log('   2. Активировать TON Boost для пользователей с балансом');
    console.log('   3. Проверить логику API обработки депозитов');
    console.log('   4. Создать механизм валидации целостности данных');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА РЕАЛЬНЫХ ПОЛЬЗОВАТЕЛЕЙ:', error);
  }
}

analyzeRealUsers191To303().catch(console.error);