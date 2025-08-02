import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTonBoostPurchases() {
  console.log('🔍 Тестирование таблицы ton_boost_purchases...\n');
  
  // Тест 1: Проверка доступности таблицы
  console.log('1️⃣ Проверка доступности таблицы...');
  const { count, error: countError } = await supabase
    .from('ton_boost_purchases')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('❌ Ошибка доступа к таблице:', countError);
    return;
  }
  console.log(`✅ Таблица доступна. Всего записей: ${count}\n`);
  
  // Тест 2: Проверка данных для пользователя 184
  console.log('2️⃣ Проверка данных для пользователя 184...');
  const { data: user184Purchases, error: user184Error } = await supabase
    .from('ton_boost_purchases')
    .select('*')
    .eq('user_id', 184)
    .eq('status', 'active')
    .order('purchased_at', { ascending: false });
    
  if (user184Error) {
    console.error('❌ Ошибка получения данных:', user184Error);
    return;
  }
  
  console.log(`✅ Найдено активных покупок: ${user184Purchases?.length || 0}`);
  
  if (user184Purchases && user184Purchases.length > 0) {
    console.log('\n📊 Детали покупок:');
    let totalAmount = 0;
    let totalDailyIncome = 0;
    
    user184Purchases.forEach((purchase, index) => {
      const amount = parseFloat(purchase.amount);
      const dailyIncome = parseFloat(purchase.daily_income);
      totalAmount += amount;
      totalDailyIncome += dailyIncome;
      
      console.log(`\n  Покупка #${index + 1}:`);
      console.log(`    - Пакет: ${purchase.package_name}`);
      console.log(`    - Сумма: ${amount} TON`);
      console.log(`    - Ставка: ${parseFloat(purchase.rate) * 100}%`);
      console.log(`    - Дневной доход: ${dailyIncome} TON`);
      console.log(`    - Дата покупки: ${new Date(purchase.purchased_at).toLocaleString()}`);
    });
    
    console.log('\n📈 Итого:');
    console.log(`    - Общая сумма депозитов: ${totalAmount} TON`);
    console.log(`    - Общий дневной доход: ${totalDailyIncome.toFixed(6)} TON`);
    console.log(`    - Доход в секунду: ${(totalDailyIncome / 86400).toFixed(8)} TON/сек`);
  }
  
  // Тест 3: Проверка статистики по всем пользователям
  console.log('\n\n3️⃣ Общая статистика по всем пользователям...');
  const { data: allPurchases, error: allError } = await supabase
    .from('ton_boost_purchases')
    .select('user_id, amount, daily_income')
    .eq('status', 'active');
    
  if (!allError && allPurchases) {
    const userStats = new Map<number, { count: number, total: number, income: number }>();
    
    allPurchases.forEach(purchase => {
      const userId = purchase.user_id;
      const amount = parseFloat(purchase.amount);
      const income = parseFloat(purchase.daily_income);
      
      if (!userStats.has(userId)) {
        userStats.set(userId, { count: 0, total: 0, income: 0 });
      }
      
      const stats = userStats.get(userId)!;
      stats.count++;
      stats.total += amount;
      stats.income += income;
    });
    
    console.log(`✅ Всего пользователей с активными покупками: ${userStats.size}`);
    console.log('\n📊 Топ-5 пользователей по сумме депозитов:');
    
    const sortedUsers = Array.from(userStats.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
      
    sortedUsers.forEach(([userId, stats], index) => {
      console.log(`  ${index + 1}. Пользователь #${userId}:`);
      console.log(`     - Покупок: ${stats.count}`);
      console.log(`     - Сумма: ${stats.total} TON`);
      console.log(`     - Дневной доход: ${stats.income.toFixed(6)} TON`);
    });
  }
}

// Запускаем тест
testTonBoostPurchases().catch(console.error);