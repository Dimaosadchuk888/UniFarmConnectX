import { supabase } from '../core/supabase.js';
import crypto from 'crypto';

async function createTestReferralsOptimized() {
  console.log('=== СОЗДАНИЕ ТЕСТОВЫХ РЕФЕРАЛОВ (ОПТИМИЗИРОВАННАЯ ВЕРСИЯ) ===\n');
  
  try {
    // Сначала проверим, сколько уже есть рефералов у пользователя 74
    const { data: existingReferrals, error: checkError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton')
      .eq('referred_by', 74);
      
    if (existingReferrals && existingReferrals.length > 0) {
      console.log(`У пользователя 74 уже есть ${existingReferrals.length} рефералов:`);
      existingReferrals.forEach((ref, i) => {
        console.log(`${i+1}. ${ref.username} (ID: ${ref.id})`);
      });
      console.log('\nПродолжаем создание новых...\n');
    }
    
    const usersPerLevel = 3; // Уменьшено для скорости
    const maxLevels = 5; // Создадим только 5 уровней для демонстрации
    
    // Структура для хранения созданных пользователей
    const createdUsers: { [level: number]: Array<{id: number, username: string}> } = {
      0: [{id: 74, username: 'test_user_1752129840905'}]
    };
    
    let totalCreated = 0;
    const startTime = Date.now();
    
    // Создаем пользователей уровень за уровнем
    for (let level = 1; level <= maxLevels; level++) {
      console.log(`\n📊 Уровень ${level}:`);
      createdUsers[level] = [];
      
      const parentUsers = createdUsers[level - 1];
      
      for (let i = 0; i < usersPerLevel; i++) {
        // Выбираем родителя циклически
        const parent = parentUsers[i % parentUsers.length];
        
        // Генерируем уникальные данные
        const telegramId = 8000000 + totalCreated + 1000;
        const username = `ref_L${level}_user${i + 1}`;
        const refCode = `REF_${level}_${i}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        // Случайные балансы
        const uniBalance = 10000 + Math.floor(Math.random() * 90000);
        const tonBalance = 10 + Math.floor(Math.random() * 90);
        const uniDeposit = Math.floor(uniBalance * 0.8);
        
        const newUser = {
          telegram_id: telegramId,
          username: username,
          first_name: `Level ${level} User`,
          ref_code: refCode,
          referred_by: parent.id,
          referrer_id: parent.id, // На случай если используется это поле
          balance_uni: uniBalance,
          balance_ton: tonBalance,
          uni_deposit_amount: uniDeposit,
          uni_farming_active: true,
          uni_farming_start_timestamp: new Date().toISOString(),
          uni_farming_balance: uniDeposit,
          uni_farming_rate: 0.01,
          ton_boost_package: level <= 3 ? level : null, // Первые 3 уровня получают boost пакеты
          created_at: new Date().toISOString()
        };
        
        // Создаем пользователя
        const { data, error } = await supabase
          .from('users')
          .insert(newUser)
          .select('id, username')
          .single();
          
        if (error) {
          console.log(`❌ Ошибка создания ${username}: ${error.message}`);
          continue;
        }
        
        if (data) {
          createdUsers[level].push(data);
          totalCreated++;
          console.log(`✅ ${username} (ID: ${data.id}) <- реферал ${parent.username}`);
          console.log(`   💰 ${uniBalance} UNI (депозит: ${uniDeposit}), ${tonBalance} TON`);
        }
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n✅ ГОТОВО! Создано ${totalCreated} тестовых рефералов за ${duration.toFixed(1)} секунд`);
    
    // Показываем итоговую структуру
    console.log('\n📊 СТРУКТУРА РЕФЕРАЛОВ:');
    for (let level = 1; level <= maxLevels; level++) {
      const users = createdUsers[level];
      console.log(`\nУровень ${level}: ${users.length} пользователей`);
      users.forEach(u => console.log(`  - ${u.username} (ID: ${u.id})`));
    }
    
    // Проверяем итоговое количество рефералов
    const { count: totalReferrals } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', 74);
      
    console.log(`\n📈 Всего рефералов первого уровня у пользователя 74: ${totalReferrals}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

createTestReferralsOptimized();