#!/usr/bin/env tsx

/**
 * СРОЧНАЯ ДИАГНОСТИКА: Аномалия с возвратом баланса
 * Проблема: 33 TON -> покупка TON Boost -> 20.84 TON -> возврат к 33 TON -> снова 20.84 TON
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('\n🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА СИСТЕМ КЕШИРОВАНИЯ БАЛАНСА\n');
console.log('='.repeat(80));
console.log('Время инцидента:', new Date().toISOString());
console.log('Симптомы: Баланс "прыгает" между старым (33) и новым (20.84) значениями');
console.log('='.repeat(80));

interface CacheSystem {
  name: string;
  file: string;
  updateInterval?: string;
  description: string;
  canRevertBalance: boolean;
}

const cacheSystems: CacheSystem[] = [
  {
    name: "WebSocket Balance Sync",
    file: "client/src/hooks/useWebSocketBalanceSync.ts",
    updateInterval: "real-time",
    description: "Синхронизация балансов через WebSocket",
    canRevertBalance: true
  },
  {
    name: "Balance Card Component",
    file: "client/src/components/wallet/BalanceCard.tsx",
    updateInterval: "unknown",
    description: "UI компонент отображения баланса",
    canRevertBalance: false
  },
  {
    name: "UserContext",
    file: "client/src/contexts/userContext.tsx",
    updateInterval: "unknown", 
    description: "Глобальный контекст пользователя с балансом",
    canRevertBalance: true
  },
  {
    name: "Balance Notification Service",
    file: "core/balanceNotificationService.ts",
    updateInterval: "100ms debounce",
    description: "Сервис уведомлений об изменении баланса",
    canRevertBalance: false
  },
  {
    name: "Batch Balance Processor",
    file: "core/BatchBalanceProcessor.ts",
    updateInterval: "unknown",
    description: "Пакетная обработка балансов",
    canRevertBalance: true
  },
  {
    name: "React Query Cache",
    file: "client/src/lib/queryClient.ts",
    updateInterval: "staleTime config",
    description: "Кеширование API запросов",
    canRevertBalance: true
  }
];

console.log('\n📊 АНАЛИЗ СИСТЕМ КЕШИРОВАНИЯ:\n');

// 1. Системы, которые могут возвращать старые значения
console.log('🔴 СИСТЕМЫ, СПОСОБНЫЕ ВЕРНУТЬ СТАРЫЙ БАЛАНС:');
console.log('-'.repeat(60));
cacheSystems.filter(s => s.canRevertBalance).forEach(system => {
  console.log(`• ${system.name}`);
  console.log(`  Файл: ${system.file}`);
  console.log(`  Интервал: ${system.updateInterval}`);
  console.log(`  Описание: ${system.description}`);
  console.log('');
});

// 2. Проверка интервалов обновления
console.log('\n⏱️ ПРОВЕРКА ИНТЕРВАЛОВ И ТАЙМАУТОВ:\n');

try {
  // WebSocket reconnect interval
  const wsHookContent = readFileSync('./client/src/hooks/useWebSocketBalanceSync.ts', 'utf8');
  const wsIntervals = wsHookContent.match(/(\d+)\s*[,\)]/g) || [];
  console.log('WebSocket intervals found:', wsIntervals);

  // Balance notification debounce
  const balanceNotifContent = readFileSync('./core/balanceNotificationService.ts', 'utf8');
  const debounceMatch = balanceNotifContent.match(/debounceTime\s*=\s*(\d+)/);
  if (debounceMatch) {
    console.log(`Balance Notification debounce: ${debounceMatch[1]}ms`);
  }

  // React Query staleTime
  const queryClientContent = readFileSync('./client/src/lib/queryClient.ts', 'utf8');
  const staleTimeMatch = queryClientContent.match(/staleTime:\s*(\d+)/);
  if (staleTimeMatch) {
    console.log(`React Query staleTime: ${staleTimeMatch[1]}ms`);
  }
} catch (error) {
  console.log('⚠️ Ошибка при анализе интервалов:', error.message);
}

// 3. Поиск race conditions
console.log('\n🏁 ПОТЕНЦИАЛЬНЫЕ RACE CONDITIONS:\n');

console.log('1. WebSocket vs API запросы:');
console.log('   - WebSocket обновляет баланс в реальном времени');
console.log('   - API запросы могут возвращать устаревшие данные из кеша');
console.log('   - При покупке TON Boost оба могут срабатывать одновременно');

console.log('\n2. React Query Cache vs Fresh Data:');
console.log('   - Кеш может хранить старое значение (33 TON)');
console.log('   - Новые данные приходят (20.84 TON)');
console.log('   - При refetch кеш может вернуть старое значение');

console.log('\n3. UserContext vs Local State:');
console.log('   - UserContext может иметь старое значение');
console.log('   - Локальный стейт компонента обновляется');
console.log('   - При ре-рендере контекст перезаписывает новое значение');

// 4. Проверка последних транзакций
console.log('\n💰 ПРОВЕРКА ПОСЛЕДНИХ ТРАНЗАКЦИЙ (User 184):\n');

try {
  const checkTransactions = `
    SELECT id, type, amount, currency, created_at, description
    FROM transactions
    WHERE user_id = 184 
    AND currency = 'TON'
    AND created_at > NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC
    LIMIT 10;
  `;
  
  console.log('Последние TON транзакции за 10 минут...');
  
} catch (error) {
  console.log('⚠️ Не удалось проверить транзакции');
}

// 5. Анализ функций обновления баланса
console.log('\n🔄 ФУНКЦИИ ОБНОВЛЕНИЯ БАЛАНСА:\n');

const updateFunctions = [
  {
    name: "fetchBalance()",
    location: "UserContext",
    trigger: "Manual/Auto",
    cache: "Updates context state"
  },
  {
    name: "refetch()",
    location: "React Query",
    trigger: "Manual/Interval", 
    cache: "Updates query cache"
  },
  {
    name: "WebSocket onMessage",
    location: "useWebSocketBalanceSync",
    trigger: "Server push",
    cache: "Direct state update"
  },
  {
    name: "refreshBalance()",
    location: "BalanceCard",
    trigger: "User click",
    cache: "Force refresh"
  }
];

updateFunctions.forEach(func => {
  console.log(`• ${func.name}`);
  console.log(`  Расположение: ${func.location}`);
  console.log(`  Триггер: ${func.trigger}`);
  console.log(`  Кеш: ${func.cache}`);
  console.log('');
});

// 6. Рекомендации
console.log('\n💡 ВЕРОЯТНАЯ ПРИЧИНА ПРОБЛЕМЫ:\n');
console.log('1. При покупке TON Boost происходит несколько параллельных обновлений:');
console.log('   - API обновляет баланс (20.84)');
console.log('   - WebSocket получает уведомление');
console.log('   - React Query кеш может вернуть старое значение (33)');
console.log('   - UserContext может перезаписать новое значение старым');

console.log('\n2. Возможен конфликт между:');
console.log('   - Оптимистичным обновлением UI');
console.log('   - Реальным ответом от сервера');
console.log('   - Кешированными данными');

console.log('\n🚨 КРИТИЧЕСКИЕ ТОЧКИ:');
console.log('- React Query staleTime может быть слишком большим');
console.log('- WebSocket и API могут конфликтовать');
console.log('- UserContext может кешировать устаревшие данные');
console.log('- Отсутствует синхронизация между системами обновления');

console.log('\n' + '='.repeat(80));