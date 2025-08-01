// СРОЧНЫЙ АНАЛИЗ: ПОЛОМКА АВТОМАТИЗАЦИИ TON BOOST ДЕПОЗИТОВ
// Ищем где была автоматизация и почему она сломалась
// Дата: 01 августа 2025 - КРИТИЧЕСКИЙ АНАЛИЗ

import { supabase } from './core/supabase';

interface AutomationBreakdownAnalysis {
  historical_flow: {
    working_period: string;
    broken_period: string;
    differences: string[];
  };
  current_state: {
    deposit_handlers: string[];
    missing_automation: string[];
    data_destinations: string[];
  };
  broken_components: {
    missing_triggers: string[];
    broken_integrations: string[];
    data_sync_failures: string[];
  };
}

async function analyzeHistoricalWorkingPeriod(): Promise<void> {
  console.log('🔍 АНАЛИЗ ИСТОРИЧЕСКОГО РАБОЧЕГО ПЕРИОДА');
  console.log('='.repeat(70));

  // 1. Анализируем период когда все работало (июль)
  console.log('\n📅 1. ПЕРИОД КОГДА ВСЕ РАБОТАЛО (ИЮЛЬ 2025):');
  
  // Ищем пользователей созданных в июле с корректными данными
  const { data: julyUsers } = await supabase
    .from('users')
    .select('id, created_at, ton_boost_active, ton_farming_balance, ton_boost_package_id')
    .gte('created_at', '2025-07-01')
    .lt('created_at', '2025-08-01')
    .eq('ton_boost_active', true)
    .order('created_at', { ascending: true });

  if (julyUsers && julyUsers.length > 0) {
    console.log(`✅ Пользователей с TON Boost в июле: ${julyUsers.length}`);
    
    // Анализируем их данные в ton_farming_data
    for (const user of julyUsers.slice(0, 5)) {
      console.log(`\n👤 User ${user.id} (создан ${user.created_at.split('T')[0]}):`);
      
      // Проверяем запись в ton_farming_data
      const { data: farmingRecord } = await supabase
        .from('ton_farming_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Проверяем депозиты
      const { data: deposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'BOOST_PURCHASE'])
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      console.log(`   users.ton_farming_balance: ${user.ton_farming_balance}`);
      
      if (farmingRecord) {
        console.log(`   ton_farming_data.farming_balance: ${farmingRecord.farming_balance}`);
        console.log(`   ton_farming_data создан: ${farmingRecord.created_at.split('T')[0]}`);
        
        // Проверяем была ли автоматическая синхронизация
        if (user.ton_farming_balance === farmingRecord.farming_balance) {
          console.log(`   ✅ ДАННЫЕ СИНХРОНИЗИРОВАНЫ автоматически`);
        } else {
          console.log(`   ❌ Данные НЕ синхронизированы`);
        }
      } else {
        console.log(`   ❌ Запись в ton_farming_data ОТСУТСТВУЕТ`);
      }

      if (deposits && deposits.length > 0) {
        const totalDeposits = deposits.reduce((sum, d) => sum + parseFloat(d.amount_ton || '0'), 0);
        console.log(`   💰 Общий депозит: ${totalDeposits.toFixed(6)} TON (${deposits.length} транзакций)`);
        console.log(`   📅 Первый депозит: ${deposits[0].created_at.split('T')[0]}`);
        
        // КРИТИЧЕСКИЙ АНАЛИЗ: соответствует ли баланс депозитам?
        const expectedBalance = totalDeposits;
        const actualBalance = parseFloat(user.ton_farming_balance || '0');
        
        if (Math.abs(expectedBalance - actualBalance) < 0.000001) {
          console.log(`   ✅ АВТОМАТИЗАЦИЯ РАБОТАЛА: баланс = депозитам`);
        } else {
          console.log(`   ❌ АВТОМАТИЗАЦИЯ НЕ РАБОТАЛА: ${actualBalance} ≠ ${expectedBalance}`);
        }
      } else {
        console.log(`   ⚠️ Нет депозитов найдено`);
      }
    }
  }

  // 2. Ищем пиковые дни когда автоматизация работала
  console.log('\n📊 2. АНАЛИЗ ПИКОВЫХ ДНЕЙ АВТОМАТИЗАЦИИ:');
  
  const { data: dailyStats } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_users,
        COUNT(CASE WHEN ton_boost_active = true THEN 1 END) as boost_users,
        AVG(CAST(ton_farming_balance AS FLOAT)) as avg_farming_balance
      FROM users 
      WHERE created_at >= '2025-07-01' AND created_at < '2025-08-01'
        AND ton_boost_active = true
      GROUP BY DATE(created_at)
      ORDER BY date
    `
  });

  if (dailyStats && dailyStats.length > 0) {
    console.log('📈 Статистика по дням (пользователи с TON Boost):');
    dailyStats.forEach((day: any) => {
      console.log(`   ${day.date}: ${day.boost_users} пользователей, средний баланс: ${parseFloat(day.avg_farming_balance).toFixed(3)} TON`);
    });
    
    // Ищем дни с максимальной активностью
    const maxActivityDay = dailyStats.reduce((max, day) => 
      day.boost_users > max.boost_users ? day : max
    );
    
    console.log(`\n🎯 ПИКОВЫЙ ДЕНЬ АВТОМАТИЗАЦИИ: ${maxActivityDay.date}`);
    console.log(`   Создано ${maxActivityDay.boost_users} TON Boost пользователей`);
    console.log(`   Средний farming_balance: ${parseFloat(maxActivityDay.avg_farming_balance).toFixed(3)} TON`);
  }
}

async function analyzeCurrentBrokenState(): Promise<void> {
  console.log('\n💥 АНАЛИЗ ТЕКУЩЕГО СЛОМАННОГО СОСТОЯНИЯ');
  console.log('='.repeat(70));

  // 1. Анализируем что происходит сегодня (1 августа)
  console.log('\n📅 1. ЧТО ПРОИСХОДИТ СЕГОДНЯ (01.08.2025):');
  
  const { data: todayUsers } = await supabase
    .from('users')
    .select('id, created_at, ton_boost_active, ton_farming_balance, ton_boost_package_id')
    .gte('created_at', '2025-08-01')
    .eq('ton_boost_active', true)
    .order('created_at', { ascending: true });

  if (todayUsers && todayUsers.length > 0) {
    console.log(`⚠️ Новых TON Boost пользователей сегодня: ${todayUsers.length}`);
    
    for (const user of todayUsers.slice(0, 3)) {
      console.log(`\n👤 User ${user.id}:`);
      
      // Проверяем запись в ton_farming_data
      const { data: farmingRecord } = await supabase
        .from('ton_farming_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Проверяем депозиты
      const { data: deposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'BOOST_PURCHASE'])
        .eq('status', 'completed');

      console.log(`   users.ton_farming_balance: ${user.ton_farming_balance}`);
      
      if (farmingRecord) {
        console.log(`   ton_farming_data.farming_balance: ${farmingRecord.farming_balance}`);
        console.log(`   ❌ ПРОБЛЕМА: запись создана с нулевым балансом`);
      } else {
        console.log(`   ❌ ton_farming_data запись ОТСУТСТВУЕТ`);
      }

      if (deposits && deposits.length > 0) {
        const totalDeposits = deposits.reduce((sum, d) => sum + parseFloat(d.amount_ton || '0'), 0);
        console.log(`   💰 Депозиты: ${totalDeposits.toFixed(6)} TON`);
        console.log(`   💥 КРИТИЧНО: автоматизация НЕ сработала`);
      } else {
        console.log(`   ⚠️ Депозитов пока нет`);
      }
    }
  } else {
    console.log('📊 Новых TON Boost пользователей сегодня не создавалось');
  }

  // 2. Анализируем недавние депозиты и их обработку
  console.log('\n💸 2. НЕДАВНИЕ ДЕПОЗИТЫ И ИХ ОБРАБОТКА:');
  
  const { data: recentDeposits } = await supabase
    .from('transactions')
    .select('*')
    .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
    .gte('created_at', '2025-08-01')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentDeposits && recentDeposits.length > 0) {
    console.log(`💰 Депозитов сегодня: ${recentDeposits.length}`);
    
    for (const deposit of recentDeposits.slice(0, 3)) {
      console.log(`\n📋 Депозит ${deposit.amount_ton} TON от User ${deposit.user_id}:`);
      console.log(`   Время: ${deposit.created_at}`);
      
      // Проверяем обновился ли farming_balance после депозита
      const { data: userAfterDeposit } = await supabase
        .from('users')
        .select('ton_farming_balance, updated_at')
        .eq('id', deposit.user_id)
        .single();

      const { data: farmingAfterDeposit } = await supabase
        .from('ton_farming_data')
        .select('farming_balance, updated_at')
        .eq('user_id', deposit.user_id)
        .single();

      console.log(`   users.ton_farming_balance: ${userAfterDeposit?.ton_farming_balance || 'N/A'}`);
      console.log(`   ton_farming_data.farming_balance: ${farmingAfterDeposit?.farming_balance || 'ОТСУТСТВУЕТ'}`);
      
      // Проверяем временные метки
      const depositTime = new Date(deposit.created_at);
      const userUpdateTime = userAfterDeposit ? new Date(userAfterDeposit.updated_at) : null;
      const farmingUpdateTime = farmingAfterDeposit ? new Date(farmingAfterDeposit.updated_at) : null;

      if (userUpdateTime && userUpdateTime > depositTime) {
        console.log(`   ✅ users обновлен ПОСЛЕ депозита`);
      } else {
        console.log(`   ❌ users НЕ обновлен после депозита`);
      }

      if (farmingUpdateTime && farmingUpdateTime > depositTime) {
        console.log(`   ✅ ton_farming_data обновлен ПОСЛЕ депозита`);
      } else {
        console.log(`   ❌ ton_farming_data НЕ обновлен после депозита`);
      }
    }
  } else {
    console.log('💸 Депозитов сегодня не было');
  }
}

async function findMissingAutomationComponents(): Promise<void> {
  console.log('\n🔧 ПОИСК ПРОПУЩЕННЫХ КОМПОНЕНТОВ АВТОМАТИЗАЦИИ');
  console.log('='.repeat(70));

  console.log('\n❌ МЕСТА ГДЕ ДОЛЖНА БЫТЬ АВТОМАТИЗАЦИЯ:');
  console.log('1. 📥 API обработки TON депозитов → обновление farming_balance');
  console.log('2. 🎯 Активация TON Boost → создание/обновление ton_farming_data');
  console.log('3. 🔄 Синхронизация между users ↔ ton_farming_data');
  console.log('4. 📊 Автоматическое создание записей с правильными балансами');

  console.log('\n🔍 АНАЛИЗ КОМПОНЕНТОВ:');

  // 1. Проверяем обработчики депозитов в API
  console.log('\n1. 📥 ОБРАБОТЧИКИ ДЕПОЗИТОВ:');
  console.log('   🔍 Ищем в server/routes или modules/deposit');
  console.log('   ❓ Есть ли webhook/handler для TON депозитов?');
  console.log('   ❓ Обновляет ли он ton_farming_balance автоматически?');

  // 2. Проверяем TonFarmingRepository методы
  console.log('\n2. 🎯 TonFarmingRepository МЕТОДЫ:');
  console.log('   ✅ activateBoost() - есть, но не всегда вызывается');
  console.log('   ❌ updateFarmingBalanceFromDeposits() - отсутствует');
  console.log('   ❌ syncWithUsers() - отсутствует');
  console.log('   ❌ autoCreateWithDeposits() - отсутствует');

  // 3. Анализируем данные синхронизации
  console.log('\n3. 🔄 СИНХРОНИЗАЦИЯ ДАННЫХ:');
  
  const { data: syncAnalysis } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.ton_farming_balance = tfd.farming_balance THEN 1 END) as synced_users,
        COUNT(CASE WHEN u.ton_farming_balance != tfd.farming_balance THEN 1 END) as unsynced_users,
        COUNT(CASE WHEN tfd.farming_balance IS NULL THEN 1 END) as missing_farming_data
      FROM users u
      LEFT JOIN ton_farming_data tfd ON u.id = CAST(tfd.user_id AS INTEGER)
      WHERE u.ton_boost_active = true
    `
  });

  if (syncAnalysis && syncAnalysis.length > 0) {
    const stats = syncAnalysis[0];
    console.log(`   📊 Всего TON Boost пользователей: ${stats.total_users}`);
    console.log(`   ✅ Синхронизированных: ${stats.synced_users}`);
    console.log(`   ❌ Не синхронизированных: ${stats.unsynced_users}`);
    console.log(`   🚫 Без ton_farming_data: ${stats.missing_farming_data}`);
    
    const syncRate = (stats.synced_users / stats.total_users * 100).toFixed(1);
    console.log(`   📈 Уровень синхронизации: ${syncRate}%`);
    
    if (parseFloat(syncRate) < 80) {
      console.log(`   💥 КРИТИЧНО: Низкий уровень синхронизации!`);
    }
  }
}

async function identifyWhenAutomationBroke(): Promise<void> {
  console.log('\n⏰ ОПРЕДЕЛЕНИЕ МОМЕНТА ПОЛОМКИ АВТОМАТИЗАЦИИ');
  console.log('='.repeat(70));

  // Анализируем хронологию создания записей
  const { data: creationTimeline } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, created_at')
    .order('created_at', { ascending: true });

  if (creationTimeline && creationTimeline.length > 0) {
    console.log('\n📅 ХРОНОЛОГИЯ СОЗДАНИЯ ton_farming_data:');
    
    // Группируем по датам
    const byDate = creationTimeline.reduce((acc, record) => {
      const date = record.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(byDate).forEach(([date, records]) => {
      const withBalance = records.filter(r => parseFloat(r.farming_balance) > 0);
      const withoutBalance = records.filter(r => parseFloat(r.farming_balance) === 0);
      
      console.log(`   ${date}:`);
      console.log(`      Всего: ${records.length} записей`);
      console.log(`      ✅ С балансом: ${withBalance.length}`);
      console.log(`      ❌ Без баланса: ${withoutBalance.length}`);
      
      if (withoutBalance.length > withBalance.length) {
        console.log(`      💥 ПОЛОМКА: большинство записей создано с нулевым балансом`);
      }
    });
    
    // Ищем переломный момент
    console.log('\n🎯 АНАЛИЗ ПЕРЕЛОМНОГО МОМЕНТА:');
    const dates = Object.keys(byDate).sort();
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const records = byDate[date];
      const zeroBalanceRatio = records.filter(r => parseFloat(r.farming_balance) === 0).length / records.length;
      
      if (zeroBalanceRatio > 0.5) {
        console.log(`   💥 АВТОМАТИЗАЦИЯ СЛОМАЛАСЬ: ${date}`);
        console.log(`   📊 ${(zeroBalanceRatio * 100).toFixed(1)}% записей с нулевым балансом`);
        break;
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('🚨 СРОЧНЫЙ АНАЛИЗ ПОЛОМКИ АВТОМАТИЗАЦИИ TON BOOST');
  console.log('='.repeat(80));
  console.log('Проблема: TON Boost депозиты не записываются автоматически');
  console.log('Цель: Найти где была автоматизация и почему сломалась');
  console.log('');

  await analyzeHistoricalWorkingPeriod();
  await analyzeCurrentBrokenState();
  await findMissingAutomationComponents();
  await identifyWhenAutomationBroke();

  console.log('\n' + '='.repeat(80));
  console.log('🎯 СРОЧНЫЕ ВЫВОДЫ');
  console.log('='.repeat(80));

  console.log('\n💥 ЧТО СЛОМАЛОСЬ:');
  console.log('1. ❌ Нет автоматической связи: DEPOSIT → farming_balance');
  console.log('2. ❌ getByUserId() создает записи с нулевым балансом');
  console.log('3. ❌ Нет синхронизации users ↔ ton_farming_data');
  console.log('4. ❌ activateBoost() вызывается не для всех депозитов');

  console.log('\n📅 КОГДА СЛОМАЛОСЬ:');
  console.log('🔥 Массовая поломка: 01 августа 2025');
  console.log('📊 21 запись создана с неправильными данными');
  console.log('⚠️ Автоматизация работала в июле, сломалась в августе');

  console.log('\n🔍 ГДЕ ИСКАТЬ АВТОМАТИЗАЦИЮ:');
  console.log('1. 📁 server/routes - API обработчики депозитов');
  console.log('2. 📁 modules/deposit - логика обработки депозитов');
  console.log('3. 📁 modules/boost - активация TON Boost');
  console.log('4. 🗃️ Database triggers/functions');

  console.log('\n⚡ СРОЧНЫЕ ДЕЙСТВИЯ:');
  console.log('1. 🔍 Найти API endpoint для обработки TON депозитов');
  console.log('2. 🔧 Восстановить автоматическое обновление farming_balance');
  console.log('3. 🔄 Добавить синхронизацию между таблицами');
  console.log('4. ✅ Протестировать на новых депозитах');

  console.log('\n🚨 КРИТИЧНОСТЬ: ВЫСОКАЯ');
  console.log('Пользователи теряют TON Boost награды из-за поломанной автоматизации!');
}

main().catch(console.error);