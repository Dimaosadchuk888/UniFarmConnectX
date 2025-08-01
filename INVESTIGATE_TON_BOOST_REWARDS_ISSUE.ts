// РАССЛЕДОВАНИЕ ПРОБЛЕМЫ TON BOOST НАГРАД
// Проверяем почему пользователи не получают награды за TON Boost
// Дата: 01 августа 2025
// БЕЗ ИЗМЕНЕНИЙ В КОДЕ - ТОЛЬКО АНАЛИЗ

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface TonBoostInvestigation {
  tableExists: boolean;
  purchasesCount: number;
  usersPurchases: any[];
  rewardTransactions: any[];
  systemSchedulers: any[];
  boostIncomeAnalysis: {
    expectedRewards: number;
    actualRewards: number;
    missingRewards: number;
  };
}

async function investigateTonBoostSystem(): Promise<TonBoostInvestigation> {
  console.log('🔍 РАССЛЕДОВАНИЕ TON BOOST СИСТЕМЫ');
  console.log('='.repeat(70));

  const investigation: TonBoostInvestigation = {
    tableExists: false,
    purchasesCount: 0,
    usersPurchases: [],
    rewardTransactions: [],
    systemSchedulers: [],
    boostIncomeAnalysis: {
      expectedRewards: 0,
      actualRewards: 0,
      missingRewards: 0
    }
  };

  // 1. Проверяем существование таблицы ton_boost_purchases
  try {
    console.log('\n📋 1. ПРОВЕРКА ТАБЛИЦЫ ton_boost_purchases:');
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('ton_boost_purchases')
      .select('*')
      .order('created_at', { ascending: false });

    if (purchasesError) {
      console.log(`❌ Ошибка доступа к таблице: ${purchasesError.message}`);
      investigation.tableExists = false;
    } else {
      console.log(`✅ Таблица существует`);
      console.log(`📊 Всего записей: ${purchases?.length || 0}`);
      investigation.tableExists = true;
      investigation.purchasesCount = purchases?.length || 0;
      investigation.usersPurchases = purchases || [];
      
      if (purchases && purchases.length > 0) {
        console.log(`📝 Последние покупки:`);
        purchases.slice(0, 5).forEach(purchase => {
          console.log(`   User ${purchase.user_id}: ${purchase.package_type} - ${purchase.amount_ton} TON (${purchase.status})`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Критическая ошибка при проверке таблицы: ${error}`);
    investigation.tableExists = false;
  }

  // 2. Ищем все транзакции связанные с TON Boost доходами
  try {
    console.log('\n💰 2. АНАЛИЗ TON BOOST ТРАНЗАКЦИЙ:');
    
    // Ищем транзакции типа TON_BOOST_INCOME или FARMING_REWARD с TON Boost метаданными
    const { data: boostRewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('*')
      .or('type.eq.TON_BOOST_INCOME,type.eq.FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(50);

    if (rewardsError) {
      console.log(`❌ Ошибка получения транзакций: ${rewardsError.message}`);
    } else {
      console.log(`📊 Найдено транзакций FARMING_REWARD/TON_BOOST_INCOME: ${boostRewards?.length || 0}`);
      
      // Фильтруем только те, что могут быть связаны с TON Boost
      const potentialBoostRewards = (boostRewards || []).filter(tx => 
        tx.metadata?.boost_multiplier || 
        tx.metadata?.ton_boost_active || 
        tx.description?.includes('boost') ||
        tx.description?.includes('TON Boost')
      );
      
      console.log(`🎯 Потенциальные TON Boost награды: ${potentialBoostRewards.length}`);
      investigation.rewardTransactions = potentialBoostRewards;
      
      if (potentialBoostRewards.length > 0) {
        console.log(`📝 Примеры TON Boost наград:`);
        potentialBoostRewards.slice(0, 3).forEach(tx => {
          console.log(`   User ${tx.user_id}: ${tx.amount_uni || tx.amount_ton} ${tx.amount_uni ? 'UNI' : 'TON'} - ${tx.created_at.substring(0, 19)}`);
        });
      } else {
        console.log(`⚠️ НЕ НАЙДЕНО транзакций с TON Boost наградами!`);
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка анализа транзакций: ${error}`);
  }

  // 3. Проверяем пользователей с активным TON Boost
  try {
    console.log('\n👥 3. ПОЛЬЗОВАТЕЛИ С АКТИВНЫМ TON BOOST:');
    
    const { data: boostUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_multiplier, balance_ton, balance_uni, uni_farming_active')
      .eq('ton_boost_active', true);

    if (usersError) {
      console.log(`❌ Ошибка получения пользователей: ${usersError.message}`);
    } else {
      console.log(`👤 Пользователей с активным TON Boost: ${boostUsers?.length || 0}`);
      
      if (boostUsers && boostUsers.length > 0) {
        for (const user of boostUsers) {
          console.log(`\n   User ${user.id} (@${user.username || 'N/A'}):`);
          console.log(`      TON Boost: ✅ активен (${user.ton_boost_multiplier || 2}x)`);
          console.log(`      UNI фарминг: ${user.uni_farming_active ? '✅ активен' : '❌ неактивен'}`);
          console.log(`      Балансы: ${user.balance_uni} UNI, ${user.balance_ton} TON`);
          
          // Проверяем последние награды этого пользователя
          const { data: userRewards } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'FARMING_REWARD')
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (userRewards && userRewards.length > 0) {
            console.log(`      Последние FARMING_REWARD (5 шт.):`);
            userRewards.forEach(reward => {
              console.log(`         ${reward.amount_uni} UNI - ${reward.created_at.substring(0, 19)}`);
            });
          } else {
            console.log(`      ❌ НЕТ наград FARMING_REWARD!`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка анализа пользователей: ${error}`);
  }

  // 4. Проверяем системные планировщики (cron jobs)
  try {
    console.log('\n⏰ 4. ПРОВЕРКА СИСТЕМНЫХ ПЛАНИРОВЩИКОВ:');
    
    // Проверяем работают ли планировщики фарминга
    const { data: recentRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // последние 10 минут
      .order('created_at', { ascending: false });

    console.log(`📊 FARMING_REWARD за последние 10 минут: ${recentRewards?.length || 0}`);
    
    if (recentRewards && recentRewards.length > 0) {
      console.log(`✅ Планировщик фарминга работает`);
      console.log(`📝 Последние награды:`);
      recentRewards.slice(0, 3).forEach(reward => {
        console.log(`   User ${reward.user_id}: ${reward.amount_uni} UNI - ${reward.created_at.substring(11, 19)}`);
      });
    } else {
      console.log(`⚠️ Планировщик фарминга НЕ работает или нет активных пользователей`);
    }

  } catch (error) {
    console.log(`❌ Ошибка проверки планировщиков: ${error}`);
  }

  // 5. Анализ файлов планировщиков
  console.log('\n🔧 5. ФАЙЛЫ ПЛАНИРОВЩИКОВ:');
  console.log('   Проверяем существование ключевых файлов...');
  
  return investigation;
}

async function analyzeBoostRewardLogic(): Promise<void> {
  console.log('\n🧠 АНАЛИЗ ЛОГИКИ TON BOOST НАГРАД:');
  console.log('='.repeat(70));

  try {
    // Ищем пользователей которые должны получать TON Boost награды
    const { data: eligibleUsers } = await supabase
      .from('users')
      .select('id, username, ton_boost_active, ton_boost_multiplier, uni_farming_active')
      .eq('ton_boost_active', true)
      .eq('uni_farming_active', true);

    console.log(`👥 Пользователей, которые ДОЛЖНЫ получать TON Boost награды: ${eligibleUsers?.length || 0}`);

    if (eligibleUsers && eligibleUsers.length > 0) {
      for (const user of eligibleUsers) {
        console.log(`\n🔍 Анализ пользователя ${user.id}:`);
        
        // Проверяем есть ли у него депозит в фарминге
        const { data: farmingDeposits } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'FARMING_DEPOSIT')
          .order('created_at', { ascending: false })
          .limit(1);

        if (farmingDeposits && farmingDeposits.length > 0) {
          const deposit = farmingDeposits[0];
          console.log(`   ✅ Есть депозит в фарминге: ${deposit.amount_uni} UNI`);
          
          // Проверяем получает ли он награды
          const { data: recentRewards } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'FARMING_REWARD')
            .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // последние 5 минут
            .order('created_at', { ascending: false});

          if (recentRewards && recentRewards.length > 0) {
            const avgReward = recentRewards.reduce((sum, r) => sum + parseFloat(r.amount_uni || '0'), 0) / recentRewards.length;
            console.log(`   ✅ Получает награды: ${recentRewards.length} за 5 мин, средняя: ${avgReward.toFixed(6)} UNI`);
            
            // Анализируем соответствует ли размер награды boost множителю
            const baseReward = parseFloat(deposit.amount_uni) * 0.01 / (24 * 60 * 60); // 1% в день в секундах
            const expectedBoostReward = baseReward * (user.ton_boost_multiplier || 2);
            const actualReward = avgReward;
            
            console.log(`   📊 Ожидаемая награда с boost: ${expectedBoostReward.toFixed(8)} UNI/сек`);
            console.log(`   📊 Фактическая награда: ${(actualReward/30).toFixed(8)} UNI/сек`); // за 30 сек
            
            if (Math.abs(actualReward/30 - expectedBoostReward) < expectedBoostReward * 0.1) {
              console.log(`   ✅ TON Boost множитель применяется ПРАВИЛЬНО`);
            } else {
              console.log(`   ❌ TON Boost множитель НЕ применяется или работает неправильно`);
            }
          } else {
            console.log(`   ❌ НЕ получает награды за последние 5 минут`);
          }
        } else {
          console.log(`   ❌ Нет депозитов в фарминге`);
        }
      }
    } else {
      console.log(`⚠️ Нет пользователей, которые должны получать TON Boost награды`);
      console.log(`   (нужно: ton_boost_active = true И uni_farming_active = true)`);
    }

  } catch (error) {
    console.log(`❌ Ошибка анализа логики: ${error}`);
  }
}

async function main(): Promise<void> {
  console.log('🚨 РАССЛЕДОВАНИЕ: ПОЧЕМУ НЕТ TON BOOST НАГРАД');
  console.log('='.repeat(80));
  console.log('Дата:', new Date().toISOString());
  console.log('');

  const investigation = await investigateTonBoostSystem();
  await analyzeBoostRewardLogic();

  console.log('\n' + '='.repeat(80));
  console.log('🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ');
  console.log('='.repeat(80));

  if (!investigation.tableExists) {
    console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Таблица ton_boost_purchases недоступна');
  } else if (investigation.purchasesCount === 0) {
    console.log('⚠️ В таблице ton_boost_purchases нет записей');
  } else {
    console.log(`✅ Таблица ton_boost_purchases содержит ${investigation.purchasesCount} записей`);
  }

  if (investigation.rewardTransactions.length === 0) {
    console.log('❌ ПРОБЛЕМА: Не найдено транзакций с TON Boost наградами');
    console.log('💡 Возможные причины:');
    console.log('   - Планировщик не запускается');
    console.log('   - Логика начисления TON Boost наград не работает');
    console.log('   - Награды начисляются как обычные FARMING_REWARD без пометки boost');
  }

  console.log('\n🔧 СЛЕДУЮЩИЕ ШАГИ ДЛЯ ИСПРАВЛЕНИЯ:');
  console.log('1. Проверить планировщики фарминга');
  console.log('2. Проверить логику применения TON Boost множителя');
  console.log('3. Убедиться что TON Boost награды правильно помечаются в метаданных');
}

// Запуск расследования
main().catch(console.error);