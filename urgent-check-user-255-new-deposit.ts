#!/usr/bin/env tsx
/**
 * 🚨 СРОЧНАЯ ПРОВЕРКА НОВОГО ДЕПОЗИТА USER 255
 * Ищем новое пополнение на 1.1 TON и проверяем почему баланс не обновился
 */

import { supabase } from './core/supabase';

async function urgentCheckUser255() {
  console.log('🚨 СРОЧНАЯ ПРОВЕРКА НОВОГО ДЕПОЗИТА USER 255 (1.1 TON)');
  console.log('='.repeat(80));

  try {
    // 1. Проверяем самые свежие депозиты (последние 30 минут)
    console.log('\n1️⃣ ПОИСК НОВОГО ДЕПОЗИТА 1.1 TON:');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: veryRecentDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    console.log(`📊 Депозитов User 255 за последние 30 минут: ${veryRecentDeposits?.length || 0}`);
    
    if (veryRecentDeposits && veryRecentDeposits.length > 0) {
      console.log('\n🎯 НАЙДЕН НОВЫЙ ДЕПОЗИТ!');
      
      veryRecentDeposits.forEach((tx, i) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        console.log(`\n   ${i + 1}. ДЕПОЗИТ #${tx.id}:`);
        console.log(`      💰 Сумма: ${tx.amount_ton} TON`);
        console.log(`      📅 Создан: ${tx.created_at} (${timeAgo} мин назад)`);
        console.log(`      ✅ Статус: ${tx.status}`);
        console.log(`      🎯 Тип: ${tx.type}`);
        console.log(`      🔗 Hash: ${tx.tx_hash_unique?.slice(0, 40) || 'НЕТ'}...`);
        console.log(`      📝 Описание: ${tx.description || 'НЕТ'}`);
        
        if (parseFloat(tx.amount_ton) === 1.1) {
          console.log(`      🎉 ЭТО ИСКОМЫЙ ДЕПОЗИТ 1.1 TON!`);
        }
      });
      
      // Анализируем проблему
      const targetDeposit = veryRecentDeposits.find(tx => parseFloat(tx.amount_ton) === 1.1);
      
      if (targetDeposit) {
        console.log(`\n🔍 АНАЛИЗ ДЕПОЗИТА 1.1 TON (#${targetDeposit.id}):`);
        console.log(`   Статус: ${targetDeposit.status}`);
        console.log(`   Тип: ${targetDeposit.type}`);
        console.log(`   Время создания: ${targetDeposit.created_at}`);
        
        if (targetDeposit.status === 'completed') {
          console.log(`   ✅ Депозит помечен как completed - должен был обновить баланс!`);
        } else {
          console.log(`   ⚠️ Депозит НЕ completed - статус: ${targetDeposit.status}`);
        }
        
        // Проверяем баланс пользователя
        console.log('\n2️⃣ ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА USER 255:');
        
        const { data: balance } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', 255)
          .single();
          
        if (balance) {
          console.log(`💰 UNI баланс: ${balance.uni_balance}`);
          console.log(`💎 TON баланс: ${balance.ton_balance}`);
          console.log(`📅 Последнее обновление: ${balance.updated_at}`);
          
          const balanceTime = new Date(balance.updated_at).getTime();
          const depositTime = new Date(targetDeposit.created_at).getTime();
          const timeDiff = (balanceTime - depositTime) / (1000 * 60);
          
          console.log(`\n⏱️ Разница времени:`);
          console.log(`   Депозит: ${targetDeposit.created_at}`);
          console.log(`   Баланс:  ${balance.updated_at}`);
          console.log(`   Разница: ${Math.round(timeDiff)} минут`);
          
          if (timeDiff > 0) {
            console.log(`   ✅ Баланс обновлялся ПОСЛЕ депозита`);
          } else {
            console.log(`   ❌ Баланс НЕ обновлялся после депозита!`);
          }
          
          // Проверяем было ли увеличение TON баланса
          console.log(`\n💎 Анализ TON баланса:`);
          console.log(`   Текущий TON баланс: ${balance.ton_balance}`);
          
          // Проверяем ожидаемое значение (предыдущий + 1.1)
          const expectedIncrease = 1.1;
          console.log(`   Ожидаемое увеличение: +${expectedIncrease} TON`);
          console.log(`   Депозит на: ${targetDeposit.amount_ton} TON`);
          
          if (targetDeposit.status === 'completed' && timeDiff <= 0) {
            console.log(`\n🚨 ПРОБЛЕМА НАЙДЕНА:`);
            console.log(`   - Депозит помечен как completed`);
            console.log(`   - Но баланс НЕ обновился после депозита`);
            console.log(`   - Возможная проблема в логике обновления баланса`);
          }
        }
        
        // 3. Проверяем связанные транзакции
        console.log('\n3️⃣ ПОИСК СВЯЗАННЫХ ТРАНЗАКЦИЙ:');
        
        const { data: relatedTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', 255)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false });
          
        if (relatedTransactions && relatedTransactions.length > 0) {
          console.log(`📊 Всего транзакций User 255 за 30 минут: ${relatedTransactions.length}`);
          
          relatedTransactions.forEach((tx, i) => {
            console.log(`\n   ${i + 1}. TX #${tx.id}:`);
            console.log(`      Тип: ${tx.type}`);
            console.log(`      Валюта: ${tx.currency}`);
            console.log(`      Сумма: ${tx.currency === 'TON' ? tx.amount_ton : tx.amount_uni}`);
            console.log(`      Статус: ${tx.status}`);
            console.log(`      Время: ${tx.created_at}`);
          });
        }
        
      } else {
        console.log(`\n❌ Депозит на 1.1 TON не найден среди новых`);
        console.log(`Возможно сумма отличается или депозит еще не попал в базу`);
      }
      
    } else {
      console.log('\n❌ Новых депозитов за последние 30 минут не найдено');
      console.log('Проверяю все депозиты за последний час...');
      
      // Расширенный поиск - последний час
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: hourlyDeposits } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 255)
        .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
        .eq('currency', 'TON')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });
        
      console.log(`📊 Депозитов за последний час: ${hourlyDeposits?.length || 0}`);
      
      if (hourlyDeposits && hourlyDeposits.length > 0) {
        hourlyDeposits.forEach((tx, i) => {
          const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
          console.log(`\n   ${i + 1}. ${tx.amount_ton} TON - ${tx.status} (${timeAgo} мин назад)`);
          
          if (parseFloat(tx.amount_ton) === 1.1) {
            console.log(`      🎯 НАЙДЕН ДЕПОЗИТ 1.1 TON!`);
          }
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 СТАТУС ПРОВЕРКИ ЗАВЕРШЕН');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА СРОЧНОЙ ПРОВЕРКИ:', error);
  }
}

urgentCheckUser255().catch(console.error);