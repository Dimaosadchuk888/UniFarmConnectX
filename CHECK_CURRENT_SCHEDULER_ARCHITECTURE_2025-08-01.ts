// АНАЛИЗ ТЕКУЩЕЙ АРХИТЕКТУРЫ ПЛАНИРОВЩИКОВ
// Проверяем как сейчас работают планировщики и к каким полям подключены
// Дата: 01 августа 2025
// БЕЗ ИЗМЕНЕНИЙ В КОДЕ - ТОЛЬКО АНАЛИЗ

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface SchedulerArchitectureAnalysis {
  tables: {
    users: any;
    ton_farming_data: any;
    ton_boost_purchases: any;
    transactions: any;
  };
  fields: {
    ton_boost_fields: string[];
    farming_fields: string[];
    missing_fields: string[];
  };
  schedulers: {
    uni_farming: any;
    ton_boost: any;
  };
  data_flow: {
    source_tables: string[];
    processing_logic: string[];
    output_transactions: string[];
  };
}

async function analyzeSchedulerArchitecture(): Promise<SchedulerArchitectureAnalysis> {
  console.log('🔧 АНАЛИЗ АРХИТЕКТУРЫ ПЛАНИРОВЩИКОВ');
  console.log('='.repeat(70));

  const analysis: SchedulerArchitectureAnalysis = {
    tables: {
      users: null,
      ton_farming_data: null,
      ton_boost_purchases: null,
      transactions: null
    },
    fields: {
      ton_boost_fields: [],
      farming_fields: [],
      missing_fields: []
    },
    schedulers: {
      uni_farming: null,
      ton_boost: null
    },
    data_flow: {
      source_tables: [],
      processing_logic: [],
      output_transactions: []
    }
  };

  // 1. АНАЛИЗ ТАБЛИЦЫ USERS - ОСНОВНОЙ ИСТОЧНИК ДАННЫХ
  try {
    console.log('\n📋 1. АНАЛИЗ ТАБЛИЦЫ USERS:');
    
    // Получаем структуру таблицы users
    const { data: userColumns, error: columnsError } = await supabase.rpc('get_table_columns', { table_name: 'users' }).single();
    
    if (columnsError) {
      // Fallback: получаем данные напрямую
      const { data: sampleUser } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleUser) {
        const fields = Object.keys(sampleUser);
        console.log(`✅ Поля в таблице users: ${fields.length} штук`);
        
        // Ищем TON Boost поля
        const tonBoostFields = fields.filter(f => 
          f.includes('ton_boost') || 
          f.includes('farming') && f.includes('ton') ||
          f.includes('ton_farming')
        );
        
        const farmingFields = fields.filter(f => 
          f.includes('farming') || 
          f.includes('uni_farming')
        );
        
        console.log(`🎯 TON Boost поля (${tonBoostFields.length}):`, tonBoostFields);
        console.log(`🌾 Farming поля (${farmingFields.length}):`, farmingFields);
        
        analysis.fields.ton_boost_fields = tonBoostFields;
        analysis.fields.farming_fields = farmingFields;
        analysis.tables.users = { field_count: fields.length, sample: sampleUser };
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка анализа таблицы users: ${error}`);
  }

  // 2. АНАЛИЗ ТАБЛИЦЫ TON_FARMING_DATA
  try {
    console.log('\n📊 2. АНАЛИЗ ТАБЛИЦЫ TON_FARMING_DATA:');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(5);

    if (farmingError) {
      console.log(`❌ Ошибка доступа к ton_farming_data: ${farmingError.message}`);
      if (farmingError.code === '42P01') {
        console.log(`⚠️ Таблица ton_farming_data НЕ СУЩЕСТВУЕТ`);
        analysis.tables.ton_farming_data = { exists: false, error: farmingError.message };
      }
    } else {
      console.log(`✅ Таблица ton_farming_data существует`);
      console.log(`📊 Записей в таблице: ${farmingData?.length || 0}`);
      
      if (farmingData && farmingData.length > 0) {
        const sampleRecord = farmingData[0];
        const fields = Object.keys(sampleRecord);
        console.log(`📋 Поля в ton_farming_data:`, fields);
        
        // Ищем важные поля для TON Boost
        const boostFields = fields.filter(f => f.includes('boost'));
        const farmingFields = fields.filter(f => f.includes('farming'));
        
        console.log(`🎯 Boost поля:`, boostFields);
        console.log(`🌾 Farming поля:`, farmingFields);
        
        analysis.tables.ton_farming_data = {
          exists: true,
          record_count: farmingData.length,
          fields: fields,
          sample: sampleRecord
        };
      }
    }
  } catch (error) {
    console.log(`❌ Критическая ошибка анализа ton_farming_data: ${error}`);
  }

  // 3. АНАЛИЗ ТЕКУЩИХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST
  try {
    console.log('\n👥 3. ПОЛЬЗОВАТЕЛИ С TON BOOST:');
    
    // Ищем в users таблице
    const { data: usersWithBoost, error: boostError } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, balance_ton, balance_uni')
      .eq('ton_boost_active', true);

    if (boostError) {
      console.log(`❌ Ошибка поиска TON Boost пользователей: ${boostError.message}`);
    } else {
      console.log(`👤 Пользователей с ton_boost_active=true: ${usersWithBoost?.length || 0}`);
      
      if (usersWithBoost && usersWithBoost.length > 0) {
        console.log(`📋 Примеры пользователей:`);
        usersWithBoost.slice(0, 3).forEach(user => {
          console.log(`   User ${user.id} (@${user.username || 'N/A'}): ${user.balance_ton} TON, ${user.balance_uni} UNI`);
        });
      }
    }
    
    // Ищем в ton_farming_data (если существует)
    if (analysis.tables.ton_farming_data?.exists) {
      const { data: farmingWithBoost } = await supabase
        .from('ton_farming_data')
        .select('*')
        .eq('boost_active', true);
      
      console.log(`📊 Записей в ton_farming_data с boost_active=true: ${farmingWithBoost?.length || 0}`);
      
      if (farmingWithBoost && farmingWithBoost.length > 0) {
        console.log(`📋 Примеры из ton_farming_data:`);
        farmingWithBoost.slice(0, 3).forEach(record => {
          console.log(`   User ${record.user_id}: farming_balance=${record.farming_balance}, boost_package_id=${record.boost_package_id}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка анализа TON Boost пользователей: ${error}`);
  }

  // 4. АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ
  try {
    console.log('\n💰 4. АНАЛИЗ ТИПОВ ТРАНЗАКЦИЙ:');
    
    // Получаем enum типы транзакций
    const { data: transactionTypes } = await supabase.rpc('get_enum_values', { enum_name: 'transaction_type' });
    
    if (transactionTypes) {
      console.log(`📋 Доступные типы транзакций:`, transactionTypes);
      
      const boostTypes = transactionTypes.filter((type: string) => 
        type.includes('BOOST') || type.includes('TON_BOOST')
      );
      console.log(`🎯 TON Boost типы:`, boostTypes);
      
      // Проверяем есть ли TON_BOOST_INCOME
      if (boostTypes.includes('TON_BOOST_INCOME')) {
        console.log(`✅ Тип TON_BOOST_INCOME поддерживается`);
      } else {
        console.log(`❌ Тип TON_BOOST_INCOME НЕ поддерживается`);
        analysis.fields.missing_fields.push('TON_BOOST_INCOME enum value');
      }
    } else {
      // Fallback: анализируем существующие транзакции
      const { data: sampleTx } = await supabase
        .from('transactions')
        .select('type')
        .limit(100);
      
      if (sampleTx) {
        const uniqueTypes = [...new Set(sampleTx.map(tx => tx.type))];
        console.log(`📋 Найденные типы транзакций:`, uniqueTypes);
        
        const boostTypes = uniqueTypes.filter(type => 
          type.includes('BOOST') || type.includes('TON_BOOST')
        );
        console.log(`🎯 Boost-связанные типы:`, boostTypes);
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка анализа типов транзакций: ${error}`);
  }

  // 5. АНАЛИЗ ПОСЛЕДНИХ НАГРАД ПЛАНИРОВЩИКА
  try {
    console.log('\n⏰ 5. АНАЛИЗ РАБОТЫ ПЛАНИРОВЩИКОВ:');
    
    // UNI Farming планировщик
    const { data: uniFarmingRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // последние 10 минут
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`🌾 UNI Farming награды за 10 минут: ${uniFarmingRewards?.length || 0}`);
    
    if (uniFarmingRewards && uniFarmingRewards.length > 0) {
      console.log(`✅ UNI Farming планировщик РАБОТАЕТ`);
      const avgReward = uniFarmingRewards.reduce((sum, tx) => sum + parseFloat(tx.amount_uni || '0'), 0) / uniFarmingRewards.length;
      console.log(`📊 Средняя награда: ${avgReward.toFixed(6)} UNI`);
      
      // Анализируем есть ли TON Boost множители
      const withBoostMetadata = uniFarmingRewards.filter(tx => {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
        return metadata.boost_multiplier || metadata.ton_boost_active || metadata.original_type === 'TON_BOOST_INCOME';
      });
      
      console.log(`🎯 Награды с TON Boost метаданными: ${withBoostMetadata.length}`);
      
      if (withBoostMetadata.length > 0) {
        console.log(`✅ TON Boost награды ОБНАРУЖЕНЫ в FARMING_REWARD`);
        console.log(`📋 Пример метаданных:`, withBoostMetadata[0].metadata);
      } else {
        console.log(`❌ TON Boost награды НЕ найдены в метаданных`);
      }
    } else {
      console.log(`⚠️ UNI Farming планировщик не активен или нет активных пользователей`);
    }
    
    // TON Boost транзакции
    const { data: tonBoostRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'TON_BOOST_INCOME')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // последний час
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tonBoostRewards && tonBoostRewards.length > 0) {
      console.log(`🎯 TON_BOOST_INCOME транзакции за час: ${tonBoostRewards.length}`);
      console.log(`✅ TON Boost планировщик СОЗДАЕТ транзакции`);
    } else {
      console.log(`❌ TON_BOOST_INCOME транзакции НЕ найдены`);
    }
    
  } catch (error) {
    console.log(`❌ Ошибка анализа планировщиков: ${error}`);
  }

  return analysis;
}

async function analyzeTonBoostDataFlow(): Promise<void> {
  console.log('\n🔄 АНАЛИЗ ПОТОКА ДАННЫХ TON BOOST');
  console.log('='.repeat(70));

  try {
    // 1. Ищем пользователей с активным TON Boost через TonFarmingRepository логику
    console.log('\n📊 1. ИМИТАЦИЯ getActiveBoostUsers():');
    
    // Сначала пробуем ton_farming_data
    let activeUsers: any[] = [];
    let dataSource = '';
    
    const { data: farmingUsers, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('boost_active', true);

    if (farmingError) {
      console.log(`⚠️ ton_farming_data недоступна (${farmingError.message}), используем fallback`);
      
      // Fallback: users таблица
      const { data: usersBoost, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('ton_boost_active', true);

      if (usersError) {
        console.log(`❌ Fallback тоже провалился: ${usersError.message}`);
        return;
      } else {
        // Преобразуем в формат TonFarmingData
        activeUsers = (usersBoost || []).map(user => ({
          user_id: user.id,
          farming_balance: user.ton_farming_balance || '0',
          farming_rate: user.ton_farming_rate || '0.01',
          boost_active: user.ton_boost_active || false,
          boost_package_id: user.ton_boost_package_id,
          ton_boost_rate: user.ton_boost_rate
        }));
        dataSource = 'users (fallback)';
      }
    } else {
      activeUsers = farmingUsers || [];
      dataSource = 'ton_farming_data';
    }
    
    console.log(`📋 Источник данных: ${dataSource}`);
    console.log(`👥 Активных TON Boost пользователей: ${activeUsers.length}`);
    
    if (activeUsers.length > 0) {
      console.log(`📊 Примеры данных:`);
      activeUsers.slice(0, 3).forEach(user => {
        console.log(`   User ${user.user_id}:`);
        console.log(`      farming_balance: ${user.farming_balance}`);
        console.log(`      boost_package_id: ${user.boost_package_id}`);
        console.log(`      ton_boost_rate: ${user.ton_boost_rate || 'N/A'}`);
      });
      
      // 2. Проверяем как планировщик получает балансы
      console.log(`\n💰 2. ПОЛУЧЕНИЕ БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ:`);
      
      const userIds = activeUsers.map(u => parseInt(u.user_id.toString())).filter(id => !isNaN(id));
      console.log(`🔢 Преобразованные ID:`, userIds);
      
      const { data: userBalances, error: balanceError } = await supabase
        .from('users')
        .select('id, balance_ton, balance_uni')
        .in('id', userIds);
      
      if (balanceError) {
        console.log(`❌ Ошибка получения балансов: ${balanceError.message}`);
      } else {
        console.log(`✅ Получено балансов: ${userBalances?.length || 0}`);
        
        // Создаем мапу как в планировщике
        const balanceMap = new Map(userBalances?.map(u => [u.id, u]) || []);
        console.log(`📊 Доступные ID в мапе:`, Array.from(balanceMap.keys()));
        
        // 3. Симулируем логику расчета доходов
        console.log(`\n💵 3. СИМУЛЯЦИЯ РАСЧЕТА ДОХОДОВ:`);
        
        for (const user of activeUsers.slice(0, 2)) { // Только первые 2 для теста
          const userId = parseInt(user.user_id.toString());
          const userBalance = balanceMap.get(userId);
          
          if (!userBalance) {
            console.log(`❌ User ${user.user_id}: баланс НЕ найден`);
            continue;
          }
          
          console.log(`✅ User ${user.user_id}:`);
          console.log(`   Текущий баланс: ${userBalance.balance_ton} TON`);
          console.log(`   Депозит в фарминге: ${user.farming_balance} TON`);
          
          // Расчет как в планировщике
          const dailyRate = user.ton_boost_rate || 0.01;
          const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));
          const dailyIncome = userDeposit * dailyRate;
          const fiveMinuteIncome = dailyIncome / 288;
          
          console.log(`   Дневная ставка: ${dailyRate * 100}%`);
          console.log(`   Дневной доход: ${dailyIncome.toFixed(6)} TON`);
          console.log(`   Доход за 5 мин: ${fiveMinuteIncome.toFixed(8)} TON`);
          
          if (fiveMinuteIncome <= 0.00001) {
            console.log(`   ⚠️ Доход слишком мал - будет пропущен планировщиком`);
          } else {
            console.log(`   ✅ Доход достаточен для начисления`);
          }
        }
      }
    } else {
      console.log(`⚠️ Нет активных TON Boost пользователей - планировщик ничего не обрабатывает`);
    }
    
  } catch (error) {
    console.log(`❌ Ошибка анализа потока данных: ${error}`);
  }
}

async function main(): Promise<void> {
  console.log('🔧 АНАЛИЗ АРХИТЕКТУРЫ ПЛАНИРОВЩИКОВ TON BOOST');
  console.log('='.repeat(80));
  console.log('Дата:', new Date().toISOString());
  console.log('');

  const architecture = await analyzeSchedulerArchitecture();
  await analyzeTonBoostDataFlow();

  console.log('\n' + '='.repeat(80));
  console.log('🎯 ВЫВОДЫ ПО АРХИТЕКТУРЕ');
  console.log('='.repeat(80));

  console.log('\n🗄️ ИСТОЧНИКИ ДАННЫХ:');
  if (architecture.tables.ton_farming_data?.exists) {
    console.log('✅ Таблица ton_farming_data существует и используется как основной источник');
  } else {
    console.log('❌ Таблица ton_farming_data отсутствует - используется fallback через users');
  }
  
  console.log('\n📊 ПОЛЯ ДЛЯ TON BOOST:');
  if (architecture.fields.ton_boost_fields.length > 0) {
    console.log('✅ TON Boost поля найдены:', architecture.fields.ton_boost_fields);
  } else {
    console.log('❌ TON Boost поля не найдены');
  }
  
  console.log('\n⚙️ МЕХАНИЗМ РАБОТЫ ПЛАНИРОВЩИКА:');
  console.log('1. TonFarmingRepository.getActiveBoostUsers() ищет boost_active=true');
  console.log('2. Получает балансы из users.balance_ton/balance_uni');
  console.log('3. Использует farming_balance для расчета доходов');
  console.log('4. Создает транзакции типа FARMING_REWARD с metadata.original_type=TON_BOOST_INCOME');
  console.log('5. BalanceManager обновляет балансы');
  console.log('6. WebSocket уведомляет frontend');
  
  console.log('\n🚨 КРИТИЧЕСКИЕ ТОЧКИ ОТКАЗА:');
  if (architecture.fields.missing_fields.length > 0) {
    console.log('❌ Отсутствующие компоненты:', architecture.fields.missing_fields);
  }
  
  console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ ДЛЯ ДИАГНОСТИКИ:');
  console.log('1. Проверить реальные логи планировщика в production');
  console.log('2. Убедиться что ton_farming_data.boost_active=true для проблемных пользователей');
  console.log('3. Проверить размеры farming_balance (возможно слишком малы)');
  console.log('4. Анализировать metadata в существующих FARMING_REWARD транзакциях');
}

// Запуск анализа
main().catch(console.error);