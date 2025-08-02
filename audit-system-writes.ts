import { supabase } from './core/supabaseClient';

async function auditSystemWrites() {
  console.log('=== АУДИТ - КУДА СИСТЕМА ХОЧЕТ ПИСАТЬ ДЕПОЗИТЫ ===\n');
  
  // Проверяем логи покупки boost
  console.log('1. АНАЛИЗ КОДА purchaseWithInternalWallet (modules/boost/service.ts):');
  console.log('├── Списывает из balance_ton через BalanceManager.subtractBalance()');
  console.log('├── Обновляет в users: ton_boost_package, ton_boost_rate, ton_boost_active');
  console.log('├── Вызывает TonFarmingRepository.activateBoost() с суммой депозита');
  console.log('└── Создает транзакцию типа BOOST_PURCHASE\n');
  
  console.log('2. АНАЛИЗ TonFarmingRepository.activateBoost():');
  console.log('├── Получает текущий farming_balance через getByUserId()');
  console.log('├── Добавляет новый депозит к существующему балансу');
  console.log('├── Пытается сохранить в ton_farming_data через upsert()');
  console.log('├── Если ton_farming_data не работает - использует fallback');
  console.log('└── В fallback обновляет ton_farming_balance в users\n');
  
  console.log('3. ПРОБЛЕМА В КОДЕ:');
  console.log('├── getByUserId() создает новую запись с farming_balance=0');
  console.log('├── calculateUserTonDeposits() НЕ учитывает BOOST_PURCHASE транзакции');
  console.log('├── Ищет только типы: [DEPOSIT, TON_DEPOSIT, FARMING_REWARD]');
  console.log('└── Поэтому новые покупки boost не попадают в расчет\n');
  
  // Проверяем транзакции
  console.log('4. ПРОВЕРКА ТРАНЗАКЦИЙ BOOST_PURCHASE:');
  const { data: boostPurchases } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .eq('type', 'BOOST_PURCHASE')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (boostPurchases && boostPurchases.length > 0) {
    console.log(`└── Найдено ${boostPurchases.length} транзакций:`);
    boostPurchases.forEach(tx => {
      console.log(`    ├── ${tx.created_at}: ${tx.amount} TON`);
    });
  } else {
    console.log('└── Транзакций BOOST_PURCHASE не найдено!\n');
  }
  
  // Анализ синхронизации
  console.log('5. ТЕКУЩАЯ МОДЕЛЬ ХРАНЕНИЯ:');
  console.log('\n📁 ОСНОВНЫЕ БАЛАНСЫ (users таблица):');
  console.log('├── balance_ton: доступный баланс для вывода');
  console.log('├── balance_uni: доступный баланс UNI');
  console.log('├── ton_farming_balance: TON в farming (не обновляется!)');
  console.log('└── uni_deposit_amount: UNI в farming\n');
  
  console.log('📁 ДУБЛИРУЮЩИЕ ТАБЛИЦЫ:');
  console.log('├── ton_farming_data: дублирует ton_farming_balance');
  console.log('└── uni_farming_data: дублирует uni_deposit_amount\n');
  
  console.log('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА:');
  console.log('1. Код списывает из balance_ton');
  console.log('2. Пытается добавить в ton_farming_data.farming_balance');
  console.log('3. Fallback обновляет users.ton_farming_balance');
  console.log('4. НО! Обновление не происходит из-за бага в коде');
  console.log('5. Деньги "зависают" между балансами\n');
  
  console.log('✅ РЕШЕНИЕ:');
  console.log('1. Исправить activateBoost() чтобы правильно обновлял ton_farming_balance');
  console.log('2. Добавить BOOST_PURCHASE в calculateUserTonDeposits()');
  console.log('3. Убедиться что транзакции создаются правильно');
}

auditSystemWrites();