# 🎯 ЧЕТКИЙ ПЛАН: КАТЕГОРИЗАЦИЯ И ИСПРАВЛЕНИЕ АККАУНТОВ

**Дата**: 31.07.2025  
**Статус**: БЕЗОПАСНЫЙ ПЛАН БЕЗ РИСКА ДЛЯ РЕФЕРАЛЬНОЙ СИСТЕМЫ

## 📊 ПОНИМАНИЕ СТРУКТУРЫ АККАУНТОВ

### Есть ДВА типа аккаунтов:

1. **🔗 РЕФЕРАЛЬНЫЕ АККАУНТЫ** (НЕ ТРОГАЕМ!)
   - Имеют ref_code
   - Участвуют в партнерской программе  
   - Связаны через parent_ref_code
   - **РАБОТАЮТ ИДЕАЛЬНО - НЕ ТРОГАТЬ!**

2. **🧪 ТЕСТОВЫЕ АККАУНТЫ** (НУЖНО ИСПРАВИТЬ)
   - Без ref_code (созданы для тестов)
   - Не участвуют в реферальной системе
   - Имеют проблемы с WebSocket/API/Balance Manager
   - **МОЖНО БЕЗОПАСНО ИСПРАВЛЯТЬ**

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### ❌ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Трогать аккаунты с ref_code
- Изменять parent_ref_code связи  
- Модифицировать реферальные балансы
- Затрагивать таблицы referral_*
- Влиять на партнерскую программу

### ✅ БЕЗОПАСНО МОЖНО:
- Исправлять тестовые аккаунты без ref_code
- Создавать технические записи (sessions, transactions)
- Исправлять TON Boost для тестовых аккаунтов
- Улучшать систему регистрации новых аккаунтов

## 🎯 ЧЕТКИЕ РЕКОМЕНДАЦИИ

### ЭТАП 1: БЕЗОПАСНАЯ ДИАГНОСТИКА
```sql
-- Найти ТОЛЬКО тестовые аккаунты (без ref_code)
SELECT id, username, first_name, created_at,
       'TEST_ACCOUNT_NEEDS_REPAIR' as category
FROM users 
WHERE ref_code IS NULL OR ref_code = '';

-- Проверить что реферальные аккаунты в порядке
SELECT COUNT(*) as referral_accounts_count,
       COUNT(CASE WHEN parent_ref_code IS NOT NULL THEN 1 END) as with_parent_refs
FROM users 
WHERE ref_code IS NOT NULL AND ref_code != '';
```

### ЭТАП 2: ИСПРАВЛЕНИЕ ТОЛЬКО ТЕСТОВЫХ АККАУНТОВ
```sql
-- BACKUP только тестовых данных
CREATE TABLE test_users_backup AS 
SELECT * FROM users WHERE ref_code IS NULL OR ref_code = '';

-- Исправить ТОЛЬКО тестовые аккаунты (без ref_code)
-- НЕ ДАЕМ им ref_code - оставляем тестовыми!

-- 1. Создать технические сессии для тестовых аккаунтов
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
SELECT 
    u.id,
    'test_session_' || u.id || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    NOW() + INTERVAL '30 days',
    NOW()
FROM users u
LEFT JOIN user_sessions us ON u.id = us.user_id
WHERE (u.ref_code IS NULL OR u.ref_code = '') -- ТОЛЬКО тестовые
    AND u.telegram_id IS NOT NULL 
    AND us.user_id IS NULL;

-- 2. Создать техническую транзакцию для Balance Manager
INSERT INTO transactions (user_id, type, currency, amount, status, description)
SELECT 
    u.id,
    'TEST_ACCOUNT_INIT',
    'UNI',
    0.001, -- минимальная сумма для технических целей
    'completed',
    'Техническая инициализация тестового аккаунта'
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE (u.ref_code IS NULL OR u.ref_code = '') -- ТОЛЬКО тестовые
    AND t.user_id IS NULL;

-- 3. Исправить TON Boost для тестовых аккаунтов
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
SELECT 
    u.id,
    0,
    0.000000231,
    u.ton_boost_active,
    NOW()
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id
WHERE (u.ref_code IS NULL OR u.ref_code = '') -- ТОЛЬКО тестовые
    AND u.ton_boost_active = true 
    AND tfd.user_id IS NULL;
```

### ЭТАП 3: МОНИТОРИНГ БЕЗОПАСНОСТИ
```sql
-- Проверить что реферальная система не пострадала
SELECT 'REFERRAL_SYSTEM_CHECK' as check_type,
       COUNT(*) as total_referral_users,
       COUNT(DISTINCT parent_ref_code) as unique_parent_refs,
       COUNT(CASE WHEN parent_ref_code IS NOT NULL THEN 1 END) as users_with_parents
FROM users 
WHERE ref_code IS NOT NULL AND ref_code != '';

-- Проверить исправленные тестовые аккаунты  
SELECT 'TEST_ACCOUNTS_FIXED' as check_type,
       COUNT(*) as test_accounts,
       COUNT(CASE WHEN EXISTS(SELECT 1 FROM transactions t WHERE t.user_id = u.id) THEN 1 END) as with_transactions,
       COUNT(CASE WHEN EXISTS(SELECT 1 FROM user_sessions s WHERE s.user_id = u.id) THEN 1 END) as with_sessions
FROM users u
WHERE ref_code IS NULL OR ref_code = '';
```

## 🔄 УЛУЧШЕНИЕ СИСТЕМЫ РЕГИСТРАЦИИ

### Для будущих аккаунтов - два пути:

**РЕФЕРАЛЬНЫЕ АККАУНТЫ** (через ссылку):
```typescript
// modules/auth/service.ts - полная инициализация с ref_code
if (startParam) { // пришел по реферальной ссылке
  userData.ref_code = generateRefCode();
  userData.parent_ref_code = startParam;
  // + полная инициализация для реферальной системы
}
```

**ТЕСТОВЫЕ АККАУНТЫ** (прямой вход):
```typescript
// modules/auth/service.ts - техническая инициализация без ref_code
if (!startParam) { // прямой вход = тестовый аккаунт
  userData.ref_code = null; // оставляем тестовым
  // + минимальная техническая инициализация для работы системы
}
```

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После выполнения плана:

**РЕФЕРАЛЬНЫЕ АККАУНТЫ**:
- Остаются нетронутыми ✅
- Партнерская программа работает идеально ✅
- Все связи сохранены ✅

**ТЕСТОВЫЕ АККАУНТЫ**:
- Получают технические сессии для аутентификации ✅
- Получают минимальные транзакции для Balance Manager ✅
- Исправляется TON Boost консистентность ✅
- НЕ получают ref_code (остаются тестовыми) ✅

**НОВЫЕ АККАУНТЫ**:
- Автоматически определяются как реферальные/тестовые ✅
- Получают правильную инициализацию по типу ✅

## 🎯 СЛЕДУЮЩИЕ ШАГИ

1. **Сначала**: Выполнить безопасную диагностику
2. **Потом**: Исправить только тестовые аккаунты  
3. **В конце**: Улучшить систему регистрации

**ГЛАВНОЕ**: Реферальная система остается нетронутой и продолжает работать идеально!