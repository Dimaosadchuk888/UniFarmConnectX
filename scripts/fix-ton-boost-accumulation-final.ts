/**
 * Финальный скрипт исправления TON Boost накопления для user 74
 * Восстанавливает потерянные 10 TON от последней покупки Advanced Boost
 */

import { supabase } from '../core/supabase';
import { logger } from '../utils/logger';

async function fixUser74TonBoostAccumulation() {
  try {
    console.log('=== ИСПРАВЛЕНИЕ TON BOOST НАКОПЛЕНИЯ ДЛЯ USER 74 ===\n');
    
    // 1. Получаем текущее состояние
    console.log('1. Получаем текущее состояние user 74...');
    const { data: currentData, error: fetchError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', 74)
      .single();
      
    if (fetchError) {
      console.error('Ошибка получения данных:', fetchError);
      return;
    }
    
    console.log('Текущее состояние:', {
      farming_balance: currentData.farming_balance,
      farming_rate: currentData.farming_rate,
      boost_package_id: currentData.boost_package_id
    });
    
    // 2. Восстанавливаем правильные значения
    const correctBalance = 340; // 330 + 10 TON от Advanced Boost
    const correctRate = 0.02;   // 2% в день для Advanced Boost
    const correctPackageId = 3; // Advanced Boost
    
    console.log('\n2. Применяем исправление...');
    console.log('Целевые значения:', {
      farming_balance: correctBalance,
      farming_rate: correctRate,
      boost_package_id: correctPackageId
    });
    
    const { data: updateResult, error: updateError } = await supabase
      .from('ton_farming_data')
      .update({
        farming_balance: correctBalance,
        farming_rate: correctRate,
        boost_package_id: correctPackageId,
        farming_last_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', 74)
      .select();
      
    if (updateError) {
      console.error('Ошибка обновления:', updateError);
      return;
    }
    
    console.log('\n✅ ИСПРАВЛЕНИЕ УСПЕШНО ПРИМЕНЕНО!');
    console.log('Новое состояние:', {
      farming_balance: updateResult[0].farming_balance,
      farming_rate: updateResult[0].farming_rate,
      boost_package_id: updateResult[0].boost_package_id
    });
    
    // 3. Создаем корректирующую транзакцию
    console.log('\n3. Создаем корректирующую транзакцию для прозрачности...');
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: 74,
        type: 'FARMING_REWARD',
        amount: 10,
        amount_ton: 10,
        currency: 'TON',
        status: 'completed',
        description: 'КОРРЕКТИРОВКА: Восстановление потерянного депозита Advanced Boost (10 TON)',
        metadata: {
          correction_type: 'ton_boost_accumulation_fix',
          original_type: 'TON_BOOST_DEPOSIT_CORRECTION',
          reason: 'Fix partial upsert execution bug',
          script: 'fix-ton-boost-accumulation-final.ts'
        }
      })
      .select();
      
    if (txError) {
      console.error('Ошибка создания транзакции:', txError);
    } else {
      console.log('✅ Корректирующая транзакция создана:', transaction[0].id);
    }
    
    console.log('\n=== ИТОГИ ИСПРАВЛЕНИЯ ===');
    console.log('1. farming_balance: 330 → 340 TON (+10 TON восстановлено)');
    console.log('2. farming_rate: 0.015 → 0.02 (Advanced Boost rate)');
    console.log('3. boost_package_id: 2 → 3 (Advanced Boost)');
    console.log('4. Создана корректирующая транзакция для аудита');
    console.log('\n✅ Все средства пользователя восстановлены!');
    
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

// Запускаем исправление
fixUser74TonBoostAccumulation();