/**
 * Детальная проверка реферальных связей активных фармеров
 */

import { supabase } from '../core/supabase';

async function checkActiveFarmersReferrals() {
  console.log('\n' + '='.repeat(80));
  console.log('ДЕТАЛЬНАЯ ПРОВЕРКА РЕФЕРАЛЬНЫХ СВЯЗЕЙ АКТИВНЫХ ФАРМЕРОВ');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Получаем всех активных фармеров
    const { data: activeFarmers } = await supabase
      .from('users')
      .select('id, username, referred_by, uni_farming_active, uni_deposit_amount')
      .eq('uni_farming_active', true)
      .gt('uni_deposit_amount', 0)
      .order('id');
    
    console.log(`Всего активных фармеров: ${activeFarmers?.length || 0}\n`);
    
    if (!activeFarmers || activeFarmers.length === 0) {
      console.log('❌ Нет активных фармеров');
      return;
    }
    
    // Анализируем каждого фармера
    let farmersWithReferrals = 0;
    let farmerDetails = [];
    
    for (const farmer of activeFarmers) {
      const hasReferral = farmer.referred_by !== null;
      if (hasReferral) farmersWithReferrals++;
      
      let referrerInfo = 'Никем';
      if (farmer.referred_by) {
        const { data: referrer } = await supabase
          .from('users')
          .select('id, username, ref_code')
          .eq('id', farmer.referred_by)
          .single();
        
        if (referrer) {
          referrerInfo = `User ${referrer.id} (${referrer.username})`;
        }
      }
      
      // Проверяем запись в таблице referrals
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', farmer.id)
        .single();
      
      farmerDetails.push({
        id: farmer.id,
        username: farmer.username,
        deposit: farmer.uni_deposit_amount,
        referred_by: farmer.referred_by,
        referrerInfo,
        hasReferralRecord: !!referralRecord
      });
    }
    
    // Выводим детальную информацию
    console.log('ДЕТАЛИ АКТИВНЫХ ФАРМЕРОВ:');
    console.log('-'.repeat(60));
    
    farmerDetails.forEach(farmer => {
      console.log(`\nUser ${farmer.id} (${farmer.username}):`);
      console.log(`  Депозит: ${farmer.deposit} UNI`);
      console.log(`  Приглашен: ${farmer.referrerInfo}`);
      console.log(`  Запись в referrals: ${farmer.hasReferralRecord ? '✅ Есть' : '❌ Нет'}`);
      
      if (farmer.referred_by && !farmer.hasReferralRecord) {
        console.log(`  ⚠️ ПРОБЛЕМА: Есть referred_by, но нет записи в referrals!`);
      }
    });
    
    // Итоговая статистика
    console.log('\n\nИТОГОВАЯ СТАТИСТИКА:');
    console.log('-'.repeat(60));
    console.log(`Всего активных фармеров: ${activeFarmers.length}`);
    console.log(`С реферальными связями (referred_by): ${farmersWithReferrals}`);
    console.log(`Без реферальных связей: ${activeFarmers.length - farmersWithReferrals}`);
    
    // Проверяем почему реферальные награды не начисляются
    console.log('\n\nВОЗМОЖНЫЕ ПРИЧИНЫ ОТСУТСТВИЯ РЕФЕРАЛЬНЫХ НАГРАД:');
    console.log('-'.repeat(60));
    
    if (farmersWithReferrals === 0) {
      console.log('❌ У активных фармеров нет реферальных связей');
    } else {
      console.log(`✅ ${farmersWithReferrals} активных фармеров имеют реферальные связи`);
      
      // Проверяем записи в referrals для фармеров с рефералами
      const farmersWithRefs = farmerDetails.filter(f => f.referred_by);
      const farmersWithoutRecords = farmersWithRefs.filter(f => !f.hasReferralRecord);
      
      if (farmersWithoutRecords.length > 0) {
        console.log(`\n⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА:`);
        console.log(`${farmersWithoutRecords.length} фармеров имеют referred_by, но НЕТ записей в referrals!`);
        console.log(`Это блокирует начисление реферальных наград.`);
        console.log(`\nНужно создать записи для:`);
        farmersWithoutRecords.forEach(f => {
          console.log(`  - User ${f.id} (referred_by: ${f.referred_by})`);
        });
      } else {
        console.log('\n✅ Все фармеры с рефералами имеют записи в таблице referrals');
        console.log('⚠️ Возможно, проблема в самом процессе начисления наград');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ЗАВЕРШЕНА');
  console.log('='.repeat(80) + '\n');
}

checkActiveFarmersReferrals();