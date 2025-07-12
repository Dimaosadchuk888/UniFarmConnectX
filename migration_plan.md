# План миграции дублированных маршрутов UniFarm
*Дата: 12 июля 2025*

## Цель
Устранить дублирование маршрутов между server/index.ts и модулями для соблюдения модульной архитектуры.

## Текущее состояние

### Дублированные маршруты (требуют удаления из server/index.ts):
1. **GET /api/v2/wallet/balance** (строка 825-857)
   - Дублирует: modules/wallet/routes.ts:69
   - Использует: BalanceManager, SupabaseUserRepository
   
2. **POST /api/v2/wallet/withdraw** (строка 858-989)
   - Дублирует: modules/wallet/routes.ts:78
   - Использует: BalanceManager, UnifiedTransactionService
   
3. **GET /api/v2/uni-farming/status** (строка 683-736)
   - Дублирует: modules/farming/routes.ts:35
   - Использует: прямой доступ к Supabase
   
4. **POST /api/v2/wallet/transfer** (строка 990-1111)
   - Дублирует: modules/wallet/routes.ts:79
   - Использует: BalanceManager, UnifiedTransactionService
   
5. **GET /api/v2/wallet/transactions** (строка 1112-1170)
   - Дублирует: modules/wallet/routes.ts:74
   - Использует: прямой доступ к Supabase

### Требуют миграции в модули:
1. **POST /api/v2/wallet/ton-deposit** (строка 740-824)
   - Нет аналога в modules/wallet/routes.ts
   - Нужно перенести в wallet модуль

## План действий

### Этап 1: Проверка функциональности модульных маршрутов
1. Убедиться, что модульные маршруты корректно обрабатывают запросы
2. Проверить, что используются те же сервисы (BalanceManager и т.д.)
3. Сравнить бизнес-логику

### Этап 2: Миграция ton-deposit
1. Создать метод `tonDeposit` в `modules/wallet/controller.ts`
2. Перенести логику из server/index.ts:740-824
3. Добавить маршрут в `modules/wallet/routes.ts`
4. Протестировать функциональность

### Этап 3: Удаление дублированных маршрутов
Последовательно удалить из server/index.ts:
1. wallet/balance (строки 825-857)
2. wallet/withdraw (строки 858-989)
3. uni-farming/status (строки 683-736)
4. wallet/transfer (строки 990-1111)
5. wallet/transactions (строки 1112-1170)

### Этап 4: Тестирование
1. Проверить работоспособность всех endpoints
2. Убедиться в корректности ответов
3. Проверить авторизацию и rate limiting

## Риски и предосторожности

1. **Различия в реализации** - проверить идентичность логики
2. **Зависимости** - убедиться, что все импорты доступны в модулях
3. **Обратная совместимость** - сохранить формат ответов API

## Ожидаемый результат
- Устранено дублирование кода
- Соблюдена модульная архитектура
- Все маршруты работают через модули
- server/index.ts содержит только инициализацию и общие middleware