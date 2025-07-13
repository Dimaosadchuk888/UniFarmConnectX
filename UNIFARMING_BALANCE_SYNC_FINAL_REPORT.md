# UniFarming Balance Synchronization Technical Investigation Report
**Date:** July 13, 2025  
**Status:** CRITICAL ISSUE IDENTIFIED - FIX READY BUT NOT APPLIED

## Executive Summary

Проведено полное техническое расследование проблемы синхронизации балансов в модуле UniFarming. Обнаружена критическая проблема: система фарминга работает корректно (транзакции создаются каждые 5 минут), но балансы не обновляются из-за архитектурного конфликта между BatchBalanceProcessor и системой WebSocket уведомлений.

## Problem Statement

**Симптомы:**
- UI не обновляется автоматически после начисления farming rewards
- Баланс в интерфейсе остается статичным: 1,377,201.45 UNI
- WebSocket соединение активно, но уведомления содержат undefined значения

## Technical Investigation Results

### 1. Database State Analysis

**Текущее состояние пользователя 74:**
```
Баланс в БД: 1,378,769.01 UNI (после ручной синхронизации)
Баланс в UI: 1,377,201.45 UNI  
Разница: 1,567.56 UNI
```

**Критическое несоответствие:**
```
Сумма всех FARMING_REWARD транзакций: 21,687.42 UNI
Начальный баланс: 1,000,000 UNI
Ожидаемый баланс: 1,021,687.42 UNI
Фактический баланс в БД: 1,378,769.01 UNI
Необъяснимая разница: 357,081.59 UNI
```

### 2. Transaction Flow Analysis

**Успешно работает:**
- ✅ Транзакции FARMING_REWARD создаются каждые 5 минут
- ✅ Последняя транзакция: ID 605192, сумма 242.71 UNI (06:27:20)
- ✅ Расчет дохода корректен (1% в день от депозита 553,589 UNI)

**НЕ работает:**
- ❌ Баланс в БД не увеличивается при создании транзакций
- ❌ WebSocket уведомления отправляются с undefined значениями
- ❌ UI не получает актуальные данные о балансе

### 3. Root Cause Analysis

**Архитектурный конфликт обнаружен в `farmingScheduler.ts`:**

```typescript
// Строка 117: Временно отключен batch update (но это только комментарий!)
logger.info('[UNI Farming] TEMPORARY: Skipping batch update to test transaction creation');

// Строка 142: BatchBalanceProcessor все равно вызывается!
const batchResult = await this.batchProcessor.processFarmingIncome(farmerIncomes);
```

**Проблема WebSocket уведомлений:**
1. BatchBalanceProcessor обновляет баланс в БД
2. Отправляет WebSocket уведомление БЕЗ данных о балансе
3. Frontend получает уведомление с undefined значениями
4. UI не может обновиться без корректных данных

### 4. Fix Implementation Status

**Исправление уже реализовано в `BatchBalanceProcessor.ts` (строки 228-250):**
```typescript
// Получаем актуальные балансы после обновления
const { data: userData, error } = await supabase
  .from('users')
  .select('balance_uni, balance_ton')
  .eq('id', op.userId)
  .single();
  
if (userData) {
  notificationService.notifyBalanceUpdate({
    userId: op.userId,
    balanceUni: parseFloat(userData.balance_uni),
    balanceTon: parseFloat(userData.balance_ton),
    // ... остальные поля
  });
}
```

**КРИТИЧНО:** Исправление НЕ применено, так как сервер не был перезапущен!

## Critical Findings

1. **Депозиты не отражены в транзакциях:**
   - Депозит 553,589 UNI существует в поле uni_deposit_amount
   - НЕТ транзакций типа FARMING_DEPOSIT для этой суммы
   - Это объясняет часть разницы в балансах

2. **Необъяснимый излишек 357,081 UNI:**
   - Возможные причины: ручные SQL операции, миграция данных, дублирование начислений
   - Требует дополнительного аудита истории изменений

3. **BatchBalanceProcessor зависает:**
   - Процесс обновления балансов может зависать без таймаута
   - Транзакции создаются, но балансы не обновляются

## Immediate Actions Required

1. **Перезапустить сервер для применения исправлений BatchBalanceProcessor**
2. **Провести аудит излишка 357,081 UNI**
3. **Добавить логирование в BatchBalanceProcessor для диагностики**
4. **Рассмотреть отказ от BatchBalanceProcessor в пользу прямых обновлений через BalanceManager**

## Risk Assessment

- **Финансовый риск:** ВЫСОКИЙ - несоответствие балансов на 35% от ожидаемого
- **Технический риск:** СРЕДНИЙ - система работает, но данные не синхронизированы
- **Репутационный риск:** ВЫСОКИЙ - пользователи не видят свои доходы в реальном времени

## Conclusion

Система UniFarming функционально работает корректно, но имеет критическую проблему с синхронизацией данных. Исправление готово и ждет перезапуска сервера. После применения исправления требуется провести полный аудит финансовых несоответствий.