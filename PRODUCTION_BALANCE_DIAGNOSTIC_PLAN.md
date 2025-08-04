# 🔍 **ПЛАН ДИАГНОСТИКИ БАЛАНСА В ПРОДАКШН**

**Дата:** 4 августа 2025  
**Цель:** Безопасная диагностика проблем с балансом без изменений кода

---

## 📊 **ЭТАП 1: АНАЛИЗ ТЕКУЩИХ ЛОГОВ**

### **1.1 Критические логи для анализа**

**Backend логи (ищем в логах сервера):**
```
[CRITICAL] [DIRECT_BALANCE_UPDATE] - изменения баланса
[CRITICAL] [TON_DEPOSIT_PROCESSING] - обработка депозитов
[CRITICAL] [TON_DEPOSIT_SUCCESS] - успешные депозиты
[CRITICAL_USER_25] - специальная диагностика для User 25
[BalanceCache] - операции с кешем
[BalanceManager] - централизованные обновления
```

**Frontend логи (консоль браузера):**
```
[balanceService] - запросы баланса и кеширование
[UserContext Reducer] SET_BALANCE - изменения в контексте
[BalanceCoordinator] - координация обновлений
[useWebSocketBalanceSync] - WebSocket синхронизация
```

### **1.2 Ключевые метрики для сбора**
- Частота обновлений баланса на пользователя
- Время между депозитом и отображением
- Случаи возврата к старому балансу
- Конфликты между источниками обновлений

---

## 🔍 **ЭТАП 2: БЕЗОПАСНАЯ ДИАГНОСТИКА**

### **2.1 Мониторинг конкретных пользователей**

**User 25 (уже настроен усиленный мониторинг):**
- Все операции логируются как [CRITICAL_USER_25]
- Отслеживаются изменения backend кеша
- Записываются все обновления баланса

**Добавить мониторинг для других проблемных пользователей:**
```sql
-- Найти пользователей с частыми изменениями баланса
SELECT user_id, COUNT(*) as balance_changes, 
       MIN(created_at) as first_change,
       MAX(created_at) as last_change
FROM transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND transaction_type IN ('TON_DEPOSIT', 'FARMING_REWARD')
GROUP BY user_id 
HAVING COUNT(*) > 5
ORDER BY balance_changes DESC;
```

### **2.2 Анализ временных паттернов**

**Поиск проблемных временных окон:**
```sql
-- Найти моменты с множественными обновлениями
SELECT DATE_TRUNC('minute', created_at) as minute_window,
       user_id,
       COUNT(*) as transactions_count,
       ARRAY_AGG(transaction_type) as types,
       ARRAY_AGG(amount) as amounts
FROM transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY minute_window, user_id
HAVING COUNT(*) > 2
ORDER BY minute_window DESC, transactions_count DESC;
```

### **2.3 Проверка состояния кешей**

**Команды для проверки без изменений:**
```bash
# Проверить логи кеша за последний час
grep -i "balancecache\|critical_user" logs/server.log | tail -50

# Найти конфликты обновлений
grep -i "координатор\|coordinator" logs/server.log | tail -30

# Проверить WebSocket активность
grep -i "websocket\|balance_update" logs/server.log | tail -30
```

---

## 🧪 **ЭТАП 3: КОНТРОЛИРУЕМОЕ ТЕСТИРОВАНИЕ**

### **3.1 Тест с известным пользователем**

**Безопасный тест (НЕ на production данных):**
1. Выбрать тестовый аккаунт или аккаунт разработчика
2. Сделать небольшой тестовый депозит (0.1 TON)
3. Записать все логи в течение 5 минут
4. Проанализировать цепочку обновлений

### **3.2 Мониторинг race conditions**

**Добавить временные логи (только логирование, не изменения):**
```typescript
// В balanceService.ts - добавить детальное логирование
console.log('[DIAGNOSTIC] fetchBalance called', {
  userId, 
  forceRefresh, 
  timestamp: Date.now(),
  cacheAge: cachedItem ? Date.now() - cachedItem.timestamp : 'no_cache'
});
```

### **3.3 Проверка синхронизации кешей**

**SQL запрос для проверки расхождений:**
```sql
-- Сравнить последние изменения баланса с текущими значениями
WITH recent_balance_changes AS (
  SELECT user_id, 
         SUM(CASE WHEN transaction_type = 'TON_DEPOSIT' THEN amount::numeric ELSE 0 END) as recent_ton_deposits,
         MAX(created_at) as last_transaction
  FROM transactions 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND transaction_type IN ('TON_DEPOSIT', 'FARMING_REWARD')
  GROUP BY user_id
)
SELECT u.id, u.telegram_id, u.balance_ton, 
       rbc.recent_ton_deposits, rbc.last_transaction,
       (u.balance_ton - rbc.recent_ton_deposits) as potential_old_balance
FROM users u 
JOIN recent_balance_changes rbc ON u.id = rbc.user_id
WHERE ABS(u.balance_ton - rbc.recent_ton_deposits) > 0.1
ORDER BY rbc.last_transaction DESC;
```

---

## 📈 **ЭТАП 4: АНАЛИЗ РЕЗУЛЬТАТОВ**

### **4.1 Паттерны для выявления**

**Признаки проблем с кешем:**
- Баланс возвращается к значению 5-минутной давности
- Множественные запросы API в течение секунды
- WebSocket уведомления не приводят к обновлению

**Признаки race conditions:**
- Одновременные обновления от разных источников
- Быстрая смена значений баланса
- Логи показывают конфликты в BalanceCoordinator

**Признаки проблем с синхронизацией:**
- Расхождения между backend и frontend кешами
- Задержки в отображении после депозитов
- Пользователи сообщают о "пропавших" депозитах

### **4.2 Метрики для сбора**

**Производительность:**
- Среднее время отклика API /api/v2/wallet/balance
- Частота cache hits vs cache misses
- Количество WebSocket сообщений в минуту

**Надежность:**
- Процент успешных обновлений баланса
- Количество fallback на старый кеш
- Частота принудительных обновлений (forceRefresh)

---

## 🛡️ **БЕЗОПАСНЫЕ УЛУЧШЕНИЯ ДЛЯ ПРОДАКШН**

### **5.1 Только логирование (без изменений логики)**

**Добавить диагностические логи:**
```typescript
// Усилить логирование для выявления проблем
logger.info('[BALANCE_DIAGNOSTIC]', {
  action: 'cache_access',
  userId,
  cacheAge,
  source: 'frontend_vs_backend',
  timestamp: Date.now()
});
```

### **5.2 Мониторинг метрик**

**Добавить счетчики без изменения логики:**
- Количество обращений к кешу
- Количество API запросов баланса
- Время выполнения операций

### **5.3 Fallback логика (только если критично)**

**Минимальные изменения для стабильности:**
- Добавить retry для критических операций
- Улучшить обработку ошибок API
- Добавить индикаторы загрузки

---

## 📋 **ПЛАН ДЕЙСТВИЙ**

### **Немедленно (сегодня):**
1. ✅ Собрать логи за последние 24 часа
2. ✅ Проанализировать паттерны пользователя 25
3. ✅ Выявить частоту проблем

### **На этой неделе:**
1. 🔍 Добавить безопасное диагностическое логирование
2. 📊 Настроить мониторинг ключевых метрик
3. 🧪 Провести контролируемые тесты

### **После сбора данных:**
1. 📈 Проанализировать результаты
2. 🎯 Определить приоритетные исправления
3. 🛠️ Составить план безопасных изменений

---

## ⚠️ **ПРИНЦИПЫ БЕЗОПАСНОСТИ**

1. **Только чтение данных** - никаких изменений структуры
2. **Логирование без воздействия** - добавляем только диагностику
3. **Мониторинг реальных пользователей** - анализируем production трафик
4. **Постепенные улучшения** - маленькие безопасные изменения
5. **Откат готовность** - все изменения должны легко откатываться

**Этот план позволит нам понять реальное состояние системы и принять обоснованные решения по улучшениям.**