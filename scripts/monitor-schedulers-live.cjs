#!/usr/bin/env node

/**
 * Мониторинг работы scheduler'ов в реальном времени
 * Отслеживает изменения балансов и создание транзакций
 */

const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Хранилище предыдущих состояний
const previousStates = new Map();
const startTime = Date.now();

async function monitorSchedulers() {
  console.clear();
  console.log(colors.cyan + '=== МОНИТОРИНГ SCHEDULER\'ОВ В РЕАЛЬНОМ ВРЕМЕНИ ===' + colors.reset);
  console.log(`Время работы: ${Math.floor((Date.now() - startTime) / 1000)} сек`);
  console.log(new Date().toLocaleString('ru-RU'));
  console.log('');

  try {
    // 1. Проверяем последние транзакции начислений
    console.log(colors.blue + '📊 ПОСЛЕДНИЕ ТРАНЗАКЦИИ НАЧИСЛЕНИЙ:' + colors.reset);
    console.log('-----------------------------------');
    
    const { data: recentTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['FARMING_REWARD', 'TON_BOOST_INCOME', 'REFERRAL_REWARD'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (!txError && recentTx && recentTx.length > 0) {
      console.log(`Найдено транзакций: ${recentTx.length}`);
      
      recentTx.forEach((tx, index) => {
        const age = (Date.now() - new Date(tx.created_at).getTime()) / 1000;
        const ageStr = age < 60 ? `${age.toFixed(0)}с назад` : `${(age/60).toFixed(1)}м назад`;
        
        let color = colors.green;
        if (age > 300) color = colors.red; // Более 5 минут - красный
        else if (age > 60) color = colors.yellow; // Более минуты - желтый
        
        const amount = tx.amount_uni || tx.amount_ton || 0;
        const currency = tx.amount_uni ? 'UNI' : 'TON';
        
        console.log(`${index + 1}. ${color}[${ageStr}]${colors.reset} User ${tx.user_id}: ${tx.type} +${parseFloat(amount).toFixed(6)} ${currency}`);
      });
      
      // Анализ частоты транзакций
      const lastTxTime = new Date(recentTx[0].created_at).getTime();
      const timeSinceLastTx = (Date.now() - lastTxTime) / 1000;
      
      if (timeSinceLastTx < 30) {
        console.log(colors.green + '\n✅ Scheduler работает! Последняя транзакция: ' + timeSinceLastTx.toFixed(0) + ' сек назад' + colors.reset);
      } else if (timeSinceLastTx < 300) {
        console.log(colors.yellow + '\n⚠️ Возможна задержка. Последняя транзакция: ' + (timeSinceLastTx/60).toFixed(1) + ' мин назад' + colors.reset);
      } else {
        console.log(colors.red + '\n❌ Scheduler не работает! Последняя транзакция: ' + (timeSinceLastTx/60).toFixed(0) + ' мин назад' + colors.reset);
      }
    } else {
      console.log(colors.red + '❌ Транзакций начислений не найдено!' + colors.reset);
    }

    // 2. Мониторинг изменений балансов активных пользователей
    console.log('\n' + colors.blue + '💰 МОНИТОРИНГ БАЛАНСОВ (топ 5 активных):' + colors.reset);
    console.log('-----------------------------------------');
    
    const { data: activeUsers, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, uni_farming_active, ton_boost_active, uni_farming_last_update')
      .or('uni_farming_active.eq.true,ton_boost_active.eq.true')
      .order('uni_farming_last_update', { ascending: false })
      .limit(5);

    if (!userError && activeUsers) {
      activeUsers.forEach(user => {
        const prevState = previousStates.get(user.id);
        
        let uniChange = '';
        let tonChange = '';
        
        if (prevState) {
          const uniDiff = user.balance_uni - prevState.balance_uni;
          const tonDiff = user.balance_ton - prevState.balance_ton;
          
          if (Math.abs(uniDiff) > 0.000001) {
            uniChange = uniDiff > 0 
              ? colors.green + ` (+${uniDiff.toFixed(6)})` + colors.reset
              : colors.red + ` (${uniDiff.toFixed(6)})` + colors.reset;
          }
          
          if (Math.abs(tonDiff) > 0.000001) {
            tonChange = tonDiff > 0 
              ? colors.green + ` (+${tonDiff.toFixed(6)})` + colors.reset
              : colors.red + ` (${tonDiff.toFixed(6)})` + colors.reset;
          }
        }
        
        console.log(`User ${user.id} (@${user.username}):`);
        console.log(`  UNI: ${user.balance_uni.toFixed(6)}${uniChange}`);
        console.log(`  TON: ${user.balance_ton.toFixed(6)}${tonChange}`);
        console.log(`  Фарминг: ${user.uni_farming_active ? '✅' : '❌'} | TON Boost: ${user.ton_boost_active ? '✅' : '❌'}`);
        
        if (user.uni_farming_last_update) {
          const updateAge = (Date.now() - new Date(user.uni_farming_last_update).getTime()) / 1000 / 60;
          console.log(`  Последнее обновление: ${updateAge.toFixed(1)} мин назад`);
        }
        console.log('');
        
        // Сохраняем текущее состояние
        previousStates.set(user.id, {
          balance_uni: user.balance_uni,
          balance_ton: user.balance_ton
        });
      });
    }

    // 3. Статистика по типам транзакций за последний час
    console.log(colors.blue + '📈 СТАТИСТИКА ЗА ПОСЛЕДНИЙ ЧАС:' + colors.reset);
    console.log('-------------------------------');
    
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: hourlyStats, error: statsError } = await supabase
      .from('transactions')
      .select('type')
      .in('type', ['FARMING_REWARD', 'TON_BOOST_INCOME', 'REFERRAL_REWARD'])
      .gte('created_at', hourAgo);

    if (!statsError && hourlyStats) {
      const stats = {
        FARMING_REWARD: 0,
        TON_BOOST_INCOME: 0,
        REFERRAL_REWARD: 0
      };
      
      hourlyStats.forEach(tx => {
        stats[tx.type] = (stats[tx.type] || 0) + 1;
      });
      
      console.log(`• FARMING_REWARD: ${stats.FARMING_REWARD} транзакций`);
      console.log(`• TON_BOOST_INCOME: ${stats.TON_BOOST_INCOME} транзакций`);
      console.log(`• REFERRAL_REWARD: ${stats.REFERRAL_REWARD} транзакций`);
      console.log(`• ВСЕГО: ${hourlyStats.length} транзакций`);
    }

    console.log('\n' + colors.magenta + 'Обновление каждые 10 секунд. Нажмите Ctrl+C для выхода.' + colors.reset);

  } catch (error) {
    console.error(colors.red + '\n❌ Ошибка мониторинга:', error + colors.reset);
  }
}

// Запуск мониторинга
console.log('Запуск мониторинга scheduler\'ов...');
monitorSchedulers();

// Обновление каждые 10 секунд
setInterval(monitorSchedulers, 10000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nМониторинг остановлен.');
  process.exit(0);
});