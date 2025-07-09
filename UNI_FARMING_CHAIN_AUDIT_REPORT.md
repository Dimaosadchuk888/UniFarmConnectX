# 📋 ОТЧЁТ: Аудит цепочки списания UNI при открытии фарминга

**Дата:** 9 января 2025  
**Статус:** ❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ

## 📁 Найденные файлы и компоненты

### Через ROADMAP.md найдены:
1. **API endpoints** (строки 165-176 ROADMAP.md):
   - POST /api/v2/farming/deposit - основной endpoint депозита
   - POST /api/v2/farming/start - альтернативный endpoint
   - POST /api/v2/farming/direct-deposit - прямой депозит минуя BaseController

2. **Недокументированные файлы** (строка 432 ROADMAP.md):
   - modules/farming/directDeposit.ts - прямые депозиты в фарминг

3. **Планировщик** (строки 386, 447):
   - core/scheduler/farmingScheduler.ts - автоматические начисления каждые 5 минут

## 📌 Анализ этапов цепочки

### ✅ ЭТАП 1: Открытие фарминга

**Найдено 3 точки входа:**

1. **FarmingController.depositUni** (строка 210-264 controller.ts)
   - Принимает amount из тела запроса
   - Валидирует авторизацию Telegram
   - Вызывает `farmingService.depositUniForFarming()`

2. **FarmingController.startFarming** (строка 157-183 controller.ts) 
   - Аналогично вызывает тот же метод сервиса
   
3. **directDepositHandler** (modules/farming/directDeposit.ts)
   - Обход BaseController для решения проблем
   - Напрямую вызывает `farmingService.depositUniForFarming()`

**❌ ПРОБЛЕМА НЕ ЗДЕСЬ** - все три метода корректно передают управление в сервис

### ✅ ЭТАП 2: Списание UNI 

**В modules/farming/service.ts метод depositUniForFarming():**

1. **Валидация баланса** (строки 186-197):
   ```typescript
   const currentBalance = parseFloat(user.balance_uni || '0');
   if (currentBalance < depositAmount) {
     return { success: false, message: 'Недостаточно средств' };
   }
   ```

2. **Списание через BalanceManager** (строки 229-242):
   ```typescript
   const balanceUpdateResult = await balanceManager.subtractBalance(
     user.id,
     depositAmount,
     0,
     'UNI farming deposit'
   );
   ```

3. **Обновление депозита в БД** (строки 245-254):
   ```typescript
   const { data: updateData, error: updateError } = await supabase
     .from(FARMING_TABLES.USERS)
     .update({
       uni_deposit_amount: newDepositAmount,
       uni_farming_start_timestamp: new Date().toISOString(),
       uni_farming_last_update: new Date().toISOString(),
       uni_farming_rate: FARMING_CONFIG.DEFAULT_RATE,
       uni_farming_active: true  // ИСПРАВЛЕНО
     })
   ```

**❌ КРИТИЧЕСКАЯ ПРОБЛЕМА НАЙДЕНА:**
- До исправления не устанавливался флаг `uni_farming_active = true`
- Без этого флага планировщик не видит пользователя

### ❌ ЭТАП 3: Сохранение фарминг-сессии

**НЕ ПРОИСХОДИТ!** 

В коде `depositUniForFarming()` отсутствует создание записи в таблице `farming_sessions`. Есть только:
- Обновление полей в таблице `users`
- Создание транзакции типа FARMING_REWARD

**Таблица farming_sessions пустая** согласно ROADMAP.md (строка 533)

### ✅ ЭТАП 4: Начисление процентов

**В core/scheduler/farmingScheduler.ts:**

1. **Поиск активных фармеров** (строки 43-47):
   ```typescript
   const { data: activeFarmers, error } = await supabase
     .from('users')
     .select('*')
     .not('uni_farming_start_timestamp', 'is', null)
     .not('uni_farming_rate', 'is', null);
   ```

2. **Расчёт и начисление** (строки 58-98):
   - Рассчитывает доход за период
   - Обновляет balance_uni
   - Создаёт транзакцию FARMING_REWARD
   - Записывает в farming_sessions (строки 72-84)

**❌ КРИТИЧЕСКАЯ ПРОБЛЕМА:**
- Планировщик НЕ проверяет флаг `uni_farming_active`
- Но у пользователя 62 этот флаг = false, поэтому начисления могут не работать корректно

## ❌ Точки обрыва логики

### 1. **Флаг uni_farming_active**
- **Где должно быть:** При депозите в методе `depositUniForFarming`
- **Что происходит:** Флаг не устанавливался (исправлено в коде)
- **Последствия:** Фарминг технически неактивен, хотя депозит есть

### 2. **Отсутствие записи в farming_sessions при депозите**
- **Где должно быть:** После успешного списания UNI
- **Что происходит:** Запись создаётся только планировщиком при начислении
- **Последствия:** Нет истории открытия фарминг-пакетов

### 3. **Несоответствие проверок в планировщике**
- **Проблема:** Планировщик проверяет только наличие `uni_farming_start_timestamp` и `uni_farming_rate`
- **Не проверяет:** Флаг `uni_farming_active`
- **Последствия:** Может начислять доход неактивным пользователям

## ✅ Подтверждение работы списания

**Анализ данных пользователя 62:**
- Баланс увеличивается: 448.229512 → 448.231257 → 448.232133
- uni_deposit_amount = 100 (депозит записан)
- uni_farming_rate = 0.01 (ставка установлена)
- uni_farming_start_timestamp есть

**ВЫВОД:** Списание UNI происходит корректно, депозит записывается, но флаг активности не устанавливался.

## 🧩 Заключение

### Что работает:
1. ✅ API endpoints принимают запросы
2. ✅ Списание UNI через BalanceManager
3. ✅ Обновление uni_deposit_amount в БД
4. ✅ Установка uni_farming_rate
5. ✅ Начисление дохода планировщиком (частично)

### Что НЕ работает:
1. ❌ Флаг uni_farming_active не устанавливался при депозите (ИСПРАВЛЕНО в коде)
2. ❌ Не создаётся запись в farming_sessions при открытии
3. ❌ UI показывает фарминг как неактивный из-за флага

### Корневая причина проблемы:
**Отсутствие установки `uni_farming_active = true` при депозите** приводило к тому, что система считала фарминг неактивным, хотя депозит был сделан и начисления работали.

### Рекомендации:
1. Активировать флаг для пользователя 62 через предоставленную HTML страницу
2. Рассмотреть добавление проверки `uni_farming_active` в планировщик
3. Добавить создание записи в farming_sessions при депозите