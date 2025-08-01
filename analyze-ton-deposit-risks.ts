import { supabase } from './core/supabaseClient';

async function analyzeTonDepositRisks() {
  console.log('⚠️ АНАЛИЗ РИСКОВ ДОБАВЛЕНИЯ TON_DEPOSIT ТРАНЗАКЦИЙ');
  console.log('='.repeat(65));

  try {
    // 1. Анализ текущей архитектуры транзакций
    console.log('\n1️⃣ ТЕКУЩАЯ АРХИТЕКТУРА ТРАНЗАКЦИЙ:');
    
    const { data: txTypes, error: typesError } = await supabase
      .from('transactions')
      .select('type')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!typesError && txTypes) {
      const typeStats: { [key: string]: number } = {};
      txTypes.forEach(tx => {
        typeStats[tx.type] = (typeStats[tx.type] || 0) + 1;
      });

      console.log('📊 Существующие типы транзакций:');
      Object.keys(typeStats).forEach(type => {
        console.log(`   ${type}: ${typeStats[type]} транзакций`);
      });
    }

    // 2. Проверка зависимостей в коде от типов транзакций
    console.log('\n2️⃣ ПОТЕНЦИАЛЬНЫЕ ЗАВИСИМОСТИ:');
    console.log('🔍 Места, где может быть код, зависящий от типов транзакций:');
    console.log('   - Frontend: История транзакций, фильтры');
    console.log('   - Backend: Подсчет балансов, статистика');
    console.log('   - Scheduler\'ы: Обработка доходов');
    console.log('   - Admin панель: Отчеты и аналитика');

    // 3. Анализ баланса пользователей
    console.log('\n3️⃣ АНАЛИЗ БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const { data: userBalances, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_ton, balance_uni')
      .gt('balance_ton', 0)
      .limit(10);

    if (!balanceError && userBalances) {
      console.log(`💰 Пользователей с TON балансом: ${userBalances.length}`);
      
      // Проверяем соответствие балансов и транзакций
      let balanceDiscrepancies = 0;
      for (const user of userBalances.slice(0, 5)) {
        const { data: userTx, error: txError } = await supabase
          .from('transactions')
          .select('amount_ton, type')
          .eq('user_id', user.id)
          .not('amount_ton', 'is', null);

        if (!txError && userTx) {
          const totalFromTx = userTx.reduce((sum, tx) => {
            const amount = parseFloat(tx.amount_ton || '0');
            return tx.type === 'REFERRAL_REWARD' || tx.type === 'FARMING_REWARD' ? sum + amount : sum;
          }, 0);

          const balanceDiff = Math.abs(user.balance_ton - totalFromTx);
          if (balanceDiff > 0.001) { // Порог для погрешности
            balanceDiscrepancies++;
            console.log(`   ⚠️ User ${user.id}: баланс ${user.balance_ton}, из транзакций ${totalFromTx.toFixed(6)}`);
          }
        }
      }

      if (balanceDiscrepancies > 0) {
        console.log(`⚠️ Найдено расхождений в балансах: ${balanceDiscrepancies}`);
      } else {
        console.log('✅ Балансы соответствуют транзакциям');
      }
    }

    // 4. Проверка влияния на статистику
    console.log('\n4️⃣ ВЛИЯНИЕ НА СТАТИСТИКУ:');
    
    const { data: farmingRewards, error: farmingError } = await supabase
      .from('transactions')
      .select('amount_ton, metadata')
      .eq('type', 'FARMING_REWARD')
      .not('amount_ton', 'is', null)
      .gt('amount_ton', 0)
      .limit(100);

    if (!farmingError && farmingRewards) {
      console.log(`📈 FARMING_REWARD с TON: ${farmingRewards.length} транзакций`);
      
      // Анализируем metadata для определения оригинальных депозитов
      let originalDeposits = 0;
      let boostIncomes = 0;
      
      farmingRewards.forEach(tx => {
        try {
          const metadata = typeof tx.metadata === 'object' ? tx.metadata : 
            (typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : {});
          
          if (metadata.original_type === 'TON_BOOST_INCOME') {
            boostIncomes++;
          } else if (metadata.original_type === 'TON_DEPOSIT') {
            originalDeposits++;
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      });

      console.log(`   Оригинальные депозиты в metadata: ${originalDeposits}`);
      console.log(`   TON Boost доходы: ${boostIncomes}`);
    }

    // 5. Риски изменения
    console.log('\n5️⃣ ВОЗМОЖНЫЕ РИСКИ ПРИ ДОБАВЛЕНИИ TON_DEPOSIT:');
    
    console.log('\n🔴 ВЫСОКИЕ РИСКИ:');
    console.log('   1. Дублирование транзакций - если депозит уже записан как FARMING_REWARD');
    console.log('   2. Нарушение баланса - двойное начисление TON');
    console.log('   3. Поломка scheduler\'ов - если они ожидают только FARMING_REWARD');
    console.log('   4. Ошибки в admin панели - если она считает только определенные типы');

    console.log('\n🟡 СРЕДНИЕ РИСКИ:');
    console.log('   1. Изменение статистики - общие суммы депозитов изменятся');
    console.log('   2. Frontend ошибки - если UI не готов к новому типу транзакций');
    console.log('   3. Нарушение целостности данных - исторические данные vs новые');

    console.log('\n🟢 НИЗКИЕ РИСКИ:');
    console.log('   1. Улучшение UX - пользователи увидят депозиты в истории');
    console.log('   2. Более понятная отчетность');
    console.log('   3. Соответствие ожиданиям пользователей');

    // 6. Рекомендации по безопасной реализации
    console.log('\n6️⃣ РЕКОМЕНДАЦИИ ПО БЕЗОПАСНОЙ РЕАЛИЗАЦИИ:');
    
    console.log('\n✅ ОБЯЗАТЕЛЬНЫЕ ПРОВЕРКИ ПЕРЕД ИЗМЕНЕНИЕМ:');
    console.log('   1. Backup базы данных');
    console.log('   2. Тестирование на копии продакшена');
    console.log('   3. Проверка всех зависимостей от типов транзакций');
    console.log('   4. Анализ scheduler\'ов и их логики');

    console.log('\n🛡️ БЕЗОПАСНЫЙ ПОДХОД:');
    console.log('   1. Добавить TON_DEPOSIT только для НОВЫХ депозитов');
    console.log('   2. НЕ изменять исторические данные');
    console.log('   3. Добавить флаг-переключатель для отката');
    console.log('   4. Постепенное развертывание с мониторингом');

    console.log('\n⚡ АЛЬТЕРНАТИВЫ:');
    console.log('   1. Добавить поле "display_type" в существующие транзакции');
    console.log('   2. Создать отдельную таблицу для отображения депозитов');
    console.log('   3. Использовать metadata для пометки оригинальных депозитов');

    // 7. Итоговая оценка рисков
    console.log('\n7️⃣ ИТОГОВАЯ ОЦЕНКА РИСКОВ:');
    console.log('📊 Уровень риска: СРЕДНИЙ-ВЫСОКИЙ');
    console.log('⏱️ Время на реализацию: 2-4 часа');
    console.log('🧪 Необходимо тестирование: ДА');
    console.log('💾 Backup обязателен: ДА');
    
    console.log('\n🎯 РЕКОМЕНДАЦИЯ:');
    console.log('   Лучше всего использовать БЕЗОПАСНЫЙ подход:');
    console.log('   - Добавить TON_DEPOSIT только для новых депозитов');
    console.log('   - Сохранить историческую совместимость');
    console.log('   - Тщательно протестировать все компоненты');

  } catch (error) {
    console.error('❌ ОШИБКА АНАЛИЗА РИСКОВ:', error);
  }
}

analyzeTonDepositRisks().catch(console.error);