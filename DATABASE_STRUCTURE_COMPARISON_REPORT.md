# 🚨 СРОЧНЫЙ АНАЛИЗ: ГДЕ ХРАНИЛИСЬ TON ДЕПОЗИТЫ ДО ПОЛОМКИ

## Текущее состояние (СЛОМАНО):
- ❌ Депозиты попадают только в `transactions`
- ❌ НЕТ таблиц: `ton_boost_packages`, `boost_packages`, `ton_deposits`
- ❌ Планировщик не может найти депозиты

## Анализ архитектуры:

### 1. Таблица `ton_farming_data` СУЩЕСТВУЕТ!
```
✅ ton_farming_data - существует
```

### 2. Поля в `users` для TON:
- `balance_ton` - текущий баланс
- `ton_boost_package` - ID активного пакета  
- `ton_boost_package_id` - дублирующее поле?
- `ton_boost_active` - флаг активности
- `ton_farming_balance` - сумма в фарминге
- `ton_farming_rate` - ставка фарминга
- `ton_farming_start_timestamp` - старт фарминга

### 3. Пользователь 290 - что должно было произойти:
**До поломки:**
1. Депозит 1 TON → `transactions` (записано ✅)
2. Активация пакета → `users.ton_boost_package = 1` (записано ✅)  
3. Перевод в фарминг → `ton_farming_data` создание записи (НЕ ПРОИЗОШЛО ❌)
4. Обновление `users.ton_farming_balance = 1` (НЕ ПРОИЗОШЛО ❌)
5. Старт планировщика → доходы (НЕ РАБОТАЕТ ❌)

## КРИТИЧЕСКИЙ ВОПРОС:
**КТО ДОЛЖЕН БЫЛ СОЗДАВАТЬ ЗАПИСИ В `ton_farming_data`?**

Скорее всего это:
- `TonFarmingRepository.activateBoost()` метод
- Или обработчик депозитов в `modules/boost/service.ts`
- Или планировщик `boostVerificationScheduler.ts`

## НУЖНО НАЙТИ:
1. Код создания записей в `ton_farming_data`
2. Логику активации TON Boost пакетов
3. Связь между `transactions` и `ton_farming_data`