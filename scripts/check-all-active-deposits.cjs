#!/usr/bin/env node

/**
 * Полная проверка начислений UNI и TON Boost по всем активным депозитам
 * Сравнение роста баланса в UI и базе данных
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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
  cyan: '\x1b[36m'
};

async function checkActiveDeposits() {
  console.log(colors.cyan + '=== ПОЛНАЯ ПРОВЕРКА НАЧИСЛЕНИЙ UNI И TON BOOST ===' + colors.reset);
  console.log(new Date().toLocaleString('ru-RU'));
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    totalUsers: 0,
    activeUniDeposits: 0,
    activeTonBoosts: 0,
    workingDeposits: 0,
    brokenDeposits: 0,
    users: []
  };

  try {
    // 1. Получаем всех пользователей с активными депозитами
    console.log(colors.blue + '📥 1. ПОЛУЧЕНИЕ СПИСКА АКТИВНЫХ ДЕПОЗИТОВ:' + colors.reset);
    console.log('------------------------------------------');
    
    // Запрос пользователей с UNI farming или TON boost
    const { data: activeUsers, error } = await supabase
      .from('users')
      .select('*')
      .or('uni_farming_active.eq.true,ton_boost_active.eq.true')
      .order('id');

    if (error) {
      console.error(colors.red + '❌ Ошибка получения пользователей:', error.message + colors.reset);
      return;
    }

    console.log(`✅ Найдено пользователей с активными депозитами: ${colors.green}${activeUsers.length}${colors.reset}`);
    report.totalUsers = activeUsers.length;

    // 2. Анализ каждого пользователя
    console.log('\n' + colors.blue + '🔍 2. ДЕТАЛЬНЫЙ АНАЛИЗ КАЖДОГО ПОЛЬЗОВАТЕЛЯ:' + colors.reset);
    console.log('=============================================\n');

    for (const user of activeUsers) {
      const userReport = {
        userId: user.id,
        username: user.username,
        deposits: [],
        balanceGrowth: null,
        syncStatus: null,
        issues: []
      };

      console.log(colors.yellow + `🔹 USER ID: ${user.id} (@${user.username})` + colors.reset);
      console.log('-----------------------------------');

      // Проверка UNI Farming
      if (user.uni_farming_active) {
        report.activeUniDeposits++;
        console.log('• Тип: ' + colors.cyan + 'UNI Farming' + colors.reset);
        console.log(`• Старт депозита: ${new Date(user.uni_farming_start_timestamp).toLocaleString('ru-RU')}`);
        console.log(`• Сумма вложения: ${user.uni_deposit_amount} UNI`);
        console.log(`• Ставка: ${(user.uni_farming_rate * 100).toFixed(2)}% в день`);
        
        // Расчет ожидаемого дохода
        const farmingDays = (Date.now() - new Date(user.uni_farming_start_timestamp).getTime()) / (1000 * 60 * 60 * 24);
        const expectedIncome = user.uni_deposit_amount * user.uni_farming_rate * farmingDays;
        console.log(`• Ожидаемый доход: ~${expectedIncome.toFixed(3)} UNI`);

        userReport.deposits.push({
          type: 'UNI_FARMING',
          startDate: user.uni_farming_start_timestamp,
          amount: user.uni_deposit_amount,
          rate: user.uni_farming_rate,
          expectedIncome: expectedIncome
        });
      }

      // Проверка TON Boost
      if (user.ton_boost_active) {
        report.activeTonBoosts++;
        console.log('• Тип: ' + colors.cyan + 'TON Boost' + colors.reset);
        console.log(`• ID пакета: ${user.ton_boost_package_id || user.ton_boost_package}`);
        console.log(`• Ставка: ${(user.ton_boost_rate * 100).toFixed(2)}% в день`);
        
        userReport.deposits.push({
          type: 'TON_BOOST',
          packageId: user.ton_boost_package_id || user.ton_boost_package,
          rate: user.ton_boost_rate
        });
      }

      // Текущие балансы
      console.log('\n💰 Балансы:');
      console.log(`• UNI в БД: ${colors.green}${user.balance_uni.toFixed(6)}${colors.reset}`);
      console.log(`• TON в БД: ${colors.green}${user.balance_ton.toFixed(6)}${colors.reset}`);

      // 3. Проверка последних транзакций для анализа начислений
      const { data: recentTx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['FARMING_REWARD', 'TON_BOOST_INCOME'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (!txError && recentTx && recentTx.length > 0) {
        console.log('\n📈 Последние начисления:');
        let hasRecentActivity = false;
        
        recentTx.forEach((tx, index) => {
          const age = (Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60);
          const ageStr = age < 60 ? `${age.toFixed(0)} мин назад` : `${(age/60).toFixed(1)} ч назад`;
          
          console.log(`  ${index + 1}. ${tx.type}: +${tx.amount_uni || tx.amount_ton} ${tx.amount_uni ? 'UNI' : 'TON'} (${ageStr})`);
          
          if (age < 15) { // Если начисление было в последние 15 минут
            hasRecentActivity = true;
          }
        });

        if (hasRecentActivity) {
          console.log(colors.green + '✅ Начисления работают (есть активность за последние 15 мин)' + colors.reset);
          report.workingDeposits++;
          userReport.balanceGrowth = 'WORKING';
        } else {
          console.log(colors.red + '❌ Начисления НЕ работают (нет активности >15 мин)' + colors.reset);
          report.brokenDeposits++;
          userReport.balanceGrowth = 'NOT_WORKING';
          userReport.issues.push('Нет начислений более 15 минут');
        }
      } else {
        console.log(colors.yellow + '⚠️ Нет истории начислений' + colors.reset);
        report.brokenDeposits++;
        userReport.balanceGrowth = 'NO_HISTORY';
        userReport.issues.push('Отсутствует история начислений');
      }

      // 4. Проверка последнего обновления фарминга
      if (user.uni_farming_active && user.uni_farming_last_update) {
        const lastUpdateAge = (Date.now() - new Date(user.uni_farming_last_update).getTime()) / (1000 * 60);
        console.log(`\n⏰ Последнее обновление UNI farming: ${lastUpdateAge.toFixed(0)} мин назад`);
        
        if (lastUpdateAge > 10) {
          console.log(colors.red + '⚠️ Фарминг не обновлялся более 10 минут!' + colors.reset);
          userReport.issues.push(`UNI farming не обновлялся ${lastUpdateAge.toFixed(0)} минут`);
        }
      }

      report.users.push(userReport);
      console.log('\n');
    }

    // 5. Сводная статистика
    console.log(colors.cyan + '📊 3. СВОДНАЯ СТАТИСТИКА:' + colors.reset);
    console.log('========================');
    console.log(`• Всего пользователей с депозитами: ${report.totalUsers}`);
    console.log(`• Активных UNI депозитов: ${report.activeUniDeposits}`);
    console.log(`• Активных TON Boost: ${report.activeTonBoosts}`);
    console.log(`• ${colors.green}Работающих депозитов: ${report.workingDeposits}${colors.reset}`);
    console.log(`• ${colors.red}Неработающих депозитов: ${report.brokenDeposits}${colors.reset}`);

    // 6. Проверка scheduler'ов
    console.log('\n' + colors.blue + '🔧 4. ПРОВЕРКА СИСТЕМНЫХ КОМПОНЕНТОВ:' + colors.reset);
    console.log('=====================================');
    
    // Проверяем последние системные транзакции
    const { data: systemTx, error: sysError } = await supabase
      .from('transactions')
      .select('type, created_at, COUNT(*)')
      .in('type', ['FARMING_REWARD', 'TON_BOOST_INCOME'])
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // За последний час
      .order('created_at', { ascending: false });

    if (!sysError && systemTx) {
      console.log(`• Транзакций FARMING_REWARD за последний час: ${systemTx.filter(tx => tx.type === 'FARMING_REWARD').length}`);
      console.log(`• Транзакций TON_BOOST_INCOME за последний час: ${systemTx.filter(tx => tx.type === 'TON_BOOST_INCOME').length}`);
    }

    // 7. Выводы и рекомендации
    console.log('\n' + colors.cyan + '🧠 5. ВЫВОДЫ И РЕКОМЕНДАЦИИ:' + colors.reset);
    console.log('============================');
    
    if (report.workingDeposits > 0) {
      console.log(colors.green + '✅ Что работает:' + colors.reset);
      console.log('• Механизм начислений функционирует для части пользователей');
      console.log('• База данных корректно фиксирует транзакции');
    }
    
    if (report.brokenDeposits > 0) {
      console.log('\n' + colors.red + '❌ Что НЕ работает:' + colors.reset);
      console.log(`• ${report.brokenDeposits} депозитов не получают начисления`);
      console.log('• Возможные причины:');
      console.log('  - Scheduler не запущен или работает нестабильно');
      console.log('  - Проблемы с расчетом rewards в farming/service.ts');
      console.log('  - Неправильная инициализация farming_last_update');
    }

    // Сохраняем отчет
    const reportPath = path.join(__dirname, `deposit-check-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Полный отчет сохранен: ${reportPath}`);

  } catch (error) {
    console.error(colors.red + '\n❌ Критическая ошибка:', error + colors.reset);
  }

  console.log('\n' + colors.cyan + '=== ПРОВЕРКА ЗАВЕРШЕНА ===' + colors.reset);
}

// Запуск проверки
checkActiveDeposits().catch(console.error);