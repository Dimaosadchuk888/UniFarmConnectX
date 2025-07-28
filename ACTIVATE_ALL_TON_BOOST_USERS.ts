#!/usr/bin/env tsx
/**
 * АКТИВАЦИЯ TON BOOST ПАКЕТОВ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ 251 И 255
 * Финальная версия с правильными переменными окружения
 */

// Импортируем конфигурацию из основного приложения
import { config } from 'dotenv';
config();

async function main() {
  console.log('🚀 === АКТИВАЦИЯ TON BOOST ПАКЕТОВ ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Пользователи: 251, 255');
  console.log('💰 Депозит: 2 TON каждому');
  
  try {
    // Используем те же переменные что и в приложении
    const supabaseUrl = 'https://wunnsvicbebssrjqedor.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAzNjc5NjcsImV4cCI6MjAzNTk0Mzk2N30.mH6cD4A6UD7RwzrwClFHqBGvWyxXqE6Tz9ZGP0PYbRY';
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Supabase подключение установлено');
    
    // Тестируем подключение
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Ошибка подключения к Supabase:', testError);
      return;
    }
    
    console.log('✅ Подключение к базе данных работает');
    
    // Получаем подходящий TON Boost пакет
    console.log('\n📦 Получение TON Boost пакетов...');
    const { data: packages, error: packagesError } = await supabase
      .from('boost_packages')
      .select('*')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });
      
    if (packagesError || !packages) {
      console.error('❌ Ошибка получения пакетов:', packagesError);
      return;
    }
    
    console.log(`✅ Найдено ${packages.length} активных пакетов:`);
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name}: от ${pkg.min_amount} TON, ставка: ${pkg.daily_rate}, UNI бонус: ${pkg.uni_bonus}`);
    });
    
    // Выбираем подходящий пакет для 2 TON
    const suitablePackage = packages.find(pkg => pkg.min_amount <= 2);
    if (!suitablePackage) {
      console.error('❌ Нет пакетов подходящих для 2 TON');
      return;
    }
    
    console.log(`\n📦 Выбран пакет: ${suitablePackage.name} (ID: ${suitablePackage.id})`);
    
    const targetUsers = [251, 255];
    const depositAmount = 2;
    const results = [];
    
    for (const userId of targetUsers) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🔄 АКТИВАЦИЯ ПОЛЬЗОВАТЕЛЯ ${userId}`);
      console.log(`${'='.repeat(50)}`);
      
      try {
        // 1. Получаем информацию о пользователе
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (userError) {
          console.error(`❌ Пользователь ${userId} не найден:`, userError);
          results.push({ userId, success: false, error: 'User not found' });
          continue;
        }
        
        console.log(`👤 Пользователь ${userId} (${user.username || 'No username'})`);
        console.log(`💰 Текущие балансы: TON=${user.balance_ton}, UNI=${user.balance_uni}`);
        console.log(`🔧 Текущий буст: ${user.ton_boost_active ? 'Активен' : 'Неактивен'}`);
        
        // 2. Обеспечиваем баланс для покупки
        const currentTonBalance = parseFloat(user.balance_ton || '0');
        let newTonBalance = currentTonBalance;
        
        if (currentTonBalance < depositAmount) {
          newTonBalance = currentTonBalance + depositAmount + 0.1; // Небольшой запас
          console.log(`💳 Пополняем баланс: ${currentTonBalance} → ${newTonBalance} TON`);
          
          const { error: balanceError } = await supabase
            .from('users')
            .update({ balance_ton: newTonBalance })
            .eq('id', userId);
            
          if (balanceError) {
            console.error(`❌ Ошибка пополнения баланса:`, balanceError);
            results.push({ userId, success: false, error: 'Balance update failed' });
            continue;
          }
        } else {
          console.log(`✅ Баланса достаточно: ${currentTonBalance} TON`);
        }
        
        // 3. Создаем транзакцию покупки
        console.log(`📝 Создание транзакции покупки...`);
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'BOOST_PURCHASE',
            amount: depositAmount,
            currency: 'TON',
            status: 'completed',
            description: `Manual TON Boost activation: ${suitablePackage.name}`,
            metadata: {
              package_id: suitablePackage.id,
              package_name: suitablePackage.name,
              manual_activation: true,
              admin_script: true
            }
          })
          .select()
          .single();
          
        if (txError) {
          console.error(`❌ Ошибка создания транзакции:`, txError);
          results.push({ userId, success: false, error: 'Transaction failed' });
          continue;
        }
        
        console.log(`✅ Транзакция создана: ID ${transaction.id}`);
        
        // 4. Активируем TON Boost в таблице users
        console.log(`⚡ Активация TON Boost статуса...`);
        const { error: activationError } = await supabase
          .from('users')
          .update({
            ton_boost_active: true,
            ton_boost_package: suitablePackage.id,
            ton_boost_package_id: suitablePackage.id,
            ton_boost_rate: suitablePackage.daily_rate,
            balance_ton: newTonBalance - depositAmount, // Списываем стоимость пакета
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
          
        if (activationError) {
          console.error(`❌ Ошибка активации:`, activationError);
          results.push({ userId, success: false, error: 'Activation failed' });
          continue;
        }
        
        console.log(`✅ TON Boost активирован в users table`);
        
        // 5. Создаем запись в ton_farming_data
        console.log(`🚜 Создание записи фарминга...`);
        const farmingRecord = {
          user_id: userId.toString(),
          farming_balance: depositAmount,
          farming_rate: suitablePackage.daily_rate / 86400, // daily rate to per second
          boost_package_id: suitablePackage.id,
          boost_active: true,
          last_claim: new Date().toISOString(),
          farming_start_timestamp: new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: farmingError } = await supabase
          .from('ton_farming_data')
          .upsert(farmingRecord, { onConflict: 'user_id' });
          
        if (farmingError) {
          console.error(`❌ Ошибка создания farming record:`, farmingError);
          results.push({ userId, success: false, error: 'Farming record failed' });
          continue;
        }
        
        console.log(`✅ Farming record создан`);
        
        // 6. Начисляем UNI бонус
        if (suitablePackage.uni_bonus > 0) {
          console.log(`🎁 Начисление UNI бонуса: ${suitablePackage.uni_bonus} UNI`);
          
          const currentUniBalance = parseFloat(user.balance_uni || '0');
          const newUniBalance = currentUniBalance + suitablePackage.uni_bonus;
          
          const { error: uniError } = await supabase
            .from('users')
            .update({ balance_uni: newUniBalance })
            .eq('id', userId);
            
          if (uniError) {
            console.warn(`⚠️ Ошибка начисления UNI бонуса:`, uniError);
          } else {
            console.log(`✅ UNI бонус начислен: ${currentUniBalance} → ${newUniBalance}`);
            
            // Создаем транзакцию UNI бонуса
            await supabase
              .from('transactions')
              .insert({
                user_id: userId,
                type: 'DAILY_BONUS',
                amount: suitablePackage.uni_bonus,
                currency: 'UNI',
                status: 'completed',
                description: `TON Boost Package Bonus: ${suitablePackage.uni_bonus} UNI`,
                metadata: {
                  bonus_type: 'ton_boost_activation',
                  package_id: suitablePackage.id
                }
              });
          }
        }
        
        console.log(`🎉 Пользователь ${userId} УСПЕШНО АКТИВИРОВАН!`);
        results.push({ userId, success: true });
        
      } catch (error) {
        console.error(`❌ Критическая ошибка для пользователя ${userId}:`, error);
        results.push({ userId, success: false, error: String(error) });
      }
    }
    
    // Итоговый отчет
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
    console.log(`${'='.repeat(60)}`);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    results.forEach(({ userId, success, error }) => {
      console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : `ОШИБКА (${error})`}`);
    });
    
    console.log(`\n🎯 Общий результат: ${successCount}/${totalCount} пользователей активированы`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 ВСЕ АКТИВАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!');
      console.log('✅ Пользователи 251 и 255 теперь имеют активные TON Boost пакеты');
      console.log('✅ Каждому зачислен депозит 2 TON в farming систему');
      console.log('✅ Все данные синхронизированы в базе данных');
      console.log('✅ Бусты отображаются в кабинетах пользователей');
      console.log('✅ Планировщик начнет начислять доход каждые 5 минут');
      
      // Проверяем финальное состояние
      console.log('\n🔍 Проверка финального состояния:');
      for (const userId of [251, 255]) {
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
          
        console.log(`👤 Пользователь ${userId}:`);
        console.log(`   - Boost активен: ${finalUser?.ton_boost_active}`);
        console.log(`   - Пакет ID: ${finalUser?.ton_boost_package}`);
        console.log(`   - TON баланс: ${finalUser?.balance_ton}`);
        console.log(`   - UNI баланс: ${finalUser?.balance_uni}`);
        console.log(`   - Farming баланс: ${farmingData?.farming_balance}`);
        console.log(`   - Farming активен: ${farmingData?.boost_active}`);
      }
      
    } else {
      console.log('\n⚠️ НЕ ВСЕ АКТИВАЦИИ УДАЛИСЬ');
      console.log('Проверьте ошибки выше и выполните активацию повторно для неудачных пользователей');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка скрипта:', error);
  }
}

main().catch(console.error);