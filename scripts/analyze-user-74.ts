import { supabase } from '../core/supabase.js';

async function analyzeUser74() {
  console.log('🔍 АНАЛИЗ USER 74 - ПОДОЗРИТЕЛЬНЫЙ ДЕПОЗИТ');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Полная информация о пользователе
    console.log('👤 ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:\n');
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', 74)
      .single();

    if (user) {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username || 'не указан'}`);
      console.log(`Telegram ID: ${user.telegram_id}`);
      console.log(`Дата регистрации: ${user.created_at}`);
      console.log(`\nБалансы:`);
      console.log(`- UNI баланс: ${user.balance_uni}`);
      console.log(`- UNI депозит: ${user.uni_deposit_amount}`);
      console.log(`- UNI farming баланс: ${user.uni_farming_balance}`);
      console.log(`- TON баланс: ${user.balance_ton}`);
      console.log(`\nФарминг статус:`);
      console.log(`- UNI farming активен: ${user.uni_farming_active}`);
      console.log(`- Дата начала: ${user.uni_farming_start_timestamp || user.created_at}`);
      console.log(`- Ставка: ${user.uni_farming_rate}% в день`);
    }

    // 2. История транзакций
    console.log('\n\n💰 ИСТОРИЯ ТРАНЗАКЦИЙ:\n');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .order('created_at', { ascending: false })
      .limit(20);

    if (transactions && transactions.length > 0) {
      console.log(`Найдено транзакций: ${transactions.length}`);
      
      // Группируем по типам
      const byType = transactions.reduce((acc, tx) => {
        if (!acc[tx.type]) acc[tx.type] = { count: 0, total: 0 };
        acc[tx.type].count++;
        acc[tx.type].total += parseFloat(tx.amount || 0);
        return acc;
      }, {});

      console.log('\nПо типам транзакций:');
      Object.entries(byType).forEach(([type, data]: [string, any]) => {
        console.log(`- ${type}: ${data.count} транзакций, сумма: ${data.total.toFixed(3)}`);
      });

      // Ищем большие транзакции
      const bigTransactions = transactions.filter(tx => 
        parseFloat(tx.amount) > 100000
      );

      if (bigTransactions.length > 0) {
        console.log('\n⚠️  БОЛЬШИЕ ТРАНЗАКЦИИ:');
        bigTransactions.forEach(tx => {
          console.log(`- ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
          console.log(`  Описание: ${tx.description}`);
        });
      }

      // Последние транзакции
      console.log('\nПоследние 5 транзакций:');
      transactions.slice(0, 5).forEach(tx => {
        console.log(`- ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
      });
    } else {
      console.log('Транзакций не найдено');
    }

    // 3. Сравнение с другими пользователями
    console.log('\n\n📊 СРАВНЕНИЕ С ДРУГИМИ ПОЛЬЗОВАТЕЛЯМИ:\n');

    const { data: topUsers } = await supabase
      .from('users')
      .select('id, username, uni_deposit_amount, balance_uni')
      .order('uni_deposit_amount', { ascending: false })
      .limit(10);

    if (topUsers) {
      console.log('ТОП-10 по размеру депозита:');
      topUsers.forEach((u, i) => {
        const mark = u.id === 74 ? ' ⚠️' : '';
        console.log(`${i + 1}. User ${u.id}: ${u.uni_deposit_amount} UNI${mark}`);
      });
    }

    // 4. Анализ и рекомендации
    console.log('\n\n📝 АНАЛИЗ И РЕКОМЕНДАЦИИ:\n');

    if (user && user.uni_deposit_amount > 1000000) {
      const dailyIncome = user.uni_deposit_amount * (user.uni_farming_rate / 100);
      console.log(`⚠️  ВНИМАНИЕ: Экстремально большой депозит!`);
      console.log(`\nРасчетный доход:`);
      console.log(`- В день: ${dailyIncome.toFixed(2)} UNI`);
      console.log(`- В месяц: ${(dailyIncome * 30).toFixed(2)} UNI`);
      console.log(`\nВозможные причины:`);
      console.log(`1. Ошибка при вводе (лишние цифры)`);
      console.log(`2. Тестовая учетная запись`);
      console.log(`3. Попытка взлома/эксплойта`);
      console.log(`\nРЕКОМЕНДАЦИИ:`);
      console.log(`1. Проверить источник этого депозита`);
      console.log(`2. Связаться с пользователем для уточнения`);
      console.log(`3. Рассмотреть корректировку или блокировку`);
    }

  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  }
}

// Запуск анализа
console.log('Анализирую User 74...\n');
analyzeUser74();