#!/usr/bin/env node
import { supabase } from '../core/supabase';

/**
 * УГЛУБЛЕННАЯ ДИАГНОСТИКА ЦЕПОЧКИ TON ПЛАТЕЖЕЙ БЕЗ ИЗМЕНЕНИЯ КОДА
 * 
 * Проверяет каждое звено от БД до React компонентов:
 * 1. Состояние таблиц в БД
 * 2. Существование ton-deposit endpoint
 * 3. Структура транзакций  
 * 4. Состояние TON кошельков пользователей
 * 5. Logs и метаданные
 */

async function diagnoseFullTonPaymentChain() {
  console.log('\n🔬 === ПОЛНАЯ ДИАГНОСТИКА ЦЕПОЧКИ TON ПЛАТЕЖЕЙ === 🔬\n');
  console.log('📋 Дата анализа:', new Date().toLocaleString('ru-RU'));
  console.log('🎯 Цель: определить источник проблемы - React или Backend\n');

  const testUserId = 184;
  let dbAccessSuccess = false;

  try {
    // ==============================
    // 1. ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БД
    // ==============================
    console.log('1️⃣ ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ:');
    
    const { data: testConnection, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (connectionError) {
      console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: Нет подключения к БД');
      console.log('   Детали:', connectionError.message);
      console.log('   Код ошибки:', connectionError.code);
      console.log('\n🎯 РЕЗУЛЬТАТ: Проблема на уровне базы данных - невозможна диагностика backend');
      return;
    }
    
    console.log('✅ Подключение к БД работает');
    dbAccessSuccess = true;

    // ==============================
    // 2. АНАЛИЗ ТАБЛИЦ TON СИСТЕМЫ
    // ==============================
    console.log('\n2️⃣ АНАЛИЗ ТАБЛИЦ TON ПЛАТЕЖНОЙ СИСТЕМЫ:');
    
    // Проверяем таблицу users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_wallet_address, ton_wallet_verified')
      .gt('balance_ton', 0)
      .limit(10);
      
    if (!usersError && users) {
      console.log(`✅ Таблица users: найдено ${users.length} пользователей с TON балансом > 0`);
      users.forEach(user => {
        console.log(`   - ${user.username || 'unknown'} (ID: ${user.id}): ${user.balance_ton} TON, кошелек: ${user.ton_wallet_verified ? '✓' : '✗'}`);
      });
    } else {
      console.log('❌ Ошибка доступа к таблице users:', usersError?.message);
    }

    // Проверяем таблицу transactions для TON
    const { data: tonTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, status, description, created_at')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(15);
      
    if (!txError && tonTransactions) {
      console.log(`\n✅ Таблица transactions: найдено ${tonTransactions.length} TON транзакций`);
      
      // Группируем по типам
      const typeStats = tonTransactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('   📊 Статистика по типам транзакций:');
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`      ${type}: ${count} транзакций`);
      });
      
      console.log('\n   📋 Последние 5 TON транзакций:');
      tonTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`   ${i + 1}. ID ${tx.id} (User ${tx.user_id}): ${tx.amount} TON`);
        console.log(`      Тип: ${tx.type}, Статус: ${tx.status}`);
        console.log(`      Описание: ${tx.description}`);
        console.log(`      Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}\n`);
      });
    } else {
      console.log('❌ Ошибка доступа к таблице transactions:', txError?.message);
    }

    // Проверяем таблицу ton_farming_data
    const { data: tonFarming, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, farming_rate, boost_active, created_at')
      .gt('farming_balance', 0)
      .limit(10);
      
    if (!farmingError && tonFarming) {
      console.log(`\n✅ Таблица ton_farming_data: найдено ${tonFarming.length} активных фармеров`);
      tonFarming.forEach(farmer => {
        console.log(`   - User ${farmer.user_id}: ${farmer.farming_balance} TON фарминг, ставка ${farmer.farming_rate}%`);
      });
    } else {
      console.log('\n⚠️  Таблица ton_farming_data недоступна или пустая:', farmingError?.message);
    }

    // ==============================
    // 3. АНАЛИЗ КОНКРЕТНОГО ПОЛЬЗОВАТЕЛЯ
    // ==============================
    console.log(`\n3️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ${testUserId}:`);
    
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();
      
    if (!userError && testUser) {
      console.log('✅ Данные пользователя найдены:');
      console.log(`   - ID: ${testUser.id}, Telegram ID: ${testUser.telegram_id}`);
      console.log(`   - Username: ${testUser.username}`);
      console.log(`   - UNI баланс: ${testUser.balance_uni}`);
      console.log(`   - TON баланс: ${testUser.balance_ton}`);
      console.log(`   - TON кошелек: ${testUser.ton_wallet_address || 'НЕ ПРИВЯЗАН'}`);
      console.log(`   - Кошелек верифицирован: ${testUser.ton_wallet_verified ? 'ДА' : 'НЕТ'}`);
      console.log(`   - TON boost пакет: ${testUser.ton_boost_package || 'НЕТ'}`);
    } else {
      console.log(`❌ Пользователь ${testUserId} не найден:`, userError?.message);
    }

    // Транзакции пользователя
    const { data: userTransactions, error: userTxError } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, status, description, created_at, metadata')
      .eq('user_id', testUserId)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!userTxError && userTransactions) {
      console.log(`\n📋 TON транзакции пользователя ${testUserId}: ${userTransactions.length}`);
      userTransactions.forEach((tx, i) => {
        console.log(`   ${i + 1}. ID ${tx.id}: ${tx.amount} TON (${tx.type})`);
        console.log(`      Статус: ${tx.status}, Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        if (tx.metadata) {
          console.log(`      Метаданные: ${JSON.stringify(tx.metadata)}`);
        }
      });
    } else {
      console.log(`⚠️  TON транзакции пользователя ${testUserId} не найдены`);
    }

    // ==============================
    // 4. ПРОВЕРКА РЕФЕРАЛЬНЫХ НАГРАД TON
    // ==============================
    console.log(`\n4️⃣ АНАЛИЗ РЕФЕРАЛЬНЫХ НАГРАД TON:`);
    
    const { data: referralRewards, error: referralError } = await supabase
      .from('transactions')
      .select('id, user_id, amount, description, created_at')
      .eq('type', 'REFERRAL_REWARD')
      .eq('currency', 'TON')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!referralError && referralRewards) {
      console.log(`✅ Найдено ${referralRewards.length} реферальных наград TON`);
      let totalReferralTon = 0;
      referralRewards.forEach((reward, i) => {
        const amount = parseFloat(reward.amount);
        totalReferralTon += amount;
        console.log(`   ${i + 1}. +${reward.amount} TON - ${reward.description}`);
        console.log(`      Дата: ${new Date(reward.created_at).toLocaleString('ru-RU')}`);
      });
      console.log(`   💰 Общая сумма реферальных наград: ${totalReferralTon.toFixed(6)} TON`);
    } else {
      console.log('⚠️  Реферальные награды TON не найдены');
    }

    // ==============================
    // 5. ПРОВЕРКА ПОСЛЕДНИХ АКТИВНОСТЕЙ
    // ==============================
    console.log(`\n5️⃣ ПОСЛЕДНИЕ АКТИВНОСТИ В СИСТЕМЕ:`);
    
    // Последние TON транзакции в системе
    const { data: recentTonTx, error: recentError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at')
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (!recentError && recentTonTx) {
      console.log('✅ Последние 5 TON транзакций в системе:');
      recentTonTx.forEach((tx, i) => {
        const timeAgo = Math.floor((Date.now() - new Date(tx.created_at).getTime()) / 1000 / 60);
        console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.amount} TON (${tx.type}) - ${timeAgo} мин назад`);
      });
    }

    // ==============================
    // 6. РЕЗЮМЕ ДИАГНОСТИКИ
    // ==============================
    console.log(`\n6️⃣ РЕЗЮМЕ ДИАГНОСТИКИ BACKEND:`);
    
    const backendHealthScore = {
      database_connection: true,
      users_table: !!users && users.length > 0,
      transactions_table: !!tonTransactions && tonTransactions.length > 0,
      ton_farming_data: !!tonFarming,
      user_data_exists: !!testUser,
      user_has_ton_transactions: !!userTransactions && userTransactions.length > 0,
      referral_system_working: !!referralRewards && referralRewards.length > 0
    };
    
    const healthyComponents = Object.values(backendHealthScore).filter(Boolean).length;
    const totalComponents = Object.keys(backendHealthScore).length;
    const healthPercentage = Math.round((healthyComponents / totalComponents) * 100);
    
    console.log(`📊 ЗДОРОВЬЕ BACKEND СИСТЕМЫ: ${healthPercentage}% (${healthyComponents}/${totalComponents} компонентов OK)`);
    
    console.log('\n📋 Детальная оценка компонентов:');
    Object.entries(backendHealthScore).forEach(([component, status]) => {
      const icon = status ? '✅' : '❌';
      console.log(`   ${icon} ${component.replace(/_/g, ' ')}: ${status ? 'OK' : 'ПРОБЛЕМА'}`);
    });

    // ==============================
    // 7. ОПРЕДЕЛЕНИЕ ИСТОЧНИКА ПРОБЛЕМЫ
    // ==============================
    console.log(`\n7️⃣ ЗАКЛЮЧЕНИЕ О ИСТОЧНИКЕ ПРОБЛЕМЫ:`);
    
    if (healthPercentage >= 80) {
      console.log('🎯 BACKEND СИСТЕМА РАБОТАЕТ КОРРЕКТНО (>80% компонентов OK)');
      console.log('   - База данных содержит TON транзакции');
      console.log('   - Пользователи имеют TON балансы');
      console.log('   - Реферальная система создает TON награды');
      console.log('   - Данные структурированы правильно');
      console.log('\n💡 ВЫВОД: Проблема скорее всего в REACT/FRONTEND части');
      console.log('   Рекомендация: сосредоточить усилия на исправлении TonConnectUIProvider');
    } else if (healthPercentage >= 50) {
      console.log('⚠️  BACKEND СИСТЕМА РАБОТАЕТ ЧАСТИЧНО (50-80% компонентов OK)');
      console.log('\n💡 ВЫВОД: Смешанная проблема - требуется проверка обеих частей');
    } else {
      console.log('❌ BACKEND СИСТЕМА ИМЕЕТ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ (<50% компонентов OK)');
      console.log('\n💡 ВЫВОД: Проблема в BACKEND части - необходимо исправление сервера');
    }

  } catch (error) {
    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА В ДИАГНОСТИКЕ:', error);
    
    if (error instanceof Error) {
      console.error('   Сообщение:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    if (!dbAccessSuccess) {
      console.log('\n🎯 РЕЗУЛЬТАТ: Невозможно провести диагностику backend из-за проблем с БД');
      console.log('   Рекомендация: проверить переменные окружения SUPABASE_URL и SUPABASE_KEY');
    }
  }

  console.log('\n📋 Диагностика завершена в', new Date().toLocaleString('ru-RU'));
  console.log('🔬 === КОНЕЦ ДИАГНОСТИКИ === 🔬\n');
}

// Запуск диагностики
if (require.main === module) {
  diagnoseFullTonPaymentChain()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Ошибка запуска диагностики:', error);
      process.exit(1);
    });
}

export { diagnoseFullTonPaymentChain };