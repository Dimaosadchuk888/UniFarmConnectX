/**
 * Тестовый скрипт для проверки построения реферальных цепочек
 */

import { supabase } from '../core/supabase';
import { ReferralService } from '../modules/referral/service';

async function testReferralChain() {
  console.log('\n' + '='.repeat(80));
  console.log('ТЕСТ ПОСТРОЕНИЯ РЕФЕРАЛЬНЫХ ЦЕПОЧЕК');
  console.log('='.repeat(80) + '\n');

  try {
    const referralService = new ReferralService();
    
    // 1. Получаем всех пользователей с депозитами UNI
    const { data: farmers } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, uni_deposit_amount')
      .not('uni_deposit_amount', 'is', null)
      .gt('uni_deposit_amount', '0')
      .order('id');
    
    if (!farmers || farmers.length === 0) {
      console.log('Нет активных фармеров с депозитами');
      return;
    }
    
    console.log(`Найдено ${farmers.length} фармеров с депозитами:\n`);
    
    // 2. Для каждого фармера строим реферальную цепочку
    for (const farmer of farmers) {
      console.log(`\nПользователь ${farmer.id} (${farmer.username || 'No username'}):`);
      console.log(`  - Депозит: ${farmer.uni_deposit_amount} UNI`);
      console.log(`  - Приглашен пользователем: ${farmer.referred_by || 'НИКЕМ (нет реферера)'}`);
      
      // Строим цепочку
      const chain = await referralService.buildReferrerChain(farmer.id.toString());
      
      if (chain.length === 0) {
        console.log(`  - Реферальная цепочка: ПУСТАЯ (нет рефереров)`);
      } else {
        console.log(`  - Реферальная цепочка (${chain.length} уровней):`);
        for (let i = 0; i < chain.length; i++) {
          // Получаем информацию о реферере
          const { data: referrer } = await supabase
            .from('users')
            .select('id, username, telegram_id')
            .eq('id', chain[i])
            .single();
          
          if (referrer) {
            console.log(`    Уровень ${i + 1}: User ${referrer.id} (${referrer.username || 'No username'})`);
          }
        }
      }
      
      // Рассчитываем потенциальные комиссии от дохода 100 UNI
      const testIncome = 100;
      const commissions = referralService.calculateReferralCommissions(testIncome, chain);
      
      if (commissions.length > 0) {
        console.log(`  - Потенциальные комиссии от дохода ${testIncome} UNI:`);
        let total = 0;
        for (const commission of commissions) {
          console.log(`    Уровень ${commission.level}: User ${commission.userId} получит ${commission.amount} UNI (${commission.percentage}%)`);
          total += parseFloat(commission.amount);
        }
        console.log(`    ИТОГО комиссий: ${total.toFixed(6)} UNI`);
      }
    }
    
    // 3. Проверяем orphaned записи
    console.log('\n' + '-'.repeat(80));
    console.log('ПРОВЕРКА ORPHANED ЗАПИСЕЙ:');
    
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, referred_by')
      .not('referred_by', 'is', null);
    
    if (allUsers) {
      const userIds = new Set(allUsers.map(u => u.id));
      const orphans = allUsers.filter(u => !userIds.has(u.referred_by));
      
      if (orphans.length > 0) {
        console.log(`\n⚠️  Найдено ${orphans.length} пользователей с несуществующими реферерами:`);
        for (const orphan of orphans) {
          console.log(`   User ${orphan.id} -> ссылается на несуществующего User ${orphan.referred_by}`);
        }
      } else {
        console.log('\n✅ Все реферальные связи корректны');
      }
    }
    
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('КОНЕЦ ТЕСТА');
  console.log('='.repeat(80) + '\n');
}

// Запуск
testReferralChain();