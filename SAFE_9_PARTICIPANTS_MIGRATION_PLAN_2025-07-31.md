# 🎯 БЕЗОПАСНЫЙ ПЛАН МИГРАЦИИ 9 УЧАСТНИКОВ
**Дата:** 31.07.2025  
**Статус:** ГОТОВ К ВЫПОЛНЕНИЮ  
**Цель:** Безопасно стандартизировать 9 участников по образцу User ID 25

## 👥 СПИСОК УЧАСТНИКОВ
1. @Irinkatriumf
2. @LeLila90  
3. @lvereskun
4. @Artem_dpp
5. @Glazeb0
6. @Rostik_m09
7. @al_eksand0
8. @Dima_27976
9. @Dezertoddd

## ✅ БЕЗОПАСНЫЙ ПРОТОКОЛ МИГРАЦИИ

### **ЭТАП 1: СОЗДАНИЕ БЭКАПОВ**
```sql
-- Создать бэкап данных участников
CREATE TABLE backup_9_participants_2025_07_31 AS
SELECT * FROM users 
WHERE username IN ('@Irinkatriumf', '@LeLila90', '@lvereskun', '@Artem_dpp', 
                   '@Glazeb0', '@Rostik_m09', '@al_eksand0', '@Dima_27976', '@Dezertoddd');

-- Бэкап связанных данных
CREATE TABLE backup_transactions_9_participants AS
SELECT t.* FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.username IN ('@Irinkatriumf', '@LeLila90', '@lvereskun', '@Artem_dpp', 
                      '@Glazeb0', '@Rostik_m09', '@al_eksand0', '@Dima_27976', '@Dezertoddd');
```

### **ЭТАП 2: ИНДИВИДУАЛЬНАЯ ДИАГНОСТИКА**
Для каждого участника выполнить:
```sql
-- Пример для @Dima_27976
SELECT 
    'ДИАГНОСТИКА' as step,
    username,
    id,
    telegram_id,
    balance_uni,
    balance_ton,
    ton_boost_active,
    uni_farming_active,
    (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = users.id) as session_count,
    CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = users.id::text) THEN 'ДА' ELSE 'НЕТ' END as has_farming_data
FROM users 
WHERE username = '@Dima_27976';
```

### **ЭТАП 3: СОЗДАНИЕ ИНДИВИДУАЛЬНЫХ ПЛАНОВ ИСПРАВЛЕНИЯ**

#### **УЧАСТНИК 1: @Dima_27976**
**Проблемы (предполагаемые):**
- Отсутствует telegram_id
- Нет записей в user_sessions
- Нет записей в ton_farming_data

**План исправления:**
```sql
-- 1. Установить telegram_id (нужно получить от пользователя)
UPDATE users 
SET telegram_id = [ТРЕБУЕТСЯ_ПОЛУЧИТЬ_ОТ_ПОЛЬЗОВАТЕЛЯ]
WHERE username = '@Dima_27976';

-- 2. Создать user_session
INSERT INTO user_sessions (user_id, token, expires_at, created_at, last_activity)
SELECT 
    id,
    'generated_token_' || id || '_' || EXTRACT(epoch FROM NOW()),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
FROM users WHERE username = '@Dima_27976';

-- 3. Создать ton_farming_data если активен TON boost
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
SELECT 
    id::text,
    0,
    CASE WHEN ton_boost_active THEN 0.1 ELSE 0.01 END,
    ton_boost_active,
    NOW()
FROM users 
WHERE username = '@Dima_27976' 
  AND ton_boost_active = true;
```

### **ЭТАП 4: ПОШАГОВОЕ ВЫПОЛНЕНИЕ (1 УЧАСТНИК В ДЕНЬ)**

**День 1: @Dima_27976**
1. Диагностика
2. Создание бэкапа
3. Исправление проблем
4. Тестирование
5. Подтверждение работоспособности

**День 2: @Irinkatriumf**
1. Повторить процесс
2. Сравнить с результатами @Dima_27976
3. Улучшить протокол при необходимости

**И так далее...**

### **ЭТАП 5: КОНТРОЛЬ КАЧЕСТВА**

После каждого исправления проверить:
```sql
-- Проверка после исправления
SELECT 
    'ПОСЛЕ_ИСПРАВЛЕНИЯ' as status,
    username,
    telegram_id IS NOT NULL as has_telegram_id,
    balance_uni IS NOT NULL as has_uni_balance,
    balance_ton IS NOT NULL as has_ton_balance,
    (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = users.id) as session_count,
    EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = users.id::text) as has_farming_data
FROM users 
WHERE username = '@Dima_27976';
```

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА БЕЗОПАСНОСТИ

### **НЕЛЬЗЯ ТРОГАТЬ:**
- ❌ ref_code (реферальная система работает)
- ❌ existing balance_uni и balance_ton (если > 0)
- ❌ created_at (история регистрации)
- ❌ username (может нарушить авторизацию)

### **МОЖНО БЕЗОПАСНО ИЗМЕНЯТЬ:**
- ✅ telegram_id (если NULL или неверный)
- ✅ Создавать недостающие user_sessions
- ✅ Создавать недостающие ton_farming_data
- ✅ Добавлять недостающие транзакции (только создание, не изменение)

### **ОБЯЗАТЕЛЬНЫЕ ПРОВЕРКИ:**
- Бэкап перед каждым изменением
- Тестирование после каждого изменения
- Подтверждение от пользователя (если возможно)
- Откат при любых проблемах

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

**После успешной миграции каждый участник будет иметь:**
- Корректный telegram_id
- Активные user_sessions
- Соответствующие ton_farming_data (если нужно)
- Полную совместимость с User ID 25
- Сохраненные балансы и рефералы

**Время выполнения:** 9-14 дней (по 1 участнику в день + тестирование)
**Риск:** МИНИМАЛЬНЫЙ (индивидуальный подход + бэкапы)
**Результат:** МАКСИМАЛЬНАЯ БЕЗОПАСНОСТЬ + РЕШЕНИЕ ПРОБЛЕМ