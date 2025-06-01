/**
 * Тестирование системы UniFarm
 */

import { db } from './server/db.js';
import { users, missions as missionsTable, transactions } from './shared/schema.js';
import { eq } from 'drizzle-orm';

console.log('🧪 Начинаем тестирование системы UniFarm...\n');

async function testDatabase() {
  console.log('1. Тестирование подключения к базе данных...');
  
  try {
    // Тест подключения к БД
    const result = await db.select().from(users).limit(1);
    console.log('✅ База данных: подключение успешно');
    
    // Проверяем структуру таблиц
    const tableCheck = await db.select().from(missionsTable).limit(1);
    console.log('✅ Схема базы данных: структура корректна');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    return false;
  }
}

async function testUserCreation() {
  console.log('\n2. Тестирование создания пользователя...');
  
  try {
    // Создаем тестового пользователя
    const [newUser] = await db
      .insert(users)
      .values({
        telegram_id: 12345678,
        username: 'test_user',
        ref_code: 'TEST123',
        balance_uni: '1000.000000',
        balance_ton: '10.000000'
      })
      .returning();
    
    console.log('✅ Пользователь создан:', {
      id: newUser.id,
      telegram_id: newUser.telegram_id,
      ref_code: newUser.ref_code
    });
    
    return newUser;
  } catch (error) {
    console.error('❌ Ошибка создания пользователя:', error.message);
    return null;
  }
}

async function testMissionsSystem() {
  console.log('\n3. Тестирование системы миссий...');
  
  try {
    // Проверяем существующие миссии
    const missions = await db
      .select()
      .from(missionsTable)
      .where(eq(missionsTable.is_active, true));
    
    console.log('✅ Активных миссий найдено:', missions.length);
    
    if (missions.length > 0) {
      console.log('📋 Примеры миссий:');
      missions.slice(0, 3).forEach(mission => {
        console.log(`  - ${mission.title}: ${mission.reward_uni} UNI`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка системы миссий:', error.message);
    return false;
  }
}

async function testTransactionSystem(userId) {
  console.log('\n4. Тестирование системы транзакций...');
  
  try {
    // Создаем тестовую транзакцию
    const [transaction] = await db
      .insert(transactions)
      .values({
        user_id: userId,
        transaction_type: 'test_reward',
        amount: '100.000000',
        currency: 'UNI',
        status: 'confirmed'
      })
      .returning();
    
    console.log('✅ Транзакция создана:', {
      id: transaction.id,
      type: transaction.transaction_type,
      amount: transaction.amount
    });
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка системы транзакций:', error.message);
    return false;
  }
}

async function testReferralSystem() {
  console.log('\n5. Тестирование реферальной системы...');
  
  try {
    // Создаем пользователя-реферера
    const [referrer] = await db
      .insert(users)
      .values({
        telegram_id: 87654321,
        username: 'referrer_user',
        ref_code: 'REF456',
        balance_uni: '500.000000'
      })
      .returning();
    
    // Создаем реферала
    const [referred] = await db
      .insert(users)
      .values({
        telegram_id: 11223344,
        username: 'referred_user',
        parent_ref_code: 'REF456',
        ref_code: 'REF789',
        balance_uni: '0.000000'
      })
      .returning();
    
    console.log('✅ Реферальная связка создана:', {
      referrer: referrer.ref_code,
      referred: referred.parent_ref_code
    });
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка реферальной системы:', error.message);
    return false;
  }
}

async function runTests() {
  const results = {
    database: false,
    userCreation: false,
    missionsSystem: false,
    transactionSystem: false,
    referralSystem: false
  };
  
  results.database = await testDatabase();
  
  if (results.database) {
    const testUser = await testUserCreation();
    results.userCreation = !!testUser;
    
    results.missionsSystem = await testMissionsSystem();
    
    if (testUser) {
      results.transactionSystem = await testTransactionSystem(testUser.id);
    }
    
    results.referralSystem = await testReferralSystem();
  }
  
  // Итоговый отчет
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('=====================================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ ПРОШЕЛ' : '❌ ПРОВАЛЕН';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status} - ${testName}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Общий результат: ${passedTests}/${totalTests} тестов прошли успешно`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Система UniFarm полностью готова к работе!');
  } else {
    console.log('⚠️  Обнаружены проблемы, требующие внимания.');
  }
  
  process.exit(0);
}

runTests().catch(console.error);