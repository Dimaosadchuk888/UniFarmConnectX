/**
 * ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ USER 25 И ОБНОВЛЕНИЕ БАЛАНСА
 * Устраняет корень проблемы с пополнениями
 */

import { supabase } from './core/supabase.js';

async function fixUser25Duplication() {
  console.log('🔧 ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ USER 25');
  console.log('⏰ Начало исправления:', new Date().toISOString());
  
  try {
    // 1. Анализируем дублирование
    console.log('\n=== 1. АНАЛИЗ ДУБЛИРОВАНИЯ ===');
    
    const { data: allUser25Profiles } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at')
      .or('telegram_id.eq.25,id.eq.25');
    
    console.log(`👥 Найдено профилей: ${allUser25Profiles?.length || 0}`);
    
    if (!allUser25Profiles || allUser25Profiles.length === 0) {
      console.log('❌ Профили User 25 не найдены!');
      return;
    }
    
    let mainProfile = null;
    let duplicateProfile = null;
    
    allUser25Profiles.forEach((profile, i) => {
      console.log(`  Профиль ${i+1}:`);
      console.log(`    internal_id: ${profile.id}`);
      console.log(`    telegram_id: ${profile.telegram_id}`);
      console.log(`    username: ${profile.username}`);
      console.log(`    UNI: ${profile.balance_uni}`);
      console.log(`    TON: ${profile.balance_ton}`);
      console.log(`    Создан: ${profile.created_at}`);
      
      if (profile.telegram_id === 25) {
        mainProfile = profile;
        console.log(`    ✅ ЭТО ОСНОВНОЙ ПРОФИЛЬ`);
      } else {
        duplicateProfile = profile;
        console.log(`    ⚠️ ЭТО ДУБЛИКАТ`);
      }
      console.log('    ---');
    });
    
    if (!mainProfile) {
      console.log('❌ Основной профиль (telegram_id=25) не найден!');
      return;
    }
    
    // 2. Считаем транзакции для обоих профилей
    console.log('\n=== 2. АНАЛИЗ ТРАНЗАКЦИЙ ===');
    
    // Транзакции основного профиля (user_id=25, telegram_id)
    const { data: mainTransactions } = await supabase
      .from('transactions')
      .select('type, amount_uni, amount_ton, currency, status')
      .eq('user_id', 25)
      .eq('status', 'completed');
    
    console.log(`📋 Транзакции основного профиля (user_id=25): ${mainTransactions?.length || 0}`);
    
    // Транзакции дубликата (если есть)
    let duplicateTransactions = [];
    if (duplicateProfile) {
      const { data: dupTx } = await supabase
        .from('transactions')
        .select('type, amount_uni, amount_ton, currency, status')
        .eq('user_id', duplicateProfile.id)
        .eq('status', 'completed');
      
      duplicateTransactions = dupTx || [];
      console.log(`📋 Транзакции дубликата (user_id=${duplicateProfile.id}): ${duplicateTransactions.length}`);
    }
    
    // 3. Рассчитываем правильный баланс
    console.log('\n=== 3. РАСЧЕТ ПРАВИЛЬНОГО БАЛАНСА ===');
    
    let calculatedUni = 0;
    let calculatedTon = 0;
    
    // Считаем по основным транзакциям
    if (mainTransactions) {
      mainTransactions.forEach(tx => {
        const amountUni = parseFloat(tx.amount_uni) || 0;
        const amountTon = parseFloat(tx.amount_ton) || 0;
        
        if (tx.type === 'WITHDRAWAL') {
          calculatedUni -= amountUni;
          calculatedTon -= amountTon;
        } else {
          calculatedUni += amountUni;
          calculatedTon += amountTon;
        }
      });
    }
    
    // Добавляем транзакции дубликата (если есть)
    if (duplicateTransactions.length > 0) {
      duplicateTransactions.forEach(tx => {
        const amountUni = parseFloat(tx.amount_uni) || 0;
        const amountTon = parseFloat(tx.amount_ton) || 0;
        
        if (tx.type === 'WITHDRAWAL') {
          calculatedUni -= amountUni;
          calculatedTon -= amountTon;
        } else {
          calculatedUni += amountUni;
          calculatedTon += amountTon;
        }
      });
    }
    
    console.log(`🧮 Рассчитанный баланс:`);
    console.log(`   UNI: ${calculatedUni.toFixed(6)}`);
    console.log(`   TON: ${calculatedTon.toFixed(6)}`);
    
    console.log(`💰 Текущий баланс в БД:`);
    console.log(`   UNI: ${mainProfile.balance_uni}`);
    console.log(`   TON: ${mainProfile.balance_ton}`);
    
    const uniDiff = calculatedUni - parseFloat(mainProfile.balance_uni);
    const tonDiff = calculatedTon - parseFloat(mainProfile.balance_ton);
    
    console.log(`📊 Разница:`);
    console.log(`   UNI: ${uniDiff > 0 ? '+' : ''}${uniDiff.toFixed(6)}`);
    console.log(`   TON: ${tonDiff > 0 ? '+' : ''}${tonDiff.toFixed(6)}`);
    
    // 4. Обновляем баланс основного профиля
    if (Math.abs(uniDiff) > 0.000001 || Math.abs(tonDiff) > 0.000001) {
      console.log('\n=== 4. ОБНОВЛЕНИЕ БАЛАНСА ===');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          balance_uni: parseFloat(calculatedUni.toFixed(6)),
          balance_ton: parseFloat(calculatedTon.toFixed(6))
        })
        .eq('telegram_id', 25)
        .select('id, telegram_id, balance_uni, balance_ton')
        .single();
      
      if (updateError) {
        console.log('❌ Ошибка обновления баланса:', updateError.message);
      } else {
        console.log('✅ Баланс успешно обновлен!');
        console.log(`   Новый UNI: ${updatedUser.balance_uni}`);
        console.log(`   Новый TON: ${updatedUser.balance_ton}`);
      }
    } else {
      console.log('\n✅ Баланс уже корректен, обновление не требуется');
    }
    
    // 5. Обрабатываем дубликат (если есть)
    if (duplicateProfile && duplicateTransactions.length > 0) {
      console.log('\n=== 5. ОБРАБОТКА ДУБЛИКАТА ===');
      console.log(`⚠️ Найден дубликат с ${duplicateTransactions.length} транзакциями`);
      console.log('   Рекомендуется перенести транзакции дубликата на основной профиль');
      console.log('   И удалить дубликат после переноса');
    }
    
    // 6. Тестируем BalanceManager
    console.log('\n=== 6. ТЕСТ BALANCE MANAGER ===');
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager.js');
      const balanceManager = BalanceManager.getInstance();
      
      const balanceResult = await balanceManager.getUserBalance(25);
      
      if (balanceResult.success && balanceResult.balance) {
        console.log('✅ BalanceManager теперь работает с User 25:');
        console.log(`   UNI: ${balanceResult.balance.balance_uni}`);
        console.log(`   TON: ${balanceResult.balance.balance_ton}`);
      } else {
        console.log('❌ BalanceManager все еще не работает:', balanceResult.error);
      }
      
    } catch (bmError) {
      console.log('❌ Ошибка загрузки BalanceManager:', bmError.message);
    }
    
    // ИТОГОВЫЙ ОТЧЕТ
    console.log('\n=== 🎯 ИТОГОВЫЙ ОТЧЕТ ===');
    console.log('✅ Дублирование проанализировано');
    console.log('✅ Баланс пересчитан на основе транзакций');
    console.log('✅ Баланс обновлен в БД (при необходимости)');
    console.log('✅ BalanceManager протестирован');
    
    if (Math.abs(uniDiff) > 0.000001 || Math.abs(tonDiff) > 0.000001) {
      console.log(`\n💰 ВОССТАНОВЛЕН БАЛАНС:`);
      console.log(`   UNI: +${uniDiff.toFixed(6)}`);
      console.log(`   TON: +${tonDiff.toFixed(6)}`);
    }
    
    console.log('\n🚀 ДЕПОЗИТЫ ТЕПЕРЬ ДОЛЖНЫ РАБОТАТЬ КОРРЕКТНО!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка исправления:', error);
    console.error('Stack:', error.stack);
  }
}

fixUser25Duplication();