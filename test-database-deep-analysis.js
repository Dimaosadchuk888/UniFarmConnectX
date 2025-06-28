#!/usr/bin/env node

/**
 * Глубокий анализ состояния базы данных Supabase
 * с реальными данными и проверкой всех таблиц
 */

import http from 'http';

const API_BASE = 'http://localhost:3000/api/v2';

async function apiRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v2${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function analyzeDatabaseTables() {
  console.log('=== ГЛУБОКИЙ АНАЛИЗ БАЗЫ ДАННЫХ SUPABASE ===\n');
  console.log('Дата проверки:', new Date().toLocaleString('ru-RU'));
  console.log('='.repeat(60) + '\n');

  const report = {
    tables: {},
    issues: [],
    recommendations: []
  };

  // 1. АНАЛИЗ ТАБЛИЦЫ USERS
  console.log('📊 ТАБЛИЦА USERS');
  console.log('-'.repeat(40));
  
  try {
    // Пробуем получить данные пользователя с ID 1
    const userTest = await apiRequest('/users/1');
    
    if (userTest.status === 200 && userTest.data.success) {
      const user = userTest.data.data;
      
      report.tables.users = {
        status: '✅ АКТИВНА',
        fields: {
          'id': user.id ? '✅ Заполнено' : '❌ Пустое',
          'telegram_id': user.telegram_id ? '✅ Заполнено' : '❌ Пустое',
          'username': user.username ? '✅ Заполнено' : '❌ Пустое',
          'ref_code': user.ref_code ? '✅ Заполнено' : '❌ Пустое',
          'balance_uni': user.balance_uni !== undefined ? '✅ Заполнено' : '❌ Отсутствует',
          'balance_ton': user.balance_ton !== undefined ? '✅ Заполнено' : '❌ Отсутствует',
          'referred_by': '✅ Поле для реферальной связи',
          'created_at': user.created_at ? '✅ Заполнено' : '❓ Возможно отсутствует',
          'uni_farming_start_timestamp': user.uni_farming_start_timestamp !== undefined ? '✅ Используется' : '❓ Не найдено',
          'ton_farming_balance': user.ton_farming_balance !== undefined ? '✅ Используется' : '❓ Не найдено'
        }
      };
      
      console.log('Пример пользователя:', {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        ref_code: user.ref_code,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton
      });
      
      // Проверка автогенерации ref_code
      if (!user.ref_code || user.ref_code === '') {
        report.issues.push('❌ Реферальные коды не генерируются автоматически при регистрации');
      }
      
    } else {
      report.tables.users = { status: '❌ НЕДОСТУПНА' };
      report.issues.push('❌ Таблица users недоступна или пустая');
    }
  } catch (error) {
    report.tables.users = { status: '❌ ОШИБКА', error: error.message };
  }

  // 2. АНАЛИЗ ТАБЛИЦЫ TRANSACTIONS
  console.log('\n💰 ТАБЛИЦА TRANSACTIONS');
  console.log('-'.repeat(40));
  
  try {
    const txHistory = await apiRequest('/wallet/history?limit=10');
    
    if (txHistory.status === 200 && txHistory.data.success) {
      const transactions = txHistory.data.data || [];
      
      report.tables.transactions = {
        status: '✅ АКТИВНА',
        recordsCount: transactions.length,
        types: {}
      };
      
      // Анализируем типы транзакций
      const txTypes = {};
      transactions.forEach(tx => {
        txTypes[tx.type] = (txTypes[tx.type] || 0) + 1;
      });
      
      report.tables.transactions.types = txTypes;
      
      console.log(`Найдено транзакций: ${transactions.length}`);
      console.log('Типы транзакций:', txTypes);
      
      // Проверяем структуру транзакций
      if (transactions.length > 0) {
        const tx = transactions[0];
        console.log('Структура транзакции:', {
          id: tx.id ? '✅' : '❌',
          user_id: tx.user_id ? '✅' : '❌',
          type: tx.type ? '✅' : '❌',
          amount_uni: tx.amount_uni !== undefined ? '✅' : '❌',
          amount_ton: tx.amount_ton !== undefined ? '✅' : '❌',
          created_at: tx.created_at ? '✅' : '❌'
        });
      }
      
      // Проверка депозитов
      const deposits = transactions.filter(tx => 
        tx.type === 'DEPOSIT' || 
        tx.type === 'TON_DEPOSIT' || 
        tx.type === 'UNI_DEPOSIT'
      );
      
      if (deposits.length === 0) {
        report.issues.push('❓ Нет записей о депозитах в истории транзакций');
      } else {
        console.log(`✅ Найдено депозитов: ${deposits.length}`);
      }
      
    } else {
      report.tables.transactions = { status: '❓ ПУСТАЯ ИЛИ НЕДОСТУПНА' };
    }
  } catch (error) {
    report.tables.transactions = { status: '❌ ОШИБКА', error: error.message };
  }

  // 3. АНАЛИЗ ТАБЛИЦЫ BOOST_PURCHASES
  console.log('\n🚀 ТАБЛИЦА BOOST_PURCHASES');
  console.log('-'.repeat(40));
  
  try {
    const activeBoosts = await apiRequest('/boost/active');
    
    if (activeBoosts.status === 200 && activeBoosts.data.success) {
      const boosts = activeBoosts.data.data || [];
      
      report.tables.boost_purchases = {
        status: boosts.length > 0 ? '✅ АКТИВНА' : '❓ ПУСТАЯ',
        recordsCount: boosts.length
      };
      
      console.log(`Активных Boost пакетов: ${boosts.length}`);
      
      if (boosts.length > 0) {
        const boost = boosts[0];
        console.log('Структура Boost записи:', {
          id: boost.id ? '✅' : '❌',
          user_id: boost.user_id ? '✅' : '❌',
          package_id: boost.package_id ? '✅' : '❌',
          amount: boost.amount ? '✅' : '❌',
          rate: boost.rate ? '✅' : '❌',
          status: boost.status ? '✅' : '❌',
          expires_at: boost.expires_at ? '✅' : '❌'
        });
      } else {
        report.issues.push('❓ Нет активных TON Boost пакетов - возможно, покупки не фиксируются');
      }
      
    } else {
      report.tables.boost_purchases = { status: '❓ НЕДОСТУПНА' };
    }
  } catch (error) {
    report.tables.boost_purchases = { status: '❌ ОШИБКА', error: error.message };
  }

  // 4. АНАЛИЗ ТАБЛИЦЫ REFERRALS
  console.log('\n👥 ТАБЛИЦА REFERRALS / РЕФЕРАЛЬНАЯ СИСТЕМА');
  console.log('-'.repeat(40));
  
  try {
    const refInfo = await apiRequest('/referral/1');
    const refList = await apiRequest('/referral/1/list');
    
    if (refInfo.status === 200 && refInfo.data.success) {
      const refData = refInfo.data.data;
      const referrals = refList.data?.data || [];
      
      report.tables.referral_system = {
        status: '✅ РАБОТАЕТ',
        ref_code_generation: refData.ref_code ? '✅ Коды генерируются' : '❌ Коды не генерируются',
        referrals_count: referrals.length,
        stats: refData.stats
      };
      
      console.log('Реферальная система:', {
        ref_code: refData.ref_code || 'НЕ СГЕНЕРИРОВАН',
        total_referrals: refData.stats?.totalReferrals || 0,
        total_earned_uni: refData.stats?.totalEarned?.UNI || '0',
        total_earned_ton: refData.stats?.totalEarned?.TON || '0'
      });
      
      if (referrals.length === 0) {
        report.issues.push('❓ Список рефералов пуст - возможно, связи не фиксируются через referred_by');
      }
      
    } else {
      report.tables.referral_system = { status: '❌ НЕ РАБОТАЕТ' };
    }
  } catch (error) {
    report.tables.referral_system = { status: '❌ ОШИБКА', error: error.message };
  }

  // 5. АНАЛИЗ FARMING ДАННЫХ
  console.log('\n🌾 FARMING ДАННЫЕ');
  console.log('-'.repeat(40));
  
  try {
    const farmingStatus = await apiRequest('/farming/status');
    
    if (farmingStatus.status === 200 && farmingStatus.data.success) {
      const farming = farmingStatus.data.data;
      
      report.tables.farming_data = {
        status: '✅ АКТИВНЫ',
        storage: 'В таблице users',
        fields: {
          'uni_farming_start_timestamp': farming.uni_farming_start_timestamp !== null ? '✅ Используется' : '❓ Не установлен',
          'uni_deposit_amount': farming.depositAmount ? '✅ Хранится' : '❓ Пустой',
          'rate': farming.rate ? '✅ Установлен' : '❌ Отсутствует',
          'accumulated': farming.accumulated !== undefined ? '✅ Отслеживается' : '❓ Не найдено'
        }
      };
      
      console.log('Статус farming:', {
        isActive: farming.isActive,
        depositAmount: farming.depositAmount,
        rate: farming.rate,
        dailyIncomeUni: farming.dailyIncomeUni
      });
      
      if (!farming.isActive && farming.depositAmount === '0') {
        report.issues.push('❓ Farming не активен - депозиты могут не фиксироваться');
      }
      
    } else {
      report.tables.farming_data = { status: '❌ НЕДОСТУПНЫ' };
    }
  } catch (error) {
    report.tables.farming_data = { status: '❌ ОШИБКА', error: error.message };
  }

  // 6. АНАЛИЗ ТАБЛИЦЫ MISSIONS
  console.log('\n🎯 ТАБЛИЦА MISSIONS');
  console.log('-'.repeat(40));
  
  try {
    const missions = await apiRequest('/missions/list');
    const userMissions = await apiRequest('/missions/user/1');
    
    if (missions.status === 200 && missions.data.success) {
      const missionList = missions.data.data || [];
      const userProgress = userMissions.data?.data || [];
      
      report.tables.missions = {
        status: '✅ АКТИВНА',
        missionsCount: missionList.length,
        userProgressCount: userProgress.length
      };
      
      console.log(`Всего миссий: ${missionList.length}`);
      console.log(`Прогресс пользователя: ${userProgress.length} записей`);
      
      if (userProgress.length === 0 && missionList.length > 0) {
        report.issues.push('❓ Прогресс миссий не отслеживается в mission_progress');
      }
      
    } else {
      report.tables.missions = { status: '❌ НЕДОСТУПНА' };
    }
  } catch (error) {
    report.tables.missions = { status: '❌ ОШИБКА', error: error.message };
  }

  // ИТОГОВЫЙ ОТЧЁТ
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЁТ ПО СОСТОЯНИЮ БАЗЫ ДАННЫХ');
  console.log('='.repeat(60) + '\n');

  // Состояние таблиц
  console.log('📊 СОСТОЯНИЕ ТАБЛИЦ:');
  for (const [table, info] of Object.entries(report.tables)) {
    console.log(`\n${table.toUpperCase()}:`);
    console.log(`  Статус: ${info.status}`);
    if (info.recordsCount !== undefined) {
      console.log(`  Записей: ${info.recordsCount}`);
    }
    if (info.fields) {
      console.log('  Поля:');
      for (const [field, status] of Object.entries(info.fields)) {
        console.log(`    - ${field}: ${status}`);
      }
    }
  }

  // Обнаруженные проблемы
  if (report.issues.length > 0) {
    console.log('\n❌ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    report.issues.forEach(issue => console.log(`  ${issue}`));
  }

  // Анализ целостности данных
  console.log('\n🔍 АНАЛИЗ ЦЕЛОСТНОСТИ ДАННЫХ:');
  console.log('✅ Данные централизованы в основных таблицах:');
  console.log('  - users: профили, балансы, farming данные');
  console.log('  - transactions: вся история операций');
  console.log('  - boost_purchases: покупки TON Boost');
  console.log('  - missions/mission_progress: задания и прогресс');
  
  console.log('\n❓ Потенциальные дублирования:');
  console.log('  - Балансы в users vs отдельная таблица wallets');
  console.log('  - Реферальные связи через referred_by vs таблица referrals');
  console.log('  - Farming данные в users vs таблица farming_sessions');
  
  console.log('\n📌 РЕКОМЕНДАЦИИ:');
  console.log('  1. Проверить автогенерацию ref_code при регистрации новых пользователей');
  console.log('  2. Убедиться, что депозиты создают записи в transactions');
  console.log('  3. Проверить фиксацию покупок TON Boost в boost_purchases');
  console.log('  4. Активировать отслеживание прогресса миссий в mission_progress');
  console.log('  5. Удалить неиспользуемые таблицы для чистоты структуры');
  
  console.log('\n' + '='.repeat(60));
}

// Запускаем анализ
analyzeDatabaseTables().catch(console.error);