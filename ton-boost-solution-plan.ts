import { supabase } from './core/supabaseClient';

async function createSolutionPlan() {
  console.log('🎯 ПЛАН РЕШЕНИЯ ПРОБЛЕМ АККАУНТОВ 191-303');
  console.log('='.repeat(60));

  try {
    // 1. Диагностика текущего состояния для принятия решения
    console.log('\n1️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА ДЛЯ ПРИНЯТИЯ РЕШЕНИЯ:');
    
    const { data: users191_303, error: usersError } = await supabase
      .from('users')
      .select('id, balance_ton, ton_boost_active, created_at')
      .gte('id', 191)
      .lte('id', 303)
      .order('id', { ascending: true });

    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_active, boost_package_id')
      .gte('user_id', 191)
      .lte('user_id', 303);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('user_id, type, amount_ton, created_at')
      .gte('user_id', 191)
      .lte('user_id', 303)
      .in('type', ['TON_DEPOSIT', 'BOOST_PURCHASE', 'FARMING_REWARD']);

    if (!usersError && !farmingError && !txError) {
      // Создаем карту пользователей по проблемам
      const userMap: { [key: number]: any } = {};
      
      users191_303?.forEach(user => {
        userMap[user.id] = {
          ...user,
          hasFarmingData: false,
          hasTransactions: false,
          problem: 'UNKNOWN'
        };
      });

      // Отмечаем наличие farming data
      farmingData?.forEach(farm => {
        if (userMap[farm.user_id]) {
          userMap[farm.user_id].hasFarmingData = true;
          userMap[farm.user_id].farmingBalance = farm.farming_balance;
          userMap[farm.user_id].boostActive = farm.boost_active;
        }
      });

      // Отмечаем наличие транзакций
      const usersWithTx = new Set(transactions?.map(tx => tx.user_id) || []);
      Object.keys(userMap).forEach(userId => {
        const id = parseInt(userId);
        if (usersWithTx.has(id)) {
          userMap[id].hasTransactions = true;
        }
      });

      // Категоризируем проблемы
      const problems = {
        WORKING_FINE: [],      // Все работает
        NO_TRANSACTIONS: [],   // Работает, но нет транзакций
        NO_FARMING_DATA: [],   // Нет farming data
        INCONSISTENT: []       // Несогласованные данные
      };

      Object.values(userMap).forEach((user: any) => {
        if (user.balance_ton > 0 && user.ton_boost_active && user.hasFarmingData && user.hasTransactions) {
          problems.WORKING_FINE.push(user);
        } else if (user.balance_ton > 0 && user.ton_boost_active && user.hasFarmingData && !user.hasTransactions) {
          problems.NO_TRANSACTIONS.push(user);
        } else if (user.balance_ton > 0 && user.ton_boost_active && !user.hasFarmingData) {
          problems.NO_FARMING_DATA.push(user);
        } else {
          problems.INCONSISTENT.push(user);
        }
      });

      console.log('📊 КАТЕГОРИИ ПРОБЛЕМ:');
      console.log(`   ✅ Работает идеально: ${problems.WORKING_FINE.length} пользователей`);
      console.log(`   ⚠️ Нет истории транзакций: ${problems.NO_TRANSACTIONS.length} пользователей`);
      console.log(`   ❌ Нет farming data: ${problems.NO_FARMING_DATA.length} пользователей`);
      console.log(`   🔄 Несогласованные данные: ${problems.INCONSISTENT.length} пользователей`);

      // 2. ВАРИАНТЫ РЕШЕНИЯ
      console.log('\n2️⃣ ВАРИАНТЫ РЕШЕНИЯ:');
      
      console.log('\n🛠️ ВАРИАНТ 1: МИНИМАЛЬНОЕ ВМЕШАТЕЛЬСТВО');
      console.log('   Цель: Исправить только критические проблемы');
      console.log('   Действия:');
      console.log('   - Создать отсутствующие записи в ton_farming_data');
      console.log('   - Синхронизировать флаги boost_active');
      console.log('   - НЕ создавать исторические транзакции');
      console.log('   Плюсы: Быстро, безопасно, минимальный риск');
      console.log('   Минусы: Пользователи не увидят историю депозитов');

      console.log('\n🔧 ВАРИАНТ 2: ПОЛНОЕ ВОССТАНОВЛЕНИЕ');
      console.log('   Цель: Восстановить полную историю для всех пользователей');
      console.log('   Действия:');
      console.log('   - Создать отсутствующие записи в ton_farming_data');
      console.log('   - Создать исторические транзакции TON_DEPOSIT');
      console.log('   - Создать транзакции BOOST_PURCHASE');
      console.log('   - Синхронизировать все данные');
      console.log('   Плюсы: Полная прозрачность для пользователей');
      console.log('   Минусы: Сложнее, больше риска, может создать дубликаты');

      // 3. РЕКОМЕНДУЕМЫЙ ПЛАН
      console.log('\n3️⃣ РЕКОМЕНДУЕМЫЙ ПЛАН (ПОЭТАПНЫЙ):');
      
      console.log('\n📋 ЭТАП 1 - КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ:');
      if (problems.NO_FARMING_DATA.length > 0) {
        console.log(`   • Создать ${problems.NO_FARMING_DATA.length} записей в ton_farming_data`);
        problems.NO_FARMING_DATA.slice(0, 5).forEach((user: any) => {
          console.log(`     - User ${user.id}: balance=${user.balance_ton} TON`);
        });
      }

      console.log('\n📋 ЭТАП 2 - ВОССТАНОВЛЕНИЕ ТРАНЗАКЦИЙ:');
      if (problems.NO_TRANSACTIONS.length > 0) {
        console.log(`   • Создать исторические транзакции для ${problems.NO_TRANSACTIONS.length} пользователей`);
        console.log('   • Типы транзакций: TON_DEPOSIT, BOOST_PURCHASE');
        problems.NO_TRANSACTIONS.slice(0, 5).forEach((user: any) => {
          console.log(`     - User ${user.id}: создать депозит ${user.balance_ton} TON`);
        });
      }

      console.log('\n📋 ЭТАП 3 - ВАЛИДАЦИЯ:');
      console.log('   • Проверить целостность всех данных');
      console.log('   • Убедиться в синхронизации таблиц');
      console.log('   • Протестировать на нескольких пользователях');

      // 4. ГОТОВЫЕ СКРИПТЫ ВОССТАНОВЛЕНИЯ
      console.log('\n4️⃣ ГОТОВЫЕ СКРИПТЫ ДЛЯ ВЫПОЛНЕНИЯ:');
      
      console.log('\n💻 СКРИПТ A: МИНИМАЛЬНЫЕ ИСПРАВЛЕНИЯ');
      console.log('```sql');
      console.log('-- Создание отсутствующих записей ton_farming_data');
      problems.NO_FARMING_DATA.slice(0, 3).forEach((user: any) => {
        console.log(`INSERT INTO ton_farming_data (user_id, farming_balance, boost_active, boost_package_id, farming_rate)`);
        console.log(`VALUES (${user.id}, ${user.balance_ton}, true, 1, 0.01);`);
      });
      console.log('```');

      console.log('\n💻 СКРИПТ B: ВОССТАНОВЛЕНИЕ ТРАНЗАКЦИЙ');
      console.log('```sql');
      console.log('-- Создание исторических депозитов');
      problems.NO_TRANSACTIONS.slice(0, 3).forEach((user: any) => {
        const depositDate = new Date(user.created_at);
        depositDate.setMinutes(depositDate.getMinutes() + 1);
        
        console.log(`INSERT INTO transactions (user_id, type, amount_ton, amount, currency, description, status, created_at)`);
        console.log(`VALUES (${user.id}, 'TON_DEPOSIT', ${user.balance_ton}, ${user.balance_ton}, 'TON',`);
        console.log(`'TON депозит: ${user.balance_ton} TON', 'completed', '${depositDate.toISOString()}');`);
      });
      console.log('```');

      // 5. ОЦЕНКА РИСКОВ
      console.log('\n5️⃣ ОЦЕНКА РИСКОВ:');
      console.log('\n⚠️ РИСКИ МИНИМАЛЬНОГО ВАРИАНТА:');
      console.log('   • Пользователи могут спросить "где мои депозиты?"');
      console.log('   • Отсутствие прозрачности операций');
      console.log('   Вероятность проблем: НИЗКАЯ');

      console.log('\n⚠️ РИСКИ ПОЛНОГО ВОССТАНОВЛЕНИЯ:');
      console.log('   • Возможные дубликаты транзакций');
      console.log('   • Неточные даты исторических операций');
      console.log('   • Нарушение целостности при ошибках');
      console.log('   Вероятность проблем: СРЕДНЯЯ');

      console.log('\n6️⃣ ИТОГОВАЯ РЕКОМЕНДАЦИЯ:');
      console.log('\n🎯 НАЧАТЬ С МИНИМАЛЬНОГО ВАРИАНТА:');
      console.log('   1. Восстановить критически важные записи ton_farming_data');
      console.log('   2. Проверить работу системы');
      console.log('   3. Если все работает - добавить транзакции по запросу');
      console.log('   4. Мониторить жалобы пользователей');
      
      console.log('\n✅ ПРЕИМУЩЕСТВА ПОЭТАПНОГО ПОДХОДА:');
      console.log('   • Минимальный риск поломки системы');
      console.log('   • Возможность откатить изменения');
      console.log('   • Тестирование на малых группах');
      console.log('   • Сохранение стабильности работы');
    }

  } catch (error) {
    console.error('❌ ОШИБКА СОЗДАНИЯ ПЛАНА РЕШЕНИЯ:', error);
  }
}

createSolutionPlan().catch(console.error);