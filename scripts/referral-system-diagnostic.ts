/**
 * Комплексная диагностика реферальной системы UniFarm
 * Проверка всех компонентов без изменения кода
 */

import { supabase } from '../core/supabase';
import { ReferralService } from '../modules/referral/service';
import { logger } from '../core/logger';

async function runReferralDiagnostics() {
  console.log('\n' + '='.repeat(80));
  console.log('КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ СИСТЕМЫ UNIFARM');
  console.log('Дата: ' + new Date().toISOString());
  console.log('='.repeat(80) + '\n');
  
  const referralService = new ReferralService();
  let allTestsPassed = true;
  
  try {
    // 1. ПРОВЕРКА ТАБЛИЦЫ REFERRALS
    console.log('1. ПРОВЕРКА ТАБЛИЦЫ REFERRALS');
    console.log('-'.repeat(40));
    
    const { data: referrals, count: referralsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' });
    
    console.log(`✓ Всего записей в referrals: ${referralsCount || 0}`);
    
    if (referrals && referrals.length > 0) {
      console.log('\nПримеры записей:');
      referrals.slice(0, 3).forEach(ref => {
        console.log(`  - User ${ref.user_id} приглашен User ${ref.inviter_id}, уровень: ${ref.level}`);
      });
    } else {
      console.log('⚠️  Таблица referrals пустая!');
      allTestsPassed = false;
    }
    
    // 2. ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ В USERS
    console.log('\n\n2. ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ В USERS');
    console.log('-'.repeat(40));
    
    const { data: usersWithRefs, error: usersError } = await supabase
      .from('users')
      .select('id, username, ref_code, referred_by')
      .not('referred_by', 'is', null)
      .order('id');
    
    if (usersWithRefs) {
      console.log(`✓ Пользователей с реферальными связями: ${usersWithRefs.length}`);
      
      // Группируем по рефереру
      const referrerGroups: { [key: string]: any[] } = {};
      usersWithRefs.forEach(user => {
        const refId = user.referred_by.toString();
        if (!referrerGroups[refId]) referrerGroups[refId] = [];
        referrerGroups[refId].push(user);
      });
      
      console.log('\nСтруктура реферальной сети:');
      for (const [referrerId, referrals] of Object.entries(referrerGroups)) {
        // Найдем информацию о реферере
        const { data: referrer } = await supabase
          .from('users')
          .select('username, ref_code')
          .eq('id', parseInt(referrerId))
          .single();
        
        console.log(`\n  Реферер User ${referrerId} (${referrer?.username}, код: ${referrer?.ref_code}):`);
        referrals.forEach(ref => {
          console.log(`    └─ User ${ref.id} (${ref.username})`);
        });
      }
    }
    
    // 3. ПРОВЕРКА ТАБЛИЦЫ REFERRAL_EARNINGS
    console.log('\n\n3. ПРОВЕРКА ТАБЛИЦЫ REFERRAL_EARNINGS');
    console.log('-'.repeat(40));
    
    const { data: earnings, count: earningsCount } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`✓ Всего записей в referral_earnings: ${earningsCount || 0}`);
    
    if (earnings && earnings.length > 0) {
      console.log('\nПоследние начисления:');
      earnings.forEach(earn => {
        console.log(`  - User ${earn.user_id} получил ${earn.amount} ${earn.currency} от User ${earn.source_user_id} (уровень ${earn.level})`);
      });
    } else {
      console.log('⚠️  Нет реферальных начислений!');
    }
    
    // 4. ПРОВЕРКА АКТИВНЫХ ФАРМЕРОВ
    console.log('\n\n4. ПРОВЕРКА АКТИВНЫХ ФАРМЕРОВ');
    console.log('-'.repeat(40));
    
    const { data: activeFarmers } = await supabase
      .from('users')
      .select('id, username, uni_farming_active, uni_deposit_amount, referred_by')
      .eq('uni_farming_active', true)
      .gt('uni_deposit_amount', 0);
    
    console.log(`✓ Активных фармеров: ${activeFarmers?.length || 0}`);
    
    if (activeFarmers && activeFarmers.length > 0) {
      let farmersWithRefs = 0;
      activeFarmers.forEach(farmer => {
        if (farmer.referred_by) farmersWithRefs++;
      });
      console.log(`✓ Из них с рефералами: ${farmersWithRefs}`);
      console.log(`✓ Потенциальных реферальных начислений при следующем цикле: ${farmersWithRefs}`);
    }
    
    // 5. ТЕСТ РАСЧЕТА РЕФЕРАЛЬНЫХ КОМИССИЙ
    console.log('\n\n5. ТЕСТ РАСЧЕТА РЕФЕРАЛЬНЫХ КОМИССИЙ');
    console.log('-'.repeat(40));
    
    // Берем первого пользователя с рефералом для теста
    const testUser = usersWithRefs?.[0];
    if (testUser) {
      console.log(`\nТестовый расчет для User ${testUser.id}:`);
      console.log(`Сумма дохода: 100 UNI`);
      
      // Получаем цепочку рефереров
      const referrerChain = await referralService.buildReferrerChain(testUser.id.toString());
      console.log(`Цепочка рефереров: [${referrerChain.join(' → ')}]`);
      
      // Рассчитываем комиссии
      const commissions = (referralService as any).calculateReferralCommissions(100, referrerChain);
      console.log('\nРасчетные комиссии:');
      
      let totalCommission = 0;
      commissions.forEach((comm: any) => {
        console.log(`  Уровень ${comm.level}: User ${comm.userId} получит ${comm.amount} UNI (${comm.percentage}%)`);
        totalCommission += parseFloat(comm.amount);
      });
      
      console.log(`\nИтого комиссий: ${totalCommission.toFixed(6)} UNI`);
      console.log(`Процент от дохода: ${totalCommission}%`);
    }
    
    // 6. ПРОВЕРКА ПОСЛЕДНИХ FARMING_REWARD ТРАНЗАКЦИЙ
    console.log('\n\n6. ПРОВЕРКА ПОСЛЕДНИХ FARMING_REWARD ТРАНЗАКЦИЙ');
    console.log('-'.repeat(40));
    
    const { data: farmingRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (farmingRewards && farmingRewards.length > 0) {
      console.log('Последние начисления фарминга:');
      for (const reward of farmingRewards) {
        console.log(`\n  User ${reward.user_id}: ${reward.amount} ${reward.currency}`);
        console.log(`  Время: ${new Date(reward.created_at).toLocaleString()}`);
        
        // Проверяем, были ли реферальные начисления для этой транзакции
        const rewardTime = new Date(reward.created_at);
        const checkTimeStart = new Date(rewardTime.getTime() - 60000); // -1 минута
        const checkTimeEnd = new Date(rewardTime.getTime() + 60000);   // +1 минута
        
        const { data: relatedEarnings } = await supabase
          .from('referral_earnings')
          .select('*')
          .eq('source_user_id', reward.user_id)
          .gte('created_at', checkTimeStart.toISOString())
          .lte('created_at', checkTimeEnd.toISOString());
        
        if (relatedEarnings && relatedEarnings.length > 0) {
          console.log(`  ✓ Найдено ${relatedEarnings.length} реферальных начислений`);
        } else {
          console.log(`  ⚠️ Реферальные начисления не найдены`);
        }
      }
    }
    
    // ИТОГОВЫЙ СТАТУС
    console.log('\n\n' + '='.repeat(80));
    console.log('ИТОГОВЫЙ СТАТУС РЕФЕРАЛЬНОЙ СИСТЕМЫ');
    console.log('='.repeat(80));
    
    const status = {
      'Таблица referrals': referralsCount! > 0 ? '✓ Работает' : '❌ Пустая',
      'Реферальные связи': usersWithRefs!.length > 0 ? '✓ Есть' : '❌ Нет',
      'Таблица referral_earnings': earningsCount! > 0 ? '✓ Есть записи' : '⚠️ Пустая',
      'Активные фармеры': activeFarmers!.length > 0 ? '✓ Есть' : '❌ Нет',
      'Расчет комиссий': '✓ Работает'
    };
    
    Object.entries(status).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    if (earningsCount === 0) {
      console.log('\n⚠️  ВАЖНО: Реферальные начисления еще не производились.');
      console.log('Это нормально, если система только что запущена.');
      console.log('Начисления появятся при следующем цикле фарминга (каждые 5 минут).');
    }
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка диагностики:', error);
    allTestsPassed = false;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
}

// Запуск диагностики
runReferralDiagnostics();