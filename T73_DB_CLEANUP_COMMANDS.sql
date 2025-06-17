-- T73: SQL КОМАНДЫ ДЛЯ ОЧИСТКИ БАЗЫ ДАННЫХ UNIFARM
-- ================================================
-- ВНИМАНИЕ: НЕ ВЫПОЛНЯТЬ БЕЗ ПОДТВЕРЖДЕНИЯ ВЛАДЕЛЬЦА ПРОЕКТА
-- Все команды подготовлены на основе анализа T72

-- =====================================================
-- ЭТАП 1: УДАЛЕНИЕ ДУБЛИРУЮЩИХ ТАБЛИЦ (БЕЗОПАСНО)
-- =====================================================

-- 1.1 Удаление user_balances (дублирует users.balance_uni/balance_ton)
-- Обоснование: Все балансы хранятся в users таблице
DROP TABLE IF EXISTS public.user_balances CASCADE;

-- 1.2 Удаление referrals (заменена users.referred_by)
-- Обоснование: Реферальные связи переведены в users.referred_by поле
DROP TABLE IF EXISTS public.referrals CASCADE;

-- 1.3 Удаление referral_earnings (заменена transactions)
-- Обоснование: 526 REFERRAL_REWARD транзакций активны в transactions
DROP TABLE IF EXISTS public.referral_earnings CASCADE;

-- 1.4 Удаление farming_sessions (интегрирована в users)
-- Обоснование: Данные farming хранятся в users.uni_farming_* полях
DROP TABLE IF EXISTS public.farming_sessions CASCADE;

-- 1.5 Удаление farming_deposits (заменена users.uni_deposit_amount)
-- Обоснование: Депозиты фарминга хранятся в users.uni_deposit_amount
DROP TABLE IF EXISTS public.farming_deposits CASCADE;

-- 1.6 Удаление user_sessions (заменена JWT токенами)
-- Обоснование: Авторизация работает через JWT без сессий в БД
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- =====================================================
-- ЭТАП 2: ОЧИСТКА ДУБЛИРУЮЩИХ ПОЛЕЙ (ТРЕБУЕТ ОСТОРОЖНОСТИ)
-- =====================================================

-- 2.1 Удаление дублирующих балансов из wallet таблицы
-- ВНИМАНИЕ: Проверить синхронизацию с users балансами перед удалением!

-- Проверочный запрос для сравнения балансов:
/*
SELECT 
    w.user_id,
    w.uni_balance as wallet_uni,
    u.balance_uni as users_uni,
    w.ton_balance as wallet_ton,
    u.balance_ton as users_ton,
    CASE 
        WHEN w.uni_balance = u.balance_uni AND w.ton_balance = u.balance_ton 
        THEN 'СИНХРОНИЗИРОВАНЫ' 
        ELSE 'КОНФЛИКТ ДАННЫХ' 
    END as status
FROM wallet w
JOIN users u ON w.user_id = u.id;
*/

-- Команды удаления (выполнять только после проверки синхронизации):
-- ALTER TABLE public.wallet DROP COLUMN IF EXISTS uni_balance;
-- ALTER TABLE public.wallet DROP COLUMN IF EXISTS ton_balance;

-- =====================================================
-- ЭТАП 3: ОЧИСТКА МИНИМАЛЬНО ИСПОЛЬЗУЕМЫХ ПОЛЕЙ USERS
-- =====================================================

-- 3.1 Удаление устаревших полей users таблицы
-- Выполнять только после подтверждения:

-- parent_ref_code (устаревшая реферальная система, 4 использования)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS parent_ref_code;

-- uni_farming_deposit (минимальное использование, только в schema)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS uni_farming_deposit;

-- uni_farming_activated_at (минимальное использование, только в schema)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS uni_farming_activated_at;

-- ton_wallet_address (только в schema, не используется в бизнес-логике)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS ton_wallet_address;

-- =====================================================
-- ЭТАП 4: ОЧИСТКА ПУСТЫХ ТАБЛИЦ СВЯЗАННЫХ С MISSIONS
-- =====================================================

-- 4.1 Удаление user_mission_completions (зависит от неактивной missions)
-- DROP TABLE IF EXISTS public.user_mission_completions CASCADE;

-- 4.2 Missions таблица - ОСТАВИТЬ для будущих версий
-- Обоснование: Планируется активация функциональности

-- =====================================================
-- ЭТАП 5: ПРОБЛЕМНЫЕ ТАБЛИЦЫ (НЕ УДАЛЯТЬ)
-- =====================================================

-- boost_purchases - НЕ УДАЛЯТЬ
-- Обоснование: RLS проблема решается в T71, T73. Планировщик адаптирован.

-- =====================================================
-- КОМАНДЫ ПРОВЕРКИ ПОСЛЕ ОЧИСТКИ
-- =====================================================

-- Проверить количество таблиц до и после
/*
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
*/

-- Проверить размер базы данных
/*
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;
*/

-- Проверить оставшиеся таблицы с данными
/*
SELECT 
    tablename,
    (SELECT count(*) FROM public.users) as users_count,
    (SELECT count(*) FROM public.transactions) as transactions_count,
    (SELECT count(*) FROM public.wallet) as wallet_count
WHERE tablename IN ('users', 'transactions', 'wallet');
*/

-- =====================================================
-- КОМАНДЫ РЕЗЕРВНОГО КОПИРОВАНИЯ (ВЫПОЛНИТЬ ПЕРЕД ОЧИСТКОЙ)
-- =====================================================

-- Создать резервные копии критических данных:
/*
-- Бэкап users таблицы
CREATE TABLE users_backup_t73 AS SELECT * FROM users;

-- Бэкап transactions таблицы  
CREATE TABLE transactions_backup_t73 AS SELECT * FROM transactions;

-- Бэкап wallet таблицы
CREATE TABLE wallet_backup_t73 AS SELECT * FROM wallet;
*/

-- =====================================================
-- ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ ПОСЛЕ ОЧИСТКИ
-- =====================================================
/*
БЫЛО:
- 12+ таблиц (многие пустые)
- 39 полей в активных таблицах
- Дублирование данных
- 42% чистота БД

СТАНЕТ:
- 7 рабочих таблиц
- ~35 оптимизированных полей
- Без дублирования
- 85% чистота БД

ВЫГОДЫ:
- Ускорение запросов
- Упрощение архитектуры
- Снижение риска конфликтов данных
- Улучшение читаемости схемы
*/

-- =====================================================
-- ВАЖНЫЕ ПРИМЕЧАНИЯ
-- =====================================================
/*
1. ОБЯЗАТЕЛЬНО создать бэкапы перед выполнением
2. Проверить синхронизацию wallet ↔ users балансов
3. Выполнять по этапам с проверками
4. НЕ удалять boost_purchases и missions
5. Координировать с активными планировщиками
6. Проверить работу системы после каждого этапа
*/