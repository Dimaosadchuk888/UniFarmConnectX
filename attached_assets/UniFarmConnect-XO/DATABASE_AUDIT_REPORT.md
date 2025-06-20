# DATABASE AUDIT REPORT - UniFarm

## Текущее состояние базы данных

### Существующие таблицы в PostgreSQL:
1. `auth_users` (3 поля)
2. `farming_deposits` (6 полей) 
3. `missions` (6 полей)
4. `referrals` (7 полей)
5. `transactions` (13 полей)
6. `user_missions` (8 полей)
7. `users` (21 поле)

## Критические несоответствия с Drizzle схемой

### 1. Таблица `users` - дублирование полей
**Проблема**: Дублирование балансов
- `uni_balance` (устаревшее)
- `balance_uni` (актуальное) 
- `ton_balance` (устаревшее)
- `balance_ton` (актуальное)

### 2. Таблица `farming_deposits` - структурные различия
**В БД**: `amount`, `start_time`, `hourly_rate`, `boost_active`
**В схеме**: `amount_uni`, `rate_uni`, `rate_ton`, `is_boosted`

### 3. Таблица `missions` - несоответствие полей
**В БД**: `reward`, `mission_type`
**В схеме**: `reward_uni`, `type`

### 4. Таблица `transactions` - лишние поля
**Неиспользуемые поля**: `category`, `tx_hash`, `description`, `source_user_id`, `wallet_address`, `data`

### 5. Отсутствующие таблицы из схемы
- `uni_farming_deposits`
- `boost_deposits` 
- `ton_boost_deposits`
- `boost_packages`
- `ton_boost_packages`
- `user_boosts`
- Логгинг таблицы

## Предложения по рефакторингу

### Удалить устаревшие поля из `users`:
- `uni_balance` (заменено на `balance_uni`)
- `ton_balance` (заменено на `balance_ton`)

### Привести в соответствие `farming_deposits`:
- `amount` → `amount_uni`
- `hourly_rate` → `rate_uni` 
- `boost_active` → `is_boosted`
- Добавить: `rate_ton`, `deposit_type`, `boost_id`, `expires_at`

### Обновить `missions`:
- `reward` → `reward_uni`
- `mission_type` → `type`

### Очистить `transactions`:
- Удалить неиспользуемые поля: `category`, `tx_hash`, `description`, `source_user_id`, `wallet_address`, `data`
- Переименовать `type` → `transaction_type`

### Создать недостающие таблицы:
- Boost-система (`boost_packages`, `user_boosts`)
- Логгинг система
- Расширенные фарминг таблицы