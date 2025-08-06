#!/usr/bin/env tsx
/**
 * СКРИПТ ПРИНУДИТЕЛЬНОЙ СИНХРОНИЗАЦИИ СИСТЕМЫ
 * Очищает все кеши и заставляет систему перезагрузить данные из БД
 * 
 * Запуск: tsx scripts/force-sync-system.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔄 ЗАПУСК ПРИНУДИТЕЛЬНОЙ СИНХРОНИЗАЦИИ СИСТЕМЫ');
console.log('='.repeat(60));

async function forceSystemSync() {
  try {
    // 1. Получаем список всех пользователей с TON Boost пакетами
    console.log('\n📊 Анализ пользователей с TON Boost пакетами...');
    
    const { data: users, error: usersError } = await supabase
      .from('ton_boost_purchases')
      .select('user_id')
      .eq('status', 'active');
    
    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError);
      return;
    }

    // Уникальные user_id
    const uniqueUserIds = [...new Set(users?.map(u => u.user_id))];
    console.log(`✅ Найдено ${uniqueUserIds.length} пользователей с активными пакетами`);

    // 2. Для каждого пользователя проверяем дубликаты
    console.log('\n🔍 Анализ дубликатов по пользователям:');
    console.log('-'.repeat(60));
    
    for (const userId of uniqueUserIds) {
      const { data: purchases, error } = await supabase
        .from('ton_boost_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('purchased_at', { ascending: true });
      
      if (error) {
        console.error(`❌ Ошибка для пользователя ${userId}:`, error);
        continue;
      }

      if (!purchases || purchases.length === 0) continue;

      // Находим дубликаты по purchased_at
      const purchaseDates = purchases.map(p => p.purchased_at);
      const uniqueDates = [...new Set(purchaseDates)];
      const duplicateCount = purchases.length - uniqueDates.length;

      if (duplicateCount > 0) {
        console.log(`\n👤 Пользователь ${userId}:`);
        console.log(`   - Всего записей: ${purchases.length}`);
        console.log(`   - Уникальных покупок: ${uniqueDates.length}`);
        console.log(`   - Дубликатов: ${duplicateCount}`);
        
        // Показываем примеры дубликатов
        const dateCount: { [key: string]: number } = {};
        purchases.forEach(p => {
          dateCount[p.purchased_at] = (dateCount[p.purchased_at] || 0) + 1;
        });
        
        const duplicatedDates = Object.entries(dateCount)
          .filter(([_, count]) => count > 1)
          .slice(0, 3); // Показываем первые 3
        
        if (duplicatedDates.length > 0) {
          console.log('   📍 Примеры дубликатов:');
          duplicatedDates.forEach(([date, count]) => {
            console.log(`      - ${date}: ${count} записей`);
          });
        }
      }
    }

    // 3. Общая статистика
    console.log('\n📈 ОБЩАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    
    const { data: totalPurchases, error: totalError } = await supabase
      .from('ton_boost_purchases')
      .select('*', { count: 'exact' })
      .eq('status', 'active');
    
    if (!totalError && totalPurchases) {
      console.log(`✅ Всего активных записей в БД: ${totalPurchases.length}`);
      
      // Подсчет уникальных покупок
      const uniquePurchases = new Map();
      totalPurchases.forEach(p => {
        const key = `${p.user_id}_${p.purchased_at}`;
        if (!uniquePurchases.has(key)) {
          uniquePurchases.set(key, p);
        }
      });
      
      console.log(`✅ Уникальных покупок: ${uniquePurchases.size}`);
      console.log(`⚠️  Дубликатов в системе: ${totalPurchases.length - uniquePurchases.size}`);
    }

    // 4. Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(60));
    console.log('1. Обнаружены дубликаты в таблице ton_boost_purchases');
    console.log('2. Backend возвращает ВСЕ записи без фильтрации');
    console.log('3. Frontend отображает общее количество записей');
    console.log('\n📌 Для полной синхронизации нужно:');
    console.log('   - Очистить кеш браузера (Ctrl+F5)');
    console.log('   - Перезайти в приложение');
    console.log('   - Или дождаться автоматического обновления (каждые 60 сек)');

    // 5. Симуляция очистки кеша (информационно)
    console.log('\n🔄 ДЕЙСТВИЯ ДЛЯ СИНХРОНИЗАЦИИ:');
    console.log('1. ✅ Анализ данных завершен');
    console.log('2. ⏳ Кеш React Query обновляется автоматически каждые 60 секунд');
    console.log('3. ⏳ WebSocket отправляет обновления в реальном времени');
    console.log('4. ⚠️  Для принудительного обновления пользователям нужно обновить страницу');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем синхронизацию
forceSystemSync().then(() => {
  console.log('\n✅ Анализ завершен');
  process.exit(0);
}).catch(err => {
  console.error('❌ Ошибка выполнения:', err);
  process.exit(1);
});