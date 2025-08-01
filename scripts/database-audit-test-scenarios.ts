#!/usr/bin/env tsx
/**
 * Скрипт для выполнения тестовых сценариев аудита БД
 * Согласно ТЗ из docs/FULL_DATABASE_AUDIT_REPORT.md
 * 
 * ВАЖНО: Использует только тестовые аккаунты
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_KEY должны быть установлены');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Тестовые данные
const TEST_TELEGRAM_ID = 999999999;
const TEST_USERNAME = 'test_user_audit';
const TEST_REF_CODE = 'TEST_AUDIT_2025';

// Интерфейсы для типизации
interface TestUser {
  id: number;
  telegram_id: number;
  username: string;
  ref_code: string;
  balance_uni: number;
  balance_ton: number;
  [key: string]: any;
}

interface TestResult {
  scenario: string;
  status: 'success' | 'failed';
  details: any;
  errors?: string[];
}

const results: TestResult[] = [];

// Утилита для логирования
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// 1. Очистка тестовых данных
async function cleanupTestData() {
  log('🧹 Очистка старых тестовых данных...');
  
  try {
    // Сначала получаем ID тестового пользователя
    const { data: testUsers } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', TEST_TELEGRAM_ID);
    
    if (testUsers && testUsers.length > 0) {
      // Удаляем связанные транзакции
      for (const user of testUsers) {
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id);
          
        await supabase
          .from('withdraw_requests')
          .delete()
          .eq('user_id', user.id);
      }
      
      // Теперь удаляем пользователя
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('telegram_id', TEST_TELEGRAM_ID);
      
      if (error && error.code !== 'PGRST116') {
        log('⚠️ Ошибка при очистке пользователя:', error);
      }
    }
    
    // Также удаляем тестового реферала
    await supabase
      .from('users')
      .delete()
      .eq('telegram_id', 888888888);
    
    log('✅ Очистка завершена');
  } catch (error) {
    log('❌ Критическая ошибка при очистке:', error);
  }
}

// 2. Сценарий: Регистрация нового пользователя
async function testUserRegistration(): Promise<TestUser | null> {
  log('\n📝 СЦЕНАРИЙ 1: Регистрация нового пользователя');
  
  const result: TestResult = {
    scenario: 'Регистрация пользователя',
    status: 'failed',
    details: {}
  };
  
  try {
    // Создаём пользователя
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        telegram_id: TEST_TELEGRAM_ID,
        username: TEST_USERNAME,
        first_name: 'Test Audit User',
        ref_code: TEST_REF_CODE,
        balance_uni: '0',
        balance_ton: '0'
      })
      .select()
      .single();
    
    if (error) {
      result.errors = [error.message];
      results.push(result);
      log('❌ Ошибка создания пользователя:', error);
      return null;
    }
    
    log('✅ Пользователь создан:', {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      ref_code: newUser.ref_code
    });
    
    // Проверяем, создалась ли welcome транзакция
    const { data: welcomeTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', newUser.id)
      .eq('type', 'DAILY_BONUS')
      .single();
    
    result.status = 'success';
    result.details = {
      user_created: true,
      user_id: newUser.id,
      ref_code_generated: newUser.ref_code,
      welcome_transaction: welcomeTx ? true : false,
      tables_affected: ['users', welcomeTx ? 'transactions' : null].filter(Boolean)
    };
    
    results.push(result);
    return newUser;
    
  } catch (error) {
    result.errors = [String(error)];
    results.push(result);
    log('❌ Критическая ошибка:', error);
    return null;
  }
}

// 3. Сценарий: Присвоение баланса
async function testBalanceAssignment(user: TestUser) {
  log('\n💰 СЦЕНАРИЙ 2: Присвоение баланса');
  
  const result: TestResult = {
    scenario: 'Присвоение баланса',
    status: 'failed',
    details: {}
  };
  
  try {
    // Начисляем 10 TON
    const { data: tonUpdate, error: tonError } = await supabase
      .from('users')
      .update({ balance_ton: '10' })
      .eq('id', user.id)
      .select()
      .single();
    
    if (tonError) {
      result.errors = ['TON update: ' + tonError.message];
      results.push(result);
      return;
    }
    
    log('✅ Начислено 10 TON');
    
    // Начисляем 100 UNI
    const { data: uniUpdate, error: uniError } = await supabase
      .from('users')
      .update({ balance_uni: '100' })
      .eq('id', user.id)
      .select()
      .single();
    
    if (uniError) {
      result.errors = ['UNI update: ' + uniError.message];
      results.push(result);
      return;
    }
    
    log('✅ Начислено 100 UNI');
    
    // Создаём транзакции
    const transactions = [
      {
        user_id: user.id,
        type: 'DEPOSIT',
        currency: 'TON',
        amount: '10',
        amount_ton: '10',
        amount_uni: '0',
        description: 'Test deposit TON',
        status: 'confirmed'
      },
      {
        user_id: user.id,
        type: 'DEPOSIT',
        currency: 'UNI',
        amount: '100',
        amount_uni: '100',
        amount_ton: '0',
        description: 'Test deposit UNI',
        status: 'confirmed'
      }
    ];
    
    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactions);
    
    if (txError) {
      log('⚠️ Ошибка создания транзакций:', txError);
    }
    
    result.status = 'success';
    result.details = {
      balances_updated: {
        ton: uniUpdate.balance_ton,
        uni: uniUpdate.balance_uni
      },
      transactions_created: !txError,
      tables_affected: ['users', 'transactions']
    };
    
    results.push(result);
    
  } catch (error) {
    result.errors = [String(error)];
    results.push(result);
    log('❌ Критическая ошибка:', error);
  }
}

// 4. Сценарий: Фарминг
async function testFarming(user: TestUser) {
  log('\n🌾 СЦЕНАРИЙ 3: Фарминг / бусты / бонусы');
  
  const result: TestResult = {
    scenario: 'Фарминг и бусты',
    status: 'failed',
    details: {}
  };
  
  try {
    // Активируем UNI farming
    const farmingData = {
      uni_farming_active: true,
      uni_deposit_amount: '50',
      uni_farming_start_timestamp: new Date().toISOString(),
      uni_farming_rate: '0.01',
      uni_farming_balance: '0'
    };
    
    const { data: farmingUpdate, error: farmingError } = await supabase
      .from('users')
      .update(farmingData)
      .eq('id', user.id)
      .select()
      .single();
    
    if (farmingError) {
      result.errors = ['Farming activation: ' + farmingError.message];
      results.push(result);
      return;
    }
    
    log('✅ UNI farming активирован');
    
    // Создаём транзакцию депозита
    const { error: depositTxError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'FARMING_DEPOSIT',
        currency: 'UNI',
        amount: '50',
        amount_uni: '50',
        amount_ton: '0',
        description: 'UNI Farming deposit',
        status: 'confirmed'
      });
    
    // Активируем TON boost
    const { data: boostUpdate, error: boostError } = await supabase
      .from('users')
      .update({
        ton_boost_active: true,
        ton_boost_package_id: 1,
        ton_boost_rate: '0.005'
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (boostError) {
      log('⚠️ Ошибка активации TON boost:', boostError);
    }
    
    // Проверяем отдельные таблицы фарминга
    const { data: uniFarmingData } = await supabase
      .from('uni_farming_data')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    const { data: tonFarmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    result.status = 'success';
    result.details = {
      uni_farming_activated: farmingUpdate.uni_farming_active,
      uni_deposit_amount: farmingUpdate.uni_deposit_amount,
      ton_boost_activated: boostUpdate?.ton_boost_active || false,
      farming_transaction_created: !depositTxError,
      uni_farming_table_used: !!uniFarmingData,
      ton_farming_table_used: !!tonFarmingData,
      tables_affected: ['users', 'transactions'],
      fields_updated: Object.keys(farmingData).concat(boostUpdate ? ['ton_boost_active', 'ton_boost_package_id', 'ton_boost_rate'] : [])
    };
    
    results.push(result);
    
  } catch (error) {
    result.errors = [String(error)];
    results.push(result);
    log('❌ Критическая ошибка:', error);
  }
}

// 5. Сценарий: Вывод средств
async function testWithdrawal(user: TestUser) {
  log('\n💸 СЦЕНАРИЙ 4: Вывод средств');
  
  const result: TestResult = {
    scenario: 'Вывод средств',
    status: 'failed',
    details: {}
  };
  
  try {
    // Создаём заявку на вывод
    const withdrawAmount = '5';
    const walletAddress = 'UQCtest_wallet_address_' + Date.now();
    
    const { data: withdrawRequest, error: withdrawError } = await supabase
      .from('withdraw_requests')
      .insert({
        user_id: user.id,
        amount: withdrawAmount,
        wallet_address: walletAddress,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (withdrawError) {
      // Пробуем альтернативную структуру таблицы
      const { data: altWithdraw, error: altError } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          amount_ton: withdrawAmount,
          ton_wallet: walletAddress,
          status: 'pending'
        })
        .select()
        .single();
      
      if (altError) {
        result.errors = ['Withdraw request: ' + withdrawError.message, 'Alt structure: ' + altError.message];
        results.push(result);
        return;
      }
      
      log('✅ Заявка на вывод создана (альтернативная структура)');
    } else {
      log('✅ Заявка на вывод создана');
    }
    
    // Уменьшаем баланс
    const { data: balanceUpdate, error: balanceError } = await supabase
      .from('users')
      .update({ 
        balance_ton: (parseFloat(user.balance_ton) - parseFloat(withdrawAmount)).toString() 
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (balanceError) {
      log('⚠️ Ошибка обновления баланса:', balanceError);
    }
    
    // Создаём транзакцию вывода
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'WITHDRAWAL',
        currency: 'TON',
        amount: withdrawAmount,
        amount_ton: withdrawAmount,
        amount_uni: '0',
        wallet_address: walletAddress,
        description: 'Test withdrawal',
        status: 'pending'
      });
    
    result.status = 'success';
    result.details = {
      withdraw_request_created: true,
      withdraw_id: withdrawRequest?.id || 'unknown',
      balance_updated: !balanceError,
      new_balance: balanceUpdate?.balance_ton || 'unknown',
      transaction_created: !txError,
      tables_affected: ['withdraw_requests', 'users', 'transactions']
    };
    
    results.push(result);
    
  } catch (error) {
    result.errors = [String(error)];
    results.push(result);
    log('❌ Критическая ошибка:', error);
  }
}

// 6. Проверка реферальной системы
async function testReferralSystem(referrer: TestUser) {
  log('\n👥 СЦЕНАРИЙ 5: Реферальная система');
  
  const result: TestResult = {
    scenario: 'Реферальная система',
    status: 'failed',
    details: {}
  };
  
  try {
    // Генерируем уникальный ref_code для реферала
    const referralRefCode = `REF_TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Создаём реферала
    const { data: referral, error: referralError } = await supabase
      .from('users')
      .insert({
        telegram_id: 888888888,
        username: 'test_referral_user',
        first_name: 'Referral User',
        ref_code: referralRefCode,
        parent_ref_code: referrer.ref_code,
        referred_by: referrer.id,
        balance_uni: '0',
        balance_ton: '0'
      })
      .select()
      .single();
    
    if (referralError) {
      result.errors = ['Create referral: ' + referralError.message];
      results.push(result);
      return;
    }
    
    log('✅ Реферал создан');
    
    // Проверяем таблицу referrals
    const { data: referralRecord } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', referral.id)
      .eq('inviter_id', referrer.id)
      .single();
    
    // Создаём тестовую транзакцию реферального бонуса
    const { error: bonusTxError } = await supabase
      .from('transactions')
      .insert({
        user_id: referrer.id,
        type: 'REFERRAL_REWARD',
        currency: 'UNI',
        amount: '10',
        amount_uni: '10',
        amount_ton: '0',
        source_user_id: referral.id,
        description: 'Referral bonus',
        status: 'confirmed'
      });
    
    // Очищаем тестового реферала
    await supabase
      .from('users')
      .delete()
      .eq('id', referral.id);
    
    result.status = 'success';
    result.details = {
      referral_created: true,
      parent_ref_code_set: referral.parent_ref_code === referrer.ref_code,
      referred_by_set: referral.referred_by === referrer.id,
      referrals_table_used: !!referralRecord,
      referral_bonus_created: !bonusTxError,
      tables_affected: ['users', 'transactions', referralRecord ? 'referrals' : null].filter(Boolean)
    };
    
    results.push(result);
    
  } catch (error) {
    result.errors = [String(error)];
    results.push(result);
    log('❌ Критическая ошибка:', error);
  }
}

// Генерация итогового отчёта
async function generateReport() {
  log('\n📊 ГЕНЕРАЦИЯ ОТЧЁТА');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'development',
    scenarios_total: results.length,
    scenarios_passed: results.filter(r => r.status === 'success').length,
    scenarios_failed: results.filter(r => r.status === 'failed').length,
    results: results
  };
  
  // Сохраняем отчёт
  const reportPath = path.join(process.cwd(), 'docs', `database_audit_test_results_${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  log(`\n✅ Отчёт сохранён: ${reportPath}`);
  
  // Выводим сводку
  console.log('\n========== ИТОГОВАЯ СВОДКА ==========');
  console.log(`Всего сценариев: ${report.scenarios_total}`);
  console.log(`Успешно: ${report.scenarios_passed}`);
  console.log(`Провалено: ${report.scenarios_failed}`);
  console.log('\nДетали по сценариям:');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.scenario}: ${result.status === 'success' ? '✅' : '❌'}`);
    if (result.errors) {
      console.log('   Ошибки:', result.errors);
    }
    if (result.details.tables_affected) {
      console.log('   Затронутые таблицы:', result.details.tables_affected);
    }
  });
}

// Главная функция
async function runAuditTests() {
  console.log('🚀 Запуск тестовых сценариев аудита БД UniFarm');
  console.log('================================================\n');
  
  try {
    // Очистка
    await cleanupTestData();
    
    // Тест 1: Регистрация
    const testUser = await testUserRegistration();
    if (!testUser) {
      log('❌ Не удалось создать тестового пользователя, прерываем тесты');
      await generateReport();
      return;
    }
    
    // Тест 2: Балансы
    await testBalanceAssignment(testUser);
    
    // Обновляем данные пользователя
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single();
    
    if (updatedUser) {
      Object.assign(testUser, updatedUser);
    }
    
    // Тест 3: Фарминг
    await testFarming(testUser);
    
    // Тест 4: Вывод
    await testWithdrawal(testUser);
    
    // Тест 5: Рефералы
    await testReferralSystem(testUser);
    
    // Генерируем отчёт
    await generateReport();
    
    // Финальная очистка
    await cleanupTestData();
    
  } catch (error) {
    log('❌ Критическая ошибка выполнения тестов:', error);
    await generateReport();
  }
}

// Запуск
runAuditTests().catch(console.error);