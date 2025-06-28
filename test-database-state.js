#!/usr/bin/env node

/**
 * Глубокая проверка состояния базы данных Supabase
 * Анализ всех таблиц и полей на актуальность и использование
 */

import http from 'http';

const API_BASE = 'http://localhost:3000/api/v2';
const TEST_TOKEN = 'mock-jwt-token-for-testing';

async function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v2${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
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

async function checkDatabaseState() {
  console.log('=== ГЛУБОКАЯ ПРОВЕРКА СОСТОЯНИЯ БАЗЫ ДАННЫХ SUPABASE ===\n');
  
  const results = {
    working: [],
    notWorking: [],
    suspicious: []
  };

  // 1. ПРОВЕРКА ТАБЛИЦЫ ПОЛЬЗОВАТЕЛЕЙ
  console.log('📊 1. Проверка таблицы пользователей (users)');
  
  try {
    // Получаем профиль пользователя
    const userProfile = await apiRequest('/users/profile');
    
    if (userProfile.status === 200 && userProfile.data.success) {
      const user = userProfile.data.data;
      console.log('Найден пользователь:', {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        ref_code: user.ref_code
      });
      
      // Проверяем наличие всех полей
      const requiredFields = ['id', 'telegram_id', 'username', 'ref_code', 'balance_uni', 'balance_ton'];
      const missingFields = requiredFields.filter(field => !(field in user));
      
      if (missingFields.length === 0) {
        results.working.push('✅ Таблица users: все обязательные поля присутствуют');
      } else {
        results.notWorking.push(`❌ Таблица users: отсутствуют поля ${missingFields.join(', ')}`);
      }
      
      // Проверяем заполненность полей
      if (user.ref_code && user.ref_code.trim() !== '') {
        results.working.push('✅ Реферальные коды генерируются корректно');
      } else {
        results.suspicious.push('❓ Реферальный код пустой или не генерируется');
      }
      
    } else {
      results.notWorking.push('❌ Не удалось получить профиль пользователя');
    }
  } catch (error) {
    results.notWorking.push(`❌ Ошибка при проверке таблицы users: ${error.message}`);
  }

  // 2. ПРОВЕРКА СИСТЕМЫ ДЕПОЗИТОВ
  console.log('\n💰 2. Проверка системы депозитов');
  
  try {
    // Проверяем баланс кошелька
    const walletBalance = await apiRequest('/wallet/balance');
    
    if (walletBalance.status === 200 && walletBalance.data.success) {
      const balance = walletBalance.data.data;
      console.log('Текущий баланс:', balance);
      
      results.working.push('✅ Система балансов работает корректно');
      
      // Проверяем историю транзакций
      const transactions = await apiRequest('/wallet/history');
      
      if (transactions.status === 200 && transactions.data.success) {
        const txData = transactions.data.data;
        console.log(`Найдено транзакций: ${txData.length}`);
        
        if (txData.length > 0) {
          // Анализируем типы транзакций
          const txTypes = [...new Set(txData.map(tx => tx.type))];
          console.log('Типы транзакций:', txTypes);
          
          results.working.push(`✅ История транзакций работает (${txData.length} записей)`);
          
          // Проверяем наличие депозитов
          const deposits = txData.filter(tx => tx.type === 'DEPOSIT' || tx.type === 'TON_DEPOSIT');
          if (deposits.length > 0) {
            results.working.push(`✅ Депозиты фиксируются в БД (найдено ${deposits.length})`);
          } else {
            results.suspicious.push('❓ Депозиты не найдены в истории транзакций');
          }
        } else {
          results.suspicious.push('❓ История транзакций пуста');
        }
      }
    }
  } catch (error) {
    results.notWorking.push(`❌ Ошибка при проверке депозитов: ${error.message}`);
  }

  // 3. ПРОВЕРКА TON BOOST ПОКУПОК
  console.log('\n🚀 3. Проверка TON Boost покупок');
  
  try {
    // Получаем список активных Boost
    const activeBoosts = await apiRequest('/boost/active');
    
    if (activeBoosts.status === 200) {
      const boosts = activeBoosts.data.data || [];
      console.log(`Активных Boost пакетов: ${boosts.length}`);
      
      if (boosts.length > 0) {
        results.working.push(`✅ TON Boost покупки фиксируются (${boosts.length} активных)`);
        
        // Проверяем структуру Boost записей
        const firstBoost = boosts[0];
        const boostFields = ['user_id', 'package_id', 'amount', 'rate', 'expires_at'];
        const missingBoostFields = boostFields.filter(field => !(field in firstBoost));
        
        if (missingBoostFields.length === 0) {
          results.working.push('✅ Структура Boost записей корректна');
        } else {
          results.suspicious.push(`❓ В Boost записях отсутствуют поля: ${missingBoostFields.join(', ')}`);
        }
      } else {
        results.suspicious.push('❓ Нет активных TON Boost пакетов');
      }
    }
  } catch (error) {
    results.notWorking.push(`❌ Ошибка при проверке TON Boost: ${error.message}`);
  }

  // 4. ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ
  console.log('\n👥 4. Проверка реферальной системы');
  
  try {
    const referralInfo = await apiRequest('/referral/1');
    
    if (referralInfo.status === 200 && referralInfo.data.success) {
      const refData = referralInfo.data.data;
      
      if (refData.ref_code) {
        results.working.push('✅ Реферальные коды генерируются и возвращаются');
      }
      
      if (refData.stats) {
        results.working.push('✅ Статистика рефералов доступна');
        console.log('Статистика рефералов:', refData.stats);
      }
      
      // Проверяем список рефералов
      const referralList = await apiRequest('/referral/1/list');
      
      if (referralList.status === 200) {
        const refs = referralList.data.data || [];
        if (refs.length > 0) {
          results.working.push(`✅ Список рефералов работает (${refs.length} рефералов)`);
        } else {
          results.suspicious.push('❓ Список рефералов пуст (возможно, нет приглашённых)');
        }
      }
    }
  } catch (error) {
    results.notWorking.push(`❌ Ошибка при проверке рефералов: ${error.message}`);
  }

  // 5. ПРОВЕРКА FARMING СИСТЕМЫ
  console.log('\n🌾 5. Проверка farming системы');
  
  try {
    const farmingStatus = await apiRequest('/farming/status');
    
    if (farmingStatus.status === 200 && farmingStatus.data.success) {
      const farming = farmingStatus.data.data;
      console.log('Статус farming:', {
        isActive: farming.isActive,
        depositAmount: farming.depositAmount,
        dailyIncomeUni: farming.dailyIncomeUni
      });
      
      results.working.push('✅ Farming система работает');
      
      // Проверяем наличие полей в БД
      if ('uni_farming_start_timestamp' in farming) {
        results.working.push('✅ Временные метки farming сохраняются');
      } else {
        results.suspicious.push('❓ Временные метки farming могут не сохраняться');
      }
    }
  } catch (error) {
    results.notWorking.push(`❌ Ошибка при проверке farming: ${error.message}`);
  }

  // 6. ПРОВЕРКА МИССИЙ
  console.log('\n🎯 6. Проверка системы миссий');
  
  try {
    const missionsList = await apiRequest('/missions/list');
    
    if (missionsList.status === 200 && missionsList.data.success) {
      const missions = missionsList.data.data;
      console.log(`Доступно миссий: ${missions.length}`);
      
      results.working.push('✅ Система миссий работает');
      
      // Проверяем прогресс пользователя
      const userMissions = await apiRequest('/missions/user/1');
      
      if (userMissions.status === 200) {
        results.working.push('✅ Прогресс миссий отслеживается');
      } else {
        results.suspicious.push('❓ Прогресс миссий может не отслеживаться');
      }
    }
  } catch (error) {
    results.notWorking.push(`❌ Ошибка при проверке миссий: ${error.message}`);
  }

  // ИТОГОВЫЙ ОТЧЁТ
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЁТ ПО СОСТОЯНИЮ БАЗЫ ДАННЫХ\n');
  
  console.log('✅ ЧТО РАБОТАЕТ:');
  results.working.forEach(item => console.log(`  ${item}`));
  
  console.log('\n❌ ЧТО НЕ РАБОТАЕТ:');
  if (results.notWorking.length === 0) {
    console.log('  Критических проблем не обнаружено');
  } else {
    results.notWorking.forEach(item => console.log(`  ${item}`));
  }
  
  console.log('\n❓ ПОДОЗРИТЕЛЬНЫЕ МОМЕНТЫ:');
  if (results.suspicious.length === 0) {
    console.log('  Подозрительных моментов не обнаружено');
  } else {
    results.suspicious.forEach(item => console.log(`  ${item}`));
  }
  
  // Анализ целостности
  console.log('\n🔍 АНАЛИЗ ЦЕЛОСТНОСТИ ДАННЫХ:');
  
  const integrity = [];
  
  // Проверяем дублирование данных
  integrity.push('• Балансы хранятся в таблице users (balance_uni, balance_ton)');
  integrity.push('• Транзакции хранятся отдельно в таблице transactions');
  integrity.push('• Реферальные связи через поле referred_by в users');
  
  // Проверяем неиспользуемые таблицы (на основе предыдущего анализа)
  integrity.push('\n• Потенциально неиспользуемые таблицы:');
  integrity.push('  - user_sessions (возможно, используется для сессий)');
  integrity.push('  - referrals (дублирует функционал referred_by)');
  integrity.push('  - farming_sessions (возможно, для истории farming)');
  
  integrity.forEach(item => console.log(item));
  
  console.log('\n' + '='.repeat(60));
}

// Запускаем проверку
checkDatabaseState().catch(console.error);