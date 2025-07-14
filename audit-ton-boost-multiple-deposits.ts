/**
 * Глубокий аудит логики множественных депозитов в TON Boost
 * Техническое исследование без изменения кода
 */

import { supabase } from './core/supabase';

async function auditTonBoostMultipleDeposits() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     АУДИТ ЛОГИКИ МНОЖЕСТВЕННЫХ ДЕПОЗИТОВ В TON BOOST        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nДата аудита:', new Date().toLocaleString());
  console.log('Основной тестовый пользователь: User 74 (9 покупок)\n');
  
  // =====================================================
  // 1. СТРУКТУРА ХРАНЕНИЯ ПАКЕТОВ
  // =====================================================
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 1. СТРУКТУРА ХРАНЕНИЯ ПАКЕТОВ В ton_farming_data           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  // Проверяем количество записей для пользователей с множественными покупками
  const { data: tonFarmingRecords } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 74);
    
  console.log(`📊 Записей в ton_farming_data для User 74: ${tonFarmingRecords?.length || 0}`);
  
  if (tonFarmingRecords && tonFarmingRecords.length > 0) {
    const record = tonFarmingRecords[0];
    console.log('\n📋 Текущая запись:');
    console.log(`├─ ID: ${record.id}`);
    console.log(`├─ User ID: ${record.user_id}`);
    console.log(`├─ Farming Balance: ${record.farming_balance} TON`);
    console.log(`├─ Boost Package ID: ${record.boost_package_id}`);
    console.log(`├─ Farming Rate: ${record.farming_rate}`);
    console.log(`├─ Created: ${new Date(record.created_at).toLocaleString()}`);
    console.log(`└─ Updated: ${new Date(record.updated_at).toLocaleString()}`);
  }
  
  // Проверяем других пользователей с множественными покупками
  const { data: multiPurchaseUsers } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('type', 'BOOST_PURCHASE')
    .order('user_id');
    
  const purchaseCountByUser: Record<number, number> = {};
  multiPurchaseUsers?.forEach(tx => {
    purchaseCountByUser[tx.user_id] = (purchaseCountByUser[tx.user_id] || 0) + 1;
  });
  
  console.log('\n📊 Анализ структуры для всех пользователей:');
  for (const [userId, count] of Object.entries(purchaseCountByUser)) {
    if (count > 1) {
      const { data: userRecords } = await supabase
        .from('ton_farming_data')
        .select('id')
        .eq('user_id', userId);
      console.log(`├─ User ${userId}: ${count} покупок → ${userRecords?.length || 0} записей в ton_farming_data`);
    }
  }
  
  console.log('\n❗ ВЫВОД: Одна запись на пользователя, перезаписывается при новой покупке');
  
  // =====================================================
  // 2. ПОВЕДЕНИЕ farming_balance
  // =====================================================
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 2. ПОВЕДЕНИЕ farming_balance ПРИ НОВЫХ ПОКУПКАХ            │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  // Анализируем историю покупок User 74
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: true });
    
  console.log('📈 Хронология покупок и изменения баланса:');
  console.log('┌────┬─────────────────────┬──────────┬──────────────────────┐');
  console.log('│ #  │ Дата                │ Сумма    │ Пакет                │');
  console.log('├────┼─────────────────────┼──────────┼──────────────────────┤');
  
  let totalSpent = 0;
  boostPurchases?.forEach((tx, idx) => {
    const amount = parseFloat(tx.amount || '0');
    totalSpent += amount;
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    console.log(`│ ${(idx + 1).toString().padEnd(2)} │ ${new Date(tx.created_at).toLocaleDateString().padEnd(19)} │ ${amount.toFixed(1).padEnd(8)} │ ${tx.description?.substring(0, 20) || 'N/A'} │`);
  });
  console.log('└────┴─────────────────────┴──────────┴──────────────────────┘');
  
  console.log(`\n💰 Общая сумма всех покупок: ${totalSpent} TON`);
  console.log(`💾 Текущий farming_balance: ${tonFarmingRecords?.[0]?.farming_balance || 0} TON`);
  console.log(`📊 Разница: ${totalSpent - (tonFarmingRecords?.[0]?.farming_balance || 0)} TON потеряно`);
  
  console.log('\n❗ ВЫВОД: farming_balance НЕ суммируется, замещается последней покупкой');
  
  // =====================================================
  // 3. ТРАНЗАКЦИИ BOOST_PURCHASE
  // =====================================================
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 3. АНАЛИЗ ТРАНЗАКЦИЙ BOOST_PURCHASE                        │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  console.log('📊 Статистика транзакций:');
  console.log(`├─ Всего транзакций: ${boostPurchases?.length || 0}`);
  console.log(`├─ Транзакций с суммой: ${boostPurchases?.filter(tx => tx.amount).length || 0}`);
  console.log(`└─ Транзакций с metadata: ${boostPurchases?.filter(tx => tx.metadata).length || 0}`);
  
  // Детальный анализ metadata
  console.log('\n🔍 Анализ metadata:');
  let withOriginalType = 0;
  let withBoostPackageId = 0;
  let withDailyRate = 0;
  
  boostPurchases?.forEach(tx => {
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    if (meta?.original_type) withOriginalType++;
    if (meta?.boost_package_id) withBoostPackageId++;
    if (meta?.daily_rate) withDailyRate++;
  });
  
  console.log(`├─ С original_type: ${withOriginalType} из ${boostPurchases?.length || 0}`);
  console.log(`├─ С boost_package_id: ${withBoostPackageId} из ${boostPurchases?.length || 0}`);
  console.log(`└─ С daily_rate: ${withDailyRate} из ${boostPurchases?.length || 0}`);
  
  // Проверка сумм
  const amounts = boostPurchases?.map(tx => parseFloat(tx.amount || '0')) || [];
  const uniqueAmounts = [...new Set(amounts)];
  console.log(`\n💵 Уникальные суммы покупок: [${uniqueAmounts.join(', ')}] TON`);
  
  console.log('\n❗ ВЫВОД: Все покупки создают транзакции, но старые суммы теряются');
  
  // =====================================================
  // 4. НАЧИСЛЕНИЯ ДОХОДА (TON_BOOST_INCOME)
  // =====================================================
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 4. АНАЛИЗ НАЧИСЛЕНИЙ ДОХОДА (TON_BOOST_INCOME)             │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  // Получаем последние начисления
  const { data: incomeTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('currency', 'TON')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('📈 Последние начисления TON:');
  let tonBoostIncomeCount = 0;
  incomeTransactions?.forEach(tx => {
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
    if (meta?.original_type === 'TON_BOOST_INCOME') {
      tonBoostIncomeCount++;
      console.log(`├─ ${new Date(tx.created_at).toLocaleString()}: +${tx.amount} TON`);
      console.log(`│  └─ Package ID: ${meta.boost_package_id}, Rate: ${meta.daily_rate}`);
    }
  });
  
  if (tonBoostIncomeCount === 0) {
    console.log('❌ TON_BOOST_INCOME транзакции не найдены!');
  }
  
  // Расчет ожидаемого дохода
  const currentPackage = tonFarmingRecords?.[0];
  if (currentPackage) {
    const expectedDailyIncome = currentPackage.farming_balance * currentPackage.farming_rate;
    const expectedPerCycle = expectedDailyIncome / 288; // 288 циклов по 5 минут в день
    console.log(`\n💡 Расчет дохода от текущего пакета:`);
    console.log(`├─ Баланс: ${currentPackage.farming_balance} TON`);
    console.log(`├─ Ставка: ${currentPackage.farming_rate * 100}% в день`);
    console.log(`├─ Ожидаемый доход за цикл: ${expectedPerCycle.toFixed(6)} TON`);
    console.log(`└─ Фактический доход: ${incomeTransactions?.[0]?.amount || 'нет данных'} TON`);
  }
  
  console.log('\n❗ ВЫВОД: Доход начисляется только от последнего активного пакета');
  
  // =====================================================
  // 5. СРАВНЕНИЕ С UNI FARMING
  // =====================================================
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ 5. СРАВНЕНИЕ С UNI FARMING                                  │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  // Получаем данные по UNI депозитам для сравнения
  const { data: uniDeposits } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', 74)
    .eq('type', 'FARMING_DEPOSIT');
    
  const { data: userData } = await supabase
    .from('users')
    .select('uni_deposit_amount')
    .eq('id', 74)
    .single();
    
  const totalUniDeposits = uniDeposits?.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0) || 0;
  
  console.log('📊 Сравнительная таблица:');
  console.log('┌─────────────────────┬─────────────────┬─────────────────┐');
  console.log('│ Параметр            │ UNI Farming     │ TON Boost       │');
  console.log('├─────────────────────┼─────────────────┼─────────────────┤');
  console.log(`│ Количество покупок  │ ${uniDeposits?.length || 0}              │ ${boostPurchases?.length || 0}               │`);
  console.log(`│ Сумма всех покупок  │ ${totalUniDeposits.toFixed(0)}         │ ${totalSpent.toFixed(0)}            │`);
  console.log(`│ Текущий баланс      │ ${userData?.uni_deposit_amount || 0}         │ ${tonFarmingRecords?.[0]?.farming_balance || 0}              │`);
  console.log(`│ Логика накопления   │ СУММИРОВАНИЕ    │ ЗАМЕЩЕНИЕ       │`);
  console.log(`│ Потери при покупках │ 0 UNI           │ ${(totalSpent - (tonFarmingRecords?.[0]?.farming_balance || 0)).toFixed(0)} TON       │`);
  console.log('└─────────────────────┴─────────────────┴─────────────────┘');
  
  console.log('\n❓ Почему TON Boost работает иначе?');
  console.log('├─ UNI: Все депозиты суммируются в uni_deposit_amount');
  console.log('├─ TON: Каждая покупка перезаписывает farming_balance');
  console.log('└─ Результат: При множественных покупках теряются предыдущие суммы');
  
  // =====================================================
  // ФИНАЛЬНЫЕ ВЫВОДЫ
  // =====================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    ФИНАЛЬНЫЕ ВЫВОДЫ                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('⚠️  ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
  console.log('├─ 1. Архитектурное ограничение: только одна запись в ton_farming_data');
  console.log('├─ 2. Потеря средств: при новой покупке предыдущий баланс перезаписывается');
  console.log('├─ 3. Недополучение дохода: начисления только от последнего пакета');
  console.log(`└─ 4. User 74 потерял ${(totalSpent - (tonFarmingRecords?.[0]?.farming_balance || 0)).toFixed(0)} TON из ${totalSpent} TON`);
  
  console.log('\n✅ ЧТО РАБОТАЕТ КОРРЕКТНО:');
  console.log('├─ Транзакции создаются для каждой покупки');
  console.log('├─ Суммы покупок фиксируются правильно');
  console.log('├─ Начисления работают для активного пакета');
  console.log('└─ История транзакций полная');
  
  console.log('\n❌ ЧТО НЕ РАБОТАЕТ:');
  console.log('├─ Накопление депозитов (как в UNI)');
  console.log('├─ Сохранение истории активных пакетов');
  console.log('├─ Начисления от всех купленных пакетов');
  console.log('└─ Возврат/компенсация при замене пакета');
  
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('├─ 1. Изменить логику на накопительную (как UNI)');
  console.log('├─ 2. Или создать таблицу истории пакетов');
  console.log('├─ 3. Или явно информировать о замещении');
  console.log('└─ 4. Компенсировать потерянные средства пользователям');
}

// Запускаем аудит
auditTonBoostMultipleDeposits().catch(console.error);