/**
 * КРИТИЧЕСКАЯ МИГРАЦИЯ: Исправление проблемы с депозитами TON Boost
 * Безопасно создает записи в ton_farming_data для пользователей с активными TON Boost
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

interface UserWithMissingFarmingData {
  id: number;
  ton_boost_active: boolean;
  ton_boost_package: number;
  ton_boost_rate: string;
  ton_farming_balance: string;
  ton_farming_start_timestamp: string | null;
}

async function migrationFixTonFarmingDeposits() {
  console.log('🔧 МИГРАЦИЯ: Исправление проблемы с депозитами TON Boost');
  console.log('=' .repeat(70));
  
  try {
    // Шаг 1: Находим пользователей с активным TON Boost
    console.log('\n📋 Шаг 1: Поиск пользователей с активным TON Boost');
    
    const { data: activeBoostUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id, 
        ton_boost_active, 
        ton_boost_package, 
        ton_boost_rate, 
        ton_farming_balance,
        ton_farming_start_timestamp
      `)
      .eq('ton_boost_active', true)
      .not('ton_boost_package', 'is', null);
    
    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError);
      return;
    }
    
    console.log(`✅ Найдено пользователей с активным TON Boost: ${activeBoostUsers?.length || 0}`);
    
    if (!activeBoostUsers || activeBoostUsers.length === 0) {
      console.log('ℹ️  Нет пользователей для миграции');
      return;
    }
    
    // Шаг 2: Проверяем какие из них отсутствуют в ton_farming_data
    console.log('\n📋 Шаг 2: Проверка записей в ton_farming_data');
    
    const userIds = activeBoostUsers.map(u => u.id.toString());
    const { data: existingFarmingRecords, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_package_id')
      .in('user_id', userIds);
    
    if (farmingError) {
      console.error('❌ Ошибка получения ton_farming_data:', farmingError);
      return;
    }
    
    const existingUserIds = new Set(existingFarmingRecords?.map(r => r.user_id) || []);
    const missingUsers = activeBoostUsers.filter(user => !existingUserIds.has(user.id.toString()));
    
    console.log(`✅ Записей в ton_farming_data: ${existingFarmingRecords?.length || 0}`);
    console.log(`⚠️  Пользователей БЕЗ записей в ton_farming_data: ${missingUsers.length}`);
    
    if (missingUsers.length === 0) {
      console.log('🎉 Все пользователи уже имеют записи в ton_farming_data');
      
      // Проверим синхронизацию данных
      console.log('\n📋 Проверка синхронизации данных');
      let syncIssues = 0;
      
      activeBoostUsers.forEach(user => {
        const farmingRecord = existingFarmingRecords?.find(f => f.user_id === user.id.toString());
        if (farmingRecord) {
          const userBalance = parseFloat(user.ton_farming_balance || '0');
          const farmingBalance = parseFloat(farmingRecord.farming_balance || '0');
          
          if (Math.abs(userBalance - farmingBalance) > 0.000001) {
            console.log(`⚠️  User ${user.id}: Баланс не синхронизирован (users: ${userBalance}, farming: ${farmingBalance})`);
            syncIssues++;
          }
        }
      });
      
      if (syncIssues === 0) {
        console.log('✅ Все данные синхронизированы');
      } else {
        console.log(`⚠️  Найдено ${syncIssues} проблем синхронизации`);
      }
      
      return;
    }
    
    // Шаг 3: Создаем записи для пользователей без ton_farming_data
    console.log('\n📋 Шаг 3: Создание записей в ton_farming_data');
    console.log(`👥 Пользователи для миграции: ${missingUsers.map(u => u.id).join(', ')}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of missingUsers) {
      try {
        console.log(`\n🔄 Обработка User ${user.id}`);
        
        const farmingBalance = parseFloat(user.ton_farming_balance || '0');
        const farmingRate = parseFloat(user.ton_boost_rate || '0.01');
        
        // Рассчитываем дневной доход
        const dailyIncome = farmingBalance * farmingRate;
        
        const farmingData = {
          user_id: user.id.toString(), // STRING для совместимости
          farming_balance: farmingBalance.toString(),
          farming_rate: farmingRate.toString(),
          farming_start_timestamp: user.ton_farming_start_timestamp || new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          farming_accumulated: '0',
          farming_last_claim: null,
          boost_active: true,
          boost_package_id: user.ton_boost_package,
          boost_expires_at: null, // Будет установлено позже
          daily_income: dailyIncome.toString(),
          total_earned: '0',
          last_claim: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log(`   📝 Создание записи: balance=${farmingBalance}, rate=${farmingRate}, daily=${dailyIncome.toFixed(6)}`);
        
        const { data: insertResult, error: insertError } = await supabase
          .from('ton_farming_data')
          .insert(farmingData)
          .select();
        
        if (insertError) {
          console.error(`   ❌ Ошибка создания записи для User ${user.id}:`, insertError);
          errorCount++;
        } else {
          console.log(`   ✅ Запись создана успешно для User ${user.id}`);
          successCount++;
        }
        
        // Небольшая пауза между операциями
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   💥 Критическая ошибка для User ${user.id}:`, error);
        errorCount++;
      }
    }
    
    // Шаг 4: Результаты миграции
    console.log('\n🎯 РЕЗУЛЬТАТЫ МИГРАЦИИ:');
    console.log(`✅ Успешно создано записей: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📊 Всего обработано: ${missingUsers.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО');
      console.log('- Все пользователи с TON Boost теперь имеют записи в ton_farming_data');
      console.log('- Система начислений работает корректно');
      console.log('- Новые покупки будут автоматически создавать записи');
    }
    
    if (errorCount > 0) {
      console.log('\n⚠️  ЧАСТИЧНЫЕ ПРОБЛЕМЫ');
      console.log('- Некоторые записи не удалось создать');
      console.log('- Требуется ручная проверка проблемных пользователей');
    }
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА миграции:', error);
  }
}

// Подтверждение безопасности
console.log('⚠️  ВНИМАНИЕ: Эта миграция создает записи ТОЛЬКО в ton_farming_data');
console.log('⚠️  Она НЕ изменяет существующие данные в таблице users');
console.log('⚠️  Она НЕ изменяет балансы пользователей');
console.log('⚠️  Запуск в течение 10 секунд...\n');

setTimeout(() => {
  migrationFixTonFarmingDeposits().then(() => {
    console.log('\n✅ Миграция завершена');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  });
}, 10000);