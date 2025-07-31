# 🔧 РЕШЕНИЕ ПРОБЛЕМЫ ДУБЛИРОВАННЫХ АККАУНТОВ @Dima_27976
**Дата:** 31.07.2025  
**Проблема:** У @Dima_27976 есть два аккаунта с одинаковым username  
**Статус:** ГОТОВ К ИСПРАВЛЕНИЮ

## 📊 АНАЛИЗ ДУБЛИРОВАННЫХ АККАУНТОВ

### **АККАУНТ 254 (ПУСТОЙ - ПРОБЛЕМНЫЙ)**
- **ID:** 254
- **Telegram ID:** 244
- **Username:** Dima_27976
- **First Name:** 𝓓𝓶𝓲𝓽𝓻𝓲𝔂 🐼
- **Создан:** 2025-07-20 10:55:33 (ПОЗЖЕ)
- **Ref Code:** REF_1753008933732_jqvz68
- **Балансы:** UNI: 0, TON: 0
- **Транзакций:** 0
- **Статус:** НЕАКТИВЕН

### **АККАУНТ 244 (РАБОЧИЙ)**
- **ID:** 244  
- **Telegram ID:** 6054799123
- **Username:** Dima_27976
- **First Name:** 𝓓𝓶𝓲𝓽𝓻𝓲𝔂 🐼
- **Создан:** 2025-07-20 05:22:57 (РАНЬШЕ)
- **Ref Code:** REF_1752988977192_x8lqai
- **Балансы:** UNI: 179,637.82, TON: 0.049896
- **Транзакций:** 5+
- **UNI Farming:** АКТИВЕН
- **TON Boost:** АКТИВЕН
- **Статус:** ПОЛНОСТЬЮ ФУНКЦИОНАЛЕН

## 🚨 ПРИЧИНА ПРОБЛЕМЫ

1. **Дублирование при регистрации** - пользователь зарегистрировался дважды
2. **Разные Telegram ID** - система создала два отдельных аккаунта
3. **Одинаковый username** - нарушает уникальность
4. **Новый аккаунт пустой** - пользователь использует старый рабочий аккаунт

## 🎯 ПЛАН ИСПРАВЛЕНИЯ

### **ВАРИАНТ 1: УДАЛЕНИЕ ПУСТОГО АККАУНТА (РЕКОМЕНДУЕМЫЙ)**

**Преимущества:**
- Простое и безопасное решение
- Сохраняет все рабочие данные
- Убирает путаницу с дублированием

**Шаги:**
```sql
-- 1. Бэкап пустого аккаунта
CREATE TABLE backup_dima_254_before_deletion AS
SELECT * FROM users WHERE id = 254;

-- 2. Удаление пустого аккаунта
DELETE FROM users WHERE id = 254;

-- 3. Проверка уникальности username
SELECT COUNT(*) FROM users WHERE username = 'Dima_27976';
-- Должно вернуть 1
```

### **ВАРИАНТ 2: ПЕРЕИМЕНОВАНИЕ ПУСТОГО АККАУНТА**

**Если нужно сохранить пустой аккаунт:**
```sql
-- Переименовать пустой аккаунт
UPDATE users 
SET username = 'Dima_27976_duplicate_inactive',
    ref_code = 'REF_INACTIVE_' || EXTRACT(epoch FROM NOW())
WHERE id = 254;
```

### **ВАРИАНТ 3: ОБЪЕДИНЕНИЕ АККАУНТОВ (СЛОЖНЫЙ)**

**Только если есть ценные данные в обоих:**
- Перенести все транзакции с ID 254 на ID 244
- Обновить все связанные таблицы
- Удалить пустой аккаунт

## ⚡ ГОТОВЫЕ КОМАНДЫ ДЛЯ ВЫПОЛНЕНИЯ

### **КОМАНДА 1: БЭКАП И ДИАГНОСТИКА**
```sql
-- Создать бэкапы
CREATE TABLE backup_dima_accounts_2025_07_31 AS
SELECT * FROM users WHERE username = 'Dima_27976';

-- Проверить связанные данные
SELECT 
    'СВЯЗАННЫЕ_ДАННЫЕ' as type,
    u.id,
    u.username,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.id) as sessions_count,
    (SELECT COUNT(*) FROM ton_farming_data WHERE user_id = u.id::text) as farming_count
FROM users u 
WHERE u.username = 'Dima_27976'
ORDER BY u.id;
```

### **КОМАНДА 2: БЕЗОПАСНОЕ УДАЛЕНИЕ ПУСТОГО АККАУНТА**
```sql
BEGIN;

-- Финальная проверка что аккаунт 254 действительно пустой
SELECT 
    id, balance_uni, balance_ton,
    (SELECT COUNT(*) FROM transactions WHERE user_id = 254) as tx_count
FROM users WHERE id = 254;

-- Если все нули - удаляем
DELETE FROM users WHERE id = 254 AND balance_uni = 0 AND balance_ton = 0;

-- Проверяем результат
SELECT COUNT(*) as remaining_dima_accounts 
FROM users WHERE username = 'Dima_27976';

COMMIT;
```

### **КОМАНДА 3: ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЯ**
```sql
-- Проверить что остался только рабочий аккаунт
SELECT 
    'РЕЗУЛЬТАТ_ИСПРАВЛЕНИЯ' as status,
    id,
    username,
    telegram_id,
    balance_uni,
    balance_ton,
    uni_farming_active,
    ton_boost_active,
    (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as tx_count
FROM users 
WHERE username = 'Dima_27976';
```

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправления:
- ✅ Останется только один аккаунт @Dima_27976 (ID: 244)
- ✅ Рабочий аккаунт с балансами: UNI: 179,637.82, TON: 0.049896
- ✅ Активный UNI Farming и TON Boost
- ✅ История транзакций сохранена
- ✅ Уникальность username восстановлена
- ✅ Полная совместимость с User ID 25

**Время выполнения:** 2-5 минут  
**Риск:** МИНИМАЛЬНЫЙ (удаляем только пустой аккаунт)  
**Статус:** ГОТОВ К ЗАПУСКУ