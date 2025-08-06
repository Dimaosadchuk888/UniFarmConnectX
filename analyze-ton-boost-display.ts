/**
 * Анализ проблемы с отображением количества TON Boost пакетов
 * БЕЗ изменения кода - только диагностика
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTonBoostDisplay() {
  console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ ОТОБРАЖЕНИЯ TON BOOST ПАКЕТОВ ===\n');
  console.log('Дата анализа:', new Date().toISOString());
  console.log('---------------------------------------------------\n');

  try {
    // Тестовые пользователи для проверки
    const testUserIds = [184, 187, 188, 189, 190];
    
    for (const userId of testUserIds) {
      console.log(`\n=== ПОЛЬЗОВАТЕЛЬ ${userId} ===\n`);
      
      // 1. Проверяем таблицу ton_boost_purchases
      console.log('1. ТАБЛИЦА ton_boost_purchases:');
      
      const { data: purchases, error: purchasesError } = await supabase
        .from('ton_boost_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });
      
      if (purchasesError) {
        console.log('   ❌ Ошибка получения данных:', purchasesError.message);
      } else if (!purchases || purchases.length === 0) {
        console.log('   Нет активных покупок в новой таблице');
      } else {
        console.log(`   Найдено активных покупок: ${purchases.length}`);
        
        // Группируем по package_id
        const packageGroups = new Map<number, number>();
        let totalAmount = 0;
        let totalDailyIncome = 0;
        
        purchases.forEach(p => {
          packageGroups.set(p.package_id, (packageGroups.get(p.package_id) || 0) + 1);
          totalAmount += parseFloat(p.amount || '0');
          totalDailyIncome += parseFloat(p.daily_income || '0');
        });
        
        console.log('\n   Распределение по пакетам:');
        Array.from(packageGroups.entries()).forEach(([packageId, count]) => {
          const packageName = purchases.find(p => p.package_id === packageId)?.package_name;
          console.log(`   - ${packageName || `Package ${packageId}`}: ${count} шт.`);
        });
        
        console.log(`\n   Общая сумма инвестиций: ${totalAmount.toFixed(2)} TON`);
        console.log(`   Общий дневной доход: ${totalDailyIncome.toFixed(6)} TON`);
        
        // Показываем первые 5 покупок
        console.log('\n   Последние покупки:');
        purchases.slice(0, 5).forEach(p => {
          console.log(`   - ${p.package_name}: ${p.amount} TON, куплен ${new Date(p.purchased_at).toLocaleDateString()}`);
        });
      }
      
      // 2. Проверяем старую систему в таблице users
      console.log('\n2. СТАРАЯ СИСТЕМА (таблица users):');
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('ton_boost_package, ton_boost_rate, ton_farming_balance')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.log('   ❌ Ошибка получения данных пользователя:', userError.message);
      } else if (!user) {
        console.log('   Пользователь не найден');
      } else {
        if (user.ton_boost_package) {
          console.log(`   ton_boost_package: ${user.ton_boost_package}`);
          console.log(`   ton_boost_rate: ${user.ton_boost_rate || 'NULL'}`);
          console.log(`   ton_farming_balance: ${user.ton_farming_balance || 'NULL'}`);
        } else {
          console.log('   Нет активного пакета в старой системе');
        }
      }
      
      // 3. Сравнение систем
      console.log('\n3. СРАВНЕНИЕ СИСТЕМ:');
      
      const newSystemCount = purchases?.length || 0;
      const oldSystemActive = user?.ton_boost_package ? 1 : 0;
      
      if (newSystemCount > 0 && oldSystemActive > 0) {
        console.log('   ⚠️ Данные есть в ОБЕИХ системах!');
        console.log(`   - Новая система: ${newSystemCount} пакетов`);
        console.log(`   - Старая система: ${oldSystemActive} пакет`);
        console.log('   ВОЗМОЖНО ДУБЛИРОВАНИЕ ОТОБРАЖЕНИЯ');
      } else if (newSystemCount > 0) {
        console.log('   ✅ Используется новая система');
        console.log(`   - Количество пакетов: ${newSystemCount}`);
      } else if (oldSystemActive > 0) {
        console.log('   📦 Используется старая система');
        console.log(`   - Активный пакет ID: ${user?.ton_boost_package}`);
      } else {
        console.log('   ❌ Нет активных пакетов ни в одной системе');
      }
      
      // 4. Проверяем, что возвращает API
      console.log('\n4. ПРОВЕРКА API RESPONSE:');
      
      try {
        const apiUrl = `http://localhost:3000/api/v2/boost/farming-status?user_id=${userId}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success && data.data) {
          const deposits = data.data.deposits || [];
          console.log(`   API возвращает: ${deposits.length} депозитов`);
          
          if (deposits.length > 0) {
            // Считаем уникальные purchased_at
            const uniqueDates = new Set(deposits.map((d: any) => d.purchased_at));
            console.log(`   Уникальных дат покупки: ${uniqueDates.size}`);
            
            // Проверяем на дубликаты
            if (uniqueDates.size < deposits.length) {
              console.log('   ⚠️ ОБНАРУЖЕНЫ ДУБЛИКАТЫ (одинаковые purchased_at)');
              
              // Анализируем дубликаты
              const dateCount = new Map<string, number>();
              deposits.forEach((d: any) => {
                const date = d.purchased_at || 'no-date';
                dateCount.set(date, (dateCount.get(date) || 0) + 1);
              });
              
              console.log('   Распределение по датам:');
              Array.from(dateCount.entries())
                .filter(([_, count]) => count > 1)
                .forEach(([date, count]) => {
                  console.log(`   - ${date}: ${count} записей (ДУБЛИКАТ)`);
                });
            }
          }
        } else {
          console.log('   ❌ Ошибка API или нет данных');
        }
      } catch (apiError) {
        console.log('   ❌ Не удалось вызвать API:', apiError);
      }
    }
    
    // 5. Общая статистика
    console.log('\n\n=== ОБЩАЯ СТАТИСТИКА ===\n');
    
    const { count: totalPurchases } = await supabase
      .from('ton_boost_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    const { count: usersWithOldBoost } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('ton_boost_package', 'is', null);
    
    console.log(`Всего активных покупок в новой системе: ${totalPurchases}`);
    console.log(`Пользователей с пакетами в старой системе: ${usersWithOldBoost}`);
    
    // 6. ВЫВОДЫ
    console.log('\n=== ВЫВОДЫ ===\n');
    
    console.log('ПРОБЛЕМА ИДЕНТИФИЦИРОВАНА:');
    console.log('1. Система использует НОВУЮ таблицу ton_boost_purchases');
    console.log('2. В этой таблице могут быть МНОЖЕСТВЕННЫЕ записи для одного пользователя');
    console.log('3. Frontend отображает ВСЕ записи из массива deposits');
    console.log('4. Если есть дубликаты или старые записи - они все отображаются');
    
    console.log('\nВОЗМОЖНЫЕ ПРИЧИНЫ ДУБЛИКАТОВ:');
    console.log('- Множественные попытки покупки одного пакета');
    console.log('- Отсутствие проверки на уникальность при создании');
    console.log('- Миграция данных из старой системы с дублированием');
    
    console.log('\nРЕКОМЕНДАЦИИ:');
    console.log('1. Проверить логику создания записей в ton_boost_purchases');
    console.log('2. Добавить фильтрацию дубликатов на backend');
    console.log('3. Или группировать пакеты по package_id на frontend');
    console.log('4. Очистить дубликаты в БД (если это безопасно)');
    
  } catch (error) {
    console.error('Ошибка анализа:', error);
  }
}

// Запускаем анализ
analyzeTonBoostDisplay()
  .then(() => {
    console.log('\n=== АНАЛИЗ ЗАВЕРШЕН ===\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });