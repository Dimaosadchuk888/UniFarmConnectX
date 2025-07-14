/**
 * Глубокий анализ проблемы с TON Farming карточкой показывающей нули
 * Техническая диагностика полной цепочки данных
 */

import { supabase } from '../core/supabase.js';
import { logger } from '../core/logger.js';
import { BoostService } from '../modules/boost/service.js';
import { TonFarmingRepository } from '../modules/boost/TonFarmingRepository.js';

async function analyzeTonFarmingCardIssue() {
  console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ TON FARMING КАРТОЧКИ ===\n');

  try {
    // 1. Проверка данных пользователя 74 в таблице users
    console.log('1. Проверка данных пользователя 74 в таблице users:');
    const { data: user74, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();

    if (userError || !user74) {
      console.log('❌ Ошибка получения пользователя 74:', userError);
      return;
    }

    console.log('✅ Пользователь 74 найден:');
    console.log('   - balance_ton:', user74.balance_ton);
    console.log('   - ton_boost_package:', user74.ton_boost_package);
    console.log('   - ton_farming_active:', user74.ton_farming_active);
    console.log('   - ton_farming_deposit:', user74.ton_farming_deposit);
    console.log('   - ton_farming_balance:', user74.ton_farming_balance);

    // 2. Проверка данных в таблице ton_farming_data
    console.log('\n2. Проверка данных в таблице ton_farming_data:');
    const { data: tonFarmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();

    if (farmingError) {
      console.log('❌ Нет данных в ton_farming_data:', farmingError.message);
    } else if (tonFarmingData) {
      console.log('✅ Данные в ton_farming_data:');
      console.log('   - farming_balance:', tonFarmingData.farming_balance);
      console.log('   - farming_rate:', tonFarmingData.farming_rate);
      console.log('   - boost_package_id:', tonFarmingData.boost_package_id);
      console.log('   - is_active:', tonFarmingData.is_active);
    }

    // 3. Тест метода getTonBoostFarmingStatus для user_id=1
    console.log('\n3. Тест API метода для user_id=1:');
    const boostService = new BoostService();
    const statusUser1 = await boostService.getTonBoostFarmingStatus('1');
    console.log('Результат для user_id=1:', JSON.stringify(statusUser1, null, 2));

    // 4. Тест метода getTonBoostFarmingStatus для user_id=74
    console.log('\n4. Тест API метода для user_id=74:');
    const statusUser74 = await boostService.getTonBoostFarmingStatus('74');
    console.log('Результат для user_id=74:', JSON.stringify(statusUser74, null, 2));

    // 5. Проверка активных TON Boost пользователей
    console.log('\n5. Проверка активных TON Boost пользователей:');
    const tonFarmingRepo = new TonFarmingRepository();
    const activeUsers = await tonFarmingRepo.getActiveBoostUsers();
    console.log(`Найдено активных пользователей: ${activeUsers.length}`);
    
    const user74Active = activeUsers.find(u => u.user_id === 74);
    if (user74Active) {
      console.log('✅ User 74 в списке активных:', user74Active);
    } else {
      console.log('❌ User 74 НЕ в списке активных TON Boost пользователей');
    }

    // 6. Анализ архитектурной проблемы
    console.log('\n6. АРХИТЕКТУРНАЯ ПРОБЛЕМА:');
    console.log('❌ Frontend: Использует getUserIdFromURL() который возвращает null');
    console.log('   → Fallback на user_id=1 вместо 74');
    console.log('❌ Backend: getTonBoostFarmingStatus ищет ton_boost_package в users');
    console.log('   → Но данные должны быть в ton_farming_data');
    console.log('❌ Результат: API возвращает нули для всех пользователей');

    // 7. Проверка транзакций TON Boost
    console.log('\n7. Последние транзакции TON Boost для user 74:');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .contains('metadata', { original_type: 'TON_BOOST_INCOME' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (!txError && transactions) {
      console.log(`Найдено ${transactions.length} транзакций TON Boost`);
      transactions.forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx.created_at}: +${tx.amount_ton} TON`);
      });
    }

    // 8. Рекомендации по исправлению
    console.log('\n8. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
    console.log('1️⃣ Frontend: Использовать userId из JWT токена вместо getUserIdFromURL()');
    console.log('2️⃣ Backend: Переписать getTonBoostFarmingStatus для работы с ton_farming_data');
    console.log('3️⃣ Альтернатива: Создать новый endpoint который корректно работает с новой архитектурой');

  } catch (error) {
    console.error('Ошибка анализа:', error);
  }
}

// Запуск анализа
analyzeTonFarmingCardIssue()
  .then(() => {
    console.log('\n✅ Анализ завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });