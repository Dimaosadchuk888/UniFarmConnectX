/**
 * 🔍 ПОСТ-ИСПРАВЛЕНИЕ ДИАГНОСТИКА ДУБЛИРОВАНИЯ TON BOOST
 * Проверка что исправления применились корректно и дублирование устранено
 * ТОЛЬКО ДИАГНОСТИКА - БЕЗ ИЗМЕНЕНИЯ КОДА
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE credentials не найдены в environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyDuplicationFix() {
  console.log('\n🔍 ПОСТ-ИСПРАВЛЕНИЕ ДИАГНОСТИКА ДУБЛИРОВАНИЯ TON BOOST');
  console.log('📅 Проверка после внедрения исправлений');
  console.log('🎯 Цель: Подтвердить устранение дублирования');
  console.log('=' + '='.repeat(70));

  try {
    // 1. ПРОВЕРКА КОДА - ПОДСЧЕТ ВЫЗОВОВ
    console.log('\n📋 1. АНАЛИЗ ИСПРАВЛЕННОГО КОДА:');
    console.log('-'.repeat(50));
    

    const serviceCode = fs.readFileSync('./modules/boost/service.ts', 'utf8');
    
    // Подсчет вызовов awardUniBonus
    const awardUniBonusMatches = serviceCode.match(/await this\.awardUniBonus\(/g) || [];
    const awardUniBonusDefMatches = serviceCode.match(/private async awardUniBonus\(/g) || [];
    
    console.log(`📊 ВЫЗОВЫ awardUniBonus:`);
    console.log(`  • Определений метода: ${awardUniBonusDefMatches.length}`);
    console.log(`  • Активных вызовов: ${awardUniBonusMatches.length}`);
    console.log(`  • Ожидаемо вызовов: 2 (internal wallet + external TON)`);
    
    if (awardUniBonusMatches.length === 2) {
      console.log(`  ✅ КОРРЕКТНО: Найдено ${awardUniBonusMatches.length} вызова (дублирование устранено)`);
    } else {
      console.log(`  ❌ ПРОБЛЕМА: Найдено ${awardUniBonusMatches.length} вызовов (ожидалось 2)`);
    }
    
    // Подсчет вызовов tonFarmingRepo.activateBoost
    const activateBoostMatches = serviceCode.match(/await tonFarmingRepo\.activateBoost\(/g) || [];
    
    console.log(`\n📊 ВЫЗОВЫ tonFarmingRepo.activateBoost:`);
    console.log(`  • Активных вызовов: ${activateBoostMatches.length}`);
    console.log(`  • Ожидаемо вызовов: 2 (internal wallet + private method)`);
    
    if (activateBoostMatches.length === 2) {
      console.log(`  ✅ КОРРЕКТНО: Найдено ${activateBoostMatches.length} вызова (дублирование устранено)`);
    } else {
      console.log(`  ❌ ПРОБЛЕМА: Найдено ${activateBoostMatches.length} вызовов (ожидалось 2)`);
    }
    
    // Проверка комментариев об исправлениях
    const fixComments = serviceCode.match(/ИСПРАВЛЕНО.*удален.*дублированный/gi) || [];
    console.log(`\n📝 КОММЕНТАРИИ ОБ ИСПРАВЛЕНИЯХ: ${fixComments.length} найдено`);
    fixComments.forEach((comment, i) => {
      console.log(`  ${i+1}. ${comment.slice(0, 80)}...`);
    });

    // 2. ПРОВЕРКА ПОСЛЕДНИХ ТРАНЗАКЦИЙ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n📊 2. АНАЛИЗ ПОСЛЕДНИХ TON BOOST ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(50));
    
    // Ищем последние DAILY_BONUS транзакции
    const { data: recentDailyBonus, error: bonusError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'DAILY_BONUS')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Последний час
      .order('created_at', { ascending: false })
      .limit(10);

    if (bonusError) {
      console.log('⚠️ Ошибка получения DAILY_BONUS транзакций:', bonusError.message);
    } else {
      console.log(`🔍 DAILY_BONUS транзакций за последний час: ${recentDailyBonus.length}`);
      
      // Группировка по пользователям и времени для поиска дубликатов
      const userGroups = {};
      recentDailyBonus.forEach(tx => {
        const key = `${tx.user_id}_${tx.amount}_${tx.currency}`;
        if (!userGroups[key]) {
          userGroups[key] = [];
        }
        userGroups[key].push(tx);
      });
      
      console.log('\n🔍 АНАЛИЗ ДУБЛИКАТОВ DAILY_BONUS:');
      let duplicatesFound = 0;
      Object.keys(userGroups).forEach(key => {
        const group = userGroups[key];
        if (group.length > 1) {
          // Проверяем временной интервал между транзакциями
          const times = group.map(tx => new Date(tx.created_at));
          const maxTimeDiff = Math.max(...times) - Math.min(...times);
          const timeDiffSeconds = maxTimeDiff / 1000;
          
          if (timeDiffSeconds < 300) { // Меньше 5 минут - подозрительно
            duplicatesFound++;
            console.log(`  ❌ ПОДОЗРИТЕЛЬНЫЙ ДУБЛИКАТ - User ${group[0].user_id}: ${group.length} транзакций за ${timeDiffSeconds}s`);
            group.forEach((tx, i) => {
              console.log(`    [${i+1}] ID:${tx.id} | ${tx.created_at.slice(11, 19)} | ${tx.amount} ${tx.currency}`);
            });
          } else {
            console.log(`  ✅ НОРМАЛЬНЫЙ ИНТЕРВАЛ - User ${group[0].user_id}: ${group.length} транзакций за ${Math.round(timeDiffSeconds/60)} минут`);
          }
        }
      });
      
      if (duplicatesFound === 0) {
        console.log('  ✅ ДУБЛИКАТОВ НЕ ОБНАРУЖЕНО в последних транзакциях');
      } else {
        console.log(`  ⚠️ НАЙДЕНО ${duplicatesFound} подозрительных дубликатов`);
      }
    }

    // 3. ПРОВЕРКА TON FARMING DATA НА АНОМАЛЬНЫЕ ДЕПОЗИТЫ
    console.log('\n📊 3. АНАЛИЗ TON_FARMING_DATA НА АНОМАЛЬНЫЕ ДЕПОЗИТЫ:');
    console.log('-'.repeat(50));
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('user_id, farming_balance, boost_package_id, updated_at')
      .not('boost_package_id', 'is', null)
      .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Последний час
      .order('updated_at', { ascending: false });

    if (farmingError) {
      console.log('⚠️ ton_farming_data недоступна:', farmingError.message);
    } else {
      console.log(`🔍 Активных TON Farming записей за последний час: ${farmingData.length}`);
      
      // Получаем минимальные суммы пакетов для сравнения
      const { data: packages, error: packagesError } = await supabase
        .from('boost_packages')
        .select('id, name, min_amount');
        
      const packageMap = {};
      if (!packagesError && packages) {
        packages.forEach(pkg => {
          packageMap[pkg.id] = pkg;
        });
      }
      
      let anomalousDeposits = 0;
      farmingData.forEach(record => {
        const balance = parseFloat(record.farming_balance) || 0;
        const packageId = record.boost_package_id;
        const expectedAmount = parseFloat(packageMap[packageId]?.min_amount || 0);
        
        console.log(`  User ${record.user_id}: ${balance} TON (пакет ${packageId}, ожидаемо: ${expectedAmount} TON)`);
        
        // Проверяем на подозрительное превышение (например, больше чем в 1.5 раза)
        if (balance > expectedAmount * 1.5) {
          anomalousDeposits++;
          console.log(`    ⚠️ ПОДОЗРИТЕЛЬНО: депозит ${balance} TON превышает ожидаемый ${expectedAmount} TON в ${(balance/expectedAmount).toFixed(1)} раз`);
        }
      });
      
      if (anomalousDeposits === 0) {
        console.log('  ✅ АНОМАЛЬНЫХ ДЕПОЗИТОВ НЕ ОБНАРУЖЕНО');
      } else {
        console.log(`  ⚠️ НАЙДЕНО ${anomalousDeposits} аномальных депозитов`);
      }
    }

    // 4. ПРОВЕРКА BOOST_PURCHASES
    console.log('\n📊 4. АНАЛИЗ BOOST_PURCHASES ЗА ПОСЛЕДНИЙ ЧАС:');
    console.log('-'.repeat(50));
    
    const { data: recentPurchases, error: purchaseError } = await supabase
      .from('boost_purchases')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (purchaseError) {
      console.log('⚠️ boost_purchases недоступна:', purchaseError.message);
    } else {
      console.log(`🔍 Покупок за последний час: ${recentPurchases.length}`);
      
      recentPurchases.forEach((purchase, i) => {
        console.log(`[${i+1}] User ${purchase.user_id} | Package ${purchase.boost_package_id} | ${purchase.payment_method.toUpperCase()} | ${purchase.status}`);
        console.log(`     Amount: ${purchase.amount} ${purchase.currency} | ${purchase.created_at.slice(11, 19)}`);
      });
      
      if (recentPurchases.length === 0) {
        console.log('  ℹ️ Новых покупок за последний час не было - невозможно проверить исправление в реальном времени');
      }
    }

    // 5. ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n📋 5. ФИНАЛЬНАЯ ОЦЕНКА ИСПРАВЛЕНИЯ:');
    console.log('-'.repeat(50));
    
    const codeFixed = (awardUniBonusMatches.length === 2 && activateBoostMatches.length === 2);
    const noRecentDuplicates = (duplicatesFound === 0);
    const noAnomalousDeposits = (anomalousDeposits === 0);
    
    console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:');
    console.log(`  • Код исправлен корректно: ${codeFixed ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`  • Нет новых дубликатов DAILY_BONUS: ${noRecentDuplicates ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`  • Нет аномальных депозитов: ${noAnomalousDeposits ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (codeFixed && noRecentDuplicates && noAnomalousDeposits) {
      console.log('\n🎯 ОБЩИЙ СТАТУС: ✅ ИСПРАВЛЕНИЕ УСПЕШНО ПРИМЕНЕНО');
      console.log('💡 Дублирование TON Boost пакетов устранено');
      console.log('🚀 Система готова для production использования');
    } else {
      console.log('\n🎯 ОБЩИЙ СТАТУС: ⚠️ ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА');
      if (!codeFixed) console.log('   • Проверить корректность изменений в коде');
      if (!noRecentDuplicates) console.log('   • Исследовать новые дубликаты транзакций');
      if (!noAnomalousDeposits) console.log('   • Проверить аномальные депозиты в farming data');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ПОСТ-ИСПРАВЛЕНИЕ ДИАГНОСТИКА ЗАВЕРШЕНА');
    console.log('📄 Отчет готов для анализа');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ДИАГНОСТИКИ:', error.message);
  }
}

// Запуск диагностики
verifyDuplicationFix();