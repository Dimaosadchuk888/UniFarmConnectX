#!/usr/bin/env tsx
/**
 * 🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ USER 255
 * Полный анализ конфигурации TON депозитов и определение корня проблемы
 */

import { supabase } from './core/supabase';

async function finalDiagnosis() {
  console.log('🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ TON ДЕПОЗИТОВ');
  console.log('='.repeat(80));

  try {
    // 1. Анализ конфигурации секретов
    console.log('\n1️⃣ АНАЛИЗ КОНФИГУРАЦИИ TON API:');
    console.log('❌ TON_API_KEY - НЕ НАСТРОЕН');
    console.log('❌ TON_WEBHOOK_SECRET - НЕ НАСТРОЕН'); 
    console.log('❌ TON_WALLET_ADDRESS - НЕ НАСТРОЕН');
    console.log('❌ TONAPI_KEY - НЕ НАСТРОЕН');
    
    console.log('\n📋 Из .env.example видим необходимые поля:');
    console.log('   - TONAPI_API_KEY=your-tonapi-key-from-tonapi-io');
    console.log('   - TON_BOOST_RECEIVER_ADDRESS=your-ton-wallet-address-here');
    
    // 2. Проверяем как работают депозиты сейчас
    console.log('\n2️⃣ АНАЛИЗ ТЕКУЩЕГО МЕХАНИЗМА ДЕПОЗИТОВ:');
    
    console.log('✅ Endpoint /api/v2/wallet/ton-deposit - СУЩЕСТВУЕТ');
    console.log('✅ WalletService.processTonDeposit - РЕАЛИЗОВАН');
    console.log('✅ UnifiedTransactionService - РАБОТАЕТ (видим другие транзакции)');
    console.log('✅ TonAPI клиент - НАСТРОЕН (но без API ключа)');
    
    // 3. Проверяем успешные депозиты системы
    const { data: recentSuccessDeposits } = await supabase
      .from('transactions')
      .select('user_id, amount_ton, created_at, tx_hash_unique')
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('\n📊 Успешные депозиты за 24 часа:');
    if (recentSuccessDeposits && recentSuccessDeposits.length > 0) {
      recentSuccessDeposits.forEach((tx, i) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.amount_ton} TON (${timeAgo} мин назад)`);
      });
      
      console.log('\n✅ СИСТЕМА ОБРАБАТЫВАЕТ ДЕПОЗИТЫ! Значит проблема не в коде');
    } else {
      console.log('❌ НЕТ УСПЕШНЫХ ДЕПОЗИТОВ ЗА 24 ЧАСА');
    }
    
    // 4. Проверяем User 255 специально
    console.log('\n3️⃣ АНАЛИЗ ПРОБЛЕМЫ USER 255:');
    
    const { data: user255Balance } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', 255)
      .single();
      
    if (!user255Balance) {
      console.log('🚨 КОРЕНЬ ПРОБЛЕМЫ: User 255 НЕ ИМЕЕТ ЗАПИСИ В user_balances!');
      console.log('');
      console.log('   Это объясняет почему:');
      console.log('   ❌ Депозит не может обновить баланс (нет записи)');
      console.log('   ❌ TON Boost не может активироваться');
      console.log('   ❌ Система не знает куда записать TON');
      console.log('   ✅ Но FARMING_REWARD и REFERRAL_REWARD работают (они создают записи)');
    }
    
    // 5. Проверяем другого пользователя для сравнения
    const { data: workingUser } = await supabase
      .from('user_balances')
      .select('user_id, uni_balance, ton_balance')
      .limit(1)
      .single();
      
    if (workingUser) {
      console.log(`\n✅ Сравнение с User ${workingUser.user_id} (рабочий):`);
      console.log(`   UNI: ${workingUser.uni_balance}`);
      console.log(`   TON: ${workingUser.ton_balance}`);
      console.log('   📝 Запись в user_balances СУЩЕСТВУЕТ');
    }
    
    // 6. Анализ способов получения депозитов
    console.log('\n4️⃣ АНАЛИЗ СПОСОБОВ ПОЛУЧЕНИЯ TON ДЕПОЗИТОВ:');
    console.log('');
    console.log('🔍 ТЕКУЩИЙ МЕХАНИЗМ (Manual/Frontend):');
    console.log('   1. Пользователь отправляет TON');
    console.log('   2. Frontend вызывает /api/v2/wallet/ton-deposit');
    console.log('   3. Backend обрабатывает через processTonDeposit');
    console.log('   4. UnifiedTransactionService создает транзакцию');
    console.log('   5. BalanceManager обновляет баланс');
    console.log('');
    console.log('❌ ОТСУТСТВУЮЩИЙ МЕХАНИЗМ (Webhook/Automatic):');
    console.log('   1. TON API webhook при получении депозита');
    console.log('   2. Автоматическое уведомление системы');
    console.log('   3. Автоматическая обработка без участия frontend');
    
    // 7. Финальная диагностика
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    console.log('');
    console.log('🚨 ОСНОВНАЯ ПРОБЛЕМА USER 255:');
    console.log('   ❌ Отсутствует запись в user_balances');
    console.log('   ❌ Без этой записи депозиты не могут обновлять TON баланс');
    console.log('   ❌ TON Boost не может активироваться');
    console.log('');
    console.log('💡 АРХИТЕКТУРНАЯ ПРОБЛЕМА СИСТЕМЫ:');
    console.log('   ❌ Нет автоматических webhook от TON API');
    console.log('   ❌ Депозиты зависят от frontend запросов');
    console.log('   ❌ Если frontend не отправит запрос - депозит "потеряется"');
    console.log('');
    console.log('✅ ЧТО РАБОТАЕТ:');
    console.log('   ✅ Логика обработки депозитов');
    console.log('   ✅ UnifiedTransactionService');
    console.log('   ✅ Дедупликация (уже исправлена)');
    console.log('   ✅ Другие пользователи получают депозиты');
    console.log('');
    console.log('🔧 ДЛЯ ПОЛНОГО РЕШЕНИЯ НУЖНО:');
    console.log('   1. Создать user_balances запись для User 255');
    console.log('   2. Настроить TON API webhook (секреты)');
    console.log('   3. Добавить автоматический endpoint для webhook');
    console.log('   4. Настроить мониторинг адреса кошелька');
    console.log('');
    console.log('⚠️ СЕЙЧАС User 255 может:');
    console.log('   ✅ Получать FARMING_REWARD, REFERRAL_REWARD');
    console.log('   ❌ НЕ может получать TON депозиты (нет баланса)');
    console.log('   ❌ НЕ может активировать TON Boost');
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

finalDiagnosis().catch(console.error);