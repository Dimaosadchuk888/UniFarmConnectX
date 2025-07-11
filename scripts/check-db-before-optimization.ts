/**
 * Скрипт проверки состояния базы данных перед оптимизацией
 * Проверяет все изменения, которые будут внесены
 */

import { supabase } from '../core/supabaseClient';

interface OptimizationCheck {
  phase: string;
  item: string;
  current_state: string;
  action_needed: string;
  impact: 'low' | 'medium' | 'high';
}

async function checkDatabaseBeforeOptimization() {
  console.log('🔍 Проверка базы данных перед оптимизацией UniFarm');
  console.log('=' .repeat(60));
  
  const checks: OptimizationCheck[] = [];
  
  // Фаза 1: Критические исправления
  console.log('\n📋 ФАЗА 1: Критические исправления\n');
  
  // 1. Проверка поля last_active
  try {
    const { data: sampleUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
      
    // Пытаемся получить last_active
    const { error: lastActiveError } = await supabase
      .from('users')
      .select('last_active')
      .eq('id', sampleUser.id)
      .single();
      
    if (!lastActiveError) {
      checks.push({
        phase: 'Фаза 1',
        item: 'users.last_active',
        current_state: 'Поле существует в БД',
        action_needed: 'Удалить поле (не используется в коде)',
        impact: 'low'
      });
    }
  } catch (error) {
    console.log('❌ Ошибка проверки last_active:', error);
  }
  
  // 2. Проверка дублирующихся полей referrer
  try {
    const { data: referrerData } = await supabase
      .from('users')
      .select('referred_by')
      .not('referred_by', 'is', null)
      .limit(5);
      
    const referredByCount = referrerData?.length || 0;
    
    checks.push({
      phase: 'Фаза 1',
      item: 'referred_by vs referrer_id',
      current_state: `referred_by используется (${referredByCount} записей)`,
      action_needed: 'Мигрировать данные из referrer_id и удалить его',
      impact: 'medium'
    });
  } catch (error) {
    console.log('❌ Ошибка проверки referrer полей:', error);
  }
  
  // 3. Проверка дублирующихся полей farming deposit
  try {
    const { data: depositData } = await supabase
      .from('users')
      .select('uni_deposit_amount')
      .not('uni_deposit_amount', 'is', null)
      .gt('uni_deposit_amount', 0)
      .limit(5);
      
    const depositCount = depositData?.length || 0;
    
    checks.push({
      phase: 'Фаза 1',
      item: 'uni_deposit_amount vs uni_farming_deposit',
      current_state: `uni_deposit_amount активно используется (${depositCount} записей)`,
      action_needed: 'Мигрировать данные из uni_farming_deposit и удалить его',
      impact: 'medium'
    });
  } catch (error) {
    console.log('❌ Ошибка проверки deposit полей:', error);
  }
  
  // 4. Проверка типов транзакций
  try {
    const { data: transactionTypes } = await supabase
      .from('transactions')
      .select('type')
      .limit(1000);
      
    const uniqueTypes = [...new Set(transactionTypes?.map(t => t.type) || [])];
    const missingTypes = ['FARMING_DEPOSIT', 'BOOST_PURCHASE', 'DAILY_BONUS', 'MISSION_REWARD', 'BOOST_REWARD'];
    const actuallyMissing = missingTypes.filter(t => !uniqueTypes.includes(t));
    
    checks.push({
      phase: 'Фаза 1',
      item: 'Типы транзакций',
      current_state: `Найдено типов: ${uniqueTypes.join(', ')}`,
      action_needed: `Добавить отсутствующие: ${actuallyMissing.join(', ')}`,
      impact: 'high'
    });
  } catch (error) {
    console.log('❌ Ошибка проверки типов транзакций:', error);
  }
  
  // Фаза 2: Структурная оптимизация
  console.log('\n📋 ФАЗА 2: Структурная оптимизация\n');
  
  // 5. Проверка полей daily bonus
  try {
    const { data: dailyBonusData } = await supabase
      .from('users')
      .select('id')
      .not('checkin_last_date', 'is', null)
      .limit(5);
      
    const dailyBonusCount = dailyBonusData?.length || 0;
    
    checks.push({
      phase: 'Фаза 2',
      item: 'checkin_last_date, checkin_streak',
      current_state: `Используется у ${dailyBonusCount} пользователей`,
      action_needed: 'Создать резервную копию и удалить поля',
      impact: 'low'
    });
  } catch (error) {
    console.log('❌ Ошибка проверки daily bonus полей:', error);
  }
  
  // 6. Проверка пустых таблиц
  const emptyTables = [
    'user_sessions',
    'referrals', 
    'farming_sessions',
    'boost_purchases',
    'user_missions',
    'airdrops',
    'daily_bonus_logs'
  ];
  
  for (const table of emptyTables) {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      checks.push({
        phase: 'Фаза 2',
        item: `Таблица ${table}`,
        current_state: `${count || 0} записей`,
        action_needed: count === 0 ? 'Пометить как DEPRECATED или удалить' : 'Оставить как есть',
        impact: 'low'
      });
    } catch (error) {
      console.log(`❌ Ошибка проверки таблицы ${table}:`, error);
    }
  }
  
  // 7. Проверка использования metadata
  try {
    const { data: metadataStats } = await supabase
      .from('transactions')
      .select('metadata')
      .not('metadata', 'is', null)
      .limit(100);
      
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
      
    const metadataUsage = metadataStats ? (metadataStats.length / 100 * 100).toFixed(1) : '0';
    
    checks.push({
      phase: 'Фаза 2',
      item: 'transactions.metadata',
      current_state: `Используется в ~${metadataUsage}% транзакций`,
      action_needed: 'Добавить документацию к полю',
      impact: 'low'
    });
  } catch (error) {
    console.log('❌ Ошибка проверки metadata:', error);
  }
  
  // Генерация отчета
  generateOptimizationReport(checks);
}

function generateOptimizationReport(checks: OptimizationCheck[]) {
  console.log('\n📊 СВОДКА ПРОВЕРКИ ОПТИМИЗАЦИИ');
  console.log('=' .repeat(60));
  
  // Группировка по фазам
  const phase1 = checks.filter(c => c.phase === 'Фаза 1');
  const phase2 = checks.filter(c => c.phase === 'Фаза 2');
  
  console.log('\n🔴 Фаза 1 - Критические исправления:');
  console.log('-'.repeat(60));
  phase1.forEach(check => {
    const impactIcon = check.impact === 'high' ? '🔴' : check.impact === 'medium' ? '🟡' : '🟢';
    console.log(`${impactIcon} ${check.item}`);
    console.log(`   Текущее состояние: ${check.current_state}`);
    console.log(`   Требуется: ${check.action_needed}`);
    console.log();
  });
  
  console.log('\n🟡 Фаза 2 - Структурная оптимизация:');
  console.log('-'.repeat(60));
  phase2.forEach(check => {
    const impactIcon = check.impact === 'high' ? '🔴' : check.impact === 'medium' ? '🟡' : '🟢';
    console.log(`${impactIcon} ${check.item}`);
    console.log(`   Текущее состояние: ${check.current_state}`);
    console.log(`   Требуется: ${check.action_needed}`);
    console.log();
  });
  
  // Рекомендации
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('-'.repeat(60));
  console.log('1. Сначала выполните все изменения Фазы 1 (критические)');
  console.log('2. Создайте резервные копии перед удалением данных');
  console.log('3. Выполняйте SQL скрипты по блокам, проверяя результаты');
  console.log('4. После каждой фазы проверьте работоспособность приложения');
  
  // Сохранение отчета
  const report = {
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total_checks: checks.length,
      high_impact: checks.filter(c => c.impact === 'high').length,
      medium_impact: checks.filter(c => c.impact === 'medium').length,
      low_impact: checks.filter(c => c.impact === 'low').length
    }
  };
  
  const fs = require('fs');
  const reportPath = 'docs/db_optimization_pre_check.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Отчет сохранен в: ${reportPath}`);
}

// Запуск проверки
checkDatabaseBeforeOptimization().catch(console.error);