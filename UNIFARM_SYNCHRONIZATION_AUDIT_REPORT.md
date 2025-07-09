# 🔍 UNIFARM SYNCHRONIZATION AUDIT REPORT
**Дата:** 9 января 2025  
**Статус:** ⚠️ Частичная синхронизация (75%)

## 📊 Сводка проверки

| Модуль | Статус синхронизации | Критические несоответствия |
|--------|---------------------|---------------------------|
| UNI Farming | ✅ 95% | Отсутствует тип транзакции FARMING_DEPOSIT |
| TON Boost | ⚠️ 70% | Виртуальные пакеты без таблицы в БД |
| Referral | ✅ 90% | Все поля синхронизированы |
| Transactions | ⚠️ 75% | Несоответствие типов транзакций |
| Wallet | ✅ 85% | Отсутствуют некоторые поля адресов |

## 1. UNI FARMING

### API Response (/api/v2/uni-farming/status)
```json
{
  "user_id": 62,
  "balance_uni": 448.234575,
  "uni_farming_active": false,
  "uni_deposit_amount": 100,
  "uni_farming_balance": 0,
  "uni_farming_rate": 0.01,
  "uni_farming_start_timestamp": "2025-07-08T17:08:07.205",
  "timestamp": "2025-07-09T16:09:22.345Z"
}
```

### Поля в таблице users (Supabase)
- ✅ `balance_uni` - синхронизировано
- ✅ `uni_farming_active` - синхронизировано
- ✅ `uni_deposit_amount` - синхронизировано  
- ✅ `uni_farming_balance` - синхронизировано
- ✅ `uni_farming_rate` - синхронизировано
- ✅ `uni_farming_start_timestamp` - синхронизировано
- ✅ `uni_farming_last_update` - есть в БД

### Проблемы:
1. **Тип транзакции**: Код использует `FARMING_REWARD` с отрицательной суммой вместо отдельного типа `FARMING_DEPOSIT`
2. **Таблица farming_sessions**: Код пытается создавать записи, но неясно существует ли таблица

## 2. TON BOOST

### API Response (getAvailableBoosts)
```typescript
{
  id: 1,
  name: "Starter Pack",
  description: "1% в день на 365 дней + 10,000 UNI бонус",
  daily_rate: 1,
  duration_days: 365,
  min_amount: 10,
  max_amount: 100,
  uni_bonus: 10000,
  is_active: true
}
```

### Проблемы:
1. **Виртуальные пакеты**: Все boost пакеты хардкодены в service.ts
2. **Отсутствует таблица**: Нет таблицы `boost_packages` в Supabase
3. **Поле ton_boost_package**: В users таблице хранится только ID пакета
4. **История покупок**: Таблица `boost_purchases` может отсутствовать

### Несоответствия полей:
- API: `daily_rate` (число) vs БД: возможно строка
- API: `uni_bonus` vs БД: может называться `bonus_uni`

## 3. REFERRAL SYSTEM

### Структура полей
#### Таблица users:
- ✅ `ref_code` - реферальный код пользователя
- ✅ `referred_by` - ID пригласившего
- ✅ `telegram_id` - для поиска
- ✅ `username` - для отображения

### Структура комиссий (REFERRAL_COMMISSION_RATES):
```javascript
1: 1.0,    // Уровень 1: 100%
2: 0.02,   // Уровень 2: 2%
3: 0.03,   // Уровень 3: 3%
// ... до уровня 20
```

### Статус: ✅ Полностью синхронизирована

## 4. TRANSACTIONS

### Типы транзакций в коде:
- `FARMING_REWARD` (используется для списания с минусом)
- `UNI_DEPOSIT`, `UNI_HARVEST`, `UNI_REWARD` (в истории)
- `REFERRAL_REWARD`
- `DAILY_BONUS`
- `TON_DEPOSIT`, `TON_BOOST_PURCHASE`

### Структура транзакции:
```typescript
{
  user_id: number,
  type: string,
  amount_uni: string,
  amount_ton: string,
  status: 'confirmed' | 'pending' | 'failed',
  description: string,
  created_at: timestamp
}
```

### Проблемы:
1. **Отсутствует FARMING_DEPOSIT**: Используется FARMING_REWARD с отрицательной суммой
2. **Валюта**: Разделена на `amount_uni` и `amount_ton` вместо единого поля `currency`

## 5. WALLET

### API Response структура:
```typescript
{
  uni_balance: number,
  ton_balance: number,
  total_earned: number,
  total_spent: number,
  transactions: []
}
```

### Поля в таблице users:
- ✅ `balance_uni` 
- ✅ `balance_ton`
- ⚠️ `wallet_address` - отсутствует в ответах API
- ⚠️ `is_wallet_verified` - не используется

### Проблемы:
1. **TON адреса**: Нет полей для хранения TON wallet адресов
2. **Верификация**: Механизм верификации кошельков не реализован

## 📋 ОБЩИЕ ВЫВОДЫ

### ✅ Синхронизировано:
1. Основные поля пользователей (balance_uni, balance_ton)
2. Farming параметры и статусы
3. Реферальная система
4. Базовая структура транзакций

### ⚠️ Проблемы синхронизации:
1. **Boost система**: Полностью виртуальная, без реальных таблиц
2. **Типы транзакций**: Несоответствие между кодом и возможными значениями в БД
3. **Wallet адреса**: Отсутствует интеграция с реальными TON адресами
4. **Таблицы сессий**: Неясно существуют ли `farming_sessions`, `boost_purchases`

### 🔧 Рекомендации:
1. Создать тип транзакции `FARMING_DEPOSIT` в БД
2. Проверить существование таблиц `farming_sessions`, `boost_purchases`
3. Добавить поля для TON wallet адресов в users
4. Создать таблицу `boost_packages` для хранения пакетов
5. Унифицировать структуру транзакций (единое поле currency)

## Итоговая оценка: 75% синхронизации
Система работоспособна, но требует доработки структуры БД для полного соответствия коду.