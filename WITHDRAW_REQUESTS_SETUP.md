# Настройка таблицы withdraw_requests в Supabase

## Шаг 1: Создание таблицы

Выполните следующий SQL в Supabase SQL Editor:

```sql
-- Создание таблицы для заявок на вывод TON
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    telegram_id TEXT,
    username TEXT,
    amount_ton NUMERIC(20, 9) NOT NULL CHECK (amount_ton > 0),
    ton_wallet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by TEXT -- username или telegram_id админа
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_created_at ON withdraw_requests(created_at DESC);
```

## Шаг 2: Настройка прав доступа (RLS)

```sql
-- Отключаем RLS для таблицы (доступ только через сервер)
ALTER TABLE withdraw_requests DISABLE ROW LEVEL SECURITY;
```

## Шаг 3: Проверка создания

После создания таблицы выполните:

```bash
node check-withdrawal-table.js
```

## Изменения в системе

### 1. Обновлены типы (modules/adminBot/types.ts)
- `WithdrawalRequest` интерфейс теперь использует новую структуру
- UUID для id
- amount_ton вместо amount
- ton_wallet вместо wallet_address
- processed_by вместо admin_username

### 2. Обновлен сервис (modules/adminBot/service.ts)
- `getWithdrawalRequests` работает с таблицей withdraw_requests
- `approveWithdrawal` добавляет processed_by при одобрении
- `rejectWithdrawal` добавляет processed_by при отклонении

### 3. Обновлен контроллер (modules/adminBot/controller.ts)
- Отображение заявок использует новые поля
- Передача username админа при обработке заявок

## Использование в админ-боте

### Команды для работы с заявками:
- `/withdrawals` - показать все заявки
- `/withdrawals pending` - только ожидающие
- `/withdrawals approved` - только одобренные
- `/withdrawals rejected` - только отклоненные
- `/approve <id>` - одобрить заявку
- `/reject <id>` - отклонить заявку

### Кнопки в боте:
При отображении pending заявок появляются кнопки:
- ✅ Одобрить
- ❌ Отклонить

## Тестирование

Для тестирования системы:

```bash
node test-withdrawal-system.js
```

Этот скрипт:
1. Создаст тестовую заявку
2. Прочитает все pending заявки
3. Одобрит тестовую заявку
4. Проверит обновленные данные
5. Удалит тестовые данные