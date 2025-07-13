# 📊 DATABASE STRUCTURE COMPARISON REPORT - UNIFARM VS ACTUAL DB

**Дата:** 13 января 2025  
**Статус:** ✅ СТРУКТУРНЫЙ АНАЛИЗ ЗАВЕРШЕН

## 📋 Executive Summary

Проведен полный анализ соответствия структуры базы данных с системой UniFarm. Обнаружены критические несоответствия в полях и типах данных, влияющие на работу TON Boost и других модулей.

---

## 🎯 1. ТАБЛИЦА USERS - АНАЛИЗ ПОЛЕЙ

### 📊 Базовые поля пользователя
| Поле | В БД | Тип в БД | Используется в коде | Проблемы |
|------|------|----------|-------------------|----------|
| id | ✅ | number | ✅ | - |
| telegram_id | ✅ | number | ✅ | - |
| username | ✅ | string | ✅ | - |
| first_name | ✅ | string | ✅ | - |
| wallet | ✅ | object | ❌ | Не используется в новом коде |
| ref_code | ✅ | string | ✅ | - |
| is_admin | ✅ | boolean | ✅ | - |
| created_at | ✅ | string | ✅ | - |

### 💰 Поля балансов
| Поле | В БД | Тип в БД | Используется в коде | Проблемы |
|------|------|----------|-------------------|----------|
| balance_uni | ✅ | number | ✅ | - |
| balance_ton | ✅ | number | ✅ | - |

### 🌾 UNI Farming поля
| Поле | В БД | Тип в БД | Используется в коде | Проблемы |
|------|------|----------|-------------------|----------|
| uni_deposit_amount | ✅ | number | ✅ | - |
| uni_farming_start_timestamp | ✅ | object (null) | ✅ | - |
| uni_farming_balance | ✅ | number | ✅ | - |
| uni_farming_rate | ✅ | number | ✅ | - |
| uni_farming_last_update | ✅ | object (null) | ✅ | - |
| uni_farming_deposit | ✅ | number | ❌ | Дублирует uni_deposit_amount |
| uni_farming_active | ❌ | - | ✅ | **ОТСУТСТВУЕТ В БД!** |
| uni_farming_activated_at | ❌ | - | ❌ | В скриптах есть, в БД нет |

### ⚡ TON Boost поля
| Поле | В БД | Тип в БД | Используется в коде | Проблемы |
|------|------|----------|-------------------|----------|
| ton_boost_package | ✅ | number | ❌ | Устаревшее поле |
| ton_boost_active | ✅ | boolean | ✅ | - |
| ton_boost_package_id | ✅ | object (null) | ✅ | - |
| ton_boost_rate | ✅ | number | ✅ | - |
| ton_boost_expires_at | ✅ | object (null) | ✅ | - |
| ton_farming_balance | ✅ | number | ✅ | **Всегда 0 - НЕ ОБНОВЛЯЕТСЯ!** |
| ton_farming_rate | ✅ | number | ✅ | - |
| ton_farming_start_timestamp | ✅ | object (null) | ✅ | - |
| ton_farming_last_update | ✅ | object (null) | ✅ | - |
| ton_farming_accumulated | ✅ | number | ✅ | - |
| ton_farming_last_claim | ✅ | object (null) | ❌ | Не используется |
| ton_farming_deposit | ❌ | - | ❌ | В скриптах есть, в БД нет |

### 📅 Daily Bonus поля
| Поле | В БД | Тип в БД | Используется в коде | Проблемы |
|------|------|----------|-------------------|----------|
| checkin_last_date | ✅ | string | ✅ | - |
| checkin_streak | ✅ | number | ✅ | - |

### 👤 Референция и другие поля
| Поле | В БД | Тип в БД | Используется в коде | Проблемы |
|------|------|----------|-------------------|----------|
| referred_by | ✅ | object (null) | ❌ | Устаревшее |
| parent_ref_code | ✅ | string | ✅ | - |
| ref_level | ✅ | number | ✅ | - |
| referrer_id | ✅ | number | ✅ | - |
| last_active | ❌ | - | ✅ | **КОД ОЖИДАЕТ, НО ПОЛЯ НЕТ!** |

---

## 🔧 2. КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 🔴 1. Поле uni_farming_active отсутствует в БД
- **Влияние:** UI показывает статус фарминга неправильно
- **Где используется:** UniFarmingCard.tsx, farming/service.ts
- **Решение:** Добавить поле в БД или использовать uni_deposit_amount > 0

### 🔴 2. Поле ton_farming_balance не обновляется
- **Значение:** Всегда 0 для всех пользователей
- **Влияние:** Планировщик использует balance_ton вместо депозита
- **Решение:** Обновлять при покупке TON Boost

### 🔴 3. Поле last_active вызывает ошибки
- **Проблема:** Код ожидает поле, которого нет в БД
- **Влияние:** Ошибки в getUserStats и других методах
- **Решение:** Удалить все ссылки из кода

### 🟡 4. Дублирующие поля
- uni_farming_deposit дублирует uni_deposit_amount
- ton_boost_package дублирует ton_boost_package_id
- referred_by дублирует referrer_id

---

## 📋 3. ТАБЛИЦЫ И ИХ СОСТОЯНИЕ

### Существующие таблицы:
1. **users** - 60 записей ✅
2. **transactions** - 536,803 записей ✅
3. **withdraw_requests** - 3 записи ✅
4. **missions** - 5 записей ✅
5. **referrals** - 0 записей ⚠️ (пустая)
6. **farming_sessions** - 0 записей ⚠️ (пустая)
7. **boost_purchases** - 0 записей ⚠️ (пустая)

### Отсутствующие таблицы:
1. **user_sessions** ❌
2. **user_missions** ❌
3. **daily_bonus_logs** ❌
4. **airdrops** ❌
5. **ton_farming_data** ❌ (планировалась для оптимизации)
6. **uni_farming_data** ❌ (планировалась для оптимизации)

---

## 📊 4. ТИПЫ ТРАНЗАКЦИЙ

### Существующие в БД:
- FARMING_REWARD ✅
- REFERRAL_REWARD ✅
- MISSION_REWARD ✅
- DAILY_BONUS ✅
- WITHDRAWAL ✅
- BOOST_PURCHASE ✅ (новый)

### Отсутствующие в БД:
- FARMING_DEPOSIT ❌
- AIRDROP_CLAIM ❌
- TON_BOOST_INCOME ❌ (использовался в коде)

---

## 🎯 5. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### Приоритет 1 - Критические:
1. **Добавить поле uni_farming_active в users**:
   ```sql
   ALTER TABLE users ADD COLUMN uni_farming_active BOOLEAN DEFAULT false;
   ```

2. **Исправить обновление ton_farming_balance при покупке**:
   - Обновить метод activateBoost() в TonFarmingRepository
   - Добавить обновление farming_balance при покупке

3. **Удалить все ссылки на last_active из кода**:
   - modules/user/controller.ts
   - BalanceManager и связанные файлы

### Приоритет 2 - Важные:
1. **Добавить отсутствующие типы транзакций**:
   ```sql
   ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
   ALTER TYPE transaction_type ADD VALUE 'AIRDROP_CLAIM';
   ```

2. **Создать отсутствующие таблицы**:
   - daily_bonus_logs для истории бонусов
   - user_missions для прогресса миссий
   - airdrops для будущих раздач

### Приоритет 3 - Оптимизация:
1. **Удалить дублирующие поля**
2. **Реализовать таблицы ton_farming_data и uni_farming_data**
3. **Обновить индексы для производительности**

---

## 📈 6. ВЛИЯНИЕ НА СИСТЕМУ

### Текущее влияние проблем:
- 🔴 **TON Boost доход завышен в 167 раз** из-за использования balance_ton
- 🟡 **UNI Farming статус** может отображаться неправильно
- 🟡 **Ошибки в логах** из-за несуществующих полей
- 🟢 **Базовый функционал работает** несмотря на проблемы

### После исправления:
- ✅ Корректный расчет дохода TON Boost
- ✅ Правильное отображение статусов
- ✅ Чистые логи без ошибок
- ✅ Готовность к масштабированию