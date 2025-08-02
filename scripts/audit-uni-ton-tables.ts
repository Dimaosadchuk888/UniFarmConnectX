import { supabase } from '../core/supabase.js';

interface TableAnalysis {
  tableName: string;
  recordCount: number;
  fields: string[];
  sampleData?: any[];
}

interface DuplicationAnalysis {
  field: string;
  tables: string[];
  discrepancies: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

async function analyzeUniTonTables() {
  console.log('🔍 АУДИТ ТАБЛИЦ UNI/TON И ДУБЛИРОВАНИЯ ДАННЫХ');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Анализ структуры и данных таблиц
    console.log('📊 АНАЛИЗ ТАБЛИЦ:\n');

    // Таблица users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('id')
      .limit(5);

    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (!usersError) {
      console.log('1. Таблица USERS:');
      console.log(`   Записей: ${userCount}`);
      console.log('   Поля UNI:');
      console.log('   - balance_uni (общий баланс UNI)');
      console.log('   - uni_deposit_amount (сумма депозита)');
      console.log('   - uni_farming_deposit (дубликат uni_deposit_amount)');
      console.log('   - uni_farming_balance (дубликат balance_uni)');
      console.log('   - uni_farming_active (статус фарминга)');
      console.log('   - uni_farming_rate (ставка фарминга)');
      console.log('   - uni_farming_start_timestamp (начало фарминга)');
      console.log('   Поля TON:');
      console.log('   - balance_ton (общий баланс TON)');
      console.log('   - ton_farming_balance (баланс фарминга TON)');
      console.log('   - ton_wallet_address (адрес кошелька)');
      console.log('   - wallet (дубликат ton_wallet_address)');
      console.log('   - ton_boost_package (ID пакета)');
      console.log('   - ton_boost_package_id (дубликат ton_boost_package)');
      console.log('   - ton_boost_purchase_date');
      console.log('   - ton_boost_rate (ставка буста)');
      console.log('   - ton_farming_rate (ставка фарминга TON)');
      console.log('');
    }

    // Таблица uni_farming_data
    const { data: uniFarmingData, count: uniFarmingCount } = await supabase
      .from('uni_farming_data')
      .select('*', { count: 'exact' })
      .order('user_id')
      .limit(5);

    if (uniFarmingData) {
      console.log('2. Таблица UNI_FARMING_DATA:');
      console.log(`   Записей: ${uniFarmingCount}`);
      console.log('   Поля:');
      console.log('   - user_id');
      console.log('   - balance (дублирует balance_uni из users)');
      console.log('   - is_active (дублирует uni_farming_active)');
      console.log('   - deposit_amount (дублирует uni_deposit_amount)');
      console.log('   - farming_balance (дублирует uni_farming_balance)');
      console.log('   - farming_rate (дублирует uni_farming_rate)');
      console.log('   - start_timestamp (дублирует uni_farming_start_timestamp)');
      console.log('   - created_at');
      console.log('');
    }

    // Таблица ton_farming_data
    const { data: tonFarmingData, count: tonFarmingCount } = await supabase
      .from('ton_farming_data')
      .select('*', { count: 'exact' })
      .order('user_id')
      .limit(5);

    if (tonFarmingData) {
      console.log('3. Таблица TON_FARMING_DATA:');
      console.log(`   Записей: ${tonFarmingCount}`);
      console.log('   Поля:');
      console.log('   - user_id');
      console.log('   - wallet_address (дублирует ton_wallet_address)');
      console.log('   - balance (дублирует ton_farming_balance)');
      console.log('   - farming_balance');
      console.log('   - farming_rate (дублирует ton_farming_rate)');
      console.log('   - boost_package_id (дублирует ton_boost_package)');
      console.log('   - boost_rate (дублирует ton_boost_rate)');
      console.log('   - created_at');
      console.log('');
    }

    // 2. Анализ дублирования данных
    console.log('\n📋 АНАЛИЗ ДУБЛИРОВАНИЯ ДАННЫХ:\n');

    // Проверка синхронизации между users и uni_farming_data
    const { data: uniSync } = await supabase.rpc('check_uni_sync', {});
    
    // SQL запрос для проверки расхождений
    const { data: uniDiscrepancies } = await supabase
      .from('users')
      .select('id, balance_uni, uni_deposit_amount, uni_farming_active')
      .order('id');

    const { data: uniDataMap } = await supabase
      .from('uni_farming_data')
      .select('user_id, balance, deposit_amount, is_active');

    let uniSyncIssues = 0;
    let tonSyncIssues = 0;

    if (uniDiscrepancies && uniDataMap) {
      const farmingMap = new Map(uniDataMap.map(f => [f.user_id, f]));
      
      for (const user of uniDiscrepancies) {
        const farmingData = farmingMap.get(user.id);
        if (farmingData) {
          if (user.balance_uni !== farmingData.balance ||
              user.uni_deposit_amount !== farmingData.deposit_amount ||
              user.uni_farming_active !== farmingData.is_active) {
            uniSyncIssues++;
          }
        }
      }
    }

    console.log('UNI данные:');
    console.log(`- Пользователей с UNI данными в users: ${uniDiscrepancies?.filter(u => u.uni_deposit_amount > 0).length || 0}`);
    console.log(`- Записей в uni_farming_data: ${uniFarmingCount || 0}`);
    console.log(`- Расхождений между таблицами: ${uniSyncIssues}`);
    console.log('');

    // Проверка синхронизации между users и ton_farming_data
    const { data: tonDiscrepancies } = await supabase
      .from('users')
      .select('id, ton_wallet_address, ton_farming_balance, ton_boost_package')
      .not('ton_wallet_address', 'is', null)
      .order('id');

    const { data: tonDataMap } = await supabase
      .from('ton_farming_data')
      .select('user_id, wallet_address, balance, boost_package_id');

    if (tonDiscrepancies && tonDataMap) {
      const tonMap = new Map(tonDataMap.map(t => [t.user_id, t]));
      
      for (const user of tonDiscrepancies) {
        const tonData = tonMap.get(user.id);
        if (tonData) {
          if (user.ton_wallet_address !== tonData.wallet_address ||
              user.ton_farming_balance !== tonData.balance ||
              user.ton_boost_package !== tonData.boost_package_id) {
            tonSyncIssues++;
          }
        }
      }
    }

    console.log('TON данные:');
    console.log(`- Пользователей с TON кошельками в users: ${tonDiscrepancies?.length || 0}`);
    console.log(`- Записей в ton_farming_data: ${tonFarmingCount || 0}`);
    console.log(`- Расхождений между таблицами: ${tonSyncIssues}`);
    console.log('');

    // 3. Анализ рисков
    console.log('\n⚠️  АНАЛИЗ РИСКОВ:\n');

    const risks = [
      {
        risk: 'ВЫСОКИЙ',
        description: 'Рассинхронизация данных между таблицами',
        details: 'Разные значения в users и farming_data таблицах могут привести к неправильным расчетам',
        affected: `${uniSyncIssues + tonSyncIssues} записей`
      },
      {
        risk: 'СРЕДНИЙ',
        description: 'Избыточность данных',
        details: 'Одни и те же данные хранятся в 2-3 местах, усложняя поддержку',
        affected: 'Все поля фарминга'
      },
      {
        risk: 'СРЕДНИЙ',
        description: 'Неконсистентность обновлений',
        details: 'При обновлении данных нужно обновлять несколько таблиц',
        affected: 'Все операции записи'
      },
      {
        risk: 'НИЗКИЙ',
        description: 'Производительность',
        details: 'Необходимость JOIN между таблицами для полной картины',
        affected: 'Запросы на чтение'
      }
    ];

    risks.forEach(r => {
      console.log(`🔴 ${r.risk}: ${r.description}`);
      console.log(`   ${r.details}`);
      console.log(`   Затронуто: ${r.affected}`);
      console.log('');
    });

    // 4. Текущее использование таблиц
    console.log('\n📈 ТЕКУЩЕЕ ИСПОЛЬЗОВАНИЕ:\n');

    // Анализ активности в таблицах за последние 7 дней
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('type')
      .gte('created_at', lastWeek.toISOString())
      .in('type', ['UNI_DEPOSIT', 'UNI_WITHDRAWAL', 'TON_DEPOSIT', 'FARMING_REWARD']);

    const transactionTypes = recentTransactions?.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    console.log('Транзакции за последнюю неделю:');
    Object.entries(transactionTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    console.log('');

    // 5. Рекомендации
    console.log('\n✅ РЕКОМЕНДАЦИИ:\n');

    console.log('1. КРАТКОСРОЧНЫЕ (безопасные):');
    console.log('   - Создать триггеры в БД для автоматической синхронизации');
    console.log('   - Добавить проверки консистентности в schedulers');
    console.log('   - Логировать все расхождения для мониторинга');
    console.log('');

    console.log('2. СРЕДНЕСРОЧНЫЕ (требуют тестирования):');
    console.log('   - Определить единый источник истины для каждого типа данных');
    console.log('   - Использовать views для совместимости со старым кодом');
    console.log('   - Постепенно переводить код на единые таблицы');
    console.log('');

    console.log('3. ДОЛГОСРОЧНЫЕ (после стабилизации):');
    console.log('   - Архивировать старые таблицы farming_data');
    console.log('   - Оставить только необходимые поля в users');
    console.log('   - Создать нормализованную структуру с foreign keys');
    console.log('');

    // 6. Схема зависимостей
    console.log('\n🔗 СХЕМА ЗАВИСИМОСТЕЙ:\n');
    console.log('users (основная таблица)');
    console.log('  ├── uni_farming_data (дублирует UNI поля)');
    console.log('  │   └── используется: UniFarmingRepository, старый код');
    console.log('  ├── ton_farming_data (дублирует TON поля)');
    console.log('  │   └── используется: TonFarmingRepository, старый код');
    console.log('  └── transactions (ссылается на user_id)');
    console.log('      └── хранит историю всех операций');

  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
  }
}

// Запуск анализа
console.log('Запуск аудита таблиц UNI/TON...\n');
analyzeUniTonTables();