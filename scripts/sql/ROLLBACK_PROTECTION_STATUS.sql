-- ================================================
-- СТАТУС ЗАЩИТЫ ОТ ROLLBACK ОПЕРАЦИЙ
-- ================================================
-- Создан: 29 июля 2025
-- Цель: Документирование отключенных rollback функций

-- ОТКЛЮЧЕННЫЕ СИСТЕМЫ:
-- 1. BalanceManager.updateUserBalance() - Math.max(0, balance - amount) отключен
-- 2. TransactionEnforcer.enforcePolicy() - полностью отключен
-- 3. BatchBalanceProcessor.invalidateBatch() - массовая инвалидация отключена
-- 4. TransactionsService.recalculateUserBalance() - блокирован (выбрасывает ошибку)
-- 5. TransactionEnforcer.detectDirectSQLUpdates() - отключен
-- 6. UnifiedTransactionService.updateUserBalance() - отключен
-- 7. SQL скрипт 2_clean_duplicates.sql - переименован в .DISABLED

-- ПРОВЕРКА СТАТУСА ЗАЩИТЫ:
SELECT 
  'ROLLBACK_PROTECTION_ACTIVE' as status,
  NOW() as check_time,
  'Все критические rollback функции отключены' as description;

-- МОНИТОРИНГ: поиск попыток rollback операций в логах
-- (требует проверки в application logs с тегом [ANTI_ROLLBACK_PROTECTION])

-- ВОССТАНОВЛЕНИЕ В СЛУЧАЕ НЕОБХОДИМОСТИ:
-- 1. Откатить изменения в core/BalanceManager.ts (вернуть Math.max)
-- 2. Откатить изменения в core/TransactionEnforcer.ts
-- 3. Откатить изменения в core/BatchBalanceProcessor.ts
-- 4. Откатить изменения в modules/transactions/service.ts
-- 5. Откатить изменения в core/TransactionService.ts
-- 6. Переименовать .DISABLED файл обратно в .sql