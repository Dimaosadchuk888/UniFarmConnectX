#!/usr/bin/env node
/**
 * ТЕСТ ЦВЕТОВ РЕФЕРАЛЬНЫХ НАГРАД
 * Создание тестовых транзакций для проверки различения UNI/TON
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function createTestReferralRewards() {
  console.log('🎨 ТЕСТ ЦВЕТОВ РЕФЕРАЛЬНЫХ НАГРАД');
  
  try {
    // Находим тестового пользователя
    const { data: testUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (!testUser) {
      console.error('❌ Тестовый пользователь не найден');
      return;
    }

    const userId = testUser.id;
    console.log(`✅ Используем пользователя ID: ${userId}`);

    // Создаем тестовые реферальные награды
    const testTransactions = [
      {
        user_id: userId,
        type: 'REFERRAL_REWARD',
        amount: '100',
        currency: 'UNI',
        status: 'completed',
        description: 'TEST: UNI referral reward (should be PURPLE)'
      },
      {
        user_id: userId,
        type: 'REFERRAL_REWARD', 
        amount: '0.05',
        currency: 'TON',
        status: 'completed',
        description: 'TEST: TON referral reward (should be BLUE)'
      }
    ];

    console.log('🔄 Создание тестовых транзакций...');
    
    const { data: results, error } = await supabase
      .from('transactions')
      .insert(testTransactions)
      .select();

    if (error) {
      console.error('❌ Ошибка создания тестов:', error.message);
      return;
    }

    console.log('✅ ТЕСТОВЫЕ ТРАНЗАКЦИИ СОЗДАНЫ:');
    results.forEach((tx, index) => {
      const expectedColor = tx.currency === 'UNI' ? 'PURPLE' : 'BLUE';
      console.log(`   ${index + 1}. ID ${tx.id}: ${tx.currency} referral → ${expectedColor}`);
    });

    console.log('\n🎯 ИНСТРУКЦИИ ДЛЯ ПРОВЕРКИ UI:');
    console.log('   1. Откройте страницу транзакций');
    console.log('   2. Найдите тестовые транзакции с "TEST:" в описании');
    console.log('   3. Проверьте цвета:');
    console.log('      - UNI referral должна быть ФИОЛЕТОВОЙ');
    console.log('      - TON referral должна быть СИНЕЙ');

    console.log('\n⏳ Ожидание 30 секунд для проверки...');
    
    setTimeout(async () => {
      console.log('\n🧹 ОЧИСТКА ТЕСТОВЫХ ДАННЫХ...');
      
      const testIds = results.map(tx => tx.id);
      await supabase
        .from('transactions')
        .delete()
        .in('id', testIds);
      
      console.log('✅ Тестовые транзакции удалены');
      console.log('🎉 Тест цветов реферальных наград завершен');
      
    }, 30000);

  } catch (error) {
    console.error('❌ Критическая ошибка теста:', error);
  }
}

createTestReferralRewards();