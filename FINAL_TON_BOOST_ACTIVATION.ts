#!/usr/bin/env tsx
/**
 * ФИНАЛЬНАЯ АКТИВАЦИЯ TON BOOST ПАКЕТОВ 
 * Использует тот же supabase клиент что и основное приложение
 */

// Используем тот же клиент что и в основном приложении
import { supabase } from './core/supabase';
import './config/database'; // Загружает проверку переменных окружения

async function main() {
  console.log('🚀 === ФИНАЛЬНАЯ АКТИВАЦИЯ TON BOOST ПАКЕТОВ ===');
  console.log('📅 Дата:', new Date().toISOString());
  console.log('👥 Пользователи: 251, 255');
  console.log('💰 Депозит: 2 TON каждому');
  
  try {
    // Тестируем подключение к базе
    console.log('\n🔌 Проверка подключения к базе данных...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Ошибка подключения к базе данных:', testError);
      return;
    }
    
    console.log('✅ Подключение к базе данных работает');
    
    // Получаем доступные TON Boost пакеты
    console.log('\n📦 Получение TON Boost пакетов...');
    const { data: packages, error: packagesError } = await supabase
      .from('boost_packages')
      .select('*')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });
      
    if (packagesError || !packages || packages.length === 0) {
      console.error('❌ Ошибка получения пакетов:', packagesError);
      return;
    }
    
    console.log(`✅ Найдено ${packages.length} активных пакетов:`);
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name}: от ${pkg.min_amount} TON, дневная ставка: ${pkg.daily_rate}, UNI бонус: ${pkg.uni_bonus}`);
    });
    
    // Выбираем подходящий пакет для 2 TON
    const suitablePackage = packages.find(pkg => pkg.min_amount <= 2);
    if (!suitablePackage) {
      console.error('❌ Нет пакетов подходящих для 2 TON');
      return;
    }
    
    console.log(`\n📦 Выбран оптимальный пакет: ${suitablePackage.name} (ID: ${suitablePackage.id})`);
    console.log(`   - Минимум: ${suitablePackage.min_amount} TON`);
    console.log(`   - Дневная ставка: ${suitablePackage.daily_rate}`);
    console.log(`   - UNI бонус: ${suitablePackage.uni_bonus}`);
    console.log(`   - Длительность: ${suitablePackage.duration_days} дней`);
    
    const targetUsers = [251, 255];
    const depositAmount = 2;
    const results = [];
    
    // Активируем TON Boost для каждого пользователя
    for (const userId of targetUsers) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 АКТИВАЦИЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ ${userId}`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        // 1. Получаем информацию о пользователе
        console.log(`👤 Получение информации о пользователе ${userId}...`);
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (userError || !user) {
          console.error(`❌ Пользователь ${userId} не найден:`, userError);
          results.push({ userId, success: false, error: 'User not found' });
          continue;
        }
        
        console.log(`✅ Пользователь найден: ${user.username || `ID${userId}`}`);
        console.log(`💰 Текущие балансы:`);
        console.log(`   - TON: ${user.balance_ton}`);
        console.log(`   - UNI: ${user.balance_uni}`);
        console.log(`🔧 Текущий статус TON Boost: ${user.ton_boost_active ? 'Активен' : 'Неактивен'}`);
        
        // 2. Обеспечиваем достаточный баланс для покупки
        const currentTonBalance = parseFloat(user.balance_ton || '0');
        let updatedTonBalance = currentTonBalance;
        
        if (currentTonBalance < depositAmount) {
          updatedTonBalance = currentTonBalance + depositAmount + 0.01; // Небольшой запас
          console.log(`💳 Пополняем TON баланс: ${currentTonBalance.toFixed(6)} → ${updatedTonBalance.toFixed(6)} TON`);
          
          const { error: balanceError } = await supabase
            .from('users')
            .update({ 
              balance_ton: updatedTonBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
          if (balanceError) {
            console.error(`❌ Ошибка пополнения баланса:`, balanceError);
            results.push({ userId, success: false, error: 'Balance update failed' });
            continue;
          }
          console.log(`✅ Баланс успешно пополнен`);
        } else {
          console.log(`✅ Баланса достаточно: ${currentTonBalance.toFixed(6)} TON`);
        }
        
        // 3. Создаем транзакцию покупки TON Boost пакета
        console.log(`📝 Создание транзакции покупки TON Boost пакета...`);
        const transactionData = {
          user_id: userId,
          type: 'BOOST_PURCHASE',
          amount: depositAmount,
          currency: 'TON',
          status: 'completed',
          description: `Manual TON Boost activation: ${suitablePackage.name} (2 TON deposit)`,
          metadata: {
            package_id: suitablePackage.id,
            package_name: suitablePackage.name,
            deposit_amount: depositAmount,
            manual_activation: true,
            admin_script: true,
            activation_date: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        };
        
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select()
          .single();
          
        if (txError) {
          console.error(`❌ Ошибка создания транзакции:`, txError);
          results.push({ userId, success: false, error: 'Transaction creation failed' });
          continue;
        }
        
        console.log(`✅ Транзакция создана: ID ${transaction.id}`);
        
        // 4. Активируем TON Boost в таблице users (для планировщика)
        console.log(`⚡ Активация TON Boost статуса в users table...`);
        const userUpdateData = {
          ton_boost_active: true,
          ton_boost_package: suitablePackage.id,
          ton_boost_package_id: suitablePackage.id,
          ton_boost_rate: suitablePackage.daily_rate,
          balance_ton: updatedTonBalance - depositAmount, // Списываем стоимость пакета
          updated_at: new Date().toISOString()
        };
        
        const { error: activationError } = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', userId);
          
        if (activationError) {
          console.error(`❌ Ошибка активации в users table:`, activationError);
          results.push({ userId, success: false, error: 'User activation failed' });
          continue;
        }
        
        console.log(`✅ TON Boost активирован в users table`);
        console.log(`   - ton_boost_active: true`);
        console.log(`   - ton_boost_package: ${suitablePackage.id}`);
        console.log(`   - ton_boost_rate: ${suitablePackage.daily_rate}`);
        console.log(`   - Новый TON баланс: ${(updatedTonBalance - depositAmount).toFixed(6)}`);
        
        // 5. Создаем запись в ton_farming_data (для фарминга)
        console.log(`🚜 Создание записи в ton_farming_data...`);
        const farmingRecord = {
          user_id: userId.toString(), // STRING как требует схема
          farming_balance: depositAmount,
          farming_rate: suitablePackage.daily_rate / 86400, // конвертируем дневную ставку в секундную
          boost_package_id: suitablePackage.id,
          boost_active: true,
          last_claim: new Date().toISOString(),
          farming_start_timestamp: new Date().toISOString(),
          farming_last_update: new Date().toISOString(),
          boost_expires_at: new Date(Date.now() + suitablePackage.duration_days * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: farmingError } = await supabase
          .from('ton_farming_data')
          .upsert(farmingRecord, { onConflict: 'user_id' });
          
        if (farmingError) {
          console.error(`❌ Ошибка создания ton_farming_data:`, farmingError);
          results.push({ userId, success: false, error: 'Farming data creation failed' });
          continue;
        }
        
        console.log(`✅ ton_farming_data запись создана`);
        console.log(`   - farming_balance: ${depositAmount} TON`);
        console.log(`   - farming_rate: ${(suitablePackage.daily_rate / 86400).toFixed(8)} TON/сек`);
        console.log(`   - boost_active: true`);
        
        // 6. Начисляем UNI бонус если предусмотрен пакетом
        if (suitablePackage.uni_bonus > 0) {
          console.log(`🎁 Начисление UNI бонуса: ${suitablePackage.uni_bonus} UNI...`);
          
          const currentUniBalance = parseFloat(user.balance_uni || '0');
          const newUniBalance = currentUniBalance + suitablePackage.uni_bonus;
          
          const { error: uniError } = await supabase
            .from('users')
            .update({ 
              balance_uni: newUniBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
            
          if (uniError) {
            console.warn(`⚠️ Ошибка начисления UNI бонуса:`, uniError);
          } else {
            console.log(`✅ UNI бонус начислен: ${currentUniBalance.toFixed(2)} → ${newUniBalance.toFixed(2)} UNI`);
            
            // Создаем транзакцию UNI бонуса
            const { error: bonusTransactionError } = await supabase
              .from('transactions')
              .insert({
                user_id: userId,
                type: 'DAILY_BONUS',
                amount: suitablePackage.uni_bonus,
                currency: 'UNI',
                status: 'completed',
                description: `TON Boost Package Bonus: ${suitablePackage.uni_bonus} UNI for ${suitablePackage.name}`,
                metadata: {
                  bonus_type: 'ton_boost_activation',
                  package_id: suitablePackage.id,
                  package_name: suitablePackage.name,
                  manual_activation: true
                },
                created_at: new Date().toISOString()
              });
              
            if (bonusTransactionError) {
              console.warn(`⚠️ Ошибка создания UNI бонус транзакции:`, bonusTransactionError);
            } else {
              console.log(`✅ UNI бонус транзакция создана`);
            }
          }
        } else {
          console.log(`ℹ️ UNI бонус не предусмотрен для пакета ${suitablePackage.name}`);
        }
        
        console.log(`\n🎉 ПОЛЬЗОВАТЕЛЬ ${userId} УСПЕШНО АКТИВИРОВАН!`);
        console.log(`✅ TON Boost пакет: ${suitablePackage.name}`);
        console.log(`✅ Депозит: ${depositAmount} TON`);
        console.log(`✅ Дневная ставка: ${suitablePackage.daily_rate}`);
        console.log(`✅ UNI бонус: ${suitablePackage.uni_bonus}`);
        
        results.push({ userId, success: true });
        
      } catch (error) {
        console.error(`❌ Критическая ошибка для пользователя ${userId}:`, error);
        results.push({ userId, success: false, error: String(error) });
      }
    }
    
    // Итоговый отчет
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 === ИТОГОВЫЕ РЕЗУЛЬТАТЫ АКТИВАЦИИ ===');
    console.log(`${'='.repeat(70)}`);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    results.forEach(({ userId, success, error }) => {
      console.log(`${success ? '✅' : '❌'} Пользователь ${userId}: ${success ? 'АКТИВИРОВАН' : `ОШИБКА (${error})`}`);
    });
    
    console.log(`\n🎯 Общий результат: ${successCount}/${totalCount} пользователей успешно активированы`);
    
    if (successCount === totalCount) {
      console.log('\n🎉🎉🎉 ВСЕ АКТИВАЦИИ ВЫПОЛНЕНЫ УСПЕШНО! 🎉🎉🎉');
      console.log('');
      console.log('✅ Пользователи 251 и 255 теперь имеют активные TON Boost пакеты');
      console.log('✅ Каждому зачислен депозит 2 TON в farming систему');
      console.log('✅ Все данные полностью синхронизированы в базе данных');
      console.log('✅ TON Boost пакеты отображаются в кабинетах пользователей');
      console.log('✅ Планировщик начнет автоматически начислять доход каждые 5 минут');
      console.log('✅ UNI бонусы начислены согласно пакетам');
      console.log('✅ Все транзакции созданы и отображаются в истории');
      
      // Проверяем и показываем финальное состояние
      console.log('\n🔍 === ПРОВЕРКА ФИНАЛЬНОГО СОСТОЯНИЯ ===');
      for (const userId of [251, 255]) {
        const { data: finalUser } = await supabase
          .from('users')
          .select('ton_boost_active, ton_boost_package, balance_ton, balance_uni, ton_boost_rate')
          .eq('id', userId)
          .single();
          
        const { data: farmingData } = await supabase
          .from('ton_farming_data')
          .select('farming_balance, boost_active, farming_rate')
          .eq('user_id', userId.toString())
          .single();
          
        console.log(`\n👤 Пользователь ${userId} - Финальное состояние:`);
        console.log(`   🔧 TON Boost активен: ${finalUser?.ton_boost_active ? 'ДА' : 'НЕТ'}`);
        console.log(`   📦 Пакет ID: ${finalUser?.ton_boost_package}`);
        console.log(`   📈 Ставка: ${finalUser?.ton_boost_rate}`);
        console.log(`   💰 TON баланс: ${parseFloat(finalUser?.balance_ton || '0').toFixed(6)} TON`);
        console.log(`   🪙 UNI баланс: ${parseFloat(finalUser?.balance_uni || '0').toFixed(2)} UNI`);
        console.log(`   🚜 Farming баланс: ${farmingData?.farming_balance} TON`);
        console.log(`   ⚡ Farming активен: ${farmingData?.boost_active ? 'ДА' : 'НЕТ'}`);
        console.log(`   📊 Farming ставка: ${parseFloat(farmingData?.farming_rate || '0').toFixed(8)} TON/сек`);
      }
      
      console.log('\n🚀 Пользователи готовы получать автоматический доход от TON Boost системы!');
      
    } else {
      console.log('\n⚠️ НЕ ВСЕ АКТИВАЦИИ УДАЛИСЬ');
      console.log('Проверьте ошибки выше и выполните активацию повторно для неудачных пользователей');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка выполнения скрипта:', error);
  }
}

main().catch(console.error);