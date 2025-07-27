#!/usr/bin/env tsx

/**
 * 🔍 ДИАГНОСТИКА ПРОБЛЕМЫ СОХРАНЕНИЯ БАЛАНСОВ
 * 
 * Исследуем почему балансы постоянно откатываются
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function balancePersistenceDebug() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ СОХРАНЕНИЯ БАЛАНСОВ');
  console.log('=' .repeat(60));
  
  try {
    const userIds = [251, 255];
    
    // 1. ПРОВЕРЯЕМ СХЕМУ ТАБЛИЦЫ USERS
    console.log('1️⃣ Анализ схемы таблицы users...');
    
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'users' });
    
    if (schemaError) {
      console.log('⚠️  Не удалось получить схему, продолжаем...');
    } else if (schema) {
      console.log('✅ Схема получена:', schema);
    }

    // 2. ПРОВЕРЯЕМ ТЕКУЩИЕ БАЛАНСЫ С МЕТАДАННЫМИ
    console.log('\n2️⃣ Детальная информация о пользователях...');
    
    const { data: detailedUsers, error: detailError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (detailError) {
      console.error('❌ ОШИБКА ПОЛУЧЕНИЯ ДЕТАЛЬНОЙ ИНФОРМАЦИИ:', detailError.message);
      return;
    }

    console.log('\n📊 ПОЛНАЯ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЯХ:');
    detailedUsers?.forEach(user => {
      console.log(`\nUser ${user.id} (@${user.username}):`);
      console.log(`   Balance TON: ${user.balance_ton}`);
      console.log(`   Balance UNI: ${user.balance_uni}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last active: ${user.last_active || 'N/A'}`);
      console.log(`   Referrer: ${user.referrer_id || 'N/A'}`);
      console.log(`   Status: ${user.status || 'N/A'}`);
    });

    // 3. ИЩЕМ АВТОМАТИЧЕСКИЕ ПРОЦЕССЫ ОБНОВЛЕНИЯ БАЛАНСОВ
    console.log('\n3️⃣ Поиск автоматических процессов...');
    
    // Проверяем триггеры и функции
    const { data: triggers, error: triggerError } = await supabase
      .rpc('get_table_triggers', { table_name: 'users' });
    
    if (triggerError) {
      console.log('⚠️  Не удалось получить триггеры');
    } else if (triggers) {
      console.log('🔧 Триггеры на таблице users:', triggers);
    }

    // 4. ТЕСТИРУЕМ ПРЯМОЕ ОБНОВЛЕНИЕ С МОНИТОРИНГОМ
    console.log('\n4️⃣ Тест прямого обновления с мониторингом...');
    
    const testUserId = 251;
    const testUser = detailedUsers?.find(u => u.id === testUserId);
    
    if (testUser) {
      const originalBalance = Number(testUser.balance_ton);
      const testAmount = 0.1; // Тестовая сумма
      const targetBalance = originalBalance + testAmount;
      
      console.log(`\n🧪 ТЕСТ на User ${testUserId}:`);
      console.log(`   Исходный баланс: ${originalBalance} TON`);
      console.log(`   Тестовая сумма: +${testAmount} TON`);
      console.log(`   Целевой баланс: ${targetBalance} TON`);
      
      // Обновляем
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance_ton: targetBalance })
        .eq('id', testUserId);

      if (updateError) {
        console.error('❌ ОШИБКА ОБНОВЛЕНИЯ:', updateError.message);
      } else {
        console.log('✅ Обновление выполнено');
        
        // Ждем немного
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Проверяем результат
        const { data: updatedUser, error: checkError } = await supabase
          .from('users')
          .select('balance_ton')
          .eq('id', testUserId)
          .single();

        if (checkError) {
          console.error('❌ ОШИБКА ПРОВЕРКИ:', checkError.message);
        } else {
          const newBalance = Number(updatedUser.balance_ton);
          console.log(`\n📊 РЕЗУЛЬТАТ ТЕСТА:`);
          console.log(`   Ожидали: ${targetBalance} TON`);
          console.log(`   Получили: ${newBalance} TON`);
          
          if (Math.abs(newBalance - targetBalance) < 0.0001) {
            console.log('✅ ТЕСТ УСПЕШЕН - изменения сохранились');
          } else if (Math.abs(newBalance - originalBalance) < 0.0001) {
            console.log('❌ ТЕСТ ПРОВАЛЕН - баланс откатился к исходному');
            console.log('🔍 ПРИЧИНА: Автоматический процесс перезаписывает балансы');
          } else {
            console.log('⚠️  ТЕСТ ЧАСТИЧЕН - баланс изменился, но не на ожидаемую сумму');
          }
        }
        
        // Откатываем тестовое изменение
        const { error: rollbackError } = await supabase
          .from('users')
          .update({ balance_ton: originalBalance })
          .eq('id', testUserId);
        
        if (!rollbackError) {
          console.log('🔄 Тестовое изменение откачено');
        }
      }
    }

    // 5. АНАЛИЗИРУЕМ ИСТОРИЮ ИЗМЕНЕНИЙ БАЛАНСОВ
    console.log('\n5️⃣ Анализ истории изменений балансов...');
    
    // Смотрим на недавние транзакции
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('user_id', userIds.map(id => id.toString()))
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) {
      console.log('⚠️  Не удалось получить транзакции');
    } else {
      console.log('\n📋 НЕДАВНИЕ ТРАНЗАКЦИИ:');
      recentTransactions?.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleString('ru-RU');
        console.log(`User ${tx.user_id}: ${tx.amount} ${tx.currency} (${tx.type}) - ${date}`);
      });
    }

    // 6. РЕКОМЕНДАЦИИ
    console.log('\n6️⃣ АНАЛИЗ И РЕКОМЕНДАЦИИ:');
    console.log('━'.repeat(60));
    
    console.log('🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ ОТКАТОВ:');
    console.log('1. Автоматический пересчет балансов на основе транзакций');
    console.log('2. Кэширование балансов в приложении');
    console.log('3. Триггеры базы данных, восстанавливающие балансы');
    console.log('4. Конкурентные процессы, перезаписывающие балансы');
    
    console.log('\n💡 АЛЬТЕРНАТИВНЫЕ ПОДХОДЫ:');
    console.log('1. Создать компенсационные транзакции вместо прямого изменения балансов');
    console.log('2. Временно отключить автоматические процессы');
    console.log('3. Использовать атомарные операции');
    console.log('4. Найти и изменить логику пересчета балансов');

    return {
      success: true,
      recommendation: 'create_compensation_transactions'
    };

  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    const result = await balancePersistenceDebug();
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ДИАГНОСТИКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();