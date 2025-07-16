import { supabase } from '../core/supabase.js';
import crypto from 'crypto';

interface TestUser {
  telegram_id: number;
  username: string;
  first_name: string;
  ref_code: string;
  referred_by: number;
  balance_uni: number;
  balance_ton: number;
  uni_deposit_amount: number;
  ton_boost_package?: number;
  created_at?: string;
}

async function createTestReferrals() {
  console.log('=== СОЗДАНИЕ ТЕСТОВЫХ РЕФЕРАЛОВ ДЛЯ USER 74 ===\n');
  
  try {
    // Массив для хранения созданных пользователей по уровням
    const levelUsers: Map<number, number[]> = new Map();
    levelUsers.set(0, [74]); // Уровень 0 - сам пользователь 74
    
    let totalCreated = 0;
    const usersPerLevel = 5;
    const maxLevels = 20;
    
    // Генератор уникального ID
    let nextUserId = 10000 + Math.floor(Math.random() * 1000);
    let nextTelegramId = 9000000 + Math.floor(Math.random() * 100000);
    
    for (let level = 1; level <= maxLevels; level++) {
      console.log(`\n📊 Создание пользователей уровня ${level}...`);
      
      const parentUsers = levelUsers.get(level - 1) || [];
      const currentLevelUsers: number[] = [];
      
      for (let i = 0; i < usersPerLevel; i++) {
        // Выбираем случайного родителя из предыдущего уровня
        const parentId = parentUsers[i % parentUsers.length];
        
        // Генерируем данные для нового пользователя
        const userId = nextUserId++;
        const telegramId = nextTelegramId++;
        const username = `test_user_L${level}_${i + 1}`;
        const refCode = `REF_L${level}_${i + 1}_${crypto.randomBytes(3).toString('hex')}`;
        
        // Случайные балансы и депозиты
        const uniBalance = Math.floor(Math.random() * 100000) + 1000;
        const tonBalance = Math.floor(Math.random() * 100) + 10;
        const uniDeposit = Math.floor(uniBalance * 0.7); // 70% от баланса в депозите
        const tonBoostPackage = Math.random() > 0.5 ? Math.floor(Math.random() * 4) + 1 : null;
        
        const newUser: TestUser = {
          telegram_id: telegramId,
          username: username,
          first_name: `Test L${level}`,
          ref_code: refCode,
          referred_by: parentId,
          balance_uni: uniBalance,
          balance_ton: tonBalance,
          uni_deposit_amount: uniDeposit,
          ...(tonBoostPackage && { ton_boost_package: tonBoostPackage })
        };
        
        // Создаем пользователя в БД
        const { data, error } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Ошибка создания ${username}:`, error.message);
          continue;
        }
        
        if (data) {
          currentLevelUsers.push(data.id);
          totalCreated++;
          console.log(`✅ Создан ${username} (ID: ${data.id}, Parent: ${parentId})`);
          console.log(`   💰 UNI: ${uniBalance}, TON: ${tonBalance}, Депозит: ${uniDeposit}`);
          if (tonBoostPackage) {
            console.log(`   🚀 TON Boost пакет: ${tonBoostPackage}`);
          }
          
          // Активируем UNI farming для пользователя
          if (uniDeposit > 0) {
            await supabase
              .from('users')
              .update({
                uni_farming_active: true,
                uni_farming_start_timestamp: new Date().toISOString(),
                uni_farming_balance: uniDeposit,
                uni_farming_rate: 0.01
              })
              .eq('id', data.id);
          }
          
          // Активируем TON farming если есть boost пакет
          if (tonBoostPackage) {
            const boostRates = { 1: 0.001, 2: 0.002, 3: 0.003, 4: 0.004 };
            await supabase
              .from('users')
              .update({
                ton_boost_active: true,
                ton_farming_balance: tonBalance * 0.5, // 50% от баланса в farming
                ton_farming_rate: boostRates[tonBoostPackage] || 0.001,
                ton_farming_start_timestamp: new Date().toISOString()
              })
              .eq('id', data.id);
          }
        }
      }
      
      levelUsers.set(level, currentLevelUsers);
      console.log(`✅ Уровень ${level}: создано ${currentLevelUsers.length} пользователей`);
    }
    
    console.log(`\n✅ ИТОГО СОЗДАНО: ${totalCreated} тестовых рефералов`);
    
    // Создаем записи в таблице referrals для связей
    console.log('\n📊 Создание записей в таблице referrals...');
    
    let referralRecords = 0;
    for (const [level, userIds] of levelUsers) {
      if (level === 0) continue; // Пропускаем уровень 0
      
      for (const userId of userIds) {
        // Получаем информацию о пользователе
        const { data: user } = await supabase
          .from('users')
          .select('referred_by')
          .eq('id', userId)
          .single();
          
        if (user && user.referred_by) {
          // Создаем запись в referrals
          const { error } = await supabase
            .from('referrals')
            .insert({
              user_id: userId,
              inviter_id: user.referred_by,
              level: 1, // Прямой реферал
              reward_uni: 0,
              reward_ton: 0
            });
            
          if (!error) {
            referralRecords++;
          }
        }
      }
    }
    
    console.log(`✅ Создано ${referralRecords} записей в таблице referrals`);
    
    // Показываем статистику по уровням
    console.log('\n📊 СТАТИСТИКА ПО УРОВНЯМ:');
    for (const [level, userIds] of levelUsers) {
      if (level === 0) continue;
      console.log(`Уровень ${level}: ${userIds.length} пользователей`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

createTestReferrals();