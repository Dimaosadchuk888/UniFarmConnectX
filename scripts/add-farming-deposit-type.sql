-- Скрипт для добавления типа транзакции FARMING_DEPOSIT
-- Дата: 09.07.2025
-- Цель: Разделение депозитов и начислений фарминга для аналитики

-- Добавляем новый тип в enum transaction_type
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'FARMING_DEPOSIT';

-- Проверяем результат
SELECT unnest(enum_range(NULL::transaction_type)) AS transaction_types
ORDER BY 1;