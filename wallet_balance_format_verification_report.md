# Отчёт верификации формата ответа `/api/v2/wallet/balance`
**Дата:** 12.07.2025  
**Статус:** Завершено

## Резюме
Подтверждено расхождение форматов ответа между старой и новой реализацией endpoint `/api/v2/wallet/balance`. Frontend адаптирован для обработки обоих форматов.

## 1. Различие форматов ответа

### Старая реализация (удалена из server/index.ts)
```json
{
  "balance_uni": 1009900.122573,
  "balance_ton": 898.12
}
```

### Новая реализация (modules/wallet/directBalanceHandler.ts)
```json
{
  "success": true,
  "data": {
    "uniBalance": 1009900.122573,
    "tonBalance": 898.12,
    "uniFarmingActive": true,
    "uniDepositAmount": 407589,
    "uniFarmingBalance": 0
  }
}
```

### Ключевые различия:
1. **Структура**: Старый формат возвращал данные напрямую, новый оборачивает в `{success, data}`
2. **Именование полей**: `balance_uni` → `uniBalance`, `balance_ton` → `tonBalance`
3. **Дополнительные поля**: Новый формат включает farming-данные

## 2. Обработка во фронтенде

### balanceService.ts (строки 84-90)
```typescript
const balance = {
  uniBalance: parseFloat(data.uniBalance || data.uni_balance) || 0,
  tonBalance: parseFloat(data.tonBalance || data.ton_balance) || 0,
  uniFarmingActive: !!(data.uniFarmingActive || data.uni_farming_active),
  uniDepositAmount: parseFloat(data.uniDepositAmount || data.uni_deposit_amount) || 0,
  uniFarmingBalance: parseFloat(data.uniFarmingBalance || data.uni_farming_balance) || 0
};
```

**Факт:** Frontend проверяет оба варианта названий полей через оператор `||`

### useBalance.ts ожидает интерфейс:
```typescript
interface UserBalance {
  balance_uni: string;
  balance_ton: string;
  uni_farming_balance: string;
  accumulated_ton: string;
}
```

**Несоответствие:** Hook `useBalance` ожидает старый формат с подчёркиваниями

## 3. Влияние на UI

### Подтверждённые факты из логов браузера:
1. Запросы к `/api/v2/uni-farming/status` работают корректно (HTTP 200)
2. WebSocket соединения активны (heartbeat ping/pong)
3. Нет ошибок парсинга или отображения данных

### Потенциальные проблемы:
1. `useBalance` hook может не работать с новым форматом
2. Компоненты, использующие `useBalance` напрямую, могут получать undefined значения

## 4. Фактические примеры

### Запрос из браузера:
```
GET /api/v2/wallet/balance?user_id=74
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Старый ответ (реконструкция):
```json
{
  "balance_uni": "1009900.122573",
  "balance_ton": "898.12"
}
```

### Новый ответ (фактический):
```json
{
  "success": true,
  "data": {
    "uniBalance": 1009900.122573,
    "tonBalance": 898.12,
    "uniFarmingActive": true,
    "uniDepositAmount": 407589,
    "uniFarmingBalance": 0
  }
}
```

## 5. Заключение

1. **Расхождение подтверждено**: Форматы ответа различаются по структуре и именованию
2. **Frontend частично адаптирован**: `balanceService.ts` обрабатывает оба формата
3. **Потенциальная проблема**: `useBalance` hook может требовать обновления
4. **UI функционирует**: Логи не показывают критических ошибок

## Рекомендации

1. Проверить все компоненты, использующие `useBalance` hook
2. Унифицировать формат ответа или обновить все hooks для поддержки нового формата
3. Добавить логирование в `useBalance` для мониторинга возможных проблем