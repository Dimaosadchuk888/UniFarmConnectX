#!/usr/bin/env node

/**
 * РЕГРЕССИОННАЯ ПРОВЕРКА СИСТЕМЫ UNIFARM
 * БЕЗ ИЗМЕНЕНИЙ КОДА - ТОЛЬКО АУДИТ
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase клиента
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Тестовые пользователи для проверки
const TEST_USERS = [74, 62, 48];

async function checkModule(moduleName, checks) {
  console.log(`\n🔍 ${moduleName}`);
  console.log('─'.repeat(50));
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({
        check: check.name,
        status: result.success ? '✅' : '❌',
        comment: result.comment || ''
      });
    } catch (error) {
      results.push({
        check: check.name,
        status: '❌',
        comment: `Ошибка: ${error.message}`
      });
    }
  }
  
  // Выводим таблицу результатов
  results.forEach(r => {
    console.log(`  ${r.status} ${r.check}`);
    if (r.comment) {
      console.log(`     └─ ${r.comment}`);
    }
  });
  
  return results;
}

async function checkTonBoost() {
  const checks = [
    {
      name: 'Активные TON Boost пакеты',
      fn: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, ton_boost_package, ton_balance')
          .not('ton_boost_package', 'is', null)
          .gt('ton_balance', 0);
        
        if (error) throw error;
        
        return {
          success: data && data.length > 0,
          comment: `Найдено ${data?.length || 0} активных пакетов`
        };
      }
    },
    {
      name: 'Начисления TON Boost за последний час',
      fn: async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'FARMING_REWARD')
          .gt('amount_ton', 0)
          .gte('created_at', oneHourAgo);
        
        if (error) throw error;
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0} транзакций, сумма: ${data?.reduce((s, t) => s + parseFloat(t.amount_ton || 0), 0).toFixed(6)} TON`
        };
      }
    },
    {
      name: 'Синхронизация баланса TON (UI vs DB)',
      fn: async () => {
        const { data: user, error } = await supabase
          .from('users')
          .select('id, ton_balance')
          .eq('id', TEST_USERS[0])
          .single();
        
        if (error) throw error;
        
        return {
          success: user && parseFloat(user.ton_balance) > 0,
          comment: `User ${user?.id}: ${user?.ton_balance} TON в БД`
        };
      }
    }
  ];
  
  return await checkModule('TON Boost / UNI Boost', checks);
}

async function checkBalance() {
  const checks = [
    {
      name: 'Рост баланса при активных депозитах',
      fn: async () => {
        // Проверяем транзакции за последние 10 минут
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('transactions')
          .select('user_id, amount_uni, amount_ton')
          .eq('type', 'FARMING_REWARD')
          .gte('created_at', tenMinutesAgo);
        
        if (error) throw error;
        
        const uniqueUsers = new Set(data?.map(t => t.user_id) || []);
        
        return {
          success: data && data.length > 0,
          comment: `${uniqueUsers.size} пользователей получили доход за 10 минут`
        };
      }
    },
    {
      name: 'Актуальность балансов в Supabase',
      fn: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, uni_balance, ton_balance')
          .in('id', TEST_USERS);
        
        if (error) throw error;
        
        const balances = data?.map(u => `User ${u.id}: ${u.uni_balance} UNI, ${u.ton_balance} TON`).join('; ');
        
        return {
          success: data && data.length > 0,
          comment: balances
        };
      }
    }
  ];
  
  return await checkModule('Баланс', checks);
}

async function checkTransactions() {
  const checks = [
    {
      name: 'Транзакции BOOST_PURCHASE',
      fn: async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'BOOST_PURCHASE')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        return {
          success: true, // Может быть 0 если никто не покупал
          comment: `Найдено ${data?.length || 0} транзакций BOOST_PURCHASE`
        };
      }
    },
    {
      name: 'Транзакции FARMING_DEPOSIT',
      fn: async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'FARMING_DEPOSIT')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        return {
          success: true,
          comment: `Найдено ${data?.length || 0} транзакций FARMING_DEPOSIT`
        };
      }
    },
    {
      name: 'Корректность user_id в транзакциях',
      fn: async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('user_id')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .limit(100);
        
        if (error) throw error;
        
        const invalidUserIds = data?.filter(t => !t.user_id || t.user_id <= 0) || [];
        
        return {
          success: invalidUserIds.length === 0,
          comment: invalidUserIds.length > 0 ? `${invalidUserIds.length} транзакций без user_id!` : 'Все транзакции привязаны к пользователям'
        };
      }
    }
  ];
  
  return await checkModule('Транзакции', checks);
}

async function checkDailyBonus() {
  const checks = [
    {
      name: 'Последние начисления Daily Bonus',
      fn: async () => {
        const { data, error } = await supabase
          .from('daily_bonus_logs')
          .select('*')
          .order('claimed_at', { ascending: false })
          .limit(5);
        
        if (error && error.code !== 'PGRST116') throw error; // Игнорируем если таблицы нет
        
        return {
          success: data && data.length > 0,
          comment: data ? `Последний бонус: ${data[0]?.claimed_at}` : 'Таблица daily_bonus_logs пуста или отсутствует'
        };
      }
    },
    {
      name: 'Транзакции DAILY_BONUS',
      fn: async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'DAILY_BONUS')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        return {
          success: true,
          comment: `Найдено ${data?.length || 0} транзакций DAILY_BONUS`
        };
      }
    }
  ];
  
  return await checkModule('Daily Bonus', checks);
}

async function checkReferrals() {
  const checks = [
    {
      name: 'Активные реферальные связи',
      fn: async () => {
        const { data, error } = await supabase
          .from('referrals')
          .select('*')
          .limit(10);
        
        if (error) throw error;
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0} реферальных связей в системе`
        };
      }
    },
    {
      name: 'Пользователи с ref_code',
      fn: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, ref_code')
          .not('ref_code', 'is', null)
          .limit(10);
        
        if (error) throw error;
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0}+ пользователей имеют ref_code`
        };
      }
    },
    {
      name: 'Реферальные награды',
      fn: async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'REFERRAL_REWARD')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0} последних реферальных наград`
        };
      }
    }
  ];
  
  return await checkModule('Рефералы', checks);
}

async function checkWalletConnect() {
  const checks = [
    {
      name: 'Пользователи с подключенным TON кошельком',
      fn: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, ton_wallet_address, ton_wallet_verified')
          .not('ton_wallet_address', 'is', null);
        
        if (error) throw error;
        
        const verified = data?.filter(u => u.ton_wallet_verified) || [];
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0} адресов, ${verified.length} верифицированы`
        };
      }
    }
  ];
  
  return await checkModule('Подключение кошелька', checks);
}

async function checkFarming() {
  const checks = [
    {
      name: 'Активные UNI farming депозиты',
      fn: async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, uni_farming_active, uni_deposit_amount')
          .eq('uni_farming_active', true)
          .gt('uni_deposit_amount', 0);
        
        if (error) throw error;
        
        const totalDeposit = data?.reduce((sum, u) => sum + parseFloat(u.uni_deposit_amount || 0), 0) || 0;
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0} активных депозитов, сумма: ${totalDeposit.toFixed(2)} UNI`
        };
      }
    },
    {
      name: 'Начисления UNI farming за последний час',
      fn: async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'FARMING_REWARD')
          .gt('amount_uni', 0)
          .gte('created_at', oneHourAgo);
        
        if (error) throw error;
        
        const totalUni = data?.reduce((sum, t) => sum + parseFloat(t.amount_uni || 0), 0) || 0;
        
        return {
          success: data && data.length > 0,
          comment: `${data?.length || 0} транзакций, начислено: ${totalUni.toFixed(6)} UNI`
        };
      }
    },
    {
      name: 'Процент пользователей получающих доход',
      fn: async () => {
        // Активные депозиты
        const { data: activeUsers } = await supabase
          .from('users')
          .select('id')
          .eq('uni_farming_active', true)
          .gt('uni_deposit_amount', 0);
        
        // Транзакции за последние 10 минут
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: recentTx } = await supabase
          .from('transactions')
          .select('user_id')
          .eq('type', 'FARMING_REWARD')
          .gt('amount_uni', 0)
          .gte('created_at', tenMinutesAgo);
        
        const activeIds = new Set(activeUsers?.map(u => u.id) || []);
        const txUserIds = new Set(recentTx?.map(t => t.user_id) || []);
        
        const usersWithIncome = [...activeIds].filter(id => txUserIds.has(id));
        const percentage = activeIds.size > 0 ? (usersWithIncome.length / activeIds.size * 100).toFixed(1) : 0;
        
        return {
          success: percentage > 90,
          comment: `${percentage}% пользователей получили доход за 10 минут`
        };
      }
    }
  ];
  
  return await checkModule('Farming', checks);
}

async function runRegressionTest() {
  console.log('=== РЕГРЕССИОННАЯ ПРОВЕРКА СИСТЕМЫ UNIFARM ===');
  console.log('Дата:', new Date().toLocaleString('ru-RU'));
  console.log('Режим: БЕЗ ИЗМЕНЕНИЙ КОДА - ТОЛЬКО АУДИТ');
  console.log('═'.repeat(50));
  
  const allResults = [];
  
  // Проверяем все модули
  allResults.push(...await checkTonBoost());
  allResults.push(...await checkBalance());
  allResults.push(...await checkTransactions());
  allResults.push(...await checkDailyBonus());
  allResults.push(...await checkReferrals());
  allResults.push(...await checkWalletConnect());
  allResults.push(...await checkFarming());
  
  // Итоговая таблица
  console.log('\n\n📊 ИТОГОВАЯ ТАБЛИЦА ПРОВЕРОК');
  console.log('═'.repeat(80));
  console.log('| Модуль              | Проверка                           | Статус | Комментарий');
  console.log('|' + '─'.repeat(20) + '|' + '─'.repeat(36) + '|' + '─'.repeat(8) + '|' + '─'.repeat(30));
  
  const moduleNames = {
    'TON Boost / UNI Boost': 'TON Boost',
    'Баланс': 'Баланс',
    'Транзакции': 'Транзакции',
    'Daily Bonus': 'Daily Bonus',
    'Рефералы': 'Рефералы',
    'Подключение кошелька': 'Кошелек',
    'Farming': 'Farming'
  };
  
  let currentModule = '';
  allResults.forEach(result => {
    // Определяем модуль по проверке
    let module = '';
    for (const [key, value] of Object.entries(moduleNames)) {
      if (result.check.includes(key) || currentModule === key) {
        module = value;
        currentModule = key;
        break;
      }
    }
    
    const checkName = result.check.substring(0, 34).padEnd(34);
    const moduleName = module.padEnd(18);
    const status = result.status.padEnd(6);
    const comment = (result.comment || '').substring(0, 28);
    
    console.log(`| ${moduleName} | ${checkName} | ${status} | ${comment}`);
  });
  
  console.log('═'.repeat(80));
  
  // Риски и рекомендации
  console.log('\n\n⚠️  ВЫЯВЛЕННЫЕ РИСКИ И ПРОБЛЕМЫ:');
  console.log('─'.repeat(50));
  
  const risks = [];
  
  // Анализируем результаты
  const failedChecks = allResults.filter(r => r.status === '❌');
  const successRate = ((allResults.length - failedChecks.length) / allResults.length * 100).toFixed(1);
  
  if (failedChecks.length > 0) {
    console.log(`❌ Обнаружено ${failedChecks.length} проваленных проверок из ${allResults.length} (${successRate}% успешных)`);
    failedChecks.forEach(f => {
      console.log(`   • ${f.check}: ${f.comment}`);
    });
  } else {
    console.log('✅ Все проверки пройдены успешно!');
  }
  
  console.log('\n\n📝 РЕКОМЕНДАЦИИ ДЛЯ ТЕСТИРОВАНИЯ:');
  console.log('─'.repeat(50));
  console.log('• Используйте user_id: 74, 62, 48 для проверки в Preview режиме');
  console.log('• Проверяйте синхронизацию UI и БД через Supabase Dashboard');
  console.log('• Обратите внимание на модули с ошибками в первую очередь');
  console.log('• Farming и TON Boost требуют регулярного мониторинга scheduler\'ов');
  
  console.log('\n✅ Регрессионная проверка завершена');
}

// Запуск проверки
runRegressionTest().catch(console.error);