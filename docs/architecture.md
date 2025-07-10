# UniFarm - Полная архитектура и карта проекта

## Обзор системы

UniFarm - это Telegram Mini App для blockchain образования с интегрированной системой фарминга, рефералов и вознаграждений. Проект построен на современном стеке с использованием React/TypeScript на фронтенде и Express/TypeScript на бэкенде с PostgreSQL/Supabase в качестве базы данных.

## Структура модулей

Проект имеет модульную архитектуру с 17 основными модулями, каждый из которых следует стандартной структуре:
- `controller.ts` - HTTP контроллеры и обработчики запросов
- `service.ts` - Бизнес-логика модуля
- `routes.ts` - Маршрутизация
- `model.ts` - Константы и модели данных
- `types.ts` - TypeScript типы и интерфейсы

## Схема базы данных

База данных использует Drizzle ORM с PostgreSQL. Основные таблицы определены в `shared/schema.ts`.

### Enum типы

#### TransactionType
```sql
FARMING_REWARD, BOOST_REWARD, MISSION_REWARD, DAILY_BONUS, REFERRAL_REWARD, WITHDRAWAL, DEPOSIT
```

#### FarmingType
```sql
UNI_FARMING, TON_FARMING, BOOST_FARMING
```

## Полная таблица соответствий

| № | Функция / Сервис | Файл(ы) | Таблица БД | Ключевые колонки | Транзакция (тип) | Комментарии |
|---|------------------|----------|------------|------------------|------------------|-------------|
| 1 | **Аутентификация** | modules/auth/* | users, user_sessions, auth_users | users: telegram_id, username, ref_code<br>user_sessions: session_token, expires_at | - | JWT авторизация через Telegram |
| 2 | **Управление пользователями** | modules/user/* | users | id, telegram_id, balance_uni, balance_ton, ref_code, parent_ref_code | - | Профили и балансы пользователей |
| 3 | **Кошелек** | modules/wallet/* | users, transactions | balance_uni, balance_ton, ton_wallet_address | DEPOSIT, WITHDRAWAL | Управление балансами UNI/TON |
| 4 | **UNI Фарминг** | modules/farming/* | users, farming_deposits, uni_farming_deposits, transactions | uni_deposit_amount, uni_farming_balance, uni_farming_rate | FARMING_REWARD | Депозиты и начисления UNI |
| 5 | **TON Фарминг** | modules/tonFarming/* | ton_boost_deposits | ton_amount, rate_ton_per_second, accumulated_ton | FARMING_REWARD | TON фарминг с бустами |
| 6 | **Boost пакеты** | modules/boost/* | boost_deposits, ton_boost_deposits | boost_id, bonus_uni, start_date, end_date | BOOST_REWARD | TON Boost пакеты 1-4 |
| 7 | **Реферальная система** | modules/referral/* | referrals, referral_earnings | user_id, inviter_id, level (1-20), reward_uni | REFERRAL_REWARD | 20-уровневая система |
| 8 | **Миссии** | modules/missions/* | missions, user_missions | type, reward_uni, completed_at | MISSION_REWARD | Задания и награды |
| 9 | **Ежедневный бонус** | modules/dailyBonus/* | users, transactions | checkin_streak, checkin_last_date | DAILY_BONUS | Ежедневные награды |
| 10 | **Транзакции** | modules/transactions/* | transactions | transaction_type, amount, currency, status | Все типы | История всех операций |
| 11 | **Airdrop** | modules/airdrop/* | airdrops (планируется) | - | - | Распределение токенов |
| 12 | **Telegram интеграция** | modules/telegram/* | users | telegram_id, username, first_name | - | Telegram Mini App API |
| 13 | **Админ-панель** | modules/admin/* | users | is_admin | - | Административный интерфейс |
| 14 | **Админ-бот** | modules/adminBot/* | users, withdraw_requests | - | - | Telegram бот для админов |
| 15 | **Мониторинг** | modules/monitor/* | Все таблицы | - | - | Системный мониторинг |
| 16 | **Планировщик** | modules/scheduler/* | farming_deposits, ton_boost_deposits | - | FARMING_REWARD, BOOST_REWARD | Фоновые задачи |
| 17 | **Отладка** | modules/debug/* | Все таблицы | - | - | Инструменты разработки |

## Детальная структура таблиц

### 1. users
Основная таблица пользователей с балансами и настройками фарминга.

```sql
- id: serial PRIMARY KEY
- telegram_id: bigint UNIQUE
- username, first_name: text
- wallet, ton_wallet_address: text
- ref_code: text UNIQUE
- parent_ref_code: text
- referred_by: integer
- balance_uni, balance_ton: numeric(18,6)
- uni_deposit_amount, uni_farming_balance: numeric(18,6)
- uni_farming_start_timestamp: timestamp
- checkin_streak: integer
- is_admin: boolean
```

### 2. transactions
История всех финансовых операций.

```sql
- id: serial PRIMARY KEY
- user_id: integer REFERENCES users(id)
- transaction_type: text (enum)
- currency: text (UNI/TON)
- amount: numeric(18,6)
- status: text DEFAULT 'confirmed'
- source, category, description: text
- created_at: timestamp
```

### 3. referrals
Реферальные связи и награды.

```sql
- id: serial PRIMARY KEY
- user_id: integer REFERENCES users(id)
- inviter_id: integer REFERENCES users(id)
- level: integer (1-20)
- reward_uni, reward_ton: numeric(18,6)
- ref_path: json[]
- created_at: timestamp
```

### 4. farming_deposits
Депозиты для фарминга (UNI).

```sql
- id: serial PRIMARY KEY
- user_id: integer REFERENCES users(id)
- amount_uni: numeric(18,6)
- rate_uni, rate_ton: numeric(5,2)
- is_boosted: boolean
- deposit_type: text
- boost_id: integer
```

### 5. ton_boost_deposits
TON Boost пакеты для ускорения фарминга.

```sql
- id: serial PRIMARY KEY
- user_id: integer REFERENCES users(id)
- boost_package_id: integer (1-4)
- ton_amount: numeric(18,5)
- bonus_uni: numeric(18,6)
- rate_ton_per_second, rate_uni_per_second: numeric(20,18)
- accumulated_ton: numeric(18,10)
```

### 6. missions
Доступные миссии и задания.

```sql
- id: serial PRIMARY KEY
- type: text
- title, description: text
- reward_uni: numeric(18,6)
- is_active: boolean DEFAULT true
```

### 7. user_missions
Прогресс выполнения миссий пользователями.

```sql
- id: serial PRIMARY KEY
- user_id: integer REFERENCES users(id)
- mission_id: integer REFERENCES missions(id)
- completed_at: timestamp
```

### 8. user_sessions
Сессии авторизации пользователей.

```sql
- id: serial PRIMARY KEY
- user_id: integer REFERENCES users(id)
- session_token: text UNIQUE
- telegram_init_data: text
- expires_at: timestamp
- ip_address, user_agent: text
```

## Обнаруженные проблемы и несоответствия

### 1. Несоответствие типов транзакций
- **Проблема**: В коде используются типы транзакций (FARMING_DEPOSIT, BOOST_PURCHASE) которых нет в enum базы данных
- **Решение**: Добавить недостающие типы в TransactionType enum

### 2. Дублирование данных
- **Проблема**: Балансы хранятся и в users, и в user_balances таблице
- **Решение**: Использовать единое место хранения, предпочтительно отдельную таблицу

### 3. Отсутствующие таблицы
- **Проблема**: Некоторые таблицы упоминаются в коде, но отсутствуют в БД:
  - withdraw_requests (для модуля adminBot)
  - airdrops (для модуля airdrop)
  - daily_bonus_logs
- **Решение**: Создать недостающие таблицы согласно SQL из TODO_SUPABASE_SYNC.md

### 4. Несогласованность полей
- **Проблема**: В коде используются поля, которых нет в таблицах:
  - users.ton_boost_package (используется в boost модуле)
  - users.uni_farming_active (используется в farming модуле)
- **Решение**: Добавить недостающие поля или переработать логику

### 5. Отсутствие Repository слоя
- **Проблема**: Модули не имеют отдельного Repository слоя, смешивая бизнес-логику с работой БД
- **Решение**: Добавить Repository файлы для каждого модуля

## Рекомендации по улучшению

### 1. Архитектурные улучшения
- Внедрить Repository паттерн для всех модулей
- Использовать единый BalanceManager для всех операций с балансами
- Централизовать управление транзакциями через TransactionService

### 2. Оптимизация БД
- Добавить недостающие индексы для часто используемых запросов
- Нормализовать структуру реферальных связей
- Оптимизировать хранение истории фарминга

### 3. Безопасность
- Добавить rate limiting для критических операций
- Внедрить двухфакторную аутентификацию для админов
- Логировать все финансовые операции

### 4. Масштабируемость
- Вынести тяжелые вычисления в фоновые задачи
- Реализовать кеширование для часто запрашиваемых данных
- Оптимизировать запросы к БД

## Созданные шаблоны кода

В директории `/docs/code-templates/` созданы следующие шаблоны для быстрого развертывания новых модулей:

### Базовые шаблоны
1. **BaseController.template.ts** - Шаблон контроллера с CRUD операциями
2. **BaseService.template.ts** - Шаблон сервиса с бизнес-логикой
3. **BaseRepository.template.ts** - Шаблон репозитория для работы с БД через Supabase
4. **BaseTypes.template.ts** - Шаблон типов и интерфейсов
5. **BaseRoutes.template.ts** - Шаблон маршрутизации API
6. **BaseValidation.template.ts** - Шаблон Zod схем для валидации

### Специализированные шаблоны модулей
1. **modules/WalletRepository.template.ts** - Репозиторий для модуля Wallet
2. **modules/FarmingRepository.template.ts** - Репозиторий для модуля Farming
3. **modules/ReferralRepository.template.ts** - Репозиторий для модуля Referral

### Использование шаблонов
Для создания нового модуля:
1. Скопируйте базовые шаблоны в новую директорию модуля
2. Замените плейсхолдеры:
   - `{{MODULE_NAME}}` - название модуля в PascalCase (например, `UserProfile`)
   - `{{MODULE_NAME_LOWER}}` - название модуля в camelCase (например, `userProfile`)
   - `{{MODULE_NAME_UPPER}}` - название модуля в UPPER_CASE (например, `USER_PROFILE`)
   - `{{TABLE_NAME}}` - название таблицы в БД
   - `{{TRANSACTION_TYPE}}` - тип транзакции из enum
3. Добавьте специфичную для модуля логику в места с комментариями `TODO`

## Следующие шаги

1. Создать недостающие таблицы в БД согласно рекомендациям
2. Применить Repository паттерн используя созданные шаблоны
3. Синхронизировать типы транзакций между кодом и БД
4. Реализовать централизованное управление балансами
5. Добавить комплексное логирование и мониторинг

## Архив с шаблонами

Все шаблоны и документация упакованы в архив: `/docs/UniFarm_Code_Templates.tar.gz`

Для распаковки используйте:
```bash
tar -xzf UniFarm_Code_Templates.tar.gz
```

---

*Документ обновлен: ${new Date().toISOString()}*
*Версия: 2.0*