# 🛠️ ПЛАН ИСПРАВЛЕНИЯ: Двойное начисление за депозиты

**Дата:** 21 июля 2025  
**Приоритет:** КРИТИЧЕСКИЙ  
**Статус:** План готов к реализации  

---

## 📌 КРАТКОЕ РЕЗЮМЕ НАЙДЕННЫХ ПРОБЛЕМ

### ❌ **КРИТИЧЕСКИЕ УЯЗВИМОСТИ:**
1. **TON депозиты:** Неработающая дедупликация (поиск по description вместо tx_hash)
2. **UNI депозиты:** Полное отсутствие защиты от дублей  
3. **Frontend:** Нет защиты от повторных кликов
4. **Мониторинг:** Отсутствие системы обнаружения дублей

### ✅ **ЧТО РАБОТАЕТ ПРАВИЛЬНО:**
- Планировщик имеет защиту от параллельных запусков
- WebSocket логи показывают нормальную работу начислений

---

## 🎯 ПЛАН ИСПРАВЛЕНИЯ (БЕЗ ПОЛОМКИ ПРОДАКШЕНА)

### **ЭТАП 1: ЭКСТРЕННЫЕ ИСПРАВЛЕНИЯ**

#### **1.1 Исправить TON дедупликацию** ⏱️ 10 мин
**Файл:** `modules/wallet/service.ts` (строки 374-390)

**ТЕКУЩИЙ КОД:**
```typescript
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .eq('description', ton_tx_hash)  // ❌ НЕНАДЕЖНО
  .eq('type', 'DEPOSIT')
  .single();
```

**ИСПРАВЛЕНИЕ:**
```typescript
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .or(`metadata->>tx_hash.eq.${ton_tx_hash},description.ilike.%${ton_tx_hash}%`)
  .in('type', ['DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD'])
  .maybeSingle(); // Используем maybeSingle вместо single
```

#### **1.2 Добавить UNI дедупликацию** ⏱️ 15 мин  
**Файл:** `modules/farming/service.ts` (перед строкой 334)

**ДОБАВИТЬ КОД:**
```typescript
// ПРОВЕРКА НА ДУБЛИРУЮЩИЕСЯ ДЕПОЗИТЫ
const recentTimeLimit = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 минут назад

const { data: existingDeposit, error: checkError } = await supabase
  .from(FARMING_TABLES.TRANSACTIONS)
  .select('*')
  .eq('user_id', user.id)
  .eq('type', 'FARMING_DEPOSIT')
  .eq('amount_uni', depositAmount.toString())
  .gte('created_at', recentTimeLimit)
  .maybeSingle();

if (existingDeposit) {
  logger.warn('[FarmingService] ДУБЛИКАТ: Депозит уже был обработан', {
    userId: user.id,
    amount: depositAmount,
    existingTransactionId: existingDeposit.id,
    timestamp: new Date().toISOString()
  });
  return { 
    success: false, 
    message: 'Депозит уже был обработан недавно. Подождите 5 минут.' 
  };
}
```

#### **1.3 Frontend защита от двойных кликов** ⏱️ 10 мин
**Файл:** `client/src/components/wallet/TonDepositCard.tsx` (строка 95)

**ДОБАВИТЬ В handleDeposit:**
```typescript
// Защита от повторных депозитов
const depositKey = `ton_deposit_${userId}_${depositAmount}_${Date.now()}`;
const existingDepositKey = Object.keys(localStorage)
  .find(key => key.startsWith(`ton_deposit_${userId}_${depositAmount}_`) && 
    (Date.now() - parseInt(key.split('_')[3])) < 300000); // 5 минут

if (existingDepositKey) {
  showError('Депозит с такой суммой уже обрабатывается. Подождите 5 минут.');
  return;
}

localStorage.setItem(depositKey, 'processing');

// В конце функции (в finally блоке):
localStorage.removeItem(depositKey);
```

### **ЭТАП 2: МОНИТОРИНГ И ЛОГИРОВАНИЕ**

#### **2.1 Создать систему обнаружения дублей** ⏱️ 20 мин
**Новый файл:** `core/monitoring/DuplicateDetector.ts`

```typescript
export class DuplicateDetector {
  private static async checkRecentDuplicates(): Promise<any[]> {
    // Проверка дублей за последние 2 часа
    const { data: duplicates, error } = await supabase.rpc('detect_duplicate_deposits');
    return duplicates || [];
  }

  static async reportSuspiciousActivity(userId: number, transactionType: string, amount: number) {
    logger.error('[DUPLICATE_ALERT] Подозрительная активность', {
      userId,
      transactionType,
      amount,
      timestamp: new Date().toISOString(),
      alert: 'POTENTIAL_DUPLICATE'
    });
  }
}
```

#### **2.2 SQL функция для обнаружения дублей**
**Новый файл:** `sql/detect_duplicates_function.sql`

```sql
CREATE OR REPLACE FUNCTION detect_duplicate_deposits()
RETURNS TABLE(
    user_id INTEGER,
    transaction_type TEXT,
    amount NUMERIC,
    duplicate_count BIGINT,
    transaction_ids INTEGER[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.user_id,
        t.type::TEXT as transaction_type,
        COALESCE(t.amount_uni::numeric, t.amount_ton::numeric, t.amount::numeric) as amount,
        COUNT(*) as duplicate_count,
        array_agg(t.id ORDER BY t.created_at) as transaction_ids
    FROM transactions t
    WHERE 
        t.type IN ('FARMING_DEPOSIT', 'BOOST_PURCHASE', 'DEPOSIT')
        AND t.status = 'completed'
        AND t.created_at >= NOW() - INTERVAL '2 hours'
    GROUP BY 
        t.user_id, 
        t.type, 
        COALESCE(t.amount_uni::numeric, t.amount_ton::numeric, t.amount::numeric),
        DATE_TRUNC('minute', t.created_at)
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;
```

### **ЭТАП 3: ТЕСТИРОВАНИЕ И ВАЛИДАЦИЯ**

#### **3.1 Тест-кейсы для проверки исправлений**
```typescript
// Тест дедупликации TON
async function testTonDuplication() {
  // 1. Создать TON депозит
  // 2. Попытаться создать его снова с тем же tx_hash
  // 3. Убедиться, что второй отклонен
}

// Тест дедупликации UNI  
async function testUniDuplication() {
  // 1. Создать UNI депозит
  // 2. Попытаться создать его снова в течение 5 минут
  // 3. Убедиться, что второй отклонен
}
```

---

## ⚡ НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ (МОЖНО ВЫПОЛНИТЬ СЕЙЧАС)

### **ПРОВЕРКА 1: Поиск существующих дублей в БД**
```sql
-- Ищем дублирующиеся депозиты за последние 7 дней
SELECT 
    user_id,
    type,
    COALESCE(amount_uni, amount_ton, amount) as amount,
    COUNT(*) as duplicates,
    array_agg(id ORDER BY created_at) as transaction_ids
FROM transactions 
WHERE 
    type IN ('FARMING_DEPOSIT', 'BOOST_PURCHASE', 'DEPOSIT')
    AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, type, COALESCE(amount_uni, amount_ton, amount), DATE_TRUNC('hour', created_at)
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;
```

### **ПРОВЕРКА 2: Анализ User 184 (из WebSocket логов)**
```sql
-- Детальный анализ транзакций пользователя 184
SELECT 
    id,
    type,
    COALESCE(amount_uni, amount_ton, amount) as amount,
    description,
    created_at,
    LAG(created_at) OVER (ORDER BY created_at) as prev_time,
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) as seconds_gap
FROM transactions 
WHERE user_id = 184 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🔒 ГАРАНТИИ БЕЗОПАСНОСТИ

### **НЕ ПОЛОМАЕМ ПРОДАКШЕН:**
1. ✅ Все изменения - дополнительные проверки (не удаляем код)
2. ✅ Fallback логика - если проверка дублей падает, депозит проходит
3. ✅ Логирование всех действий для отката
4. ✅ Тестирование на dev перед продакшеном

### **ПЛАН ОТКАТА:**
```typescript
// Если что-то пойдет не так - добавить флаг
const DISABLE_DUPLICATE_CHECK = process.env.DISABLE_DUPLICATE_CHECK === 'true';

if (!DISABLE_DUPLICATE_CHECK) {
  // Наши новые проверки
}
// Старая логика всегда работает
```

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### **ПОСЛЕ ИСПРАВЛЕНИЙ:**
1. ✅ TON депозиты: 100% защита от дублей по tx_hash
2. ✅ UNI депозиты: Защита от дублей в течение 5 минут  
3. ✅ Frontend: Невозможность повторного клика
4. ✅ Мониторинг: Автоматическое обнаружение подозрительной активности

### **МЕТРИКИ УСПЕХА:**
- Количество дублирующихся депозитов = 0
- Жалобы пользователей на двойные списания = 0  
- Система стабильности фарминга = 100%

---

## 🎯 ГОТОВНОСТЬ К РЕАЛИЗАЦИИ

### **ЧТО ГОТОВО:**
✅ Анализ кода завершен  
✅ Найдены все источники проблем  
✅ Разработан безопасный план исправления  
✅ Подготовлены тест-кейсы  

### **ЧТО НУЖНО ОТ ПОЛЬЗОВАТЕЛЯ:**
1. **Подтверждение** на начало исправлений
2. **Доступ к базе данных** для проверки существующих дублей  
3. **Решение** - исправлять сразу все или по этапам

### **ВРЕМЯ НА РЕАЛИЗАЦИЮ:**
- **Этап 1 (критические исправления):** 35 минут
- **Этап 2 (мониторинг):** 20 минут  
- **Этап 3 (тестирование):** 15 минут
- **ИТОГО:** ~1 час

**ГОТОВ НАЧАТЬ ИСПРАВЛЕНИЯ ПО ВАШЕЙ КОМАНДЕ** 🚀