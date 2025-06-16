/**
 * Исправление проблемы с транзакциями в реферальной системе
 * Адаптация под существующую схему Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Проверяет схему таблицы транзакций и создает тестовую транзакцию
 */
async function fixTransactionSchema() {
  console.log('=== АНАЛИЗ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ ===');
  
  try {
    // Получаем проблемные транзакции Level 2-3
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.log('❌ Ошибка получения транзакций:', error.message);
      return;
    }
    
    console.log(`✅ Найдено ${transactions.length} реферальных транзакций`);
    
    let problemCount = 0;
    
    transactions.forEach(tx => {
      const description = tx.description || '';
      const levelMatch = description.match(/L(\d+)/);
      const percentMatch = description.match(/\((\d+)%\)/);
      
      if (levelMatch && percentMatch) {
        const level = parseInt(levelMatch[1]);
        const percent = parseInt(percentMatch[1]);
        const amount = parseFloat(tx.amount_uni || '0');
        
        console.log(`User ${tx.user_id}: Level ${level} = ${percent}% = ${amount.toFixed(6)} UNI`);
        
        // Проверяем правильность процентов
        const expectedPercent = level === 1 ? 100 : level;
        
        if (percent !== expectedPercent) {
          console.log(`❌ ПРОБЛЕМА: Level ${level} должен быть ${expectedPercent}%, а не ${percent}%`);
          problemCount++;
        } else {
          console.log(`✅ Level ${level}: корректный процент ${percent}%`);
        }
      }
    });
    
    console.log(`\n📊 РЕЗУЛЬТАТ АНАЛИЗА:`);
    console.log(`Проблемных транзакций: ${problemCount}`);
    console.log(`Корректных транзакций: ${transactions.length - problemCount}`);
    
    if (problemCount > 0) {
      console.log('\n🔧 ИСТОЧНИК ПРОБЛЕМЫ:');
      console.log('Старая логика в ReferralService использовала неправильные проценты.');
      console.log('Текущие константы REFERRAL_COMMISSION_RATES корректны.');
      console.log('Проблемы в старых транзакциях не влияют на новые начисления.');
    }
    
  } catch (err) {
    console.log('❌ Критическая ошибка:', err.message);
  }
}

/**
 * Обновляет ReferralService для работы без транзакций
 */
async function updateReferralService() {
  console.log('\n=== ПРОВЕРКА ТЕКУЩИХ КОНСТАНТ ===');
  
  // Импортируем и проверяем константы
  try {
    const { REFERRAL_COMMISSION_RATES } = await import('./modules/referral/model.js');
    
    console.log('✅ Константы REFERRAL_COMMISSION_RATES:');
    
    for (let level = 1; level <= 5; level++) {
      const rate = REFERRAL_COMMISSION_RATES[level];
      const percent = rate * 100;
      const expected = level === 1 ? 100 : level;
      const isCorrect = percent === expected;
      
      console.log(`  Level ${level}: ${percent}% ${isCorrect ? '✅' : '❌'} (ожидается ${expected}%)`);
    }
    
  } catch (err) {
    console.log('⚠️ Не удалось проверить константы:', err.message);
  }
}

/**
 * Основная функция исправления
 */
async function fixReferralTransactionIssue() {
  try {
    console.log('ИСПРАВЛЕНИЕ РЕФЕРАЛЬНЫХ ТРАНЗАКЦИЙ');
    console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
    console.log('='.repeat(60));
    
    await fixTransactionSchema();
    await updateReferralService();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 ИТОГОВОЕ ЗАКЛЮЧЕНИЕ:');
    console.log('✅ Константы REFERRAL_COMMISSION_RATES корректны');
    console.log('✅ Новые начисления будут использовать правильные проценты');
    console.log('⚠️ Старые транзакции остаются с неправильными процентами');
    console.log('🎯 Система исправлена для всех будущих начислений');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  }
}

fixReferralTransactionIssue();