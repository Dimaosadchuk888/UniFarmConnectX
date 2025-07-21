const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wunnsvicbebssrjqedor.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY не найден в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseUser25TONBalance() {
  console.log('=== 🔍 ДИАГНОСТИКА TON БАЛАНСА USER 25 В PRODUCTION ===\n');

  try {
    // 1. Проверяем User 25
    console.log('1. 👤 ДАННЫЕ ПОЛЬЗОВАТЕЛЯ 25:');
    let { data: user25, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, balance_uni, created_at')
      .eq('id', 25)
      .single();
      
    if (userError) {
      console.log('❌ Ошибка получения User 25:', userError.message);
      
      // Попробуем найти по telegram_id из логов (425855744)
      console.log('\n🔍 Поиск пользователя по telegram_id 425855744:');
      const { data: userByTgId, error: tgError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', 425855744)
        .single();
        
      if (tgError) {
        console.log('❌ Пользователь с telegram_id 425855744 не найден:', tgError.message);
        return;
      } else {
        console.log('✅ Найден пользователь:', userByTgId);
        // Используем найденного пользователя
        user25 = userByTgId;
      }
    } else {
      console.log('✅ User 25 найден:', {
        id: user25.id,
        telegram_id: user25.telegram_id,
        username: user25.username,
        balance_ton: user25.balance_ton,
        balance_uni: user25.balance_uni,
        updated_at: user25.updated_at
      });
    }

    const userId = user25.id;
    
    // 2. Проверяем все TON транзакции
    console.log('\n2. 💰 ВСЕ TON ТРАНЗАКЦИИ USER ' + userId + ':');
    const { data: tonTransactions, error: tonTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (tonTxError) {
      console.log('❌ Ошибка получения TON транзакций:', tonTxError.message);
    } else {
      console.log(`📊 Найдено ${tonTransactions?.length || 0} TON транзакций:`);
      tonTransactions?.forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.id}`);
        console.log(`   💵 Сумма: ${tx.amount || tx.amount_ton || '0'} TON`);
        console.log(`   🏷️  Тип: ${tx.type}, Статус: ${tx.status}`);
        console.log(`   📅 Дата: ${tx.created_at}`);
        console.log(`   📝 Описание: ${tx.description || 'нет'}`);
        console.log(`   🔗 Metadata: ${tx.metadata ? JSON.stringify(tx.metadata) : 'нет'}`);
        console.log('');
      });
    }
    
    // 3. Все депозиты (DEPOSIT, TON_DEPOSIT)
    console.log('\n3. 📥 ВСЕ ДЕПОЗИТЫ USER ' + userId + ':');
    const { data: deposits, error: depositError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('type.eq.DEPOSIT,type.eq.TON_DEPOSIT,description.ilike.%deposit%')
      .order('created_at', { ascending: false });
      
    if (depositError) {
      console.log('❌ Ошибка получения депозитов:', depositError.message);
    } else {
      console.log(`📊 Найдено ${deposits?.length || 0} депозитов:`);
      deposits?.forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.id}`);
        console.log(`   💵 Сумма: ${tx.amount || tx.amount_ton || tx.amount_uni || '0'}`);
        console.log(`   💱 Валюта: ${tx.currency || 'неизвестно'}`);
        console.log(`   🏷️  Тип: ${tx.type}, Статус: ${tx.status}`);
        console.log(`   📅 Дата: ${tx.created_at}`);
        console.log(`   📝 Описание: ${tx.description || 'нет'}`);
        console.log('');
      });
    }
    
    // 4. Последние 10 транзакций любого типа
    console.log('\n4. 📋 ПОСЛЕДНИЕ 10 ТРАНЗАКЦИЙ USER ' + userId + ':');
    const { data: recentTx, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (recentError) {
      console.log('❌ Ошибка получения последних транзакций:', recentError.message);
    } else {
      console.log(`📊 Найдено ${recentTx?.length || 0} последних транзакций:`);
      recentTx?.forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.id}, ${tx.currency || 'UNI'}: ${tx.amount || tx.amount_ton || tx.amount_uni || '0'}`);
        console.log(`   🏷️  ${tx.type} (${tx.status}) - ${tx.created_at}`);
      });
    }
    
    // 5. Проверяем User 227 для сравнения
    console.log('\n5. 🔄 СРАВНЕНИЕ С USER 227:');
    const { data: user227, error: user227Error } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_ton, balance_uni')
      .eq('id', 227)
      .single();
      
    if (user227Error) {
      console.log('❌ User 227 не найден:', user227Error.message);
    } else {
      console.log('✅ User 227 данные:', {
        id: user227.id,
        telegram_id: user227.telegram_id,
        username: user227.username,
        balance_ton: user227.balance_ton,
        balance_uni: user227.balance_uni
      });
      
      // Проверим TON транзакции User 227
      const { data: user227Tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 227)
        .eq('currency', 'TON')
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log(`📊 User 227 имеет ${user227Tx?.length || 0} TON транзакций`);
    }
    
    // 6. Проверим активные сессии/данные пользователя
    console.log('\n6. 🔐 ПРОВЕРКА ДРУГИХ ДАННЫХ USER ' + userId + ':');
    
    // Проверим user_sessions
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log(`🔗 Активных сессий: ${sessions?.length || 0}`);
    sessions?.forEach(session => {
      console.log(`   📅 Сессия от ${session.created_at}, последняя активность: ${session.last_active || 'нет данных'}`);
    });

  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Запускаем диагностику
diagnoseUser25TONBalance().then(() => {
  console.log('\n=== ✅ ДИАГНОСТИКА ЗАВЕРШЕНА ===');
  process.exit(0);
}).catch(err => {
  console.error('❌ Ошибка выполнения:', err.message);
  process.exit(1);
});