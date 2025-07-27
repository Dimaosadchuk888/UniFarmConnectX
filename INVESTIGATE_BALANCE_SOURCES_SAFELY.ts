#!/usr/bin/env tsx

/**
 * 🔍 БЕЗОПАСНОЕ ИССЛЕДОВАНИЕ ИСТОЧНИКОВ БАЛАНСОВ
 * 
 * Цель: найти откуда берутся огромные балансы БЕЗ изменения кода
 * Только READ операции, никаких изменений в БД
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function investigateBalanceSources() {
  console.log('🔍 БЕЗОПАСНОЕ ИССЛЕДОВАНИЕ ИСТОЧНИКОВ БАЛАНСОВ');
  console.log('=' .repeat(80));
  
  const report: string[] = [];
  report.push('🔍 ИССЛЕДОВАНИЕ ИСТОЧНИКОВ БАЛАНСНЫХ РАСХОЖДЕНИЙ');
  report.push('='.repeat(60));
  report.push('РЕЖИМ: ТОЛЬКО ЧТЕНИЕ, НИКАКИХ ИЗМЕНЕНИЙ');
  report.push('');
  
  try {
    // 1. ПРОВЕРЯЕМ ВСЕ ТАБЛИЦЫ С БАЛАНСНЫМИ ДАННЫМИ
    console.log('1️⃣ Поиск всех таблиц с балансными данными...');
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names');
    
    if (tablesError) {
      // Альтернативный способ - проверяем известные таблицы
      const possibleTables = [
        'users', 'user_balances', 'wallet_balances', 'farming_balances',
        'ton_farming_data', 'boost_purchases', 'referral_earnings'
      ];
      
      report.push('1️⃣ ПРОВЕРКА ИЗВЕСТНЫХ ТАБЛИЦ С БАЛАНСАМИ:');
      
      for (const tableName of possibleTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', '25')
            .limit(1);
            
          if (!error && data) {
            report.push(`   ✅ ${tableName}: существует, найдены данные для User 25`);
            
            // Проверяем структуру таблицы
            const columns = Object.keys(data[0] || {});
            const balanceColumns = columns.filter(col => 
              col.includes('balance') || col.includes('amount') || col.includes('earning')
            );
            
            if (balanceColumns.length > 0) {
              report.push(`      Балансные поля: ${balanceColumns.join(', ')}`);
            }
          } else if (error?.code === '42P01') {
            report.push(`   ❌ ${tableName}: таблица не существует`);
          } else {
            report.push(`   ⚠️  ${tableName}: нет данных для User 25`);
          }
        } catch (e) {
          report.push(`   ❌ ${tableName}: ошибка доступа`);
        }
      }
    }
    report.push('');

    // 2. ДЕТАЛЬНЫЙ АНАЛИЗ ТАБЛИЦЫ USERS
    console.log('2️⃣ Детальный анализ таблицы users...');
    
    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();

    if (userError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ ДАННЫХ USERS: ${userError.message}`);
    } else {
      report.push('2️⃣ ПОЛНЫЕ ДАННЫЕ USER 25 ИЗ ТАБЛИЦЫ USERS:');
      Object.entries(userDetails).forEach(([key, value]) => {
        if (key.includes('balance') || key.includes('amount') || key.includes('earning')) {
          report.push(`   💰 ${key}: ${value}`);
        } else {
          report.push(`   📝 ${key}: ${value}`);
        }
      });
      report.push('');
    }

    // 3. ПРОВЕРКА TON_FARMING_DATA
    console.log('3️⃣ Проверка ton_farming_data...');
    
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '25');

    if (farmingError) {
      report.push(`❌ ОШИБКА ton_farming_data: ${farmingError.message}`);
    } else {
      report.push('3️⃣ ДАННЫЕ TON_FARMING_DATA ДЛЯ USER 25:');
      if (farmingData && farmingData.length > 0) {
        farmingData.forEach((record: any, index: number) => {
          report.push(`   [${index + 1}] Farming Balance: ${record.farming_balance}`);
          report.push(`       Farming Rate: ${record.farming_rate}`);
          report.push(`       Created: ${record.created_at}`);
          report.push(`       Updated: ${record.updated_at}`);
        });
      } else {
        report.push('   ❌ ДАННЫЕ НЕ НАЙДЕНЫ');
      }
      report.push('');
    }

    // 4. АНАЛИЗ ТОП-10 ПОЛЬЗОВАТЕЛЕЙ ПО БАЛАНСАМ
    console.log('4️⃣ Анализ топ пользователей по балансам...');
    
    const { data: topUsers, error: topError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton')
      .order('balance_uni', { ascending: false })
      .limit(10);

    if (topError) {
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ ТОП ПОЛЬЗОВАТЕЛЕЙ: ${topError.message}`);
    } else {
      report.push('4️⃣ ТОП-10 ПОЛЬЗОВАТЕЛЕЙ ПО UNI БАЛАНСУ:');
      topUsers?.forEach((user: any, index: number) => {
        report.push(`   [${index + 1}] User ${user.id}: ${user.balance_uni} UNI, ${user.balance_ton} TON`);
        if (user.balance_uni > 1000000) {
          report.push(`       ⚠️  ПОДОЗРИТЕЛЬНО БОЛЬШОЙ БАЛАНС!`);
        }
      });
      report.push('');
    }

    // 5. ПОИСК КРУПНЫХ ТРАНЗАКЦИЙ
    console.log('5️⃣ Поиск крупных транзакций...');
    
    const { data: largeTx, error: largeError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', '25')
      .gt('amount', 1000)
      .order('amount', { ascending: false })
      .limit(20);

    if (largeError) {
      report.push(`❌ ОШИБКА ПОИСКА КРУПНЫХ ТРАНЗАКЦИЙ: ${largeError.message}`);
    } else {
      report.push('5️⃣ КРУПНЫЕ ТРАНЗАКЦИИ USER 25 (>1000):');
      if (largeTx && largeTx.length > 0) {
        largeTx.forEach((tx: any, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | ${tx.type} | ${tx.amount} ${tx.currency}`);
          report.push(`       Description: ${tx.description.slice(0, 80)}...`);
          if (tx.amount > 100000) {
            report.push(`       🚨 КРУПНАЯ ТРАНЗАКЦИЯ! Может объяснить расхождения`);
          }
        });
      } else {
        report.push('   ❌ КРУПНЫЕ ТРАНЗАКЦИИ НЕ НАЙДЕНЫ');
        report.push('   ⚠️  ЭТО ПОДТВЕРЖДАЕТ ЧТО БАЛАНС ОБНОВЛЯЛСЯ НЕ ЧЕРЕЗ ТРАНЗАКЦИИ!');
      }
      report.push('');
    }

    // 6. ПРОВЕРКА МАССОВЫХ ОБНОВЛЕНИЙ
    console.log('6️⃣ Поиск признаков массовых обновлений...');
    
    const { data: massUpdates, error: massError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton')
      .gt('balance_uni', 1000000)
      .order('balance_uni', { ascending: false });

    if (massError) {
      report.push(`❌ ОШИБКА ПОИСКА МАССОВЫХ ОБНОВЛЕНИЙ: ${massError.message}`);
    } else {
      report.push('6️⃣ ПОЛЬЗОВАТЕЛИ С ПОДОЗРИТЕЛЬНО БОЛЬШИМИ БАЛАНСАМИ:');
      if (massUpdates && massUpdates.length > 0) {
        report.push(`   📊 Всего пользователей с балансом >1M UNI: ${massUpdates.length}`);
        massUpdates.slice(0, 5).forEach((user: any, index: number) => {
          report.push(`   [${index + 1}] User ${user.id}: ${user.balance_uni} UNI`);
        });
        
        if (massUpdates.length > 1) {
          report.push(`   🚨 МНОЖЕСТВЕННЫЕ ПОЛЬЗОВАТЕЛИ С ОГРОМНЫМИ БАЛАНСАМИ!`);
          report.push(`   💡 ВЕРОЯТНО БЫЛА МАССОВАЯ ОПЕРАЦИЯ/МИГРАЦИЯ`);
        }
      } else {
        report.push('   ✅ Только User 25 имеет аномальный баланс');
      }
      report.push('');
    }

    // ВЫВОДЫ И РЕКОМЕНДАЦИИ
    report.push('🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ:');
    report.push('=' .repeat(40));
    
    const hasMultipleAnomalies = massUpdates && massUpdates.length > 1;
    const hasLargeTransactions = largeTx && largeTx.length > 0;
    
    if (hasMultipleAnomalies) {
      report.push('❌ СИСТЕМНАЯ ПРОБЛЕМА: Множественные пользователи с аномальными балансами');
      report.push('   ПРИЧИНА: Вероятно была миграция/массовое обновление балансов');
      report.push('   РЕШЕНИЕ: Нужен массовый пересчет балансов для всех затронутых пользователей');
    } else {
      report.push('⚠️  ЛОКАЛЬНАЯ ПРОБЛЕМА: Только User 25 имеет аномальный баланс');
      report.push('   ПРИЧИНА: Индивидуальная ошибка или тестовые данные');
      report.push('   РЕШЕНИЕ: Можно исправить индивидуально');
    }
    
    if (!hasLargeTransactions) {
      report.push('❌ ПОДТВЕРЖДЕНИЕ: Баланс обновлялся НЕ через систему транзакций');
      report.push('   ИСТОЧНИК: Прямые UPDATE запросы в таблицу users');
      report.push('   ОПАСНОСТЬ: Система транзакций и балансы рассинхронизированы');
    }
    
    report.push('');
    report.push('📋 СЛЕДУЮЩИЕ ШАГИ:');
    report.push('1. Создать backup таблицы users');
    report.push('2. Протестировать пересчет на User 25');
    report.push('3. Если тест успешен - применить ко всем аномальным пользователям');
    report.push('4. Внедрить мониторинг расхождений');
    report.push('5. Заблокировать прямые обновления балансов в будущем');

    // Сохраняем отчет
    const reportContent = report.join('\n');
    const filename = `BALANCE_SOURCES_INVESTIGATION_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.md`;
    
    fs.writeFileSync(filename, reportContent, 'utf8');
    console.log(`📄 Отчет сохранен: ${filename}`);
    
    console.log('\n' + reportContent);
    
    return {
      success: true,
      reportFile: filename,
      hasMultipleAnomalies,
      hasLargeTransactions,
      needsMassRecalculation: hasMultipleAnomalies
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ИССЛЕДОВАНИЯ:', error);
    throw error;
  }
}

// Запуск исследования
async function main() {
  try {
    const result = await investigateBalanceSources();
    console.log('\n✅ ИССЛЕДОВАНИЕ ЗАВЕРШЕНО');
    console.log('Результат:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ИССЛЕДОВАНИЕ ПРОВАЛЕНО:', error);
    process.exit(1);
  }
}

main();

export { investigateBalanceSources };