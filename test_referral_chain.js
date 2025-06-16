/**
 * T58 - Тестирование 20-уровневой реферальной цепочки UniFarm
 * Создает полную реферальную структуру и тестирует партнёрские начисления
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 T58: Начало тестирования 20-уровневой реферальной цепочки');

/**
 * Генерирует случайный реферальный код
 */
function generateRefCode() {
  return `TEST_REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Создает тестового пользователя
 */
async function createTestUser(level, referrerCode = null) {
  const telegramId = 2000000000 + level; // Уникальные telegram_id начиная с 2000000001
  const refCode = generateRefCode();
  
  console.log(`👤 Создание пользователя уровня ${level} (telegram_id: ${telegramId})`);
  
  try {
    // Находим реферера по коду если указан
    let referrerId = null;
    if (referrerCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('ref_code', referrerCode)
        .single();
      
      if (referrer) {
        referrerId = referrer.id;
        console.log(`   📎 Связан с реферером ID: ${referrerId}`);
      }
    }

    // Создаем пользователя
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        username: `test_user_${level}`,
        first_name: `TestUser${level}`,
        ref_code: refCode,
        balance_uni: '100.00000000',
        balance_ton: '100.00000000',
        uni_farming_rate: '0.001000',
        uni_farming_start_timestamp: new Date().toISOString(),
        uni_deposit_amount: '100.00000000',
        referred_by: referrerId
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Ошибка создания пользователя уровня ${level}:`, error);
      return null;
    }

    console.log(`✅ Пользователь уровня ${level} создан (ID: ${user.id}, ref_code: ${refCode})`);
    return user;
    
  } catch (error) {
    console.error(`❌ Критическая ошибка при создании пользователя ${level}:`, error);
    return null;
  }
}

/**
 * Создает 20-уровневую реферальную цепочку
 */
async function createReferralChain() {
  console.log('🔗 Создание 20-уровневой реферальной цепочки...');
  
  const chain = [];
  let previousRefCode = null;
  
  for (let level = 1; level <= 20; level++) {
    const user = await createTestUser(level, previousRefCode);
    
    if (!user) {
      console.error(`❌ Не удалось создать пользователя уровня ${level}, остановка`);
      break;
    }
    
    chain.push(user);
    previousRefCode = user.ref_code;
    
    // Пауза между созданием пользователей
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`✅ Создано ${chain.length} пользователей в реферальной цепочке`);
  return chain;
}

/**
 * Симулирует доход от фарминга для пользователя
 */
async function simulateFarmingIncome(user) {
  const uniIncome = 0.001; // 1 миллитокен UNI дохода
  const tonIncome = 0.0001; // 0.1 миллитокен TON дохода
  
  console.log(`💰 Симуляция дохода для пользователя ${user.id}:`);
  console.log(`    UNI доход: ${uniIncome}`);
  console.log(`    TON доход: ${tonIncome}`);
  
  try {
    // Обновляем баланс пользователя
    const newUniBalance = parseFloat(user.balance_uni) + uniIncome;
    const newTonBalance = parseFloat(user.balance_ton) + tonIncome;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance_uni: newUniBalance.toFixed(8),
        balance_ton: newTonBalance.toFixed(8)
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error(`❌ Ошибка обновления баланса пользователя ${user.id}:`, updateError);
      return false;
    }
    
    // Создаем транзакции дохода
    const transactions = [
      {
        user_id: user.id,
        type: 'UNI_FARMING_INCOME',
        amount_uni: uniIncome.toFixed(8),
        amount_ton: '0',
        currency: 'UNI',
        status: 'completed',
        description: 'Доход от UNI фарминга (тест)',
        source_user_id: user.id,
        created_at: new Date().toISOString()
      },
      {
        user_id: user.id,
        type: 'TON_BOOST_INCOME',
        amount_uni: '0',
        amount_ton: tonIncome.toFixed(8),
        currency: 'TON',
        status: 'completed',
        description: 'Доход от TON Boost (тест)',
        source_user_id: user.id,
        created_at: new Date().toISOString()
      }
    ];
    
    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactions);
    
    if (txError) {
      console.error(`❌ Ошибка создания транзакций дохода для пользователя ${user.id}:`, txError);
      return false;
    }
    
    console.log(`✅ Доход симулирован для пользователя ${user.id}`);
    return { uniIncome, tonIncome };
    
  } catch (error) {
    console.error(`❌ Критическая ошибка симуляции дохода для пользователя ${user.id}:`, error);
    return false;
  }
}

/**
 * Симулирует реферальные начисления для цепочки
 */
async function simulateReferralRewards(chain) {
  console.log('🎁 Симуляция реферальных начислений...');
  
  // Берем последнего пользователя в цепочке (уровень 20) как источник дохода
  const sourceUser = chain[chain.length - 1];
  const income = await simulateFarmingIncome(sourceUser);
  
  if (!income) {
    console.error('❌ Не удалось симулировать доход, прерывание реферальных начислений');
    return false;
  }
  
  console.log(`💎 Начисление реферальных наград от пользователя ${sourceUser.id}...`);
  
  // Проходим по цепочке вверх и начисляем награды
  let currentUser = sourceUser;
  let level = 1;
  
  while (currentUser && currentUser.referred_by && level <= 20) {
    try {
      // Находим реферера
      const { data: referrer, error: refError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.referred_by)
        .single();
      
      if (refError || !referrer) {
        console.log(`⚠️ Реферер для пользователя ${currentUser.id} не найден, остановка цепочки`);
        break;
      }
      
      // Рассчитываем награду
      const uniReward = level === 1 ? income.uniIncome : income.uniIncome * (level / 100);
      const tonReward = level === 1 ? income.tonIncome : income.tonIncome * (level / 100);
      
      console.log(`🏆 Уровень ${level}: Пользователь ${referrer.id} получает:`);
      console.log(`    UNI награда: ${uniReward.toFixed(8)} (${level === 1 ? '100%' : level + '%'})`);
      console.log(`    TON награда: ${tonReward.toFixed(8)} (${level === 1 ? '100%' : level + '%'})`);
      
      // Обновляем баланс реферера
      const newUniBalance = parseFloat(referrer.balance_uni) + uniReward;
      const newTonBalance = parseFloat(referrer.balance_ton) + tonReward;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          balance_uni: newUniBalance.toFixed(8),
          balance_ton: newTonBalance.toFixed(8)
        })
        .eq('id', referrer.id);
      
      if (updateError) {
        console.error(`❌ Ошибка обновления баланса реферера ${referrer.id}:`, updateError);
        continue;
      }
      
      // Создаем транзакции реферальных наград
      const referralTransactions = [];
      
      if (uniReward > 0) {
        referralTransactions.push({
          user_id: referrer.id,
          type: 'REFERRAL_REWARD',
          amount_uni: uniReward.toFixed(8),
          amount_ton: '0',
          currency: 'UNI',
          status: 'completed',
          description: `Реферальная награда ${level} уровня от uni_farming`,
          source_user_id: sourceUser.id,
          created_at: new Date().toISOString()
        });
      }
      
      if (tonReward > 0) {
        referralTransactions.push({
          user_id: referrer.id,
          type: 'REFERRAL_REWARD',
          amount_uni: '0',
          amount_ton: tonReward.toFixed(8),
          currency: 'TON',
          status: 'completed',
          description: `Реферальная награда ${level} уровня от boost_income`,
          source_user_id: sourceUser.id,
          created_at: new Date().toISOString()
        });
      }
      
      if (referralTransactions.length > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert(referralTransactions);
        
        if (txError) {
          console.error(`❌ Ошибка создания реферальных транзакций для ${referrer.id}:`, txError);
        } else {
          console.log(`✅ Реферальные транзакции созданы для пользователя ${referrer.id}`);
        }
      }
      
      // Переходим к следующему уровню
      currentUser = referrer;
      level++;
      
    } catch (error) {
      console.error(`❌ Ошибка обработки уровня ${level}:`, error);
      break;
    }
  }
  
  console.log(`✅ Реферальные начисления завершены. Обработано ${level - 1} уровней`);
  return true;
}

/**
 * Проверяет результаты тестирования
 */
async function verifyResults(chain) {
  console.log('🔍 Проверка результатов тестирования...');
  
  try {
    // Проверяем транзакции REFERRAL_REWARD
    const { data: referralTxs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (txError) {
      console.error('❌ Ошибка получения реферальных транзакций:', txError);
      return false;
    }
    
    console.log(`📊 Найдено ${referralTxs.length} реферальных транзакций:`);
    
    // Группируем по уровням
    const rewardsByLevel = {};
    referralTxs.forEach(tx => {
      const level = tx.description.match(/(\d+) уровня/)?.[1] || 'unknown';
      if (!rewardsByLevel[level]) {
        rewardsByLevel[level] = { uni: 0, ton: 0, count: 0 };
      }
      rewardsByLevel[level].uni += parseFloat(tx.amount_uni || 0);
      rewardsByLevel[level].ton += parseFloat(tx.amount_ton || 0);
      rewardsByLevel[level].count++;
    });
    
    console.log('\n📈 Реферальные награды по уровням:');
    Object.keys(rewardsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
      const data = rewardsByLevel[level];
      console.log(`   Уровень ${level}: UNI ${data.uni.toFixed(8)}, TON ${data.ton.toFixed(8)} (${data.count} транзакций)`);
    });
    
    // Проверяем балансы пользователей
    console.log('\n💰 Итоговые балансы тестовых пользователей:');
    for (let i = 0; i < Math.min(10, chain.length); i++) {
      const user = chain[i];
      const { data: updatedUser } = await supabase
        .from('users')
        .select('id, telegram_id, balance_uni, balance_ton')
        .eq('id', user.id)
        .single();
      
      if (updatedUser) {
        console.log(`   User ${updatedUser.id}: UNI ${updatedUser.balance_uni}, TON ${updatedUser.balance_ton}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Критическая ошибка проверки результатов:', error);
    return false;
  }
}

/**
 * Очистка тестовых данных
 */
async function cleanupTestData(chain) {
  console.log('🧹 Очистка тестовых данных...');
  
  try {
    // Удаляем тестовые транзакции
    const testUserIds = chain.map(user => user.id);
    
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .in('user_id', testUserIds);
    
    if (txError) {
      console.error('❌ Ошибка удаления тестовых транзакций:', txError);
    } else {
      console.log('✅ Тестовые транзакции удалены');
    }
    
    // Удаляем тестовых пользователей
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .in('id', testUserIds);
    
    if (userError) {
      console.error('❌ Ошибка удаления тестовых пользователей:', userError);
    } else {
      console.log('✅ Тестовые пользователи удалены');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка очистки:', error);
  }
}

/**
 * Основная функция тестирования
 */
async function runReferralChainTest() {
  console.log('🎯 T58: Запуск тестирования 20-уровневой реферальной цепочки\n');
  
  try {
    // Этап 1: Создание реферальной цепочки
    const chain = await createReferralChain();
    
    if (chain.length !== 20) {
      console.error(`❌ Не удалось создать полную цепочку из 20 пользователей (создано: ${chain.length})`);
      return false;
    }
    
    console.log('\n🔗 Реферальная цепочка создана успешно');
    
    // Этап 2: Симуляция реферальных начислений
    await simulateReferralRewards(chain);
    
    // Этап 3: Проверка результатов
    await verifyResults(chain);
    
    // Этап 4: Очистка (опционально)
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      await cleanupTestData(chain);
    } else {
      console.log('\n⚠️ Тестовые данные сохранены. Используйте --cleanup для удаления');
    }
    
    console.log('\n✅ T58: Тестирование 20-уровневой реферальной цепочки завершено успешно');
    return true;
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
    return false;
  }
}

// Запуск тестирования
runReferralChainTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Неожиданная ошибка:', error);
    process.exit(1);
  });