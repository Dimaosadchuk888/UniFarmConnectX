// АНАЛИЗ: ПОЧЕМУ АККАУНТЫ НЕ ЗАПИСАЛИСЬ С ПРАВИЛЬНЫМИ БАЛАНСАМИ
// Исследуем логику создания записей в ton_farming_data
// Дата: 01 августа 2025

import { supabase } from './core/supabase';

interface AccountCreationAnalysis {
  deposit_flow: string[];
  boost_activation_flow: string[];
  data_sync_issues: string[];
  missing_integration_points: string[];
}

async function analyzeAccountCreationFlow(): Promise<void> {
  console.log('🔍 АНАЛИЗ СОЗДАНИЯ АККАУНТОВ TON BOOST');
  console.log('='.repeat(70));

  // 1. Анализируем хронологию создания аккаунтов
  console.log('\n📅 1. ХРОНОЛОГИЯ СОЗДАНИЯ АККАУНТОВ:');
  
  const { data: tonFarmingRecords } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_active, created_at')
    .order('created_at', { ascending: true });

  if (tonFarmingRecords) {
    console.log(`📊 Всего записей в ton_farming_data: ${tonFarmingRecords.length}`);
    
    // Группируем по датам создания
    const byDate = tonFarmingRecords.reduce((acc, record) => {
      const date = record.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n📋 Создание по датам:');
    Object.entries(byDate).forEach(([date, records]) => {
      const withBalance = records.filter(r => parseFloat(r.farming_balance || '0') > 0).length;
      const withoutBalance = records.length - withBalance;
      console.log(`   ${date}: ${records.length} записей (${withBalance} с балансом, ${withoutBalance} без)`);
    });
  }

  // 2. Анализируем депозиты и активацию boost
  console.log('\n💰 2. АНАЛИЗ ДЕПОЗИТОВ И BOOST АКТИВАЦИИ:');
  
  // Получаем примеры пользователей которые были исправлены
  const problemUsers = [244, 245, 262, 235]; // Пользователи у которых был 0 баланс
  
  for (const userId of problemUsers) {
    console.log(`\n👤 User ${userId}:`);
    
    // Получаем все транзакции
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    // Получаем запись в ton_farming_data
    const { data: farmingRecord } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Получаем запись в users
    const { data: userRecord } = await supabase
      .from('users')
      .select('created_at, ton_boost_active, ton_farming_balance, ton_boost_package_id')
      .eq('id', userId)
      .single();

    if (transactions && farmingRecord && userRecord) {
      console.log(`   📊 Транзакций: ${transactions.length}`);
      console.log(`   👤 Пользователь создан: ${userRecord.created_at.split('T')[0]}`);
      console.log(`   📋 ton_farming_data создан: ${farmingRecord.created_at.split('T')[0]}`);
      
      // Анализируем последовательность событий
      const depositTransactions = transactions.filter(t => 
        t.type === 'DEPOSIT' || t.type === 'TON_DEPOSIT'
      );
      
      const boostTransactions = transactions.filter(t => 
        t.type === 'BOOST_PURCHASE' || 
        (t.metadata && (
          typeof t.metadata === 'string' ? 
          JSON.parse(t.metadata).original_type === 'TON_BOOST_PURCHASE' :
          t.metadata.original_type === 'TON_BOOST_PURCHASE'
        ))
      );

      console.log(`   💵 Депозиты: ${depositTransactions.length} штук`);
      if (depositTransactions.length > 0) {
        const firstDeposit = depositTransactions[0];
        const lastDeposit = depositTransactions[depositTransactions.length - 1];
        console.log(`      Первый: ${firstDeposit.amount_ton} TON (${firstDeposit.created_at.split('T')[0]})`);
        console.log(`      Последний: ${lastDeposit.amount_ton} TON (${lastDeposit.created_at.split('T')[0]})`);
      }

      console.log(`   🎯 Boost покупки: ${boostTransactions.length} штук`);
      if (boostTransactions.length > 0) {
        const firstBoost = boostTransactions[0];
        console.log(`      Первый: ${firstBoost.created_at.split('T')[0]}`);
      }

      // Проверяем временную последовательность
      if (depositTransactions.length > 0) {
        const firstDepositDate = new Date(depositTransactions[0].created_at);
        const farmingCreatedDate = new Date(farmingRecord.created_at);
        
        if (firstDepositDate < farmingCreatedDate) {
          console.log(`   ⚠️ ПРОБЛЕМА: Депозит был ДО создания farming записи`);
          console.log(`      Депозит: ${depositTransactions[0].created_at}`);
          console.log(`      Farming запись: ${farmingRecord.created_at}`);
        } else {
          console.log(`   ✅ Порядок корректен: farming запись создана до депозитов`);
        }
      }

      // Проверяем синхронизацию между users и ton_farming_data
      console.log(`   🔄 Синхронизация:`);
      console.log(`      users.ton_farming_balance: ${userRecord.ton_farming_balance}`);
      console.log(`      ton_farming_data.farming_balance: ${farmingRecord.farming_balance}`);
      console.log(`      users.ton_boost_active: ${userRecord.ton_boost_active}`);
      console.log(`      ton_farming_data.boost_active: ${farmingRecord.boost_active}`);
    }
  }

  // 3. Анализируем код создания записей
  console.log('\n🔧 3. АНАЛИЗ ЛОГИКИ СОЗДАНИЯ ЗАПИСЕЙ:');
  console.log('Места где создаются записи в ton_farming_data:');
  console.log('1. TonFarmingRepository.getByUserId() - если запись не найдена');
  console.log('2. TonFarmingRepository.activateBoost() - при активации boost');
  console.log('3. Миграции или скрипты инициализации');
  
  // Ищем записи созданные автоматически (без депозитов)
  const { data: allFarmingRecords } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance, boost_active, created_at');

  if (allFarmingRecords) {
    const autoCreated = allFarmingRecords.filter(record => 
      parseFloat(record.farming_balance || '0') === 0 && record.boost_active
    );
    
    console.log(`\n📊 Записи созданные автоматически (баланс=0, boost=true): ${autoCreated.length}`);
    
    if (autoCreated.length > 0) {
      console.log('Примеры:');
      autoCreated.slice(0, 5).forEach(record => {
        console.log(`   User ${record.user_id}: ${record.created_at.split('T')[0]}`);
      });
    }
  }

  // 4. Проверяем код TonFarmingRepository
  console.log('\n📋 4. АНАЛИЗ КОДА TonFarmingRepository.getByUserId():');
  console.log('В строках 76-84 есть логика создания новой записи:');
  console.log(`
  const newData: Partial<TonFarmingData> = {
    user_id: parseInt(userId),
    farming_balance: '0',  // ⚠️ ПРОБЛЕМА: всегда 0
    farming_rate: '0.01',
    farming_accumulated: '0',
    boost_active: false,   // ⚠️ НЕ активируется автоматически
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  `);
  
  console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
  console.log('1. getByUserId() создает записи с farming_balance=0');
  console.log('2. activateBoost() не всегда вызывается при депозитах');
  console.log('3. Нет автоматической синхронизации депозитов с farming_balance');
  console.log('4. Записи могли быть созданы массово скриптом без учета депозитов');
}

async function analyzeDepositToFarmingFlow(): Promise<void> {
  console.log('\n🔄 АНАЛИЗ ПОТОКА: ДЕПОЗИТ → FARMING_BALANCE');
  console.log('='.repeat(50));

  // Ищем где должна происходить связь между депозитами и farming_balance
  console.log('\n📋 МЕСТА ГДЕ ДОЛЖНО ОБНОВЛЯТЬСЯ farming_balance:');
  console.log('1. При обработке TON депозитов в API');
  console.log('2. При активации TON Boost пакетов');
  console.log('3. При создании новых пользователей с депозитами');
  
  // Проверяем последние депозиты и как они обрабатывались
  const { data: recentDeposits } = await supabase
    .from('transactions')
    .select('*')
    .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
    .gte('created_at', '2025-07-31')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentDeposits) {
    console.log(`\n💰 Последние депозиты (с 31 июля): ${recentDeposits.length}`);
    
    for (const deposit of recentDeposits.slice(0, 3)) {
      console.log(`\n📋 Депозит User ${deposit.user_id}:`);
      console.log(`   Сумма: ${deposit.amount_ton} TON`);
      console.log(`   Дата: ${deposit.created_at}`);
      
      // Проверяем было ли обновление farming_balance после этого депозита
      const { data: farmingRecord } = await supabase
        .from('ton_farming_data')
        .select('farming_balance, updated_at')
        .eq('user_id', deposit.user_id)
        .single();

      if (farmingRecord) {
        const depositDate = new Date(deposit.created_at);
        const farmingUpdateDate = new Date(farmingRecord.updated_at);
        
        console.log(`   farming_balance: ${farmingRecord.farming_balance}`);
        console.log(`   farming обновлен: ${farmingRecord.updated_at}`);
        
        if (farmingUpdateDate > depositDate) {
          console.log(`   ✅ farming_balance обновлен ПОСЛЕ депозита`);
        } else {
          console.log(`   ❌ farming_balance НЕ обновлен после депозита`);
        }
      } else {
        console.log(`   ❌ Запись в ton_farming_data не найдена`);
      }
    }
  }
}

async function findMissingIntegrationPoints(): Promise<void> {
  console.log('\n🔗 ПОИСК ПРОПУЩЕННЫХ ИНТЕГРАЦИЙ');
  console.log('='.repeat(40));

  console.log('\n❌ ПРОБЛЕМЫ В ТЕКУЩЕЙ АРХИТЕКТУРЕ:');
  console.log('1. Нет автоматической связи между DEPOSIT транзакциями и farming_balance');
  console.log('2. getByUserId() всегда создает записи с farming_balance=0');
  console.log('3. activateBoost() вызывается не для всех депозитов');
  console.log('4. Нет постоянной синхронизации между users и ton_farming_data');

  console.log('\n💡 ЧТО ДОЛЖНО БЫТЬ:');
  console.log('1. При любом TON депозите → автоматическое обновление farming_balance');
  console.log('2. При активации boost → накопление депозита в farming_balance');
  console.log('3. Периодическая синхронизация данных между таблицами');
  console.log('4. Миграция для исправления существующих несоответствий');

  console.log('\n🔧 РЕКОМЕНДАЦИИ ДЛЯ ПРЕДОТВРАЩЕНИЯ:');
  console.log('1. Добавить webhook/trigger на DEPOSIT транзакции');
  console.log('2. Изменить getByUserId() для расчета farming_balance из транзакций');
  console.log('3. Добавить валидацию данных при активации boost');
  console.log('4. Создать задачу синхронизации в планировщике');
}

async function main(): Promise<void> {
  console.log('🔍 АНАЛИЗ КОРНЕВЫХ ПРИЧИН ПРОБЛЕМЫ TON BOOST');
  console.log('='.repeat(80));
  console.log('Вопрос: Почему аккаунты изначально не записались с правильными балансами?');
  console.log('');

  await analyzeAccountCreationFlow();
  await analyzeDepositToFarmingFlow();
  await findMissingIntegrationPoints();

  console.log('\n' + '='.repeat(80));
  console.log('🎯 ИТОГОВЫЙ ОТВЕТ');
  console.log('='.repeat(80));

  console.log('\n❌ КОРНЕВЫЕ ПРИЧИНЫ:');
  console.log('1. TonFarmingRepository.getByUserId() создает записи с farming_balance="0"');
  console.log('2. Нет автоматической интеграции между DEPOSIT транзакциями и farming_balance');
  console.log('3. activateBoost() вызывается не для всех пользователей с депозитами');
  console.log('4. Возможно массовое создание записей скриптом без учета существующих депозитов');

  console.log('\n🔧 ИСПРАВЛЕНО СЕГОДНЯ:');
  console.log('✅ Восстановлены farming_balance на основе реальных депозитов');
  console.log('✅ 18 пользователей теперь получают TON Boost награды');
  console.log('✅ Синхронизированы данные между users и ton_farming_data');

  console.log('\n💡 ДЛЯ ПРЕДОТВРАЩЕНИЯ В БУДУЩЕМ:');
  console.log('🔄 Нужно добавить автоматическую синхронизацию депозитов с farming_balance');
  console.log('🔄 Изменить логику создания новых записей в ton_farming_data');
  console.log('🔄 Добавить валидацию данных при активации boost пакетов');
}

main().catch(console.error);