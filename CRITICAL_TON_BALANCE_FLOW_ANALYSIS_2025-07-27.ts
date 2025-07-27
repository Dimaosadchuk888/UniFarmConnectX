/**
 * КРИТИЧЕСКИЙ АНАЛИЗ ПОТОКОВ TON БАЛАНСОВ
 * Полное исследование всех проблем с мапингами, депозитами и возвратами средств
 */

import { supabase } from './core/supabase';

async function analyzeTonBalanceFlows() {
  console.log('🔍 КРИТИЧЕСКИЙ АНАЛИЗ ПОТОКОВ TON БАЛАНСОВ');
  console.log('='.repeat(80));
  
  const issues = [];
  const warnings = [];
  const suspiciousPatterns = [];
  
  try {
    // 1. АНАЛИЗ СИСТЕМЫ МАПИНГОВ
    console.log('\n1️⃣ ПОЛНЫЙ АНАЛИЗ ТРАНЗАКЦИОННЫХ МАПИНГОВ:');
    console.log('-'.repeat(70));
    
    // Получаем все мапинги из кода
    const TRANSACTION_TYPE_MAPPING = {
      'FARMING_REWARD': 'FARMING_REWARD',
      'FARMING_DEPOSIT': 'FARMING_DEPOSIT',
      'REFERRAL_REWARD': 'REFERRAL_REWARD', 
      'MISSION_REWARD': 'MISSION_REWARD',
      'DAILY_BONUS': 'DAILY_BONUS',
      'WITHDRAWAL': 'WITHDRAWAL',
      'DEPOSIT': 'DEPOSIT',
      // ПРОБЛЕМНЫЕ МАПИНГИ:
      'TON_BOOST_INCOME': 'FARMING_REWARD',   // ✅ Логично - доходы
      'UNI_DEPOSIT': 'FARMING_REWARD',        // 🔴 ПРОБЛЕМА - депозиты как доходы
      'TON_DEPOSIT': 'DEPOSIT',              // ✅ Исправлено недавно  
      'UNI_WITHDRAWAL': 'WITHDRAWAL',         // ✅ Логично
      'TON_WITHDRAWAL': 'WITHDRAWAL',         // ✅ Логично
      'BOOST_PURCHASE': 'FARMING_REWARD',     // 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА
      'AIRDROP_REWARD': 'DAILY_BONUS',        // ✅ Логично
      'withdrawal': 'WITHDRAWAL',              // ✅ Совместимость
      'withdrawal_fee': 'WITHDRAWAL'           // ✅ Совместимость
    };
    
    console.log('📋 АНАЛИЗ ВСЕХ МАПИНГОВ:');
    Object.entries(TRANSACTION_TYPE_MAPPING).forEach(([source, target]) => {
      console.log(`   ${source.padEnd(20)} → ${target}`);
    });
    
    // 2. АНАЛИЗ shouldUpdateBalance ЛОГИКИ
    console.log('\n2️⃣ АНАЛИЗ shouldUpdateBalance ЛОГИКИ:');
    console.log('-'.repeat(70));
    
    const incomeTypes = [
      'FARMING_REWARD',
      'REFERRAL_REWARD', 
      'MISSION_REWARD',
      'DAILY_BONUS',
      'TON_BOOST_INCOME',
      'UNI_DEPOSIT',
      'TON_DEPOSIT',
      'AIRDROP_REWARD',
      'DEPOSIT'
    ];
    
    console.log('💰 ТИПЫ ОБНОВЛЯЮЩИЕ БАЛАНС (доходы):');
    incomeTypes.forEach(type => {
      console.log(`   ✅ ${type}`);
    });
    
    // КРИТИЧЕСКИЙ АНАЛИЗ ПРОБЛЕМНЫХ КОМБИНАЦИЙ
    console.log('\n🔍 ПРОБЛЕМНЫЕ КОМБИНАЦИИ:');
    
    const problematicMappings = [];
    Object.entries(TRANSACTION_TYPE_MAPPING).forEach(([source, target]) => {
      const sourceUpdatesBalance = incomeTypes.includes(source);
      const targetUpdatesBalance = incomeTypes.includes(target);
      
      // Проверяем на логические несоответствия
      if (source.includes('PURCHASE') && targetUpdatesBalance) {
        problematicMappings.push({
          source,
          target,
          problem: 'ПОКУПКА МАПИТСЯ В ДОХОД',
          severity: 'КРИТИЧЕСКАЯ'
        });
      }
      
      if (source.includes('DEPOSIT') && source !== 'TON_DEPOSIT' && targetUpdatesBalance) {
        problematicMappings.push({
          source,
          target,
          problem: 'ДЕПОЗИТ МАПИТСЯ В ДОХОД',
          severity: 'ВЫСОКАЯ'
        });
      }
      
      if (source.includes('WITHDRAWAL') && targetUpdatesBalance) {
        problematicMappings.push({
          source,
          target,
          problem: 'ВЫВОД МАПИТСЯ В ДОХОД',
          severity: 'КРИТИЧЕСКАЯ'
        });
      }
    });
    
    problematicMappings.forEach(mapping => {
      console.log(`   🔴 ${mapping.severity}: ${mapping.source} → ${mapping.target}`);
      console.log(`      Проблема: ${mapping.problem}`);
      issues.push(`${mapping.source}: ${mapping.problem}`);
    });
    
    // 3. АНАЛИЗ ПОСЛЕДНИХ ТРАНЗАКЦИЙ ЗА 24 ЧАСА
    console.log('\n3️⃣ АНАЛИЗ ПОСЛЕДНИХ ТРАНЗАКЦИЙ (24 часа):');
    console.log('-'.repeat(70));
    
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, amount_uni, description, metadata, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError);
      issues.push('База данных: недоступна для анализа транзакций');
    } else if (recentTransactions) {
      console.log(`📊 Найдено транзакций за 24 часа: ${recentTransactions.length}`);
      
      // Группируем по типам
      const typeStats = {};
      const userStats = {};
      const suspiciousTransactions = [];
      
      recentTransactions.forEach(tx => {
        // Статистика по типам
        if (!typeStats[tx.type]) {
          typeStats[tx.type] = { count: 0, users: new Set(), totalTon: 0, totalUni: 0 };
        }
        typeStats[tx.type].count++;
        typeStats[tx.type].users.add(tx.user_id);
        typeStats[tx.type].totalTon += parseFloat(tx.amount_ton || '0');
        typeStats[tx.type].totalUni += parseFloat(tx.amount_uni || '0');
        
        // Статистика по пользователям
        if (!userStats[tx.user_id]) {
          userStats[tx.user_id] = { transactions: 0, tonFlow: 0, uniFlow: 0, types: new Set() };
        }
        userStats[tx.user_id].transactions++;
        userStats[tx.user_id].tonFlow += parseFloat(tx.amount_ton || '0');
        userStats[tx.user_id].uniFlow += parseFloat(tx.amount_uni || '0');
        userStats[tx.user_id].types.add(tx.type);
        
        // Поиск подозрительных паттернов
        const tonAmount = parseFloat(tx.amount_ton || '0');
        const uniAmount = parseFloat(tx.amount_uni || '0');
        
        // 1. BOOST_PURCHASE с положительными суммами
        if (tx.type === 'BOOST_PURCHASE' && tonAmount > 0) {
          suspiciousTransactions.push({
            ...tx,
            suspicion: 'BOOST_PURCHASE с положительной TON суммой (возврат денег)',
            severity: 'КРИТИЧЕСКАЯ'
          });
        }
        
        // 2. Депозиты с отрицательными суммами
        if ((tx.type === 'DEPOSIT' || tx.type.includes('DEPOSIT')) && (tonAmount < 0 || uniAmount < 0)) {
          suspiciousTransactions.push({
            ...tx,
            suspicion: 'ДЕПОЗИТ с отрицательной суммой (списание после пополнения)',
            severity: 'КРИТИЧЕСКАЯ'
          });
        }
        
        // 3. Множественные одинаковые транзакции от одного пользователя
        const sameUserSameAmount = recentTransactions.filter(t => 
          t.user_id === tx.user_id && 
          t.amount_ton === tx.amount_ton && 
          t.type === tx.type &&
          Math.abs(new Date(t.created_at).getTime() - new Date(tx.created_at).getTime()) < 60000 // в пределах минуты
        );
        
        if (sameUserSameAmount.length > 1) {
          suspiciousTransactions.push({
            ...tx,
            suspicion: `Дублирование: ${sameUserSameAmount.length} одинаковых транзакций за минуту`,
            severity: 'ВЫСОКАЯ'
          });
        }
      });
      
      console.log('\n📋 СТАТИСТИКА ПО ТИПАМ:');
      Object.entries(typeStats).forEach(([type, stats]: [string, any]) => {
        console.log(`   ${type}:`);
        console.log(`      Транзакций: ${stats.count}, Пользователей: ${stats.users.size}`);
        console.log(`      TON: ${stats.totalTon.toFixed(6)}, UNI: ${stats.totalUni.toFixed(2)}`);
        
        // Анализируем аномалии
        if (type === 'BOOST_PURCHASE' && stats.totalTon > 0) {
          console.log(`      🔴 АНОМАЛИЯ: BOOST_PURCHASE имеет положительный TON баланс!`);
          issues.push(`${type}: положительный TON баланс ${stats.totalTon.toFixed(6)}`);
        }
        
        if (type.includes('DEPOSIT') && (stats.totalTon < 0 || stats.totalUni < 0)) {
          console.log(`      🔴 АНОМАЛИЯ: ДЕПОЗИТ имеет отрицательный баланс!`);
          issues.push(`${type}: отрицательные суммы при депозитах`);
        }
      });
      
      // 4. АНАЛИЗ ПОДОЗРИТЕЛЬНЫХ ПОЛЬЗОВАТЕЛЕЙ
      console.log('\n4️⃣ АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С АНОМАЛЬНОЙ АКТИВНОСТЬЮ:');
      console.log('-'.repeat(70));
      
      const suspiciousUsers = Object.entries(userStats)
        .filter(([userId, stats]: [string, any]) => {
          return stats.transactions > 10 || // более 10 транзакций за день
                 Math.abs(stats.tonFlow) > 5 || // большие движения TON
                 stats.types.size > 5; // много разных типов транзакций
        })
        .sort(([,a], [,b]) => (b as any).transactions - (a as any).transactions);
      
      if (suspiciousUsers.length > 0) {
        console.log('👤 ПОЛЬЗОВАТЕЛИ С ВЫСОКОЙ АКТИВНОСТЬЮ:');
        suspiciousUsers.slice(0, 10).forEach(([userId, stats]: [string, any]) => {
          console.log(`   User ${userId}:`);
          console.log(`      Транзакций: ${stats.transactions}`);
          console.log(`      TON поток: ${stats.tonFlow > 0 ? '+' : ''}${stats.tonFlow.toFixed(6)}`);
          console.log(`      UNI поток: ${stats.uniFlow > 0 ? '+' : ''}${stats.uniFlow.toFixed(2)}`);
          console.log(`      Типы: ${Array.from(stats.types).join(', ')}`);
          
          if (stats.tonFlow > 2) {
            warnings.push(`User ${userId}: подозрительно высокий положительный TON поток`);
          }
        });
      }
      
      // 5. ПОДОЗРИТЕЛЬНЫЕ ТРАНЗАКЦИИ
      if (suspiciousTransactions.length > 0) {
        console.log('\n5️⃣ ПОДОЗРИТЕЛЬНЫЕ ТРАНЗАКЦИИ:');
        console.log('-'.repeat(70));
        
        const uniqueSuspicious = suspiciousTransactions.filter((tx, index, self) => 
          index === self.findIndex(t => t.id === tx.id)
        );
        
        uniqueSuspicious.slice(0, 20).forEach(tx => {
          console.log(`🚨 ${tx.severity}: Transaction ${tx.id}`);
          console.log(`   User: ${tx.user_id}, Type: ${tx.type}`);
          console.log(`   Amount: ${tx.amount_ton || 0} TON, ${tx.amount_uni || 0} UNI`);
          console.log(`   Проблема: ${tx.suspicion}`);
          console.log(`   Время: ${tx.created_at}`);
          
          suspiciousPatterns.push(`TX${tx.id}: ${tx.suspicion}`);
        });
      }
    }
    
    // 6. АНАЛИЗ КОНКРЕТНЫХ ПРОБЛЕМНЫХ СЦЕНАРИЕВ
    console.log('\n6️⃣ АНАЛИЗ ПРОБЛЕМНЫХ СЦЕНАРИЕВ:');
    console.log('-'.repeat(70));
    
    console.log('🎯 СЦЕНАРИЙ 1: TON Boost покупка');
    console.log('   Ожидаемый поток: User покупает → списание с баланса → активация boost');
    console.log('   Текущий маппинг: BOOST_PURCHASE → FARMING_REWARD → зачисление на баланс');
    console.log('   🔴 РЕЗУЛЬТАТ: "Возврат денег" - пользователь видит зачисление вместо списания');
    
    console.log('\n🎯 СЦЕНАРИЙ 2: TON депозит');
    console.log('   Ожидаемый поток: User депозит → зачисление на баланс');
    console.log('   Текущий маппинг: TON_DEPOSIT → DEPOSIT → зачисление на баланс');
    console.log('   ✅ РЕЗУЛЬТАТ: Работает корректно (исправлено)');
    
    console.log('\n🎯 СЦЕНАРИЙ 3: UNI депозит');
    console.log('   Ожидаемый поток: User депозит → зачисление на баланс');
    console.log('   Текущий маппинг: UNI_DEPOSIT → FARMING_REWARD → зачисление на баланс');
    console.log('   ⚠️ РЕЗУЛЬТАТ: Работает, но логически неправильно');
    
    // 7. ИССЛЕДОВАНИЕ ДВОЙНЫХ ОБНОВЛЕНИЙ БАЛАНСА
    console.log('\n7️⃣ ИССЛЕДОВАНИЕ ДВОЙНЫХ ОБНОВЛЕНИЙ:');
    console.log('-'.repeat(70));
    
    console.log('🔍 ИСТОЧНИКИ ОБНОВЛЕНИЯ БАЛАНСА:');
    console.log('   1. TransactionService.shouldUpdateBalance() → updateUserBalance()');
    console.log('   2. BalanceManager.updateUserBalance() (прямые вызовы)');
    console.log('   3. WalletService.processWithdrawal() → BalanceManager');
    console.log('   4. Планировщики доходов → BalanceManager');
    
    console.log('\n💥 ПОТЕНЦИАЛЬНЫЕ КОНФЛИКТЫ:');
    console.log('   🔴 TonBoost покупка может вызвать:');
    console.log('      - WalletService.processWithdrawal() списывает TON');
    console.log('      - TransactionService создает BOOST_PURCHASE → FARMING_REWARD');
    console.log('      - shouldUpdateBalance(BOOST_PURCHASE) = false, НО');
    console.log('      - shouldUpdateBalance проверяется по dbType (FARMING_REWARD) = true');
    console.log('      - updateUserBalance зачисляет TON обратно');
    console.log('   🎯 ИТОГ: Списание + зачисление = "возврат денег"');
    
    // 8. ФИНАЛЬНАЯ ДИАГНОСТИКА
    console.log('\n8️⃣ ФИНАЛЬНАЯ ДИАГНОСТИКА:');
    console.log('-'.repeat(70));
    
    console.log(`🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ: ${issues.length}`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log(`\n⚠️ ПРЕДУПРЕЖДЕНИЯ: ${warnings.length}`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
    
    console.log(`\n🚨 ПОДОЗРИТЕЛЬНЫЕ ПАТТЕРНЫ: ${suspiciousPatterns.length}`);
    suspiciousPatterns.slice(0, 10).forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern}`);
    });
    
    // ОБЩАЯ ОЦЕНКА КРИТИЧНОСТИ
    const criticalityScore = Math.max(0, 100 - (issues.length * 25) - (warnings.length * 10) - (suspiciousPatterns.length * 5));
    console.log(`\n📊 КРИТИЧНОСТЬ СИСТЕМЫ: ${criticalityScore}/100`);
    
    if (criticalityScore <= 30) {
      console.log('🔴 СИСТЕМА В КРИТИЧЕСКОМ СОСТОЯНИИ - ТРЕБУЕТ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ');
    } else if (criticalityScore <= 60) {
      console.log('⚠️ СИСТЕМА ИМЕЕТ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ');
    } else {
      console.log('💛 СИСТЕМА ТРЕБУЕТ ВНИМАНИЯ');
    }
    
    // 9. ДЕТАЛЬНЫЕ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ
    console.log('\n9️⃣ ДЕТАЛЬНЫЕ РЕКОМЕНДАЦИИ:');
    console.log('-'.repeat(70));
    
    console.log('🎯 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (ПРИОРИТЕТ 1):');
    console.log('   1. Изменить BOOST_PURCHASE mapping:');
    console.log('      БЫЛО: "BOOST_PURCHASE": "FARMING_REWARD"');
    console.log('      СТАТЬ: "BOOST_PURCHASE": "BOOST_PAYMENT" (новый тип, не обновляющий баланс)');
    
    console.log('\n   2. Исправить UNI_DEPOSIT mapping:');
    console.log('      БЫЛО: "UNI_DEPOSIT": "FARMING_REWARD"');
    console.log('      СТАТЬ: "UNI_DEPOSIT": "DEPOSIT"');
    
    console.log('\n🔧 СИСТЕМНЫЕ УЛУЧШЕНИЯ (ПРИОРИТЕТ 2):');
    console.log('   3. Добавить защиту от двойного обновления баланса');
    console.log('   4. Настроить WebSocket интеграцию для мгновенных обновлений');
    console.log('   5. Добавить мониторинг подозрительных транзакций');
    
    console.log('\n📊 МОНИТОРИНГ (ПРИОРИТЕТ 3):');
    console.log('   6. Создать алерты на положительные BOOST_PURCHASE');
    console.log('   7. Мониторить пользователей с высокой транзакционной активностью');
    console.log('   8. Логировать все изменения баланса с источником операции');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА анализа:', error);
  }
}

// Запуск анализа
analyzeTonBalanceFlows()
  .then(() => {
    console.log('\n✅ Критический анализ завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка выполнения анализа:', error);
    process.exit(1);
  });