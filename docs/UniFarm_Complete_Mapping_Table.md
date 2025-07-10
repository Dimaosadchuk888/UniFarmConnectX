# UniFarm - Полная таблица соответствий функций, БД и транзакций

## Сводная таблица соответствий

| № | Модуль | Основные функции | Файлы | Таблицы БД | Ключевые поля | Типы транзакций | Статус |
|---|--------|------------------|-------|------------|---------------|-----------------|--------|
| 1 | **auth** | JWT авторизация, Telegram auth | modules/auth/* | users, user_sessions, auth_users | telegram_id, username, session_token, expires_at | - | ✅ Полный |
| 2 | **user** | Профили, балансы | modules/user/* | users | id, telegram_id, balance_uni, balance_ton, ref_code | - | ⚠️ Доп. поля в БД |
| 3 | **wallet** | Управление балансами | modules/wallet/* | users, transactions, withdraw_requests | balance_uni, balance_ton, ton_wallet_address | DEPOSIT, WITHDRAWAL | ✅ Полный |
| 4 | **farming** | UNI фарминг | modules/farming/* | users, farming_deposits, uni_farming_deposits | amount_uni, rate_uni, last_claim | FARMING_REWARD | ⚠️ FARMING_DEPOSIT отсутствует |
| 5 | **tonFarming** | TON фарминг | modules/tonFarming/* | ton_boost_deposits, users* | ton_amount, rate_ton_per_second | FARMING_REWARD | ⚠️ Доп. поля в users |
| 6 | **boost** | TON Boost пакеты | modules/boost/* | boost_deposits, ton_boost_deposits | boost_id, bonus_uni, end_date | BOOST_REWARD | ⚠️ BOOST_PURCHASE отсутствует |
| 7 | **referral** | Реферальная система | modules/referral/* | referrals, referral_earnings | inviter_id, level (1-20), reward_uni | REFERRAL_REWARD | ✅ Полный |
| 8 | **missions** | Миссии и задания | modules/missions/* | missions, user_missions | type, reward_uni, completed_at | MISSION_REWARD | ✅ Полный |
| 9 | **dailyBonus** | Ежедневные бонусы | modules/dailyBonus/* | users, transactions, daily_bonus_logs* | checkin_streak, checkin_last_date | DAILY_BONUS | ⚠️ daily_bonus_logs отсутствует |
| 10 | **transactions** | История операций | modules/transactions/* | transactions | transaction_type, amount, currency, status | Все типы | ✅ Полный |
| 11 | **airdrop** | Распределение токенов | modules/airdrop/* | airdrops* | - | - | ❌ Таблица отсутствует |
| 12 | **telegram** | Telegram Mini App | modules/telegram/* | users | telegram_id, username, first_name | - | ✅ Полный |
| 13 | **admin** | Админ-панель | modules/admin/* | users | is_admin | - | ✅ Полный |
| 14 | **adminBot** | Telegram админ-бот | modules/adminBot/* | users, withdraw_requests | - | - | ⚠️ withdraw_requests частично |
| 15 | **monitor** | Системный мониторинг | modules/monitor/* | Все таблицы | - | - | ✅ Полный |
| 16 | **scheduler** | Фоновые задачи | modules/scheduler/* | farming_deposits, ton_boost_deposits | - | FARMING_REWARD, BOOST_REWARD | ✅ Полный |
| 17 | **debug** | Инструменты отладки | modules/debug/* | Все таблицы | - | - | ✅ Полный |

*Примечание: ✅ = Полностью реализовано, ⚠️ = Частично/Есть проблемы, ❌ = Отсутствует

## Детальные несоответствия и проблемы

### 1. Отсутствующие типы транзакций в enum
В коде используются, но отсутствуют в TransactionType enum:
- `FARMING_DEPOSIT` - используется при создании депозитов фарминга
- `BOOST_PURCHASE` - используется при покупке буст-пакетов
- `AIRDROP_CLAIM` - может использоваться для airdrop

### 2. Недокументированные поля в таблице users
Поля существуют в БД, но отсутствуют в schema.ts:
```sql
- ton_boost_package: integer
- ton_farming_balance: numeric
- ton_farming_rate: numeric
- ton_farming_start_timestamp: timestamp
- ton_farming_last_update: timestamp
- ton_farming_accumulated: numeric
- ton_farming_last_claim: timestamp
- ton_boost_active: boolean
- ton_boost_package_id: integer
- ton_boost_rate: numeric
- uni_farming_active: boolean
- parent_ref_code: text
- ton_wallet_verified: boolean
- ton_wallet_linked_at: timestamp
```

### 3. Отсутствующие таблицы
Упоминаются в коде, но отсутствуют в БД:
- `airdrops` - для модуля airdrop
- `daily_bonus_logs` - для истории ежедневных бонусов
- `withdraw_requests` - частично создана (нужны дополнительные поля)

### 4. Дублирование данных
- Балансы хранятся и в `users`, и в `user_balances`
- Фарминг данные дублируются между `users` и отдельными таблицами

### 5. Отсутствие Repository слоя
Большинство модулей не имеют отдельного Repository слоя, что приводит к:
- Смешиванию бизнес-логики с работой БД
- Дублированию кода запросов
- Сложности в тестировании

## Рекомендации по исправлению

### Приоритет 1 (Критические)
1. **Добавить недостающие типы транзакций в enum**
   ```sql
   ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
   ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
   ```

2. **Синхронизировать schema.ts с реальной БД**
   - Добавить все недостающие поля в определение таблицы users
   - Создать миграцию для документирования изменений

### Приоритет 2 (Важные)
1. **Создать недостающие таблицы**
   ```sql
   -- Таблица airdrops
   CREATE TABLE airdrops (
     id SERIAL PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     total_amount NUMERIC(18,6),
     currency TEXT,
     start_date TIMESTAMP,
     end_date TIMESTAMP,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Таблица daily_bonus_logs
   CREATE TABLE daily_bonus_logs (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     bonus_amount NUMERIC(18,6),
     streak_day INTEGER,
     claimed_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Добавить Repository слой для всех модулей**
   - Использовать созданные шаблоны
   - Вынести всю работу с БД из Service в Repository

### Приоритет 3 (Улучшения)
1. **Устранить дублирование данных**
   - Решить где хранить балансы (предпочтительно в отдельной таблице)
   - Унифицировать хранение фарминг данных

2. **Добавить индексы для оптимизации**
   ```sql
   CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);
   CREATE INDEX idx_referrals_inviter_level ON referrals(inviter_id, level);
   ```

3. **Внедрить транзакционность**
   - Использовать database transactions для критических операций
   - Реализовать механизм отката при ошибках

## Матрица использования транзакций по модулям

| Модуль | FARMING_REWARD | BOOST_REWARD | MISSION_REWARD | DAILY_BONUS | REFERRAL_REWARD | WITHDRAWAL | DEPOSIT |
|--------|----------------|--------------|----------------|-------------|-----------------|------------|---------|
| farming | ✅ Создает | - | - | - | - | - | - |
| tonFarming | ✅ Создает | - | - | - | - | - | - |
| boost | - | ✅ Создает | - | - | - | - | - |
| missions | - | - | ✅ Создает | - | - | - | - |
| dailyBonus | - | - | - | ✅ Создает | - | - | - |
| referral | - | - | - | - | ✅ Создает | - | - |
| wallet | - | - | - | - | - | ✅ Создает | ✅ Создает |
| scheduler | ✅ Инициирует | ✅ Инициирует | - | - | ✅ Инициирует | - | - |

## Итоговые метрики

- **Общее количество модулей**: 17
- **Полностью готовые модули**: 9 (53%)
- **Модули с проблемами**: 7 (41%)
- **Отсутствующие компоненты**: 1 (6%)
- **Покрытие Repository слоем**: 0% (требует внедрения)
- **Соответствие схемы БД коду**: ~70%

---
*Документ создан: ${new Date().toISOString()}*
*На основе анализа кода и результатов аудита БД*