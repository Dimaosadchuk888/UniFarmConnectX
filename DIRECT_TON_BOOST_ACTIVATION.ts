#!/usr/bin/env tsx
/**
 * Прямая активация TON Boost пакетов для пользователей 251 и 255
 * Использует те же методы что и система, но напрямую через модули
 */

async function main() {
  console.log('🚀 === ПРЯМАЯ АКТИВАЦИЯ TON BOOST ПАКЕТОВ ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Пользователи: 251, 255');
  console.log('💰 Депозит: 2 TON каждому');
  
  try {
    // Импортируем необходимые модули
    const { createClient } = await import('@supabase/supabase-js');
    
    // Используем переменные из .env (которые загружаются сервером)
    const supabaseUrl = 'https://wunnsvicbebssrjqedor.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAzNjc5NjcsImV4cCI6MjAzNTk0Mzk2N30.mH6cD4A6UD7RwzrwClFHqBGvWyxXqE6Tz9ZGP0PYbRY';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase подключение установлено');
    
    const targetUsers = [251, 255];
    const depositAmount = 2;
    
    // Получаем подходящий пакет
    console.log('\n📦 Поиск подходящего TON Boost пакета...');
    const { data: packages, error: packagesError } = await supabase
      .from('boost_packages')
      .select('*')
      .eq('is_active', true)
      .lte('min_amount', depositAmount)
      .order('min_amount', { ascending: false })
      .limit(1);
      
    if (packagesError || !packages || packages.length === 0) {
      console.error('❌ Не удалось найти подходящий пакет:', packagesError);
      return;
    }
    
    const selectedPackage = packages[0];
    console.log(`✅ Выбран пакет: ${selectedPackage.name}`, {
      id: selectedPackage.id,
      minAmount: selectedPackage.min_amount,
      dailyRate: selectedPackage.daily_rate,
      uniBonus: selectedPackage.uni_bonus
    });
    
    const results = [];
    
    for (const userId of targetUsers) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 АКТИВАЦИЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ ${userId}`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        // 1. Проверяем текущее состояние пользователя
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (userError || !user) {
          console.error(`❌ Пользователь ${userId} не найден:`, userError);
          results.push({ userId, success: false });
          continue;
        }
        
        console.log(`👤 Пользователь ${userId} найден:`, {
          username: user.username,
          tonBalance: user.balance_ton,
          currentBoostActive: user.ton_boost_active
        });
        
        // 2. Обеспечиваем достаточный баланс
        const currentBalance = parseFloat(user.balance_ton || '0');
        if (currentBalance < depositAmount) {
          const newBalance = currentBalance + depositAmount + 0.1; // Небольшой запас
          console.log(`💳 Добавляем баланс: ${currentBalance} → ${newBalance} TON`);
          
          const { error: balanceError } = await supabase
            .from('users')
            .update({ 
              balance_ton: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
          if (balanceError) {
            console.error(`❌ Ошибка обновления баланса для ${userId}:`, balanceError);
            results.push({ userId, success: false });
            continue;
          }
          console.log(`✅ Баланс пользователя ${userId} обновлен`);
        }
        
        // 3. Создаем транзакцию покупки
        console.log(`💰 Создание транзакции покупки TON Boost...`);
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'BOOST_PURCHASE',
            amount: depositAmount,
            currency: 'TON',
            status: 'completed',
            description: `TON Boost Package Purchase: ${selectedPackage.name}`,
            metadata: {
              package_id: selectedPackage.id,
              package_name: selectedPackage.name,
              deposit_amount: depositAmount,
              rate_ton_per_second: selectedPackage.daily_rate / 86400, // daily rate to per second
              bonus_uni: selectedPackage.uni_bonus,
              manual_activation: true,
              activation_admin: 'manual_script'
            },
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (transactionError) {
          console.error(`❌ Ошибка создания транзакции для ${userId}:`, transactionError);
          results.push({ userId, success: false });
          continue;
        }
        console.log(`✅ Транзакция создана: ID ${transaction.id}`);
        
        // 4. Обновляем статус пользователя (для планировщика)
        console.log(`👤 Обновление статуса TON Boost пользователя...`);
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            ton_boost_active: true,
            ton_boost_package: selectedPackage.id,
            ton_boost_package_id: selectedPackage.id,
            ton_boost_rate: selectedPackage.daily_rate,
            balance_ton: parseFloat(user.balance_ton || '0') - depositAmount, // Списываем сумму
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
          
        if (userUpdateError) {
          console.error(`❌ Ошибка обновления пользователя ${userId}:`, userUpdateError);
          results.push({ userId, success: false });
          continue;
        }
        console.log(`✅ Статус пользователя ${userId} обновлен`);
        
        // 5. Создаем/обновляем запись в ton_farming_data
        console.log(`🚜 Создание записи в ton_farming_data...`);
        const farmingData = {
          user_id: userId.toString(),
          farming_balance: depositAmount,
          farming_rate: selectedPackage.daily_rate / 86400, // daily to per second
          boost_package_id: selectedPackage.id,
          boost_active: true,
          last_claim: new Date().toISOString(),
          farming_start_timestamp: new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: farmingError } = await supabase
          .from('ton_farming_data')
          .upsert(farmingData, { onConflict: 'user_id' });
          
        if (farmingError) {
          console.error(`❌ Ошибка создания ton_farming_data для ${userId}:`, farmingError);
          results.push({ userId, success: false });
          continue;
        }
        console.log(`✅ ton_farming_data создан для пользователя ${userId}`);
        
        // 6. Начисляем UNI бонус если предусмотрен
        if (selectedPackage.uni_bonus > 0) {
          console.log(`🎁 Начисление UNI бонуса: ${selectedPackage.uni_bonus} UNI...`);
          
          // Обновляем UNI баланс
          const currentUniBalance = parseFloat(user.balance_uni || '0');
          const newUniBalance = currentUniBalance + selectedPackage.uni_bonus;
          
          const { error: uniBalanceError } = await supabase
            .from('users')
            .update({ balance_uni: newUniBalance })
            .eq('id', userId);
            
          if (uniBalanceError) {
            console.warn(`⚠️ Ошибка обновления UNI баланса для ${userId}:`, uniBalanceError);
          } else {
            console.log(`✅ UNI бонус начислен: ${currentUniBalance} → ${newUniBalance} UNI`);
            
            // Создаем транзакцию UNI бонуса
            const { error: bonusTransactionError } = await supabase
              .from('transactions')
              .insert({
                user_id: userId,
                type: 'DAILY_BONUS',
                amount: selectedPackage.uni_bonus,
                currency: 'UNI',
                status: 'completed',
                description: `TON Boost Package Bonus: ${selectedPackage.uni_bonus} UNI`,
                metadata: {
                  bonus_type: 'ton_boost_package',
                  package_id: selectedPackage.id,
                  package_name: selectedPackage.name
                },
                created_at: new Date().toISOString()
              });
              
            if (bonusTransactionError) {
              console.warn(`⚠️ Ошибка создания UNI бонус транзакции для ${userId}`);
            }
          }
        }
        
        console.log(`🎉 Пользователь ${userId} успешно активирован!`);
        results.push({ userId, success: true });
        
      } catch (error) {
        console.error(`❌ Критическая ошибка для пользователя ${userId}:`, error);
        results.push({ userId, success: false });
      }
    }
    
    // Итоговый отчет
    console.log(`\n${'='.repeat(60)}`);
    console.log('📈 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
    console.log(`${'='.repeat(60)}`);
    
    results.forEach(({ userId, success }) => {
      console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : 'ОШИБКА'}`);
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 Результат: ${successCount}/${results.length} пользователей активированы`);
    
    if (successCount === results.length) {
      console.log('🎉 ВСЕ АКТИВАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!');
      console.log('✅ Пользователи 251 и 255 теперь имеют активные TON Boost пакеты по 2 TON');
      console.log('✅ Все данные синхронизированы в базе данных');
      console.log('✅ Бусты будут отображаться в их кабинетах');
      console.log('✅ Планировщик начнет начислять им доход каждые 5 минут');
    } else {
      console.log('⚠️ Некоторые активации не удались, проверьте логи выше');
    }
    
    // Проверяем финальное состояние
    console.log('\n🔍 === ПРОВЕРКА ФИНАЛЬНОГО СОСТОЯНИЯ ===');
    for (const { userId, success } of results) {
      if (success) {
        const { data: finalUser } = await supabase
          .from('users')
          .select('ton_boost_active, ton_boost_package, balance_ton, balance_uni')
          .eq('id', userId)
          .single();
          
        const { data: farmingData } = await supabase
          .from('ton_farming_data')
          .select('farming_balance, boost_active')
          .eq('user_id', userId.toString())
          .single();
          
        console.log(`👤 Пользователь ${userId}:`, {
          boostActive: finalUser?.ton_boost_active,
          package: finalUser?.ton_boost_package,
          tonBalance: finalUser?.balance_ton,
          uniBalance: finalUser?.balance_uni,
          farmingBalance: farmingData?.farming_balance,
          farmingActive: farmingData?.boost_active
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка выполнения скрипта:', error);
  }
}

main().catch(console.error);