# 🛠️ ПЛАН БЕЗОПАСНОГО ИСПРАВЛЕНИЯ ПРОБЛЕМ UniFarm
**Дата:** 13 января 2025  
**Статус:** Готов к реализации  
**Приоритет:** КРИТИЧЕСКИЙ

## 📋 Резюме плана

Три проблемы требуют аккуратного исправления:
1. **TON Boost транзакции** - быстрое исправление (15 минут)
2. **Миграция существующих пользователей** - скрипт миграции (30 минут)
3. **UNI Farming множественные пакеты** - архитектурное изменение (2-3 часа)

## 🎯 ПРОБЛЕМА 1: TON Boost транзакции не отображаются

### Варианты решения:

#### Вариант А: Минимальное изменение (РЕКОМЕНДУЕТСЯ)
**Файл:** `modules/scheduler/tonBoostIncomeScheduler.ts`  
**Строка:** 158  
**Изменение:**
```typescript
// БЫЛО:
type: 'FARMING_REWARD',

// СТАЛО:
type: 'TON_BOOST_INCOME',
```

**Преимущества:**
- Изменение 1 строки кода
- Мгновенный эффект после перезапуска
- Новые транзакции сразу будут видны в истории

**Недостатки:**
- Старые 131 транзакция останутся с типом FARMING_REWARD

#### Вариант Б: Добавление нового типа в БД
```sql
-- Добавить новый тип в enum
ALTER TYPE transactions_transaction_type 
ADD VALUE 'TON_BOOST_REWARD' AFTER 'FARMING_REWARD';

-- Обновить старые транзакции
UPDATE transactions 
SET type = 'TON_BOOST_REWARD'
WHERE type = 'FARMING_REWARD' 
  AND currency = 'TON'
  AND amount_ton > 0;
```

**Преимущества:**
- Исправляет исторические данные
- Четкое разделение типов

**Недостатки:**
- Требует изменения БД
- Риск при UPDATE операции

### 🔧 Пошаговая инструкция (Вариант А):

1. **Создать резервную копию:**
   ```bash
   # Экспорт текущих транзакций
   pg_dump -t transactions > backup_transactions_$(date +%Y%m%d).sql
   ```

2. **Изменить код:**
   ```bash
   # Открыть файл
   nano modules/scheduler/tonBoostIncomeScheduler.ts
   # Найти строку 158
   # Изменить type: 'FARMING_REWARD' на type: 'TON_BOOST_INCOME'
   ```

3. **Перезапустить сервер:**
   ```bash
   # Остановить текущий процесс
   pm2 stop unifarm
   # Запустить заново
   pm2 start unifarm
   ```

4. **Проверить результат:**
   ```sql
   -- Проверить новые транзакции
   SELECT type, COUNT(*) 
   FROM transactions 
   WHERE created_at > NOW() - INTERVAL '10 minutes'
   GROUP BY type;
   ```

## 🎯 ПРОБЛЕМА 2: Миграция существующих пользователей TON Boost

### Скрипт безопасной миграции:

**Файл:** `scripts/fix-ton-farming-balance.ts`
```typescript
import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function fixTonFarmingBalance() {
  logger.info('🔧 Начинаем миграцию farming_balance для TON Boost пользователей');
  
  try {
    // 1. Получаем пользователей с активным TON Boost
    const { data: activeUsers, error } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('is_active', true)
      .eq('farming_balance', 0);
      
    if (error) {
      logger.error('Ошибка получения пользователей:', error);
      return;
    }
    
    logger.info(`Найдено ${activeUsers?.length || 0} пользователей для миграции`);
    
    // 2. Для каждого пользователя устанавливаем farming_balance
    for (const user of activeUsers || []) {
      // Получаем сумму из последней покупки
      const { data: lastPurchase } = await supabase
        .from('boost_purchases')
        .select('required_amount')
        .eq('user_id', user.user_id)
        .eq('boost_type', 'TON_BOOST')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      const depositAmount = lastPurchase?.required_amount || 5; // По умолчанию 5 TON
      
      // Обновляем farming_balance
      const { error: updateError } = await supabase
        .from('ton_farming_data')
        .update({ farming_balance: depositAmount })
        .eq('user_id', user.user_id);
        
      if (updateError) {
        logger.error(`Ошибка обновления user ${user.user_id}:`, updateError);
      } else {
        logger.info(`✅ Обновлен user ${user.user_id}: farming_balance = ${depositAmount}`);
      }
    }
    
    logger.info('✅ Миграция завершена');
    
  } catch (error) {
    logger.error('Критическая ошибка миграции:', error);
  }
}

// Запуск с подтверждением
if (process.argv[2] === '--confirm') {
  fixTonFarmingBalance();
} else {
  console.log('⚠️  Для запуска миграции используйте: npm run fix-ton-balance -- --confirm');
}
```

### 🔧 Инструкция по запуску миграции:

1. **Создать файл скрипта**
2. **Добавить в package.json:**
   ```json
   "scripts": {
     "fix-ton-balance": "tsx scripts/fix-ton-farming-balance.ts"
   }
   ```
3. **Запустить в тестовом режиме:**
   ```bash
   npm run fix-ton-balance
   ```
4. **Запустить с подтверждением:**
   ```bash
   npm run fix-ton-balance -- --confirm
   ```

## 🎯 ПРОБЛЕМА 3: UNI Farming множественные пакеты

### Архитектурное решение:

#### Этап 1: Создание таблицы для пакетов
```sql
CREATE TABLE uni_farming_packages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  package_number INTEGER NOT NULL,
  deposit_amount NUMERIC(20,6) NOT NULL,
  farming_rate NUMERIC(10,6) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  last_claim TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, package_number)
);

CREATE INDEX idx_uni_farming_packages_active 
ON uni_farming_packages(user_id, is_active);
```

#### Этап 2: Миграция существующих депозитов
```sql
-- Создаем пакеты из существующих депозитов
INSERT INTO uni_farming_packages (
  user_id, 
  package_number, 
  deposit_amount, 
  farming_rate, 
  started_at
)
SELECT 
  id as user_id,
  1 as package_number,
  uni_deposit_amount as deposit_amount,
  uni_farming_rate as farming_rate,
  COALESCE(uni_farming_start, created_at) as started_at
FROM users
WHERE uni_farming_active = true
  AND uni_deposit_amount > 0;
```

#### Этап 3: Обновление планировщика (МИНИМАЛЬНЫЕ изменения)
**Файл:** `core/scheduler/farmingScheduler.ts`

Добавить новый метод для обработки пакетов:
```typescript
private async calculatePackageIncome(packageData: any): Promise<string> {
  const now = new Date();
  const lastClaim = packageData.last_claim ? new Date(packageData.last_claim) : new Date(packageData.started_at);
  const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
  
  const rate = parseFloat(packageData.farming_rate || '0');
  const depositAmount = parseFloat(packageData.deposit_amount || '0');
  const daysElapsed = hoursSinceLastClaim / 24;
  const income = depositAmount * rate * daysElapsed;
  
  return income.toFixed(6);
}
```

### 🔧 Поэтапное внедрение:

**Фаза 1: Подготовка (без влияния на работу)**
1. Создать таблицу uni_farming_packages
2. Заполнить данными из существующих депозитов
3. Тестировать на копии БД

**Фаза 2: Параллельная работа**
1. Обновить UniFarmingRepository для чтения из новой таблицы
2. Продолжать использовать старую логику как fallback
3. Логировать различия для проверки

**Фаза 3: Переключение**
1. Обновить планировщик для использования пакетов
2. Создавать отдельные транзакции для каждого пакета
3. Отключить старую логику после проверки

## ⚠️ Меры предосторожности

1. **Всегда делать резервные копии перед изменениями**
2. **Тестировать на небольшой группе пользователей**
3. **Мониторить логи после каждого изменения**
4. **Иметь план отката для каждого шага**
5. **Не делать все изменения одновременно**

## 📊 Метрики успеха

После внедрения проверить:
- [ ] Новые TON транзакции видны в истории
- [ ] 10 пользователей имеют корректный farming_balance
- [ ] UNI Farming создает отдельные транзакции для пакетов
- [ ] Нет ошибок в логах планировщиков
- [ ] Балансы пользователей корректны

## 🚀 Рекомендуемый порядок внедрения

1. **Сегодня:** Исправить тип транзакций TON Boost (15 мин)
2. **Сегодня:** Запустить миграцию farming_balance (30 мин)
3. **Завтра:** Начать работу над множественными пакетами (2-3 часа)

**ВАЖНО:** После каждого шага ждать 30 минут и проверять метрики!