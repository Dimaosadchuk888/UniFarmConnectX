# Структура базы данных UniFarm

Документация по структуре базы данных UniFarm, включая описание назначения таблиц, их полей, связей и индексов.

## Основные принципы работы с данными

1. **Запрет удаления данных** - система спроектирована для хранения всей истории операций без удаления.
2. **Индексация** - все таблицы имеют оптимизационные индексы для обеспечения высокой скорости запросов.
3. **Принцип целостности** - все связи между таблицами обеспечены ограничениями внешних ключей.
4. **Аналитические снимки** - система включает таблицы для периодического создания снимков состояния пользовательских балансов и фарминга.

## Таблицы и их назначение

### 1. users

**Назначение:** Хранение информации о пользователях системы.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор пользователя.
- `username` (VARCHAR) - Имя пользователя.
- `telegram_id` (INTEGER) - Идентификатор пользователя в Telegram (может быть NULL).
- `balance_uni` (NUMERIC) - Баланс UNI токенов.
- `balance_ton` (NUMERIC) - Баланс TON токенов.
- `ref_code` (VARCHAR) - Уникальный реферальный код пользователя.
- `guest_id` (VARCHAR) - Идентификатор для гостевых сессий.
- `parent_ref_code` (VARCHAR) - Реферальный код пригласившего пользователя.
- `created_at` (TIMESTAMP) - Дата и время создания аккаунта.

**Индексы:**
- PRIMARY KEY (`id`)
- UNIQUE (`telegram_id`)
- UNIQUE (`ref_code`)
- UNIQUE (`guest_id`)

**Связи:**
- С `transactions` через `user_id` (один ко многим)
- С `uni_farming_deposits` через `user_id` (один ко многим)
- С `referrals` через `user_id` и `inviter_id` (многие ко многим)
- С `user_missions` через `user_id` (один ко многим)

### 2. transactions

**Назначение:** Хранение всех финансовых операций в системе.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор транзакции.
- `user_id` (INTEGER) - Идентификатор пользователя, связанного с транзакцией.
- `type` (VARCHAR) - Тип транзакции (deposit, withdraw, farming_reward, и т.д.).
- `amount` (NUMERIC) - Сумма транзакции.
- `currency` (VARCHAR) - Валюта транзакции (UNI, TON).
- `status` (VARCHAR) - Статус транзакции (pending, completed, failed).
- `tx_hash` (VARCHAR) - Хеш транзакции в блокчейне (опционально).
- `wallet_address` (VARCHAR) - Адрес кошелька (опционально).
- `description` (TEXT) - Дополнительное описание транзакции.
- `created_at` (TIMESTAMP) - Дата и время создания транзакции.
- `updated_at` (TIMESTAMP) - Дата и время последнего обновления транзакции.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_transactions_user_id` (`user_id`)
- INDEX `idx_transactions_user_id_created_at` (`user_id`, `created_at` DESC)
- INDEX `idx_transactions_type` (`type`)
- INDEX `idx_transactions_currency` (`currency`)

**Связи:**
- С `users` через `user_id` (многие к одному)

### 3. uni_farming_deposits

**Назначение:** Хранение информации о депозитах UNI токенов в фарминг.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор депозита.
- `user_id` (INTEGER) - Идентификатор пользователя-владельца депозита.
- `amount` (NUMERIC) - Сумма депозита в UNI.
- `rate` (NUMERIC) - Ставка дохода (UNI в секунду).
- `is_active` (BOOLEAN) - Статус активности депозита.
- `last_harvest_time` (TIMESTAMP) - Время последнего сбора дохода.
- `created_at` (TIMESTAMP) - Время создания депозита.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_uni_farming_deposits_user_id` (`user_id`)

**Связи:**
- С `users` через `user_id` (многие к одному)

### 4. ton_boost_deposits

**Назначение:** Хранение информации о депозитах TON для бустов.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор депозита.
- `user_id` (INTEGER) - Идентификатор пользователя-владельца депозита.
- `amount` (NUMERIC) - Сумма депозита в TON.
- `boost_multiplier` (NUMERIC) - Множитель буста.
- `start_time` (TIMESTAMP) - Время начала действия буста.
- `end_time` (TIMESTAMP) - Время окончания действия буста.
- `is_active` (BOOLEAN) - Статус активности буста.
- `created_at` (TIMESTAMP) - Время создания депозита.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_ton_boost_deposits_user_id` (`user_id`)

**Связи:**
- С `users` через `user_id` (многие к одному)

### 5. referrals

**Назначение:** Хранение информации о реферальных отношениях между пользователями.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор реферальной связи.
- `user_id` (INTEGER) - Идентификатор реферала (приглашённого пользователя).
- `inviter_id` (INTEGER) - Идентификатор пригласившего пользователя.
- `level` (INTEGER) - Уровень реферальной связи (1-20).
- `created_at` (TIMESTAMP) - Время создания реферальной связи.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_referrals_user_id` (`user_id`)
- INDEX `idx_referrals_inviter_id` (`inviter_id`)

**Связи:**
- С `users` через `user_id` (многие к одному)
- С `users` через `inviter_id` (многие к одному)

### 6. missions

**Назначение:** Хранение информации о доступных миссиях/заданиях.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор миссии.
- `title` (VARCHAR) - Название миссии.
- `description` (TEXT) - Описание миссии.
- `reward_amount` (NUMERIC) - Размер награды за выполнение миссии.
- `reward_currency` (VARCHAR) - Валюта награды (UNI, TON).
- `is_active` (BOOLEAN) - Статус активности миссии.
- `requirements` (JSONB) - Требования для выполнения миссии.
- `created_at` (TIMESTAMP) - Время создания миссии.

**Индексы:**
- PRIMARY KEY (`id`)

### 7. user_missions

**Назначение:** Хранение информации о прогрессе пользователей в выполнении миссий.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор записи.
- `user_id` (INTEGER) - Идентификатор пользователя.
- `mission_id` (INTEGER) - Идентификатор миссии.
- `status` (VARCHAR) - Статус выполнения (not_started, in_progress, completed, rewarded).
- `progress` (JSONB) - Данные о прогрессе выполнения.
- `completed_at` (TIMESTAMP) - Время завершения миссии.
- `rewarded_at` (TIMESTAMP) - Время получения награды.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_user_missions_user_id_mission_id` (`user_id`, `mission_id`)

**Связи:**
- С `users` через `user_id` (многие к одному)
- С `missions` через `mission_id` (многие к одному)

### 8. auth_users

**Назначение:** Хранение аутентификационных данных для пользователей с ролями.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор записи.
- `user_id` (INTEGER) - Идентификатор пользователя.
- `role` (VARCHAR) - Роль пользователя (user, admin, superadmin).
- `password_hash` (VARCHAR) - Хеш пароля.
- `last_login` (TIMESTAMP) - Время последнего входа.
- `created_at` (TIMESTAMP) - Время создания записи.

**Индексы:**
- PRIMARY KEY (`id`)
- UNIQUE (`user_id`)

**Связи:**
- С `users` через `user_id` (один к одному)

### 9. farming_snapshots

**Назначение:** Хранение ежедневных снимков дохода от фарминга для аналитики.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор снимка.
- `user_id` (INTEGER) - Идентификатор пользователя.
- `total_earned` (NUMERIC) - Общая сумма заработанного на момент снимка.
- `snapshot_date` (TIMESTAMP) - Дата и время создания снимка.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_farming_snapshots_user_id` (`user_id`)
- INDEX `idx_farming_snapshots_snapshot_date` (`snapshot_date` DESC)
- INDEX `idx_farming_snapshots_user_date` (`user_id`, `snapshot_date` DESC)

**Связи:**
- С `users` через `user_id` (многие к одному)

### 10. wallet_snapshots

**Назначение:** Хранение ежедневных снимков балансов кошельков для аналитики.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор снимка.
- `user_id` (INTEGER) - Идентификатор пользователя.
- `balance_uni` (NUMERIC) - Баланс UNI на момент снимка.
- `balance_ton` (NUMERIC) - Баланс TON на момент снимка.
- `snapshot_date` (TIMESTAMP) - Дата и время создания снимка.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_wallet_snapshots_user_id` (`user_id`)
- INDEX `idx_wallet_snapshots_snapshot_date` (`snapshot_date` DESC)
- INDEX `idx_wallet_snapshots_user_date` (`user_id`, `snapshot_date` DESC)

**Связи:**
- С `users` через `user_id` (многие к одному)

### 11. admin_logs

**Назначение:** Хранение логов административных действий для аудита.

**Поля:**
- `id` (INTEGER) - Первичный ключ, уникальный идентификатор лога.
- `admin_id` (INTEGER) - Идентификатор администратора.
- `action_type` (admin_action_type) - Тип действия (enum).
- `action_description` (TEXT) - Описание действия.
- `target_user_id` (INTEGER) - Идентификатор целевого пользователя (если применимо).
- `details` (JSONB) - Дополнительные детали действия.
- `ip_address` (VARCHAR) - IP-адрес, с которого выполнено действие.
- `created_at` (TIMESTAMP) - Дата и время действия.

**Индексы:**
- PRIMARY KEY (`id`)
- INDEX `idx_admin_logs_admin_id` (`admin_id`)
- INDEX `idx_admin_logs_action_type` (`action_type`)
- INDEX `idx_admin_logs_target_user_id` (`target_user_id`)
- INDEX `idx_admin_logs_created_at` (`created_at` DESC)

**Связи:**
- С `users` через `admin_id` (многие к одному)
- С `users` через `target_user_id` (многие к одному)

## Партиционирование таблиц

Для таблицы `transactions` рекомендуется применить партиционирование по дате (`created_at`) при достижении 1 миллиона записей. Это позволит оптимизировать запросы, связанные с выборкой по временным интервалам.

## Рекомендации по работе с базой данных

1. **Не удалять данные** - все записи должны сохраняться для обеспечения полной истории операций и возможности аудита.
2. **Использовать миграции** - все изменения структуры базы данных должны выполняться через миграции.
3. **Мониторить размер таблиц** - регулярно контролировать рост таблиц для своевременной оптимизации.
4. **Создавать снимки** - для таблиц `farming_snapshots` и `wallet_snapshots` рекомендуется настроить автоматическое создание ежедневных снимков в 00:00 UTC.
5. **Архивировать старые данные** - при необходимости, можно архивировать транзакции старше определенного срока, сохраняя их в отдельной таблице.