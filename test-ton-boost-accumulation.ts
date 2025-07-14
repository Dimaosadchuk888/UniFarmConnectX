#!/usr/bin/env ts-node
import { supabase } from './core/supabase';

/**
 * Скрипт для проверки применения изменений накопления TON Boost
 * Запускать после перезапуска сервера
 */

async function testTonBoostAccumulation() {
  console.log('🧪 ТЕСТ: Проверка накопления депозитов TON Boost\n');
  console.log('Время теста:', new Date().toISOString());
  console.log('=' .repeat(70) + '\n');

  const testUserId = 74;
  
  try {
    // 1. Получаем текущий баланс ДО покупки
    console.log('📊 ШАГ 1: Текущее состояние ДО покупки\n');
    
    const { data: beforeData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    const balanceBefore = parseFloat(beforeData?.farming_balance) || 0;
    const rateBefore = parseFloat(beforeData?.farming_rate) || 0;
    const packageBefore = beforeData?.boost_package_id;
    
    console.log(`Баланс ДО: ${balanceBefore} TON`);
    console.log(`Ставка ДО: ${rateBefore} (${rateBefore * 100}% в день)`);
    console.log(`Пакет ДО: ${packageBefore}`);
    
    // 2. Считаем сумму всех депозитов
    console.log('\n📈 ШАГ 2: История депозитов\n');
    
    const { data: allDeposits } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('user_id', testUserId)
      .eq('type', 'BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(20);
    
    let totalDeposits = 0;
    if (allDeposits) {
      allDeposits.forEach((tx, idx) => {
        const amount = parseFloat(tx.amount);
        totalDeposits += amount;
        if (idx < 5) { // Показываем только последние 5
          console.log(`${idx + 1}. ${tx.created_at}: ${amount} TON`);
        }
      });
      
      console.log(`\nВсего депозитов: ${allDeposits.length}`);
      console.log(`Общая сумма: ${totalDeposits} TON`);
    }
    
    // 3. Проверяем соответствие
    console.log('\n✅ ШАГ 3: Проверка накопления\n');
    
    console.log(`Текущий farming_balance: ${balanceBefore} TON`);
    console.log(`Сумма всех депозитов: ${totalDeposits} TON`);
    
    if (Math.abs(balanceBefore - totalDeposits) < 0.01) {
      console.log(`\n✅ НАКОПЛЕНИЕ РАБОТАЕТ! Баланс равен сумме депозитов.`);
    } else if (balanceBefore < totalDeposits) {
      const lost = totalDeposits - balanceBefore;
      const lostPercent = (lost / totalDeposits * 100).toFixed(1);
      console.log(`\n❌ НАКОПЛЕНИЕ НЕ РАБОТАЕТ!`);
      console.log(`   Потеряно: ${lost.toFixed(2)} TON (${lostPercent}%)`);
      console.log(`   Используется логика замещения.`);
    } else {
      console.log(`\n⚠️  Баланс больше суммы депозитов на ${(balanceBefore - totalDeposits).toFixed(2)} TON`);
      console.log(`   Возможно, были начальные депозиты или ручные корректировки.`);
    }
    
    // 4. Проверяем последние начисления
    console.log('\n💰 ШАГ 4: Последние начисления\n');
    
    const { data: lastRewards } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (lastRewards) {
      lastRewards.forEach((reward, idx) => {
        const meta = reward.metadata ? 
          (typeof reward.metadata === 'string' ? JSON.parse(reward.metadata) : reward.metadata) : {};
        
        if (meta.original_type === 'TON_BOOST_INCOME') {
          const amount = parseFloat(reward.amount);
          const expectedAmount = (balanceBefore * rateBefore) / (24 * 12);
          
          console.log(`Начисление ${idx + 1}:`);
          console.log(`   Время: ${reward.created_at}`);
          console.log(`   Сумма: ${amount} TON`);
          console.log(`   Ожидаемая: ${expectedAmount.toFixed(9)} TON`);
          console.log(`   Рассчитано от: ${balanceBefore} TON`);
        }
      });
    }
    
    // 5. Рекомендации
    console.log('\n📋 РЕКОМЕНДАЦИИ:\n');
    
    if (balanceBefore < totalDeposits) {
      console.log('1. Убедитесь, что сервер перезапущен после внедрения изменений');
      console.log('2. Проверьте, что файлы TonFarmingRepository.ts и service.ts обновлены');
      console.log('3. Сделайте тестовую покупку после перезапуска');
      console.log('4. Запустите этот скрипт повторно через 5 минут');
    } else {
      console.log('✅ Система работает корректно!');
      console.log('   Накопление депозитов активно.');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении теста:', error);
  }
}

// Запуск теста
testTonBoostAccumulation()
  .then(() => {
    console.log('\n✅ Тест завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });