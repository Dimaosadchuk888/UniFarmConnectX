# 🧩 Отчет полной сверки структуры БД и кода UniFarm

**Дата проверки:** 2025-07-10T05:11:00.006Z

## 📊 Сводная статистика

| Показатель | Значение |
|------------|----------|
| Всего таблиц для проверки | 11 |
| Существует в БД | 11 |
| Полных соответствий | 1 |
| Частичных соответствий | 0 |
| Критических проблем | 3 |
| **Уровень соответствия** | **9%** |

## 📋 Детальный анализ по сущностям

### ✅ Сущности с полным соответствием

#### withdraw_requests
- ✅ Все поля соответствуют
- Полей в БД: 10
- Используется в модулях: adminBot, wallet

### ❌ Критические несоответствия

#### users
- **[HIGH]** 2 полей используются в коде, но отсутствуют в БД
  - Поля: `is_active`, `guest_id`
  - Используется в модулях: adminBot, boost, dailyBonus, debug, farming, referral, scheduler, tonFarming, user

#### transactions
- **[HIGH]** 1 полей используются в коде, но отсутствуют в БД
  - Поля: `amount`
  - Используется в модулях: adminBot, boost, missions, referral, scheduler, user

#### boost_purchases
- **[HIGH]** 6 полей используются в коде, но отсутствуют в БД
  - Поля: `tx_hash`, `status`, `user_id`, `boost_id`, `updated_at`, `id`
  - Используется в модулях: boost

## 🔧 Рекомендации по исправлению

### Таблица: users

**ADD_MISSING_FIELDS** (Приоритет: HIGH)

Добавить поля:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_id INTEGER;
```

### Таблица: transactions

**ADD_MISSING_FIELDS** (Приоритет: HIGH)

Добавить поля:
```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount DECIMAL(20,9);
```

### Таблица: boost_purchases

**ADD_MISSING_FIELDS** (Приоритет: HIGH)

Добавить поля:
```sql
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS boost_id INTEGER;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS id INTEGER;
```

## 📌 Заключение

⚠️ **Требуется синхронизация структуры БД с кодом.**

Необходимо:
1. Выполнить SQL скрипты для добавления недостающих полей
2. Проверить неиспользуемые поля и при необходимости удалить их
3. Обновить код для корректной работы с существующей структурой БД
