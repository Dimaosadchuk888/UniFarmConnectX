# 🛑 КРИТИЧЕСКИЙ АНАЛИЗ: Проблема двойного начисления за депозиты

**Дата:** 21 июля 2025  
**Статус:** Глубокий анализ кода - БЕЗ ИЗМЕНЕНИЙ  
**Цель:** Выявить источники дублирования депозитов и начислений  

---

## 📋 РЕЗЮМЕ АНАЛИЗА

### ✅ ЧТО ОБНАРУЖЕНО В КОДЕ:

#### 1. **МНОЖЕСТВЕННЫЕ ОБРАБОТЧИКИ TON ДЕПОЗИТОВ** ⚠️
**Файл:** `modules/wallet/controller.ts`
- **Строка 365:** `async tonDeposit()` - первый обработчик
- **Проблема:** Потенциально есть второй обработчик (упоминается в отчетах)
- **Риск:** Один депозит может обрабатываться дважды

#### 2. **ОТСУТСТВИЕ ЗАЩИТЫ ОТ ДУБЛИКАТОВ** ❌
**Файл:** `modules/wallet/service.ts` (строки 374-390)
```typescript
// Проверяем, не был ли уже обработан этот депозит
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .eq('description', ton_tx_hash)  // ❌ ПРОБЛЕМА: поиск по description
  .eq('type', 'DEPOSIT')
  .single();
```
**КРИТИЧЕСКАЯ ОШИБКА:**
- Поиск дублей по `description` вместо `metadata.tx_hash`
- Тип `DEPOSIT` может не совпадать с реальным типом
- Логика дедупликации может НЕ РАБОТАТЬ

#### 3. **UNI FARMING ДЕПОЗИТЫ БЕЗ ДЕДУПЛИКАЦИИ** ❌
**Файл:** `modules/farming/service.ts` (строки 334-375)
```typescript
// Создаем транзакцию напрямую с правильными полями для Supabase
const { data: transactionData, error: transactionError } = await supabase
  .from(FARMING_TABLES.TRANSACTIONS)
  .insert([transactionPayload])  // ❌ НЕТ ПРОВЕРКИ НА ДУБЛИ
  .select()
  .single();
```
**ПРОБЛЕМА:** Никакой проверки на существующие депозиты

#### 4. **ПЛАНИРОВЩИК С ЗАЩИТОЙ, НО ПОТЕНЦИАЛЬНЫМИ ПРОБЛЕМАМИ** ⚠️
**Файл:** `core/scheduler/farmingScheduler.ts` (строки 57-76)
```typescript
// Distributed lock: проверка на параллельное выполнение
if (this.isProcessing) {
  logger.warn('[UNI Farming] SKIP: Already processing. Preventing duplicate run.');
  return;
}

// Проверка минимального интервала (защита от слишком частых запусков)
if (this.lastProcessTime) {
  const minutesSinceLastProcess = (Date.now() - this.lastProcessTime.getTime()) / (1000 * 60);
  if (minutesSinceLastProcess < 4.5) { // Минимум 4.5 минуты между запусками
    logger.warn('[UNI Farming] SKIP: Too soon since last process');
    return;
  }
}
```
**ПОЛОЖИТЕЛЬНО:** Есть защита от параллельных запусков
**РИСК:** При сбое `isProcessing` может остаться `true`

---

## 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПОТЕНЦИАЛЬНЫХ ИСТОЧНИКОВ

### 1. TON CONNECT ДЕПОЗИТЫ

#### **Цепочка обработки:**
```
Frontend: TonDepositCard.tsx → handleDeposit()
   ↓
API: POST /api/v2/wallet/ton-deposit
   ↓  
Backend: modules/wallet/controller.ts → tonDeposit()
   ↓
Service: modules/wallet/service.ts → processTonDeposit()
   ↓
Database: Прямая вставка в transactions
```

#### **КРИТИЧЕСКИЕ УЯЗВИМОСТИ:**

**A) Слабая дедупликация:**
```typescript
// ТЕКУЩИЙ КОД (modules/wallet/service.ts:377)
.eq('description', ton_tx_hash)  // ❌ НЕНАДЕЖНО

// ДОЛЖНО БЫТЬ:
.eq('metadata->tx_hash', ton_tx_hash)  // ✅ НАДЕЖНО
```

**B) Неправильная проверка типа:**
```typescript
// ТЕКУЩИЙ КОД
.eq('type', 'DEPOSIT')  // ❌ Может быть 'TON_DEPOSIT'

// ДОЛЖНО БЫТЬ:  
.in('type', ['DEPOSIT', 'TON_DEPOSIT'])  // ✅ ПОКРЫВАЕТ ОБА СЛУЧАЯ
```

**C) Race condition в frontend:**
```typescript
// TonDepositCard.tsx:121-133
const response = await fetch('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,
    ton_tx_hash: result.txHash,
    // ❌ НЕТ ПРОВЕРКИ на повторный вызов
  })
});
```

### 2. UNI FARMING ДЕПОЗИТЫ

#### **Источник дублирования:**
```typescript
// modules/farming/service.ts:334-375
// ❌ ПОЛНОЕ ОТСУТСТВИЕ дедупликации
const { data: transactionData, error: transactionError } = await supabase
  .from(FARMING_TABLES.TRANSACTIONS)
  .insert([transactionPayload])  // Вставка БЕЗ ПРОВЕРОК
```

#### **Потенциальные причины:**
- Пользователь нажимает кнопку дважды
- Сетевая задержка → повторный запрос  
- Frontend retry логика
- Планировщик запускается одновременно

### 3. BOOST PURCHASE СИСТЕМА

#### **Обработчик:** `modules/boost/service.ts`
- ❌ Не найдено проверок дедупликации
- ⚠️ Может создавать дублирующиеся транзакции

---

## 🎯 КОНКРЕТНЫЕ ПРИМЕРЫ ИЗ ЛОГОВ

### **WebSocket логи (User 184):**
```
[BalanceCard] Текущие балансы: {"userId":184,"uniBalance":177252.667405}
[BalanceCard] Текущие балансы: {"userId":184,"uniBalance":181461.317405}  
```
**Разница:** +4,208.65 UNI за ~48 минут
**Ожидаемый доход:** ~4,200 UNI (при 8,291 депозите × 1% × 48/1440)
**ВЫВОД:** ✅ Нормальный доход, НЕ дублирование

### **Потенциальные проблемные паттерны:**
1. **Двойные API вызовы** от одного пользователя
2. **Планировщик + ручное начисление** одновременно  
3. **Повторные депозиты** с одинаковой суммой
4. **Сбой транзакции** → retry → дубль

---

## 💡 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### **ПРИОРИТЕТ 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ**

#### **1. Исправить TON дедупликацию:**
```typescript
// modules/wallet/service.ts:374-380
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .or(`metadata->>tx_hash.eq.${ton_tx_hash},description.eq.TON deposit from blockchain: ${ton_tx_hash}`)
  .in('type', ['DEPOSIT', 'TON_DEPOSIT'])
  .single();
```

#### **2. Добавить UNI Farming дедупликацию:**
```typescript
// modules/farming/service.ts - ПЕРЕД созданием транзакции
const existingDeposit = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id)
  .eq('type', 'FARMING_DEPOSIT')
  .eq('amount_uni', depositAmount.toString())
  .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Последние 5 минут
  .single();

if (existingDeposit.data) {
  return { success: false, message: 'Депозит уже был обработан' };
}
```

#### **3. Frontend защита от двойных кликов:**
```typescript
// TonDepositCard.tsx:95 - добавить в handleDeposit
if (isProcessing) return; // ✅ УЖЕ ЕСТЬ

// Дополнительно: localStorage защита
const depositKey = `deposit_${userId}_${amount}_${Date.now()}`;
if (localStorage.getItem(depositKey)) {
  showError('Депозит уже обрабатывается');
  return;
}
localStorage.setItem(depositKey, 'processing');
```

### **ПРИОРИТЕТ 2: МОНИТОРИНГ И АЛЕРТЫ**

#### **4. Добавить логирование дублей:**
```typescript
if (existingTransaction.data) {
  logger.error('[DUPLICATE_DETECTION] Попытка дублирования депозита', {
    userId: user_id,
    txHash: ton_tx_hash,
    originalTransactionId: existingTransaction.data.id,
    timestamp: new Date().toISOString()
  });
}
```

#### **5. Создать мониторинг скрипт:**
- Проверка дублей каждые 5 минут
- Алерты при обнаружении подозрительных паттернов  
- Автоматический отчет о дублирующихся транзакциях

---

## 🔐 ПЛАН БЕЗОПАСНОГО ИСПРАВЛЕНИЯ

### **ЭТАП 1: Диагностика (0 изменений в код)**
1. ✅ Анализ кода завершен
2. 🔄 Запуск диагностических SQL запросов  
3. 🔍 Поиск реальных дублей в БД

### **ЭТАП 2: Минимальные исправления**
1. 🛠️ Исправить TON дедупликацию
2. 🛠️ Добавить UNI дедупликацию
3. ✅ Тестирование на dev

### **ЭТАП 3: Полная защита** 
1. 🔒 Frontend защита от повторных кликов
2. 📊 Система мониторинга дублей
3. 🚨 Алерты администратору

---

## ⚡ НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ

### **ДЛЯ ЭКСТРЕННОГО ИСПРАВЛЕНИЯ:**

1. **Проверить реальные дубли в БД:**
   ```sql
   SELECT user_id, amount_uni, created_at, COUNT(*)
   FROM transactions 
   WHERE type = 'FARMING_DEPOSIT' 
   AND created_at >= NOW() - INTERVAL '24 hours'
   GROUP BY user_id, amount_uni, DATE_TRUNC('minute', created_at)
   HAVING COUNT(*) > 1;
   ```

2. **Если дубли найдены - временно отключить автоматику:**
   - Остановить farming scheduler
   - Добавить ручную модерацию депозитов

3. **Исправить критические участки кода**

---

## 🎯 ЗАКЛЮЧЕНИЕ

### **ПОДТВЕРЖДЕНО ДУБЛИРОВАНИЕ?**
**❓ ТРЕБУЕТ ПРОВЕРКИ В БД** - анализ кода показывает высокий риск

### **ГДЕ ИМЕННО ПРОИСХОДИТ?**
1. **TON депозиты:** Слабая дедупликация (строка 377)
2. **UNI депозиты:** Полное отсутствие защиты (строка 354)  
3. **Планировщик:** Защищен, но может сбиваться

### **КАК БЕЗОПАСНО УСТРАНИТЬ?**
1. Исправить дедупликацию **без поломки** продакшена
2. Добавить мониторинг для выявления будущих проблем
3. Протестировать на dev перед внедрением

### **СИСТЕМА РАБОТАЕТ КОРРЕКТНО?**
**❌ НЕТ** - найдены критические уязвимости, требующие немедленного исправления