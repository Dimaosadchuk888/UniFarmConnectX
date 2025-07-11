# Отчет по расследованию проблемы с балансами аккаунта 74

## Дата: 11 января 2025
## Проблема: Баланс не отображается (показывает 0)

### Симптомы:
- userId: 74 корректно отображается
- uniBalance: 0 (должно быть ~1,009,900)
- tonBalance: 0 (должно быть ~898)
- uniFarmingActive: false (должно быть true)
- uniDepositAmount: 0 (должно быть 407,589)

### План расследования:
1. Проверка JWT токена
2. Проверка API запросов
3. Проверка UserContext
4. Проверка BalanceCard компонента
5. Проверка консольных логов

## Шаг 1: Анализ консольных логов

### Обнаруженные факты:
1. В консоли видно:
   - [UserContext] Данные пользователя из API загружаются с правильными балансами:
     - balance_uni: 1009900.122573  
     - balance_ton: 898.118945
   - [UserContext] Состояние обновлено, userId: 74

2. НО отсутствуют критические логи:
   - ❌ "[UserContext] userId установлен, запрашиваем баланс для userId:"
   - ❌ "[UserContext] Запрос баланса для userId:"
   - ❌ "[balanceService] Запрос баланса для userId:"

3. BalanceCard постоянно показывает нулевые балансы

### Вывод:
refreshBalance() НЕ вызывается, хотя userId устанавливается правильно!

## Шаг 2: Проверка useEffect для refreshBalance

### Обнаружено:
useEffect срабатывает и вызывает refreshBalance! В новых логах видно:
- ✅ "[BalanceCard] Первичная загрузка баланса"  
- ✅ "[UserContext] Запрос баланса для userId: 74 с forceRefresh: true"
- ✅ "[balanceService] Запрос баланса для userId: 74"
- ✅ "[correctApiRequest] Отправка запроса: /api/v2/wallet/balance?user_id=74"

## Шаг 3: Проблема с JWT авторизацией

### Корневая причина найдена!
API endpoint /api/v2/wallet/balance возвращает ошибку:
```json
{
  "success": false,
  "error": "Invalid or expired JWT token", 
  "jwt_error": "invalid signature",
  "need_new_token": true
}
```

### Почему это происходит:
1. Браузер использует JWT токен из localStorage
2. Но этот токен имеет неправильную подпись или истек
3. API отклоняет запрос баланса
4. balanceService ловит ошибку и устанавливает нулевые балансы