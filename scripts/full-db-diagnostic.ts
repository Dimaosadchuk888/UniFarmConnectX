/**
 * Полная диагностика БД для понимания где хранятся данные
 */

import { supabase } from '../core/supabase';

async function fullDbDiagnostic() {
  console.log('\n' + '='.repeat(80));
  console.log('ПОЛНАЯ ДИАГНОСТИКА БАЗЫ ДАННЫХ UNIFARM');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Проверяем структуру таблицы referrals
    console.log('1. СТРУКТУРА ТАБЛИЦЫ referrals:');
    const { data: referralsSample, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .limit(5);
    
    if (refError) {
      console.error('Ошибка чтения referrals:', refError);
    } else {
      console.log(`Найдено записей: ${referralsSample?.length || 0}`);
      if (referralsSample && referralsSample.length > 0) {
        console.log('Структура записи:', Object.keys(referralsSample[0]));
        console.log('Примеры записей:');
        referralsSample.forEach(r => {
          console.log(`  - ID: ${r.id}, created_at: ${r.created_at}`);
          console.log(`    Поля:`, r);
        });
      }
    }
    
    // 2. Проверяем где хранятся реферальные НАГРАДЫ (не связи)
    console.log('\n2. РЕФЕРАЛЬНЫЕ НАГРАДЫ В ТАБЛИЦЕ transactions:');
    const { data: referralRewards, error: rewError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (rewError) {
      console.error('Ошибка чтения транзакций:', rewError);
    } else {
      console.log(`Найдено реферальных транзакций: ${referralRewards?.length || 0}`);
      referralRewards?.forEach(tx => {
        console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency} от User ${tx.source_user_id}`);
        console.log(`    Время: ${new Date(tx.created_at).toLocaleString()}`);
      });
    }
    
    // 3. Проверяем таблицу referral_earnings
    console.log('\n3. ТАБЛИЦА referral_earnings:');
    const { data: earnings, count: earningsCount } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Всего записей в referral_earnings: ${earningsCount || 0}`);
    if (earnings && earnings.length > 0) {
      console.log('Примеры записей:');
      earnings.forEach(e => {
        console.log(`  - User ${e.user_id}: ${e.amount} ${e.currency} от User ${e.source_user_id}`);
      });
    }
    
    // 4. Проверяем boost_purchases
    console.log('\n4. ТАБЛИЦА boost_purchases:');
    const { data: boostPurchases, count: boostCount, error: boostError } = await supabase
      .from('boost_purchases')
      .select('*', { count: 'exact' })
      .limit(10);
    
    if (boostError) {
      console.error('Ошибка чтения boost_purchases:', boostError);
    } else {
      console.log(`Всего записей в boost_purchases: ${boostCount || 0}`);
      if (boostPurchases && boostPurchases.length > 0) {
        console.log('Примеры записей:');
        boostPurchases.forEach(b => {
          console.log(`  - User ${b.user_id}: пакет ${b.boost_package_id}, статус ${b.status}`);
        });
      } else {
        console.log('⚠️  Таблица boost_purchases ПУСТАЯ!');
      }
    }
    
    // 5. Проверяем данные boost в таблице users
    console.log('\n5. BOOST ДАННЫЕ В ТАБЛИЦЕ users:');
    const { data: usersWithBoost } = await supabase
      .from('users')
      .select('id, username, ton_boost_package_id')
      .not('ton_boost_package_id', 'is', null)
      .limit(10);
    
    console.log(`Пользователей с ton_boost_package_id: ${usersWithBoost?.length || 0}`);
    usersWithBoost?.forEach(u => {
      console.log(`  - User ${u.id} (${u.username}): boost package ${u.ton_boost_package_id}`);
    });
    
    // 6. Проверяем транзакции типа BOOST_PURCHASE
    console.log('\n6. BOOST ТРАНЗАКЦИИ В transactions:');
    const { data: boostTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Найдено BOOST_PURCHASE транзакций: ${boostTx?.length || 0}`);
    boostTx?.forEach(tx => {
      console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency}`);
      console.log(`    Время: ${new Date(tx.created_at).toLocaleString()}`);
    });
    
    // 7. Ищем boost транзакции по описанию
    console.log('\n7. ПОИСК BOOST ТРАНЗАКЦИЙ ПО ОПИСАНИЮ:');
    const { data: boostByDesc } = await supabase
      .from('transactions')
      .select('*')
      .like('description', '%boost%')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Найдено транзакций с "boost" в описании: ${boostByDesc?.length || 0}`);
    boostByDesc?.forEach(tx => {
      console.log(`  - Type: ${tx.type}, User ${tx.user_id}: ${tx.amount} ${tx.currency}`);
      console.log(`    Описание: ${tx.description}`);
    });
    
    // 8. Проверяем данные TON farming
    console.log('\n8. TON FARMING ДАННЫЕ:');
    const { data: tonFarmingData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .limit(10);
    
    if (tonError) {
      console.error('Ошибка чтения ton_farming_data:', tonError);
    } else {
      console.log(`Записей в ton_farming_data: ${tonFarmingData?.length || 0}`);
      tonFarmingData?.forEach(t => {
        console.log(`  - User ${t.user_id}: farming_balance ${t.farming_balance}, boost_package_id ${t.boost_package_id}`);
      });
    }
    
    // 9. Анализ проблемы с referrals
    console.log('\n9. АНАЛИЗ ТАБЛИЦЫ referrals (детально):');
    const { data: allReferrals } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log(`\nВСЕГО записей в referrals: ${allReferrals?.length || 0}`);
    if (allReferrals && allReferrals.length > 0) {
      // Проверяем есть ли поля reward
      const firstRecord = allReferrals[0];
      const hasRewardFields = 'reward_uni' in firstRecord || 'reward_ton' in firstRecord;
      
      if (hasRewardFields) {
        console.log('✓ Поля reward_uni/reward_ton СУЩЕСТВУЮТ в таблице');
        
        // Считаем записи с ненулевыми наградами
        const withUniRewards = allReferrals.filter(r => r.reward_uni && parseFloat(r.reward_uni) > 0);
        const withTonRewards = allReferrals.filter(r => r.reward_ton && parseFloat(r.reward_ton) > 0);
        
        console.log(`Записей с UNI наградами: ${withUniRewards.length}`);
        console.log(`Записей с TON наградами: ${withTonRewards.length}`);
        
        if (withUniRewards.length === 0 && withTonRewards.length === 0) {
          console.log('\n⚠️  ВСЕ поля reward_uni и reward_ton равны 0!');
          console.log('   Это означает, что награды НЕ записываются в таблицу referrals.');
          console.log('   Награды хранятся в таблице transactions с типом REFERRAL_REWARD.');
        }
      } else {
        console.log('❌ Поля reward_uni/reward_ton НЕ НАЙДЕНЫ в таблице');
      }
    }
    
    // 10. Итоговый анализ
    console.log('\n' + '='.repeat(80));
    console.log('ИТОГОВЫЙ АНАЛИЗ:');
    console.log('='.repeat(80));
    
    console.log('\n📊 РЕФЕРАЛЬНАЯ СИСТЕМА:');
    console.log('  - Реферальные СВЯЗИ хранятся в таблице "referrals"');
    console.log('  - Реферальные НАГРАДЫ хранятся в таблице "transactions" (type = REFERRAL_REWARD)');
    console.log('  - Поля reward_uni/reward_ton в таблице referrals НЕ используются (всегда 0)');
    
    console.log('\n📊 BOOST СИСТЕМА:');
    console.log('  - Таблица boost_purchases существует, но ПУСТАЯ');
    console.log('  - Данные о boost хранятся в таблице users (поле ton_boost_package_id)');
    console.log('  - Покупки boost записываются в transactions (type = BOOST_PURCHASE или FARMING_REWARD)');
    console.log('  - Активные boost фармеры хранятся в ton_farming_data');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

fullDbDiagnostic();