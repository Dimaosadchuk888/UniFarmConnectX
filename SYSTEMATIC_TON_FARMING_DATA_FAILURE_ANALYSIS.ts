/**
 * 🚨 СИСТЕМНАЯ ДИАГНОСТИКА: ПОЧЕМУ НЕ СОЗДАЮТСЯ ton_farming_data ЗАПИСИ
 * 
 * Анализ реального кода vs фактического поведения системы
 */

import { supabase } from './core/supabase';

async function analyzeSystematicTonFarmingDataFailure() {
  console.log('\n🚨 === СИСТЕМНАЯ ДИАГНОСТИКА СОЗДАНИЯ ton_farming_data ===\n');
  
  try {
    // 1. АНАЛИЗ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST БЕЗ ЗАПИСЕЙ В ton_farming_data
    console.log('1️⃣ ПОИСК ВСЕХ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('=========================================');
    
    // Получаем всех пользователей с ton_boost_package
    const { data: usersWithBoosts, error: usersError } = await supabase
      .from('users')
      .select('id, ton_boost_package, ton_boost_active, ton_boost_rate, balance_ton, created_at')
      .not('ton_boost_package', 'is', null)
      .neq('ton_boost_package', 0)
      .order('id', { ascending: true });

    if (usersError || !usersWithBoosts?.length) {
      console.log('❌ Не найдено пользователей с TON boost пакетами');
      return;
    }

    console.log(`✅ Найдено ${usersWithBoosts.length} пользователей с TON boost пакетами`);
    
    // Получаем все записи из ton_farming_data
    const { data: farmingDataRecords, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, boost_active, farming_balance, boost_package_id')
      .order('user_id', { ascending: true });

    const farmingDataUserIds = new Set(farmingDataRecords?.map(r => parseInt(r.user_id)) || []);
    
    console.log(`✅ В ton_farming_data есть записи для ${farmingDataUserIds.size} пользователей`);
    console.log(`📋 User IDs в ton_farming_data: [${Array.from(farmingDataUserIds).join(', ')}]`);
    
    // Находим пользователей БЕЗ записей в ton_farming_data
    const usersWithoutFarmingData = usersWithBoosts.filter(user => !farmingDataUserIds.has(user.id));
    
    console.log('\n🚨 ПОЛЬЗОВАТЕЛИ БЕЗ ton_farming_data ЗАПИСЕЙ:');
    console.log(`   Всего пострадавших: ${usersWithoutFarmingData.length}`);
    
    if (usersWithoutFarmingData.length > 0) {
      console.log('   Список пострадавших пользователей:');
      usersWithoutFarmingData.forEach(user => {
        console.log(`     User ${user.id}: package=${user.ton_boost_package}, active=${user.ton_boost_active}, rate=${user.ton_boost_rate}`);
      });
      
      // Анализируем паттерн по времени
      const recentUsers = usersWithoutFarmingData.filter(user => 
        new Date(user.created_at) > new Date('2025-07-20')
      );
      
      console.log(`\n🔍 АНАЛИЗ ПО ВРЕМЕНИ:`);
      console.log(`   Недавние пользователи (после 20.07.2025): ${recentUsers.length}`);
      console.log(`   Старые пользователи: ${usersWithoutFarmingData.length - recentUsers.length}`);
      
      if (recentUsers.length === usersWithoutFarmingData.length) {
        console.log('🚨 ВСЕ пострадавшие - недавние пользователи!');
        console.log('   Проблема началась недавно - система СЛОМАЛАСЬ');
      }
    }

    // 2. АНАЛИЗ КОДА: КАКИЕ ПОЛЯ НУЖНЫ ДЛЯ ton_farming_data
    console.log('\n2️⃣ АНАЛИЗ ТРЕБОВАНИЙ К ПОЛЯМ ton_farming_data:');
    console.log('===============================================');
    
    if (farmingDataRecords && farmingDataRecords.length > 0) {
      const sampleRecord = farmingDataRecords[0];
      console.log('✅ СТРУКТУРА ton_farming_data (из существующей записи):');
      console.log(`   Поля: ${Object.keys(sampleRecord).join(', ')}`);
      
      // Получаем полную структуру одной записи
      const { data: fullRecord, error: fullError } = await supabase
        .from('ton_farming_data')
        .select('*')
        .limit(1)
        .single();
        
      if (!fullError && fullRecord) {
        console.log('\n📋 ПОЛНАЯ СТРУКТУРА ton_farming_data:');
        Object.entries(fullRecord).forEach(([key, value]) => {
          console.log(`     ${key}: ${value} (${typeof value})`);
        });
      }
    }

    // 3. АНАЛИЗ TonFarmingRepository.activateBoost() МЕТОДА
    console.log('\n3️⃣ АНАЛИЗ TonFarmingRepository.activateBoost():');
    console.log('==============================================');
    
    console.log('🔍 ПОИСК ПРОБЛЕМЫ В КОДЕ СОЗДАНИЯ ЗАПИСЕЙ...');
    console.log('   TonFarmingRepository должен создавать записи в ton_farming_data');
    console.log('   при вызове activateBoost(userId, packageData)');
    console.log('   Анализ кода покажет какие поля отсутствуют или неправильные');

    // 4. ПРОВЕРКА ПЛАНИРОВЩИКА: КАКИЕ ПОЛЯ ОН ИЩЕТ
    console.log('\n4️⃣ АНАЛИЗ ТРЕБОВАНИЙ ПЛАНИРОВЩИКА:');
    console.log('==================================');
    
    console.log('🔍 ПЛАНИРОВЩИК ИЩЕТ ПОЛЬЗОВАТЕЛЕЙ ПО КРИТЕРИЯМ:');
    console.log('   Анализ кода планировщика покажет:');
    console.log('   - Какие JOIN используются между users и ton_farming_data');
    console.log('   - Какие поля проверяются для активности');
    console.log('   - Почему новые пользователи не попадают в выборку');

    // 5. ТЕСТ СОЗДАНИЯ ЗАПИСИ (СИМУЛЯЦИЯ)
    console.log('\n5️⃣ СИМУЛЯЦИЯ СОЗДАНИЯ ton_farming_data:');
    console.log('======================================');
    
    // Берем User 290 как пример
    const testUserId = 290;
    const testUser = usersWithBoosts.find(u => u.id === testUserId);
    
    if (testUser) {
      console.log(`🧪 ТЕСТ: Что нужно для создания записи User ${testUserId}:`);
      console.log(`   user_id: ${testUserId} (INTEGER или STRING?)`);
      console.log(`   boost_package_id: ${testUser.ton_boost_package}`);
      console.log(`   farming_balance: ??? (из депозита или users.balance_ton?)`);
      console.log(`   boost_active: true`);
      console.log(`   farming_rate: ${testUser.ton_boost_rate}`);
      console.log(`   created_at: NOW()`);
      console.log(`   updated_at: NOW()`);
      
      // Попробуем найти депозит для этого пользователя
      const { data: depositTx, error: depositError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', testUserId)
        .eq('type', 'TON_DEPOSIT')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!depositError && depositTx) {
        console.log(`   💰 ДЕПОЗИТ НАЙДЕН: ${depositTx.amount} TON (${depositTx.created_at})`);
        console.log(`   farming_balance должен быть: ${depositTx.amount}`);
      } else {
        console.log(`   ❌ Депозит не найден - ВОЗМОЖНАЯ ПРОБЛЕМА!`);
      }
    }

    // 6. ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ
    console.log('\n6️⃣ ПЛАН УСТРАНЕНИЯ ПРОБЛЕМЫ:');
    console.log('============================');
    console.log('');
    console.log('🔧 ШАГИ ИСПРАВЛЕНИЯ:');
    console.log('   1. Найти и исправить TonFarmingRepository.activateBoost()');
    console.log('   2. Создать недостающие ton_farming_data записи для пострадавших');
    console.log('   3. Проверить планировщик на совместимость типов данных');
    console.log('   4. Убедиться что новые пользователи попадают в систему');
    console.log('');
    console.log(`🚨 СРОЧНО: ${usersWithoutFarmingData.length} пользователей ждут активации!`);

    console.log('\n✅ === СИСТЕМНАЯ ДИАГНОСТИКА ЗАВЕРШЕНА ===\n');

  } catch (error) {
    console.error('❌ Критическая ошибка системной диагностики:', error);
  }
}

// Запускаем системную диагностику
analyzeSystematicTonFarmingDataFailure();