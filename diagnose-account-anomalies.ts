import { supabase } from './core/supabaseClient';

async function diagnoseAccountAnomalies() {
  console.log('🔍 ДИАГНОСТИКА АНОМАЛЬНОГО ПОВЕДЕНИЯ АККАУНТОВ');
  console.log('='.repeat(60));

  try {
    // 1. Сравнение проблемного аккаунта 251 с работающими
    console.log('\n1️⃣ СРАВНЕНИЕ ПРОБЛЕМНОГО И РАБОТАЮЩИХ АККАУНТОВ:');
    
    // Проблемный аккаунт 251
    const { data: user251, error: user251Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 251)
      .single();

    // Работающие аккаунты с TON Boost
    const { data: workingUsers, error: workingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_active, boost_package_id')
      .eq('boost_active', true)
      .gt('farming_balance', 0)
      .limit(5);

    if (!user251Error && !workingError && workingUsers) {
      console.log('\n📊 ПРОБЛЕМНЫЙ АККАУНТ 251:');
      if (user251) {
        console.log(`   TON Balance: ${user251.balance_ton}`);
        console.log(`   UNI Balance: ${user251.balance_uni}`);
        console.log(`   TON Wallet: ${user251.ton_wallet_address || 'НЕ ПРИВЯЗАН'}`);
        console.log(`   Создан: ${user251.created_at}`);
        console.log(`   TON Boost: ${user251.ton_boost_active ? 'активен' : 'НЕ АКТИВЕН'}`);
        console.log(`   UNI Farming: ${user251.uni_farming_active ? 'активен' : 'НЕ АКТИВЕН'}`);
      }

      console.log('\n✅ РАБОТАЮЩИЕ АККАУНТЫ:');
      for (const workingUser of workingUsers.slice(0, 3)) {
        const { data: userInfo, error: userInfoError } = await supabase
          .from('users')
          .select('*')
          .eq('id', workingUser.user_id)
          .single();

        if (!userInfoError && userInfo) {
          console.log(`\n   User ${workingUser.user_id}:`);
          console.log(`     TON Balance: ${userInfo.balance_ton}`);
          console.log(`     TON Wallet: ${userInfo.ton_wallet_address || 'НЕ ПРИВЯЗАН'}`);
          console.log(`     TON Boost: ${userInfo.ton_boost_active ? 'активен' : 'НЕ АКТИВЕН'}`);
          console.log(`     Farming Balance: ${workingUser.farming_balance}`);
          console.log(`     Package: ${workingUser.boost_package_id}`);
          console.log(`     Создан: ${userInfo.created_at}`);
        }
      }
    }

    // 2. Анализ различий в структуре данных
    console.log('\n2️⃣ АНАЛИЗ РАЗЛИЧИЙ В ДАННЫХ:');
    
    // Проверяем ton_farming_data для проблемного аккаунта
    const { data: user251Farming, error: farming251Error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '251');

    console.log('\n🔍 TON FARMING DATA для User 251:');
    if (!farming251Error && user251Farming && user251Farming.length > 0) {
      user251Farming.forEach((farm, idx) => {
        console.log(`   Запись ${idx + 1}:`);
        console.log(`     User ID: ${farm.user_id}`);
        console.log(`     Farming Balance: ${farm.farming_balance}`);
        console.log(`     Boost Active: ${farm.boost_active}`);
        console.log(`     Package ID: ${farm.boost_package_id || 'НЕТ'}`);
        console.log(`     Farming Rate: ${farm.farming_rate || 'НЕТ'}`);
        console.log(`     Last Update: ${farm.last_update || 'НЕТ'}`);
        console.log(`     Created: ${farm.created_at || 'НЕТ'}`);
      });
    } else {
      console.log('❌ НЕТ ЗАПИСЕЙ в ton_farming_data для User 251!');
    }

    // 3. Проверка различий в TON кошельках
    console.log('\n3️⃣ АНАЛИЗ TON КОШЕЛЬКОВ:');
    
    const { data: walletsData, error: walletsError } = await supabase
      .from('users')
      .select('id, ton_wallet_address, balance_ton, ton_boost_active')
      .in('id', [251, ...workingUsers?.map(u => u.user_id) || []])
      .order('id', { ascending: true });

    if (!walletsError && walletsData) {
      console.log('\n💳 СРАВНЕНИЕ КОШЕЛЬКОВ:');
      walletsData.forEach(user => {
        const isProblematic = user.id === 251;
        console.log(`   User ${user.id} ${isProblematic ? '❌ (ПРОБЛЕМНЫЙ)' : '✅'}:`);
        console.log(`     Wallet: ${user.ton_wallet_address || 'НЕ ПРИВЯЗАН'}`);
        console.log(`     Balance: ${user.balance_ton} TON`);
        console.log(`     Boost Active: ${user.ton_boost_active}`);
        
        // Проверяем формат кошелька
        if (user.ton_wallet_address) {
          const isValidFormat = user.ton_wallet_address.startsWith('0:') || 
                               user.ton_wallet_address.startsWith('EQ') ||
                               user.ton_wallet_address.startsWith('UQ');
          console.log(`     Формат кошелька: ${isValidFormat ? 'ВАЛИДНЫЙ' : '⚠️ ПОДОЗРИТЕЛЬНЫЙ'}`);
        }
      });
    }

    // 4. Проверка последних попыток депозитов от User 251
    console.log('\n4️⃣ ПОИСК СЛЕДОВ ДЕПОЗИТОВ USER 251:');
    
    // Ищем любые транзакции с большими суммами TON
    const { data: bigTonTx, error: bigTonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 251)
      .or('amount_ton.gt.0.1,amount.gt.0.1')
      .order('created_at', { ascending: false})
      .limit(10);

    if (!bigTonError && bigTonTx && bigTonTx.length > 0) {
      console.log(`💰 Найдено крупных TON транзакций: ${bigTonTx.length}`);
      bigTonTx.forEach((tx, idx) => {
        console.log(`   ${idx + 1}. [${tx.created_at}] ${tx.type}`);
        console.log(`      Amount TON: ${tx.amount_ton}, Amount: ${tx.amount}`);
        console.log(`      Description: ${tx.description}`);
        console.log(`      Status: ${tx.status}`);
      });
    } else {
      console.log('❌ Крупных TON транзакций не найдено');
    }

    // 5. Проверка системных различий
    console.log('\n5️⃣ СИСТЕМНЫЕ РАЗЛИЧИЯ:');
    
    // Проверяем есть ли дублирующие записи
    const { data: duplicateCheck, error: dupError } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('telegram_id', user251?.telegram_id)
      .order('id', { ascending: true });

    if (!dupError && duplicateCheck && duplicateCheck.length > 1) {
      console.log(`🚨 НАЙДЕНЫ ДУБЛИРУЮЩИЕ АККАУНТЫ: ${duplicateCheck.length} с Telegram ID ${user251?.telegram_id}`);
    } else {
      console.log('✅ Дублирующих аккаунтов не найдено');
    }

    // 6. Анализ паттернов успешных и неуспешных аккаунтов
    console.log('\n6️⃣ ПАТТЕРНЫ УСПЕШНЫХ VS НЕУСПЕШНЫХ АККАУНТОВ:');
    
    const { data: allTonUsers, error: allTonError } = await supabase
      .from('users')
      .select('id, created_at, ton_wallet_address, balance_ton, ton_boost_active')
      .gt('balance_ton', 0);

    if (!allTonError && allTonUsers) {
      const successful = allTonUsers.filter(u => u.ton_boost_active && u.balance_ton > 0);
      const problematic = allTonUsers.filter(u => !u.ton_boost_active && u.balance_ton > 0);
      
      console.log(`✅ Успешных аккаунтов: ${successful.length}`);
      console.log(`❌ Проблемных аккаунтов: ${problematic.length}`);
      
      if (problematic.length > 0) {
        console.log('\n🚨 ПРОБЛЕМНЫЕ АККАУНТЫ:');
        problematic.forEach(user => {
          console.log(`   User ${user.id}: ${user.balance_ton} TON, boost: ${user.ton_boost_active}`);
          console.log(`     Wallet: ${user.ton_wallet_address || 'НЕТ'}`);
          console.log(`     Создан: ${user.created_at}`);
        });
      }
    }

    // 7. Итоговый диагноз аномалий
    console.log('\n7️⃣ ДИАГНОЗ АНОМАЛИЙ:');
    
    console.log('\n🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ АНОМАЛЬНОГО ПОВЕДЕНИЯ:');
    console.log('   1. Проблемы с TON Connect интеграцией для конкретных кошельков');
    console.log('   2. Различия в формате TON адресов (0: vs EQ vs UQ)');
    console.log('   3. Ошибки в scheduler\'ах при обработке конкретных пользователей');
    console.log('   4. Проблемы с JWT токенами для определенных аккаунтов');
    console.log('   5. Дублирующие записи в базе данных');
    console.log('   6. Проблемы с транзакциями на blockchain уровне');

    console.log('\n📋 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:');
    console.log('   1. Проверить логи сервера на момент депозитов User 251');
    console.log('   2. Сравнить JWT токены работающих и проблемных аккаунтов');
    console.log('   3. Проверить TON Connect статус для проблемных кошельков');
    console.log('   4. Найти различия в обработке транзакций');
    console.log('   5. Создать тестовый депозит с логированием всех шагов');

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

diagnoseAccountAnomalies().catch(console.error);