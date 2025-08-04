#!/usr/bin/env tsx
/**
 * 🔍 ПРОВЕРКА ВСЕХ НЕДАВНИХ ДЕПОЗИТОВ
 * Ищем новые депозиты User 255 и проверяем общую активность
 */

import { supabase } from './core/supabase';

async function checkRecentDeposits() {
  console.log('🔍 ПРОВЕРКА ВСЕХ НЕДАВНИХ ДЕПОЗИТОВ И USER 255');
  console.log('='.repeat(80));

  try {
    // 1. Проверяем все депозиты за последние 3 часа
    console.log('\n1️⃣ ВСЕ ДЕПОЗИТЫ ЗА ПОСЛЕДНИЕ 3 ЧАСА:');
    
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    
    const { data: recentDeposits } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .gte('created_at', threeHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`📊 Найдено депозитов за 3 часа: ${recentDeposits?.length || 0}`);
    
    if (recentDeposits && recentDeposits.length > 0) {
      console.log('\n📋 Последние депозиты:');
      
      let user255Found = false;
      
      recentDeposits.forEach((tx, i) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        const isUser255 = tx.user_id === 255;
        
        if (isUser255) user255Found = true;
        
        console.log(`\n   ${i + 1}. ${isUser255 ? '🌟 USER 255' : `USER ${tx.user_id}`}:`);
        console.log(`      💰 Сумма: ${tx.amount_ton} TON`);
        console.log(`      📅 Время: ${tx.created_at.slice(0, 19)} (${timeAgo} мин назад)`);
        console.log(`      ✅ Статус: ${tx.status}`);
        console.log(`      🎯 Тип: ${tx.type}`);
        console.log(`      🔗 Hash: ${tx.tx_hash_unique?.slice(0, 20) || 'НЕТ'}...`);
        
        if (isUser255 && timeAgo < 180) {
          console.log(`      🎉 НОВЫЙ ДЕПОЗИТ USER 255!`);
        }
      });
      
      // 2. Специальная проверка User 255
      console.log('\n2️⃣ ФОКУС НА USER 255:');
      
      if (user255Found) {
        const user255Deposits = recentDeposits.filter(tx => tx.user_id === 255);
        console.log(`🎯 Депозитов User 255 за 3 часа: ${user255Deposits.length}`);
        
        const newestDeposit = user255Deposits[0];
        console.log(`\n✅ ПОСЛЕДНИЙ ДЕПОЗИТ USER 255:`);
        console.log(`   ID: ${newestDeposit.id}`);
        console.log(`   Сумма: ${newestDeposit.amount_ton} TON`);
        console.log(`   Время: ${newestDeposit.created_at}`);
        console.log(`   Статус: ${newestDeposit.status}`);
        
        // Проверяем баланс
        const { data: balance } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', 255)
          .single();
          
        if (balance) {
          console.log(`\n💰 ТЕКУЩИЙ БАЛАНС USER 255:`);
          console.log(`   UNI: ${balance.uni_balance}`);
          console.log(`   TON: ${balance.ton_balance}`);
          console.log(`   Обновлен: ${balance.updated_at}`);
          
          const balanceTime = new Date(balance.updated_at).getTime();
          const depositTime = new Date(newestDeposit.created_at).getTime();
          const timeDiff = (balanceTime - depositTime) / 1000;
          
          console.log(`\n⏱️ Баланс обновлен через ${Math.round(timeDiff)} сек после депозита`);
          
          if (timeDiff > 0) {
            console.log(`✅ БАЛАНС ОБНОВЛЕН ПОСЛЕ ДЕПОЗИТА - РАБОТАЕТ!`);
          } else {
            console.log(`⚠️ Баланс не обновлен или обновлен до депозита`);
          }
        }
        
      } else {
        console.log('❌ User 255 не найден среди недавних депозитов');
      }
      
    } else {
      console.log('❌ Депозитов за последние 3 часа не найдено');
    }
    
    // 3. Проверяем самые последние депозиты User 255 вообще
    console.log('\n3️⃣ ПОСЛЕДНИЕ ДЕПОЗИТЫ USER 255 (любые):');
    
    const { data: allUser255Deposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 255)
      .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (allUser255Deposits && allUser255Deposits.length > 0) {
      allUser255Deposits.forEach((tx, i) => {
        const timeAgo = Math.round((Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60));
        console.log(`\n   ${i + 1}. Депозит #${tx.id}:`);
        console.log(`      💰 ${tx.amount_ton} TON`);
        console.log(`      📅 ${tx.created_at.slice(0, 19)} (${timeAgo} мин назад)`);
        console.log(`      ✅ ${tx.status}`);
        
        if (timeAgo < 60) {
          console.log(`      🔥 ОЧЕНЬ СВЕЖИЙ! (менее часа)`);
        } else if (timeAgo < 180) {
          console.log(`      🆕 СВЕЖИЙ! (менее 3 часов)`);
        }
      });
      
      const latestDeposit = allUser255Deposits[0];
      const minutesAgo = Math.round((Date.now() - new Date(latestDeposit.created_at).getTime()) / (1000 * 60));
      
      console.log('\n' + '='.repeat(80));
      console.log('🎯 ИТОГОВЫЙ СТАТУС:');
      console.log('');
      console.log(`📅 Последний депозит User 255: ${minutesAgo} минут назад`);
      console.log(`✅ Статус: ${latestDeposit.status}`);
      console.log(`💰 Сумма: ${latestDeposit.amount_ton} TON`);
      
      if (minutesAgo < 60) {
        console.log('');
        console.log('🎉 НАЙДЕН СВЕЖИЙ ДЕПОЗИТ!');
        console.log('🚀 ИСПРАВЛЕНИЕ ДЕДУПЛИКАЦИИ РАБОТАЕТ!');
        console.log('✅ User 255 успешно создал новый депозит');
      } else if (minutesAgo < 180) {
        console.log('');
        console.log('🆕 Есть относительно свежий депозит');
        console.log('✅ Система работает стабильно');
      } else {
        console.log('');
        console.log('⏰ Депозит не самый свежий');
        console.log('❓ Возможно новый депозит еще обрабатывается');
      }
      
    } else {
      console.log('❌ Депозиты User 255 не найдены');
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('💥 ОШИБКА ПРОВЕРКИ:', error);
  }
}

checkRecentDeposits().catch(console.error);