/**
 * Быстрый скрипт для проверки реферальных связей и начислений
 */

import { supabase } from '../core/supabase';

async function checkReferralSystem() {
  console.log('\n' + '='.repeat(80));
  console.log('ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ UNIFARM');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Проверка таблицы users (реферальные поля)
    console.log('1. АНАЛИЗ ТАБЛИЦЫ USERS:');
    
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: usersWithReferrers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('referred_by', 'is', null);
    
    const { data: usersSample } = await supabase
      .from('users')
      .select('id, telegram_id, username, ref_code, parent_ref_code, referred_by')
      .not('referred_by', 'is', null)
      .limit(10);
    
    console.log(`   - Всего пользователей: ${totalUsers}`);
    console.log(`   - С реферерами (referred_by): ${usersWithReferrers}`);
    console.log(`   - Процент охвата: ${((usersWithReferrers || 0) / (totalUsers || 1) * 100).toFixed(2)}%`);
    
    if (usersSample && usersSample.length > 0) {
      console.log('   - Примеры реферальных связей:');
      for (const user of usersSample.slice(0, 5)) {
        console.log(`     User ${user.id} (${user.username || 'No username'}) → приглашен пользователем ${user.referred_by}`);
      }
    }

    // 2. Проверка таблицы referrals
    console.log('\n2. АНАЛИЗ ТАБЛИЦЫ REFERRALS:');
    
    const { count: referralsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true });
    
    const { data: referralsByLevel } = await supabase
      .from('referrals')
      .select('level')
      .order('level');
    
    console.log(`   - Всего записей в referrals: ${referralsCount}`);
    
    if (referralsByLevel) {
      const levelCounts: Record<number, number> = {};
      referralsByLevel.forEach(r => {
        levelCounts[r.level] = (levelCounts[r.level] || 0) + 1;
      });
      
      console.log('   - Распределение по уровням:');
      for (let level = 1; level <= 20; level++) {
        if (levelCounts[level]) {
          console.log(`     Уровень ${level}: ${levelCounts[level]} записей`);
        }
      }
    }

    // 3. Проверка таблицы referral_earnings
    console.log('\n3. АНАЛИЗ ТАБЛИЦЫ REFERRAL_EARNINGS:');
    
    const { count: earningsCount } = await supabase
      .from('referral_earnings')
      .select('*', { count: 'exact', head: true });
    
    const { data: earningsByCurrency } = await supabase
      .from('referral_earnings')
      .select('currency, amount, level');
    
    console.log(`   - Всего записей начислений: ${earningsCount}`);
    
    if (earningsByCurrency) {
      let uniTotal = 0;
      let tonTotal = 0;
      const levelStats: Record<number, { count: number; total: number }> = {};
      
      earningsByCurrency.forEach(e => {
        const amount = parseFloat(e.amount);
        if (e.currency === 'UNI') uniTotal += amount;
        if (e.currency === 'TON') tonTotal += amount;
        
        if (!levelStats[e.level]) {
          levelStats[e.level] = { count: 0, total: 0 };
        }
        levelStats[e.level].count++;
        levelStats[e.level].total += amount;
      });
      
      console.log(`   - Общие начисления UNI: ${uniTotal.toFixed(6)}`);
      console.log(`   - Общие начисления TON: ${tonTotal.toFixed(6)}`);
      console.log('   - Начисления по уровням:');
      
      for (let level = 1; level <= 20; level++) {
        if (levelStats[level]) {
          console.log(`     Уровень ${level}: ${levelStats[level].count} начислений, сумма: ${levelStats[level].total.toFixed(6)}`);
        }
      }
    }

    // 4. Проверка транзакций REFERRAL_REWARD
    console.log('\n4. АНАЛИЗ ТРАНЗАКЦИЙ REFERRAL_REWARD:');
    
    const { data: referralTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log(`   - Найдено транзакций: ${referralTransactions?.length || 0}`);
    
    if (referralTransactions && referralTransactions.length > 0) {
      console.log('   - Последние реферальные транзакции:');
      referralTransactions.slice(0, 5).forEach(tx => {
        console.log(`     ${new Date(tx.created_at).toLocaleString()}: User ${tx.user_id} получил ${tx.amount} ${tx.currency} от User ${tx.source_user_id || 'Unknown'}`);
      });
    }

    // 5. Проверка проблем и целостности
    console.log('\n5. ПРОВЕРКА ЦЕЛОСТНОСТИ:');
    
    // Проверка пользователей без ref_code
    const { count: usersWithoutRefCode } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('ref_code', null);
    
    if (usersWithoutRefCode && usersWithoutRefCode > 0) {
      console.log(`   ⚠️  Найдено ${usersWithoutRefCode} пользователей без ref_code`);
    }
    
    // Проверка орфанов
    const { data: orphanCheck } = await supabase
      .from('users')
      .select('id, referred_by')
      .not('referred_by', 'is', null);
    
    if (orphanCheck) {
      const userIds = new Set(orphanCheck.map(u => u.id));
      const orphans = orphanCheck.filter(u => !userIds.has(u.referred_by));
      if (orphans.length > 0) {
        console.log(`   ⚠️  Найдено ${orphans.length} пользователей с несуществующими реферерами`);
      }
    }

    // 6. Проверка процентов начислений
    console.log('\n6. ПРОЦЕНТЫ РЕФЕРАЛЬНЫХ НАЧИСЛЕНИЙ:');
    console.log('   Уровень 1: 100% от дохода (маркетинговая стратегия)');
    console.log('   Уровень 2: 2% от дохода');
    console.log('   Уровень 3: 3% от дохода');
    console.log('   ...');
    console.log('   Уровень 20: 20% от дохода');
    console.log(`   Общая нагрузка: ${100 + (2+3+4+5+6+7+8+9+10+11+12+13+14+15+16+17+18+19+20)}% = 310%`);

    // 7. Проверка свежих начислений
    console.log('\n7. СВЕЖИЕ РЕФЕРАЛЬНЫЕ НАЧИСЛЕНИЯ (последние 24 часа):');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentEarnings } = await supabase
      .from('referral_earnings')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentEarnings && recentEarnings.length > 0) {
      console.log(`   - Найдено ${recentEarnings.length} начислений за последние 24 часа`);
      recentEarnings.slice(0, 5).forEach(e => {
        console.log(`     ${new Date(e.created_at).toLocaleString()}: User ${e.user_id} получил ${e.amount} ${e.currency} (уровень ${e.level}) от User ${e.source_user_id}`);
      });
    } else {
      console.log('   - Начислений за последние 24 часа не найдено');
    }

  } catch (error) {
    console.error('Ошибка при проверке:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('КОНЕЦ ОТЧЕТА');
  console.log('='.repeat(80) + '\n');
}

// Запуск
checkReferralSystem();