# План безопасной очистки базы данных UniFarm
**Дата**: 13 июля 2025
**Статус**: Проверено - таблицы не используются в коде

## 🛡️ БЕЗОПАСНЫЙ ПОДХОД (РЕКОМЕНДУЮ)

### Этап 1: Переименование таблиц (вместо удаления)
```sql
-- Сохраним таблицы с префиксом _archived_ на случай если что-то понадобится
ALTER TABLE referrals RENAME TO _archived_referrals;
ALTER TABLE farming_sessions RENAME TO _archived_farming_sessions;
ALTER TABLE user_sessions RENAME TO _archived_user_sessions;
ALTER TABLE wallet RENAME TO _archived_wallet;
ALTER TABLE farming_deposits RENAME TO _archived_farming_deposits;
ALTER TABLE boosts RENAME TO _archived_boosts;
ALTER TABLE airdrop_claims RENAME TO _archived_airdrop_claims;
ALTER TABLE airdrop_missions RENAME TO _archived_airdrop_missions;
ALTER TABLE auth_logs RENAME TO _archived_auth_logs;
ALTER TABLE mission_progress RENAME TO _archived_mission_progress;
ALTER TABLE mission_templates RENAME TO _archived_mission_templates;
ALTER TABLE referral_analytics RENAME TO _archived_referral_analytics;
ALTER TABLE referral_earnings RENAME TO _archived_referral_earnings;
ALTER TABLE system_metrics RENAME TO _archived_system_metrics;
ALTER TABLE ton_boost_schedules RENAME TO _archived_ton_boost_schedules;
ALTER TABLE user_mission_claims RENAME TO _archived_user_mission_claims;
ALTER TABLE user_mission_completions RENAME TO _archived_user_mission_completions;
ALTER TABLE wallet_logs RENAME TO _archived_wallet_logs;
ALTER TABLE webhook_logs RENAME TO _archived_webhook_logs;
ALTER TABLE daily_bonus_history RENAME TO _archived_daily_bonus_history;
```

### Этап 2: Мониторинг (1-2 недели)
- Следите за логами ошибок
- Проверьте все функции приложения
- Убедитесь что все работает корректно

### Этап 3: Создание резервной копии
```bash
# Перед окончательным удалением сделайте бэкап архивных таблиц
pg_dump -t '_archived_*' your_database > archived_tables_backup.sql
```

### Этап 4: Окончательное удаление (через 2 недели)
```sql
-- Только после успешного тестирования
DROP TABLE IF EXISTS _archived_referrals CASCADE;
DROP TABLE IF EXISTS _archived_farming_sessions CASCADE;
-- и так далее для всех таблиц...
```

## ⚡ КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (сделать сразу)

### 1. Добавить отсутствующие поля:
```sql
-- Эти поля используются в коде но отсутствуют в БД
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS last_active timestamp without time zone,
  ADD COLUMN IF NOT EXISTS guest_id text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Поле amount используется в коде
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;

-- Обновить amount из существующих данных
UPDATE transactions 
SET amount = COALESCE(amount_uni, 0) + COALESCE(amount_ton, 0)
WHERE amount = 0;
```

## 📊 ПОЧЕМУ БЕЗОПАСНЫЙ ПОДХОД ЛУЧШЕ

1. **Обратимость**: Можно легко восстановить таблицу если что-то пойдет не так
2. **История данных**: Сохраняется историческая информация
3. **Постепенность**: Можно отследить любые скрытые зависимости
4. **Минимальный риск**: Нет риска потерять важные данные

## 🔍 ЧТО ПРОВЕРЕНО

- ✅ Поиск по всему коду (modules, core, server, shared, utils, config)
- ✅ Проверены все паттерны использования таблиц
- ✅ SQL запросы, Supabase вызовы, импорты
- ✅ Результат: 0 использований для всех 20 таблиц

## 📈 ВЫГОДА ОТ ОЧИСТКИ

- Упрощение структуры БД (с 31 до 10 таблиц)
- Уменьшение размера БД
- Упрощение бэкапов и миграций
- Более понятная архитектура