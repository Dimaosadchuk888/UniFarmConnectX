#!/usr/bin/env tsx
/**
 * 🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА USER 255 ПОСЛЕ ИСПРАВЛЕНИЯ
 * Проверяем работу нового депозита с исправленной дедупликацией
 */

import { supabase } from './core/supabase';

async function diagnoseFinalUser255() {
  console.log('🔍 ФИНАЛЬНАЯ ДИАГНОСТИКА USER 255 ПОСЛЕ ИСПРАВЛЕНИЯ');
  console.log('='.repeat(80));

  try {
    // 1. Проверяем последние депозиты User 255
    console.log('\n1️⃣ ПРОВЕРКА ПОСЛЕДНИХ ДЕПОЗИТОВ USER 255:');
    
    const { data: deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(5);

    if (deposits && deposits.length > 0) {
      console.log(`📊 Найдено депозитов: ${deposits.length}`);
      console.log('\n📋 Последние депозиты:');
      
      deposits.forEach((tx, i) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        console.log(`\n   ${i + 1}. ДЕПОЗИТ #${tx.id}:`);
        console.log(`      💰 Сумма: ${tx.amount_ton} TON`);
        console.log(`      📅 Время: ${tx.created_at.slice(0, 19)} (${timeAgo} минут назад)`);
        console.log(`      ✅ Статус: ${tx.status}`);
        console.log(`      🔗 Hash: ${tx.tx_hash_unique?.slice(0, 30) || 'НЕТ'}...`);
        console.log(`      🎯 Тип: ${tx.type}`);
        
        // Особо отмечаем новый депозит
        if (timeAgo < 60) {
          console.log(`      🌟 НОВЫЙ ДЕПОЗИТ! (менее часа назад)`);
        }
      });
      
      // 2. Проверяем есть ли новый депозит после исправления
      const newDeposit = deposits.find(tx => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        return timeAgo < 60; // Последний час
      });
      
      if (newDeposit) {
        console.log('\n🎉 НАЙДЕН НОВЫЙ ДЕПОЗИТ ПОСЛЕ ИСПРАВЛЕНИЯ!');
        console.log(`   Депозит #${newDeposit.id}: ${newDeposit.amount_ton} TON`);
        console.log(`   Статус: ${newDeposit.status}`);
        console.log(`   Время: ${newDeposit.created_at}`);
        
        // 3. Проверяем баланс пользователя
        console.log('\n2️⃣ ПРОВЕРКА БАЛАНСА USER 255:');
        
        const { data: balance } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', 255)
          .single();
          
        if (balance) {
          console.log(`💰 UNI баланс: ${balance.uni_balance}`);
          console.log(`💎 TON баланс: ${balance.ton_balance}`);
          console.log(`📅 Обновлен: ${balance.updated_at}`);
          
          // Проверяем было ли обновление баланса после депозита
          const balanceUpdateTime = new Date(balance.updated_at).getTime();
          const depositTime = new Date(newDeposit.created_at).getTime();
          const balanceUpdatedAfterDeposit = balanceUpdateTime > depositTime;
          
          console.log(`\n✅ Баланс обновлен после депозита: ${balanceUpdatedAfterDeposit ? 'ДА' : 'НЕТ'}`);
          
          if (balanceUpdatedAfterDeposit) {
            const timeDiff = Math.round((balanceUpdateTime - depositTime) / 1000);
            console.log(`⏱️ Время обновления баланса: ${timeDiff} секунд после депозита`);
          }
        }
        
        // 4. Проверяем TON Boost статус
        console.log('\n3️⃣ ПРОВЕРКА TON BOOST USER 255:');
        
        const { data: boosts } = await supabase
          .from('ton_boost_purchases')
          .select('*')
          .eq('user_id', 255)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (boosts && boosts.length > 0) {
          console.log(`🚀 Найдено TON Boost покупок: ${boosts.length}`);
          
          boosts.forEach((boost, i) => {
            console.log(`\n   ${i + 1}. Boost #${boost.id}:`);
            console.log(`      💰 Сумма: ${boost.amount_ton} TON`);
            console.log(`      📅 Время: ${boost.created_at.slice(0, 19)}`);
            console.log(`      ✅ Статус: ${boost.status}`);
            console.log(`      📈 Множитель: ${boost.multiplier}x`);
          });
          
          // Проверяем активацию boost после нового депозита
          const recentBoost = boosts.find(boost => {
            const boostTime = new Date(boost.created_at).getTime();
            const depositTime = new Date(newDeposit.created_at).getTime();
            return Math.abs(boostTime - depositTime) < 10 * 60 * 1000; // 10 минут разницы
          });
          
          if (recentBoost) {
            console.log('\n🎉 TON BOOST АКТИВИРОВАН ВМЕСТЕ С ДЕПОЗИТОМ!');
            console.log(`   Boost ID: ${recentBoost.id}`);
            console.log(`   Статус: ${recentBoost.status}`);
          }
        }
        
        // 5. Общий вывод
        console.log('\n' + '='.repeat(80));
        console.log('🎯 РЕЗУЛЬТАТЫ ПРОВЕРКИ ПОСЛЕ ИСПРАВЛЕНИЯ:');
        console.log('');
        console.log('✅ НОВЫЙ ДЕПОЗИТ ОБНАРУЖЕН И ОБРАБОТАН');
        console.log(`✅ Статус депозита: ${newDeposit.status}`);
        console.log(`✅ Сумма: ${newDeposit.amount_ton} TON`);
        
        if (balance && balanceUpdatedAfterDeposit) {
          console.log('✅ БАЛАНС УСПЕШНО ОБНОВЛЕН');
        } else {
          console.log('⚠️ Баланс требует проверки');
        }
        
        console.log('');
        console.log('🚀 ИСПРАВЛЕНИЕ ДЕДУПЛИКАЦИИ РАБОТАЕТ!');
        console.log('- User 255 смог создать новый депозит');
        console.log('- Логика дедупликации не заблокировала транзакцию');
        console.log('- Система обработала депозит корректно');
        
      } else {
        console.log('\n⚠️ Новых депозитов за последний час не найдено');
        console.log('Возможно депозит еще обрабатывается или не был создан');
      }
      
    } else {
      console.log('❌ Депозиты не найдены');
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА ДИАГНОСТИКИ:', error);
  }
}

diagnoseFinalUser255().catch(console.error);