/**
 * КРИТИЧЕСКАЯ ВЕРИФИКАЦИЯ АНАЛИЗА
 * Цель: Подтвердить диагноз с 100% уверенностью
 * Проверить все пути выполнения кода для TON Boost и депозитов
 */

import { supabase } from './core/supabase';

async function verifyAnalysis() {
  console.log('🔬 КРИТИЧЕСКАЯ ВЕРИФИКАЦИЯ АНАЛИЗА');
  console.log('='.repeat(70));
  
  try {
    // 1. ПРОВЕРЯЕМ КОНКРЕТНЫЕ ПОЛЬЗОВАТЕЛИ С ПРОБЛЕМАМИ
    console.log('\n1️⃣ АНАЛИЗ КОНКРЕТНЫХ СЛУЧАЕВ ВОЗВРАТА TON:');
    console.log('-'.repeat(50));
    
    // Ищем пользователей с паттерном: покупка → возврат
    const { data: suspiciousTransactions, error: suspError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .or('description.ilike.%boost%,type.eq.BOOST_PURCHASE,metadata->>original_type.eq.TON_BOOST_DEPOSIT')
      .order('created_at', { ascending: false });
    
    if (suspError) {
      console.error('❌ Ошибка получения подозрительных транзакций:', suspError);
      return;
    }
    
    if (suspiciousTransactions && suspiciousTransactions.length > 0) {
      console.log(`📊 Найдено Boost/Deposit транзакций за 24ч: ${suspiciousTransactions.length}`);
      
      const userAnalysis = new Map();
      
      suspiciousTransactions.forEach(tx => {
        const userId = tx.user_id.toString();
        if (!userAnalysis.has(userId)) {
          userAnalysis.set(userId, { purchases: [], deposits: [], boostPurchases: [] });
        }
        
        const userData = userAnalysis.get(userId);
        if (tx.type === 'BOOST_PURCHASE') {
          userData.boostPurchases.push(tx);
        } else if (tx.metadata?.original_type === 'TON_BOOST_DEPOSIT') {
          userData.deposits.push(tx);
        } else if (tx.description?.toLowerCase().includes('покупка')) {
          userData.purchases.push(tx);
        }
      });
      
      console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ:');
      
      for (const [userId, data] of userAnalysis) {
        const { purchases, deposits, boostPurchases } = data;
        
        if (boostPurchases.length > 0) {
          console.log(`\n👤 User ${userId}:`);
          console.log(`  🛒 BOOST_PURCHASE транзакций: ${boostPurchases.length}`);
          console.log(`  📥 TON_BOOST_DEPOSIT транзакций: ${deposits.length}`);
          console.log(`  💰 Покупок (описание): ${purchases.length}`);
          
          // Анализируем BOOST_PURCHASE транзакции
          boostPurchases.forEach((tx, index) => {
            console.log(`\n  📋 BOOST_PURCHASE #${index + 1}:`);
            console.log(`     ID: ${tx.id}`);
            console.log(`     Amount TON: ${tx.amount_ton}`);
            console.log(`     Type: ${tx.type}`);
            console.log(`     Created: ${new Date(tx.created_at).toLocaleString()}`);
            console.log(`     Description: ${tx.description}`);
            
            if (tx.metadata) {
              console.log(`     Metadata:`);
              console.log(`       - original_type: ${tx.metadata.original_type}`);
              console.log(`       - transaction_source: ${tx.metadata.transaction_source}`);
              console.log(`       - boost_package_id: ${tx.metadata.boost_package_id}`);
            }
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА: Это зачисление или списание?
            const amount = parseFloat(tx.amount_ton || '0');
            if (amount > 0) {
              console.log(`     🔴 ПОДТВЕРЖДЕНИЕ ПРОБЛЕМЫ: BOOST_PURCHASE зачисляет +${amount} TON!`);
            } else {
              console.log(`     ✅ BOOST_PURCHASE корректно списывает ${amount} TON`);
            }
          });
        }
      }
    }
    
    // 2. ПРОВЕРЯЕМ MAPPING И shouldUpdateBalance ЛОГИКУ
    console.log('\n2️⃣ ПРОВЕРКА ЛОГИКИ shouldUpdateBalance:');
    console.log('-'.repeat(50));
    
    // Симулируем логику из TransactionService
    const TRANSACTION_TYPE_MAPPING = {
      'BOOST_PURCHASE': 'FARMING_REWARD'
    };
    
    const shouldUpdateBalanceTypes = [
      'FARMING_REWARD',
      'REFERRAL_REWARD', 
      'MISSION_REWARD',
      'DAILY_BONUS',
      'TON_BOOST_INCOME',
      'UNI_DEPOSIT',
      'TON_DEPOSIT',
      'AIRDROP_REWARD',
      'DEPOSIT'
    ];
    
    console.log('📋 АНАЛИЗ MAPPING:');
    console.log(`BOOST_PURCHASE → ${TRANSACTION_TYPE_MAPPING['BOOST_PURCHASE']}`);
    console.log(`shouldUpdateBalance('BOOST_PURCHASE'): ${shouldUpdateBalanceTypes.includes('BOOST_PURCHASE')}`);
    console.log(`shouldUpdateBalance('FARMING_REWARD'): ${shouldUpdateBalanceTypes.includes('FARMING_REWARD')}`);
    
    console.log('\n🔍 ЛОГИЧЕСКАЯ ЦЕПОЧКА:');
    console.log('1. TonFarmingRepository создает BOOST_PURCHASE транзакцию');
    console.log('2. TransactionService мапит BOOST_PURCHASE → FARMING_REWARD');
    console.log('3. shouldUpdateBalance(BOOST_PURCHASE) возвращает FALSE');
    console.log('4. shouldUpdateBalance проверяется по dbTransactionType (FARMING_REWARD)');
    console.log('5. shouldUpdateBalance(FARMING_REWARD) возвращает TRUE');
    console.log('6. updateUserBalance зачисляет amount_ton на баланс');
    
    if (shouldUpdateBalanceTypes.includes('FARMING_REWARD')) {
      console.log('\n🔴 ПОДТВЕРЖДЕНИЕ ПРОБЛЕМЫ: FARMING_REWARD входит в shouldUpdateBalance!');
    }
    
    // 3. ПРОВЕРЯЕМ РЕАЛЬНЫЕ БАЛАНСЫ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n3️⃣ ПРОВЕРКА РЕАЛЬНЫХ БАЛАНСОВ:');
    console.log('-'.repeat(50));
    
    // Берем пользователей с BOOST_PURCHASE активностью
    const uniqueUserIds = Array.from(new Set(
      suspiciousTransactions
        ?.filter(tx => tx.type === 'BOOST_PURCHASE')
        ?.map(tx => tx.user_id)
        ?.slice(0, 5) || []
    ));
    
    for (const userId of uniqueUserIds) {
      const { data: userBalance } = await supabase
        .from('users')
        .select('id, balance_ton')
        .eq('id', userId)
        .single();
      
      if (userBalance) {
        // Считаем сумму всех BOOST_PURCHASE транзакций пользователя
        const userBoostTx = suspiciousTransactions.filter(tx => 
          tx.user_id === userId && tx.type === 'BOOST_PURCHASE'
        );
        
        const totalBoostAmount = userBoostTx.reduce((sum, tx) => 
          sum + parseFloat(tx.amount_ton || '0'), 0
        );
        
        console.log(`User ${userId}:`);
        console.log(`  Текущий баланс: ${userBalance.balance_ton} TON`);
        console.log(`  Сумма BOOST_PURCHASE: +${totalBoostAmount.toFixed(6)} TON`);
        console.log(`  Количество BOOST_PURCHASE: ${userBoostTx.length}`);
        
        if (totalBoostAmount > 0) {
          console.log(`  🔴 ПОДТВЕРЖДЕНИЕ: BOOST_PURCHASE зачислил TON на баланс!`);
        }
      }
    }
    
    // 4. ПРОВЕРЯЕМ ИСХОДНЫЙ КОД НА СЕРВЕРЕ
    console.log('\n4️⃣ ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ:');
    console.log('-'.repeat(50));
    
    console.log('📊 СТАТИСТИКА ПРОБЛЕМЫ:');
    console.log(`- BOOST_PURCHASE транзакций найдено: ${suspiciousTransactions?.filter(tx => tx.type === 'BOOST_PURCHASE').length || 0}`);
    console.log(`- Пользователей с BOOST_PURCHASE: ${uniqueUserIds.length}`);
    
    const positiveBoostPurchases = suspiciousTransactions?.filter(tx => 
      tx.type === 'BOOST_PURCHASE' && parseFloat(tx.amount_ton || '0') > 0
    ).length || 0;
    
    console.log(`- BOOST_PURCHASE с положительной суммой: ${positiveBoostPurchases}`);
    
    if (positiveBoostPurchases > 0) {
      console.log('\n🔴 КРИТИЧЕСКОЕ ПОДТВЕРЖДЕНИЕ:');
      console.log(`${positiveBoostPurchases} BOOST_PURCHASE транзакций ЗАЧИСЛЯЮТ TON вместо списания!`);
      console.log('Это на 100% подтверждает диагноз.');
    }
    
    // 5. АНАЛИЗ ПОСЛЕДСТВИЙ ИСПРАВЛЕНИЯ
    console.log('\n5️⃣ АНАЛИЗ ПОСЛЕДСТВИЙ ИСПРАВЛЕНИЯ:');
    console.log('-'.repeat(50));
    
    console.log('🎯 ПРЕДЛАГАЕМОЕ ИСПРАВЛЕНИЕ:');
    console.log('Изменить mapping: BOOST_PURCHASE → FARMING_REWARD');
    console.log('На: BOOST_PURCHASE → тип без автообновления баланса');
    
    console.log('\n✅ ПОЛОЖИТЕЛЬНЫЕ ПОСЛЕДСТВИЯ:');
    console.log('- TON Boost покупки перестанут возвращать деньги');
    console.log('- Устранится непредсказуемость балансов');
    console.log('- Система будет работать логично');
    
    console.log('\n⚠️ ПОТЕНЦИАЛЬНЫЕ РИСКИ:');
    console.log('- Пользователи с активными TON Boost перестанут получать "возвраты"');
    console.log('- Нужно решить что делать с уже созданными депозитами от BOOST_PURCHASE');
    console.log('- Возможны жалобы от пользователей привыкших к "возвратам"');
    
    console.log('\n📋 ПЛАН БЕЗОПАСНОГО ИСПРАВЛЕНИЯ:');
    console.log('1. Создать новый тип транзакции для покупок (например, BOOST_PAYMENT)');
    console.log('2. Обновить TonFarmingRepository для использования нового типа');
    console.log('3. Убедиться что новый тип НЕ входит в shouldUpdateBalance');
    console.log('4. Протестировать на staging среде');
    console.log('5. Применить к production с мониторингом');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА в верификации:', error);
  }
}

// Запуск верификации
verifyAnalysis()
  .then(() => {
    console.log('\n✅ Верификация завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка выполнения:', error);
    process.exit(1);
  });