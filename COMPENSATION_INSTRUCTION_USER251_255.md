# 💰 КОМПЕНСАЦИЯ ПОТЕРЯННЫХ СРЕДСТВ - USER 251 И 255

## 📋 СИТУАЦИЯ:
- **User ID 251**: Потерял 2 TON из-за багов системы
- **User ID 255**: Потерял 2 TON из-за багов системы
- **Причина**: Исторические баги в системе пополнений
- **Решение**: Ручная компенсация через создание транзакций

---

## 🛡️ БЕЗОПАСНЫЙ СПОСОБ КОМПЕНСАЦИИ:

### ВАРИАНТ 1: ЧЕРЕЗ СОЗДАНИЕ ТРАНЗАКЦИЙ (РЕКОМЕНДУЕТСЯ)
**Принцип**: Создаем правильные транзакции, система автоматически обновит балансы

```sql
-- 1. СОЗДАЕМ BACKUP ПЕРЕД ИЗМЕНЕНИЯМИ
CREATE TABLE compensation_backup_2025_07_27 AS 
SELECT id, balance_ton, balance_uni 
FROM users 
WHERE id IN (251, 255);

-- 2. СОЗДАЕМ КОМПЕНСАЦИОННЫЕ ТРАНЗАКЦИИ ДЛЯ USER 251
INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    created_at,
    updated_at,
    metadata
) VALUES (
    '251',
    'ADMIN_COMPENSATION',
    2.0,
    'TON',
    'completed',
    'Admin compensation for lost deposit due to system bug - 2 TON restored',
    NOW(),
    NOW(),
    '{"admin_action": true, "compensation_reason": "lost_deposit_bug", "original_amount": "2.0", "admin_user": "system"}'
);

-- 3. СОЗДАЕМ КОМПЕНСАЦИОННУЮ ТРАНЗАКЦИЮ ДЛЯ USER 255
INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    created_at,
    updated_at,
    metadata
) VALUES (
    '255',
    'ADMIN_COMPENSATION',
    2.0,
    'TON',
    'completed',
    'Admin compensation for lost deposit due to system bug - 2 TON restored',
    NOW(),
    NOW(),
    '{"admin_action": true, "compensation_reason": "lost_deposit_bug", "original_amount": "2.0", "admin_user": "system"}'
);

-- 4. ПЕРЕСЧИТЫВАЕМ БАЛАНСЫ НА ОСНОВЕ ТРАНЗАКЦИЙ
UPDATE users 
SET balance_ton = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM transactions 
    WHERE user_id = users.id::text 
      AND currency = 'TON' 
      AND status = 'completed'
)
WHERE id IN (251, 255);
```

### ВАРИАНТ 2: ПРЯМОЕ ОБНОВЛЕНИЕ БАЛАНСОВ (ПРОЩЕ, НО МЕНЕЕ ЧИСТО)
```sql
-- 1. BACKUP (ОБЯЗАТЕЛЬНО)
CREATE TABLE compensation_backup_2025_07_27 AS 
SELECT id, balance_ton, balance_uni 
FROM users 
WHERE id IN (251, 255);

-- 2. ПРЯМОЕ ОБНОВЛЕНИЕ БАЛАНСОВ
UPDATE users 
SET balance_ton = balance_ton + 2.0
WHERE id = 251;

UPDATE users 
SET balance_ton = balance_ton + 2.0
WHERE id = 255;

-- 3. ЛОГИРУЕМ ОПЕРАЦИЮ
INSERT INTO admin_log (action, user_ids, details, timestamp) 
VALUES (
    'MANUAL_BALANCE_COMPENSATION',
    '{251, 255}',
    'Added 2 TON each for lost deposits due to system bugs',
    NOW()
);
```

---

## 🎯 РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ:

### ЭТАП 1: ПРОВЕРКА ТЕКУЩИХ БАЛАНСОВ
```sql
-- Проверяем текущие балансы пользователей
SELECT 
    id,
    username,
    balance_ton,
    balance_uni,
    created_at
FROM users 
WHERE id IN (251, 255);
```

### ЭТАП 2: СОЗДАНИЕ BACKUP
```sql
-- Обязательный backup перед любыми изменениями
CREATE TABLE compensation_backup_2025_07_27 AS 
SELECT * FROM users WHERE id IN (251, 255);
```

### ЭТАП 3: КОМПЕНСАЦИЯ (выберите один вариант)
- **Вариант 1**: Создание транзакций (более правильно)
- **Вариант 2**: Прямое обновление (быстрее)

### ЭТАП 4: ПРОВЕРКА РЕЗУЛЬТАТА
```sql
-- Проверяем что балансы обновились
SELECT 
    id,
    username,
    balance_ton,
    'Должно быть +2 TON' as note
FROM users 
WHERE id IN (251, 255);
```

### ЭТАП 5: УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ
- Отправить уведомления пользователям
- Объяснить причину компенсации
- Извиниться за неудобства

---

## ⚠️ ВАЖНЫЕ ПРЕДОСТОРОЖНОСТИ:

### 1. ОБЯЗАТЕЛЬНО СОЗДАТЬ BACKUP
- Всегда делайте backup перед изменениями
- Сохраняйте исходные балансы

### 2. ПРОВЕРИТЬ ПОЛЬЗОВАТЕЛЕЙ
```sql
-- Убедитесь что пользователи существуют
SELECT id, username, balance_ton 
FROM users 
WHERE id IN (251, 255);
```

### 3. ДОКУМЕНТИРОВАТЬ ОПЕРАЦИЮ
- Записать кто, когда и зачем делал компенсацию
- Сохранить причину и сумму

### 4. МОНИТОРИНГ ПОСЛЕ ОПЕРАЦИИ
- Проверить что система работает нормально
- Убедиться что балансы отображаются корректно

---

## 🚀 ГОТОВЫЙ СКРИПТ ДЛЯ ВЫПОЛНЕНИЯ:

```sql
-- ПОЛНЫЙ СКРИПТ КОМПЕНСАЦИИ USER 251 И 255

-- Шаг 1: Backup
CREATE TABLE compensation_backup_user251_255_2025_07_27 AS 
SELECT * FROM users WHERE id IN (251, 255);

-- Шаг 2: Проверка текущих балансов
SELECT 
    'BEFORE COMPENSATION' as stage,
    id, username, balance_ton, balance_uni 
FROM users WHERE id IN (251, 255);

-- Шаг 3: Компенсационные транзакции
INSERT INTO transactions (user_id, type, amount, currency, status, description, created_at, updated_at, metadata) VALUES
('251', 'ADMIN_COMPENSATION', 2.0, 'TON', 'completed', 'Admin compensation for lost deposit - 2 TON restored', NOW(), NOW(), '{"admin_action": true, "reason": "lost_deposit_bug"}'),
('255', 'ADMIN_COMPENSATION', 2.0, 'TON', 'completed', 'Admin compensation for lost deposit - 2 TON restored', NOW(), NOW(), '{"admin_action": true, "reason": "lost_deposit_bug"}');

-- Шаг 4: Обновление балансов
UPDATE users 
SET balance_ton = balance_ton + 2.0
WHERE id IN (251, 255);

-- Шаг 5: Проверка результата
SELECT 
    'AFTER COMPENSATION' as stage,
    id, username, balance_ton, balance_uni 
FROM users WHERE id IN (251, 255);
```

---

## ❓ КАКОЙ ВАРИАНТ ВЫБРАТЬ?

**Рекомендую ВАРИАНТ 1 (через транзакции)** потому что:
- ✅ Создает правильную историю операций
- ✅ Видно в транзакциях пользователя
- ✅ Легко отследить и отменить при необходимости
- ✅ Система работает как задумано

**Готовы выполнить компенсацию? Какой способ предпочитаете?**