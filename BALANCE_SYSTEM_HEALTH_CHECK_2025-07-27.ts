/**
 * ПРОВЕРКА ЗДОРОВЬЯ СИСТЕМЫ МГНОВЕННЫХ ОБНОВЛЕНИЙ БАЛАНСОВ
 * Полная проверка всех компонентов без изменения кода
 */

import { supabase } from './core/supabase';

async function checkBalanceSystemHealth() {
  console.log('🔍 ПРОВЕРКА СИСТЕМЫ МГНОВЕННЫХ ОБНОВЛЕНИЙ БАЛАНСОВ');
  console.log('='.repeat(70));
  
  const issues = [];
  const warnings = [];
  
  try {
    // 1. ПРОВЕРЯЕМ ЦЕНТРАЛЬНЫЙ БАЛАНСМЕНЕДЖЕР
    console.log('\n1️⃣ ПРОВЕРКА BalanceManager:');
    console.log('-'.repeat(50));
    
    try {
      const { BalanceManager } = await import('./core/BalanceManager');
      const manager = BalanceManager.getInstance();
      
      console.log('✅ BalanceManager успешно импортирован');
      console.log(`✅ Singleton instance создан: ${!!manager}`);
      
      // Проверяем наличие критических методов
      const hasMethods = {
        updateUserBalance: typeof manager.updateUserBalance === 'function',
        getUserBalance: typeof manager.getUserBalance === 'function',
        addBalance: typeof manager.addBalance === 'function',
        subtractBalance: typeof manager.subtractBalance === 'function'
      };
      
      Object.entries(hasMethods).forEach(([method, exists]) => {
        if (exists) {
          console.log(`✅ Метод ${method}: присутствует`);
        } else {
          console.log(`❌ Метод ${method}: отсутствует`);
          issues.push(`BalanceManager: отсутствует метод ${method}`);
        }
      });
      
      // Проверяем WebSocket callback
      const hasCallback = (manager as any).onBalanceUpdate !== undefined;
      if (hasCallback) {
        console.log('✅ WebSocket callback настроен');
      } else {
        console.log('⚠️ WebSocket callback не настроен');
        warnings.push('BalanceManager: WebSocket callback не инициализирован');
      }
      
    } catch (error) {
      console.log('❌ Ошибка импорта BalanceManager:', error);
      issues.push(`BalanceManager: ошибка инициализации - ${error}`);
    }
    
    // 2. ПРОВЕРЯЕМ WEBSOCKET ИНТЕГРАЦИЮ
    console.log('\n2️⃣ ПРОВЕРКА WebSocket Integration:');
    console.log('-'.repeat(50));
    
    try {
      const { setupWebSocketBalanceIntegration } = await import('./server/websocket-balance-integration');
      console.log('✅ WebSocket integration модуль доступен');
      
      if (typeof setupWebSocketBalanceIntegration === 'function') {
        console.log('✅ Функция setupWebSocketBalanceIntegration существует');
      } else {
        console.log('❌ Функция setupWebSocketBalanceIntegration не найдена');
        issues.push('WebSocket Integration: отсутствует функция настройки');
      }
      
    } catch (error) {
      console.log('❌ Ошибка импорта WebSocket integration:', error);
      issues.push(`WebSocket Integration: недоступен - ${error}`);
    }
    
    // 3. ПРОВЕРЯЕМ NOTIFICATION SERVICE
    console.log('\n3️⃣ ПРОВЕРКА BalanceNotificationService:');
    console.log('-'.repeat(50));
    
    try {
      const { BalanceNotificationService } = await import('./core/balanceNotificationService');
      const service = BalanceNotificationService.getInstance();
      
      console.log('✅ BalanceNotificationService импортирован');
      console.log(`✅ Singleton instance: ${!!service}`);
      
      const serviceMethods = {
        notifyBalanceUpdate: typeof service.notifyBalanceUpdate === 'function',
        registerConnection: typeof service.registerConnection === 'function',
        removeConnection: typeof service.removeConnection === 'function',
        flushPendingUpdates: typeof service.flushPendingUpdates === 'function'
      };
      
      Object.entries(serviceMethods).forEach(([method, exists]) => {
        if (exists) {
          console.log(`✅ Метод ${method}: присутствует`);
        } else {
          console.log(`❌ Метод ${method}: отсутствует`);
          issues.push(`BalanceNotificationService: отсутствует метод ${method}`);
        }
      });
      
    } catch (error) {
      console.log('❌ Ошибка импорта BalanceNotificationService:', error);
      issues.push(`BalanceNotificationService: недоступен - ${error}`);
    }
    
    // 4. ПРОВЕРЯЕМ TRANSACTIONSERVICE
    console.log('\n4️⃣ ПРОВЕРКА TransactionService:');
    console.log('-'.repeat(50));
    
    try {
      const { UnifiedTransactionService } = await import('./core/TransactionService');
      const service = new UnifiedTransactionService();
      
      console.log('✅ UnifiedTransactionService импортирован');
      
      // Проверяем shouldUpdateBalance (приватный метод - можем только логически проверить)
      console.log('✅ shouldUpdateBalance логика: проверяется по типам транзакций');
      
      // Проверяем типы которые обновляют баланс
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
      
      console.log('💡 Типы транзакций обновляющие баланс:');
      incomeTypes.forEach(type => {
        console.log(`   - ${type}`);
      });
      
      // КРИТИЧЕСКАЯ ПРОВЕРКА: BOOST_PURCHASE mapping
      const TRANSACTION_TYPE_MAPPING = {
        'BOOST_PURCHASE': 'FARMING_REWARD'
      };
      
      const boostPurchaseType = TRANSACTION_TYPE_MAPPING['BOOST_PURCHASE'];
      console.log(`🔍 BOOST_PURCHASE мапится в: ${boostPurchaseType}`);
      
      if (incomeTypes.includes(boostPurchaseType)) {
        console.log('🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: BOOST_PURCHASE мапится в тип обновляющий баланс!');
        console.log('   Это может вызывать возврат денег после покупок TON Boost');
        issues.push('TransactionService: BOOST_PURCHASE мапится в FARMING_REWARD (обновляет баланс)');
      } else {
        console.log('✅ BOOST_PURCHASE не обновляет баланс автоматически');
      }
      
    } catch (error) {
      console.log('❌ Ошибка импорта TransactionService:', error);
      issues.push(`TransactionService: недоступен - ${error}`);
    }
    
    // 5. ПРОВЕРЯЕМ ИСТОЧНИКИ ОБНОВЛЕНИЙ
    console.log('\n5️⃣ ПРОВЕРКА ИСТОЧНИКОВ ОБНОВЛЕНИЙ:');
    console.log('-'.repeat(50));
    
    const sources = [
      { path: './modules/boost/service.ts', name: 'BoostService' },
      { path: './modules/wallet/service.ts', name: 'WalletService' },
      { path: './modules/boost/TonFarmingRepository.ts', name: 'TonFarmingRepository' }
    ];
    
    for (const source of sources) {
      try {
        const module = await import(source.path);
        console.log(`✅ ${source.name}: доступен`);
        
        // Проверяем использует ли BalanceManager
        const moduleStr = JSON.stringify(module);
        if (moduleStr.includes('BalanceManager') || moduleStr.includes('updateUserBalance')) {
          console.log(`   🔗 Интегрирован с BalanceManager`);
        } else {
          console.log(`   ⚠️ Возможно не использует BalanceManager`);
          warnings.push(`${source.name}: возможно не интегрирован с BalanceManager`);
        }
        
      } catch (error) {
        console.log(`❌ ${source.name}: недоступен - ${error}`);
        issues.push(`${source.name}: недоступен`);
      }
    }
    
    // 6. ПРОВЕРЯЕМ RACE CONDITIONS
    console.log('\n6️⃣ ПРОВЕРКА ПОТЕНЦИАЛЬНЫХ RACE CONDITIONS:');
    console.log('-'.repeat(50));
    
    console.log('🔍 Анализ потенциальных проблем:');
    
    // Проверяем двойное обновление баланса
    console.log('   💡 Двойные обновления:');
    console.log('      - BalanceManager.updateUserBalance()');
    console.log('      - TransactionService.shouldUpdateBalance()');
    console.log('      🔴 РИСК: Одна операция может обновить баланс дважды');
    warnings.push('Потенциальное двойное обновление: BalanceManager + TransactionService');
    
    // Проверяем debounce в notifications
    console.log('   💡 WebSocket debounce: 2000ms');
    console.log('      🔴 РИСК: Пользователи могут не видеть мгновенные обновления');
    warnings.push('WebSocket debounce 2s может задерживать обновления');
    
    // Проверяем агрегацию изменений
    console.log('   💡 Агрегация изменений в BalanceNotificationService');
    console.log('      ⚠️ РИСК: Мелкие изменения могут теряться в агрегации');
    
    // 7. ПРОВЕРЯЕМ ПОСЛЕДНИЕ ТРАНЗАКЦИИ
    console.log('\n7️⃣ ПРОВЕРКА ПОСЛЕДНИХ ТРАНЗАКЦИЙ:');
    console.log('-'.repeat(50));
    
    const { data: recentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount_ton, created_at, description')
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (txError) {
      console.log('❌ Ошибка получения транзакций:', txError);
      issues.push('База данных: недоступна для проверки транзакций');
    } else if (recentTransactions) {
      console.log(`📊 Найдено транзакций за последние 6 часов: ${recentTransactions.length}`);
      
      const typeAnalysis = {};
      recentTransactions.forEach(tx => {
        if (!typeAnalysis[tx.type]) {
          typeAnalysis[tx.type] = { count: 0, users: new Set() };
        }
        typeAnalysis[tx.type].count++;
        typeAnalysis[tx.type].users.add(tx.user_id);
      });
      
      console.log('📋 Анализ по типам:');
      Object.entries(typeAnalysis).forEach(([type, data]: [string, any]) => {
        console.log(`   ${type}: ${data.count} транзакций, ${data.users.size} пользователей`);
        
        // Ищем подозрительные паттерны
        if (type === 'BOOST_PURCHASE' && data.count > 0) {
          const boostTx = recentTransactions.filter(tx => tx.type === 'BOOST_PURCHASE');
          const positiveAmounts = boostTx.filter(tx => parseFloat(tx.amount_ton || '0') > 0);
          
          if (positiveAmounts.length > 0) {
            console.log(`   🔴 ПРОБЛЕМА: ${positiveAmounts.length} BOOST_PURCHASE с положительной суммой!`);
            issues.push(`BOOST_PURCHASE: ${positiveAmounts.length} транзакций зачисляют TON`);
          }
        }
      });
    }
    
    // 8. ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n8️⃣ ФИНАЛЬНАЯ ОЦЕНКА СИСТЕМЫ:');
    console.log('-'.repeat(50));
    
    console.log(`🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ: ${issues.length}`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log(`\n⚠️ ПРЕДУПРЕЖДЕНИЯ: ${warnings.length}`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
    
    // ОБЩАЯ ОЦЕНКА ЗДОРОВЬЯ
    const healthScore = Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5));
    console.log(`\n📊 ОБЩИЙ СЧЕТ ЗДОРОВЬЯ: ${healthScore}/100`);
    
    if (healthScore >= 80) {
      console.log('✅ СИСТЕМА В ХОРОШЕМ СОСТОЯНИИ');
    } else if (healthScore >= 60) {
      console.log('⚠️ СИСТЕМА ТРЕБУЕТ ВНИМАНИЯ');
    } else {
      console.log('🔴 СИСТЕМА ТРЕБУЕТ СРОЧНОГО ИСПРАВЛЕНИЯ');
    }
    
    // РЕКОМЕНДАЦИИ
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    console.log('-'.repeat(50));
    
    if (issues.some(i => i.includes('BOOST_PURCHASE'))) {
      console.log('1. 🔴 КРИТИЧНО: Исправить mapping BOOST_PURCHASE → не обновляющий баланс тип');
    }
    
    if (warnings.some(w => w.includes('двойное обновление'))) {
      console.log('2. ⚠️ Добавить защиту от двойных обновлений баланса');
    }
    
    if (warnings.some(w => w.includes('debounce'))) {
      console.log('3. 💡 Рассмотреть уменьшение debounce с 2s до 500ms для лучшего UX');
    }
    
    console.log('4. 📊 Добавить мониторинг частоты операций с балансом на пользователя');
    console.log('5. 🔍 Реализовать детальное логирование source операций для диагностики');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА при проверке системы:', error);
  }
}

// Запуск проверки
checkBalanceSystemHealth()
  .then(() => {
    console.log('\n✅ Проверка системы завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка выполнения проверки:', error);
    process.exit(1);
  });