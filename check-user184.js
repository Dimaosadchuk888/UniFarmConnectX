const { supabase } = require('./core/supabase');

async function checkUser184() {
  console.log('=== ПРОВЕРКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ 184 ===\n');
  
  try {
    // Получаем данные пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 184)
      .single();
      
    if (userError) {
      console.error('Ошибка получения пользователя:', userError);
      return;
    }
    
    console.log('ДАННЫЕ ПОЛЬЗОВАТЕЛЯ 184:');
    console.log('ID:', user.id);
    console.log('Telegram ID:', user.telegram_id);
    console.log('Баланс UNI:', user.balance_uni);
    console.log('Депозит фарминга:', user.uni_deposit_amount);
    console.log('Ставка фарминга:', user.uni_farming_rate);
    console.log('Фарминг активен:', user.uni_farming_active);
    console.log('Последнее обновление:', user.uni_farming_last_update);
    console.log();
    
    // Получаем последние транзакции FARMING_REWARD
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, amount, amount_uni, description, created_at')
      .eq('user_id', 184)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(15);
      
    if (txError) {
      console.error('Ошибка получения транзакций:', txError);
      return;
    }
    
    console.log('=== ПОСЛЕДНИЕ 15 FARMING_REWARD ТРАНЗАКЦИЙ ===');
    transactions.forEach((tx, index) => {
      const amount = tx.amount || tx.amount_uni || '0';
      const date = new Date(tx.created_at);
      const timeAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60));
      console.log((index + 1) + '. ' + amount + ' UNI (' + timeAgo + ' мин назад) - ' + date.toLocaleString('ru-RU'));
    });
    
    // Анализ сумм
    const amounts = transactions.map(tx => parseFloat(tx.amount || tx.amount_uni || '0'));
    const uniqueAmounts = [...new Set(amounts.map(a => a.toFixed(6)))];
    
    console.log('\n=== АНАЛИЗ НАЧИСЛЕНИЙ ===');
    console.log('Уникальные суммы:', uniqueAmounts);
    console.log('Средняя сумма:', (amounts.reduce((a,b) => a+b, 0) / amounts.length).toFixed(6), 'UNI');
    
    // Поиск 1.23
    const around123 = amounts.filter(a => Math.abs(a - 1.23) < 0.1);
    if (around123.length > 0) {
      console.log('\n🔍 НАЙДЕНЫ СУММЫ ОКОЛО 1.23 UNI:');
      console.log('Количество:', around123.length);
      console.log('Точные значения:', around123.map(a => a.toFixed(8)));
    }
    
    // Расчет ожидаемого дохода
    const depositAmount = parseFloat(user.uni_deposit_amount || '0');
    const rate = parseFloat(user.uni_farming_rate || '0.01');
    const dailyIncome = depositAmount * rate;
    const incomePerPeriod = dailyIncome / 288; // 288 периодов в сутках
    
    console.log('\n=== РАСЧЕТ ОЖИДАЕМОГО ДОХОДА ===');
    console.log('Депозит:', depositAmount, 'UNI');
    console.log('Ставка:', (rate * 100).toFixed(1), '% в день');
    console.log('Дневной доход:', dailyIncome.toFixed(6), 'UNI');
    console.log('Доход за 5 минут (интервальный режим):', incomePerPeriod.toFixed(6), 'UNI');
    
    // Проверка переменной окружения
    console.log('\n=== НАСТРОЙКИ СИСТЕМЫ ===');
    console.log('UNI_FARMING_INTERVAL_MODE:', process.env.UNI_FARMING_INTERVAL_MODE);
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

checkUser184();