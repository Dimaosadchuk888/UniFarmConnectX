/**
 * АНАЛИЗ СИСТЕМЫ МАППИНГА ID
 * Проверяем как должна работать связь между internal ID и telegram_id
 */

import { supabase } from './core/supabase.js';

async function analyzeIdMappingSystem() {
  console.log('🔍 АНАЛИЗ СИСТЕМЫ МАППИНГА ID');
  
  try {
    // 1. Проверяем как другие пользователи работают
    console.log('\n📊 АНАЛИЗ РАБОТАЮЩИХ ПОЛЬЗОВАТЕЛЕЙ:');
    
    // Найдем пользователей которые имеют ненулевые балансы
    const { data: workingUsers } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton, updated_at')
      .or('balance_uni.gt.0,balance_ton.gt.0')
      .not('updated_at', 'is', null)
      .limit(5);
    
    if (workingUsers && workingUsers.length > 0) {
      console.log('✅ ПОЛЬЗОВАТЕЛИ С РАБОТАЮЩИМИ БАЛАНСАМИ:');
      
      for (const user of workingUsers) {
        console.log(`\n--- User ${user.telegram_id} ---`);
        console.log(`Internal ID: ${user.id}`);
        console.log(`Telegram ID: ${user.telegram_id}`);
        console.log(`UNI: ${user.balance_uni}, TON: ${user.balance_ton}`);
        console.log(`Last updated: ${user.updated_at}`);
        
        // Проверяем какой ID используется в транзакциях
        const { data: txByInternal } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', user.id)
          .single();
          
        const { data: txByTelegram } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', user.telegram_id)
          .single();
        
        console.log(`Транзакций по internal ID (${user.id}): ${txByInternal?.count || 0}`);
        console.log(`Транзакций по telegram ID (${user.telegram_id}): ${txByTelegram?.count || 0}`);
        
        // Определяем какой ID система использует для этого пользователя
        if ((txByInternal?.count || 0) > 0 && (txByTelegram?.count || 0) === 0) {
          console.log('✅ СИСТЕМА ИСПОЛЬЗУЕТ: Internal ID');
        } else if ((txByTelegram?.count || 0) > 0 && (txByInternal?.count || 0) === 0) {
          console.log('✅ СИСТЕМА ИСПОЛЬЗУЕТ: Telegram ID');
        } else if ((txByInternal?.count || 0) > 0 && (txByTelegram?.count || 0) > 0) {
          console.log('⚠️ СМЕШАННОЕ ИСПОЛЬЗОВАНИЕ: Оба ID используются');
        } else {
          console.log('❌ НЕТ ТРАНЗАКЦИЙ: Ни одного ID не используется');
        }
      }
    } else {
      console.log('❌ Не найдено пользователей с работающими балансами');
    }
    
    // 2. Проверяем какой ID преобладает в системе
    console.log('\n📈 СТАТИСТИКА ИСПОЛЬЗОВАНИЯ ID В ТРАНЗАКЦИЯХ:');
    
    // Найдем самые частые user_id в транзакциях
    const { data: topUserIds } = await supabase
      .from('transactions')
      .select('user_id, count')
      .gte('created_at', '2025-08-01T00:00:00.000Z')
      .order('count', { ascending: false })
      .limit(10);
    
    if (topUserIds) {
      console.log('TOP 10 user_id в транзакциях:');
      
      for (const item of topUserIds) {
        const userId = item.user_id;
        
        // Проверяем есть ли пользователь с таким internal ID
        const { data: userByInternal } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', userId)
          .single();
          
        // Проверяем есть ли пользователь с таким telegram_id
        const { data: userByTelegram } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', userId)
          .single();
        
        let idType = 'НЕИЗВЕСТНО';
        if (userByInternal && !userByTelegram) {
          idType = 'Internal ID';
        } else if (!userByInternal && userByTelegram) {
          idType = 'Telegram ID';
        } else if (userByInternal && userByTelegram) {
          idType = 'Оба варианта';
        }
        
        console.log(`User ID ${userId}: ${item.count} транзакций | Тип: ${idType}`);
      }
    }
    
    // 3. Проверяем что происходит в BalanceManager код
    console.log('\n🔍 ПРОВЕРКА ЛОГИКИ BALANCEMANAGER:');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      // Попробуем понять как BalanceManager обрабатывает ID
      console.log('BalanceManager загружен успешно');
      
      // Проверим работающего пользователя если он есть
      if (workingUsers && workingUsers.length > 0) {
        const testUser = workingUsers[0];
        console.log(`\nТестируем BalanceManager с работающим пользователем ${testUser.telegram_id}:`);
        
        const result = await balanceManager.getUserBalance(testUser.id);
        console.log('Результат getUserBalance:', result);
        
        if (result.success) {
          console.log('✅ BalanceManager успешно работает с internal ID');
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка работы с BalanceManager:', error.message);
    }
    
    // 4. Проверяем как создаются новые транзакции
    console.log('\n⚡ ПРОВЕРКА СОЗДАНИЯ НОВЫХ ТРАНЗАКЦИЙ:');
    
    // Найдем самые свежие транзакции за последний час
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, currency, created_at, metadata')
      .gte('created_at', hourAgo)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentTransactions) {
      console.log('НЕДАВНИЕ ТРАНЗАКЦИИ:');
      
      for (const tx of recentTransactions) {
        // Проверяем тип ID для каждой транзакции
        const { data: userByInternal } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', tx.user_id)
          .single();
          
        const { data: userByTelegram } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', tx.user_id)
          .single();
        
        let idStatus = '';
        if (userByInternal && !userByTelegram) {
          idStatus = '✅ Internal ID';
        } else if (!userByInternal && userByTelegram) {
          idStatus = '⚠️ Telegram ID';
        } else if (userByInternal && userByTelegram) {
          idStatus = '🔄 ID конфликт';
        } else {
          idStatus = '❌ Orphaned';
        }
        
        console.log(`${tx.created_at} | User ${tx.user_id} | ${tx.type} | ${idStatus}`);
        
        // Проверяем источник создания
        if (tx.metadata?.source) {
          console.log(`   Источник: ${tx.metadata.source}`);
        }
      }
    }
    
    // 5. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n🚨 ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    
    const issues = [];
    
    // Подсчитаем сколько пользователей используют internal vs telegram ID
    const { data: totalUsers } = await supabase
      .from('users')
      .select('count')
      .single();
    
    console.log(`Всего пользователей в системе: ${totalUsers?.count || 0}`);
    
    // Подсчитаем транзакции по типам ID
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('user_id')
      .gte('created_at', '2025-08-01T00:00:00.000Z');
    
    if (allTransactions) {
      let internalIdCount = 0;
      let telegramIdCount = 0;
      let unknownCount = 0;
      
      for (const tx of allTransactions) {
        const { data: userByInternal } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('id', tx.user_id)
          .single();
          
        const { data: userByTelegram } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', tx.user_id)
          .single();
        
        if (userByInternal && !userByTelegram) {
          internalIdCount++;
        } else if (!userByInternal && userByTelegram) {
          telegramIdCount++;
        } else {
          unknownCount++;
        }
      }
      
      console.log(`\nРаспределение транзакций по типам ID:`);
      console.log(`Internal ID: ${internalIdCount}`);
      console.log(`Telegram ID: ${telegramIdCount}`);
      console.log(`Неопределенные: ${unknownCount}`);
      
      if (telegramIdCount > internalIdCount) {
        console.log('⚠️ СИСТЕМА ПРЕИМУЩЕСТВЕННО ИСПОЛЬЗУЕТ TELEGRAM_ID');
        issues.push('BalanceManager ожидает internal ID, но система создает транзакции с telegram_id');
      } else if (internalIdCount > telegramIdCount) {
        console.log('✅ СИСТЕМА ПРЕИМУЩЕСТВЕННО ИСПОЛЬЗУЕТ INTERNAL_ID');
      } else {
        console.log('🔄 СМЕШАННОЕ ИСПОЛЬЗОВАНИЕ ID - ЭТО ПРОБЛЕМА');
        issues.push('Система использует разные типы ID непоследовательно');
      }
    }
    
    if (issues.length > 0) {
      console.log('\n❌ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n✅ Анализ маппинга ID завершен');
    
  } catch (error) {
    console.error('❌ Ошибка анализа маппинга ID:', error);
  }
}

analyzeIdMappingSystem();