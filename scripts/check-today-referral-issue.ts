/**
 * Проверка проблемы с реферальными наградами за сегодня
 */

import { supabase } from '../core/supabase';
import { ReferralService } from '../modules/referral/service';

async function checkTodayReferralIssue() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА ПРОБЛЕМЫ С РЕФЕРАЛЬНЫМИ НАГРАДАМИ ЗА СЕГОДНЯ');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Проверяем текущие проценты реферальной системы
    console.log('1. ПРОВЕРКА ПРОЦЕНТОВ РЕФЕРАЛЬНОЙ СИСТЕМЫ:');
    const referralService = new ReferralService();
    console.log('Текущие проценты по уровням (из кода):');
    console.log(`  Level 1: 5%`);
    console.log(`  Level 2: 4%`);
    console.log(`  Level 3: 3%`);
    console.log(`  Level 4: 2%`);
    console.log(`  Level 5: 1%`);
    
    // 2. Проверяем цепочку рефереров для активных фармеров
    console.log('\n2. ПРОВЕРКА ЦЕПОЧЕК РЕФЕРЕРОВ:');
    const activeReferrals = [186, 187, 188, 189, 190];
    
    for (const userId of activeReferrals) {
      const chain = await referralService.buildReferrerChain(userId.toString());
      console.log(`\nUser ${userId} - цепочка рефереров:`, chain.length > 0 ? chain : 'ПУСТАЯ');
      if (chain.length > 0) {
        chain.forEach((ref, index) => {
          console.log(`  Level ${index + 1}: User ${ref.userId} (${ref.percentage}%)`);
        });
      }
    }
    
    // 3. Проверяем последние farming транзакции рефералов за сегодня
    console.log('\n3. ПОСЛЕДНИЕ FARMING ТРАНЗАКЦИИ РЕФЕРАЛОВ (сегодня):');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: todayFarming } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', activeReferrals)
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Найдено ${todayFarming?.length || 0} транзакций за сегодня:`);
    todayFarming?.forEach(tx => {
      console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency} (${new Date(tx.created_at).toLocaleTimeString()})`);
    });
    
    // 4. Тестируем распределение реферальных наград вручную
    console.log('\n4. ТЕСТ РАСПРЕДЕЛЕНИЯ РЕФЕРАЛЬНЫХ НАГРАД:');
    console.log('Тестируем для User 186 (депозит 1500 UNI, доход ~0.46875 UNI)...');
    
    // Симулируем распределение без реального начисления
    const testAmount = '0.46875';
    const referrerChain = await referralService.buildReferrerChain('186');
    
    if (referrerChain.length > 0) {
      console.log('Расчет наград для цепочки:');
      referrerChain.forEach((referrer, index) => {
        const percentage = referrer.percentage;
        const reward = (parseFloat(testAmount) * percentage / 100).toFixed(8);
        console.log(`  Level ${index + 1}: User ${referrer.userId} получит ${reward} UNI (${percentage}%)`);
      });
    }
    
    // 5. Проверяем связи в таблице referrals
    console.log('\n5. ПРОВЕРКА ТАБЛИЦЫ referrals:');
    const { data: referralLinks, error: linkError } = await supabase
      .from('referrals')
      .select('*')
      .or('referrer_id.eq.184,user_id.in.(186,187,188,189,190)');
    
    if (linkError) {
      console.error('Ошибка получения referrals:', linkError);
    } else {
      console.log(`Найдено ${referralLinks?.length || 0} записей:`);
      referralLinks?.forEach(link => {
        console.log(`  - Referrer ID: ${link.referrer_id}, User ID: ${link.user_id}, Referred User ID: ${link.referred_user_id}`);
      });
      
      if (!referralLinks || referralLinks.length === 0) {
        console.log('\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет записей в таблице referrals!');
        console.log('   Это объясняет отсутствие реферальных наград.');
      }
    }
    
    // 6. Анализ последней успешной реферальной транзакции
    console.log('\n6. АНАЛИЗ ПОСЛЕДНЕЙ УСПЕШНОЙ РЕФЕРАЛЬНОЙ ТРАНЗАКЦИИ:');
    const { data: lastReferral } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 184)
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (lastReferral) {
      console.log(`Последняя реферальная транзакция:`);
      console.log(`  - Время: ${new Date(lastReferral.created_at).toLocaleString()}`);
      console.log(`  - Сумма: ${lastReferral.amount} ${lastReferral.currency}`);
      console.log(`  - От: User ${lastReferral.source_user_id}`);
      console.log(`  - Описание: ${lastReferral.description}`);
      
      // Проверяем процент в описании
      const match = lastReferral.description.match(/\((\d+)%\)/);
      if (match) {
        const percentage = parseInt(match[1]);
        if (percentage === 100) {
          console.log('\n⚠️  ПРОБЛЕМА: В транзакции указано 100% вместо 5%!');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('АНАЛИЗ ЗАВЕРШЕН');
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

checkTodayReferralIssue();