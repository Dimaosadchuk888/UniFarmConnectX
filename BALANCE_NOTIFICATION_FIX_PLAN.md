# План исправления конфликта BalanceNotificationService

## 1. Подтверждение диагностики

### ✅ Подтверждаю: причина в дублировании BalanceNotificationService

**Обнаружены два конфликтующих файла:**
- `core/balanceNotificationService.ts` (строчная, создан 04.07.2025)
- `core/BalanceNotificationService.ts` (заглавная, создан 11.07.2025)

**Ключевые различия:**

| Характеристика | Версия 1 (строчная) | Версия 2 (заглавная) |
|----------------|---------------------|----------------------|
| Методы WebSocket | registerConnection/removeConnection | addConnection/removeConnection |
| Сигнатура notify | notifyBalanceUpdate(data: BalanceUpdateData) | async notifyBalanceUpdate(userId: number) |
| Хранилище соединений | Map<number, WebSocket[]> | Map<number, UserConnection> |
| Агрегация уведомлений | Да (2 сек debounce) | Нет |
| Используется в | server/index.ts | BatchBalanceProcessor, websocket-balance-integration |

## 2. Рекомендуемое решение

### Оставить версию 1 (строчная буква)

**Причины:**
1. **Более функциональная** - поддерживает агрегацию обновлений (debounce 2 сек)
2. **Уже интегрирована** с WebSocket в server/index.ts
3. **Хранит активные соединения** - критично для работы
4. **Более детальная** - передает полную информацию об изменениях (сумма, валюта, источник)

### План точечных изменений:

#### Шаг 1: Удаление конфликтующего файла
```
Удалить: core/BalanceNotificationService.ts (заглавная)
```

#### Шаг 2: Обновление импортов
```
Файлы для изменения импорта:
- core/BatchBalanceProcessor.ts (строка 9)
- server/websocket-balance-integration.ts (строка 2)

Заменить:
import { BalanceNotificationService } from './BalanceNotificationService';
На:
import { BalanceNotificationService } from './balanceNotificationService';
```

#### Шаг 3: Адаптация вызовов в BatchBalanceProcessor
Текущий вызов уже корректный - передает объект BalanceUpdateData.
Никаких изменений не требуется.

#### Шаг 4: Адаптация websocket-balance-integration.ts
```
Заменить вызов:
await notificationService.notifyBalanceUpdate(userId);

На:
notificationService.notifyBalanceUpdate({
  userId,
  balanceUni: balance.balance_uni,
  balanceTon: balance.balance_ton,
  changeAmount: 0, // или вычислить разницу
  currency: 'UNI', // или определить какая валюта изменилась
  source: 'manual_update',
  timestamp: new Date().toISOString()
});
```

## 3. Анализ зависимостей и рисков

### Затронутые модули:
- ✅ **server/index.ts** - уже использует правильную версию
- ⚠️ **BatchBalanceProcessor** - требует обновления импорта
- ⚠️ **websocket-balance-integration** - требует обновления импорта и вызова
- ✅ **farmingScheduler** - не затронут напрямую
- ✅ **BalanceManager** - не затронут

### Риски:
1. **Минимальный риск сбоя** - изменения точечные, только импорты
2. **Временное отсутствие уведомлений** - на время рестарта сервера
3. **Нет риска потери данных** - затрагивается только слой уведомлений

## 4. План безопасной миграции

### Фаза 1: Подготовка (5 минут)
1. Создать резервные копии обоих файлов BalanceNotificationService
2. Проверить текущие логи на наличие ошибок
3. Зафиксировать текущий баланс пользователя для проверки

### Фаза 2: Применение изменений (10 минут)
1. Обновить импорт в `core/BatchBalanceProcessor.ts`
2. Обновить импорт и вызов в `server/websocket-balance-integration.ts`
3. Удалить файл `core/BalanceNotificationService.ts` (заглавная)
4. Перезапустить сервер

### Фаза 3: Проверка (15 минут)
1. Подключиться WebSocket клиентом к пользователю 74
2. Дождаться следующего цикла фарминга (каждые 5 минут)
3. Проверить получение сообщения `balance_update` в браузере
4. Убедиться что баланс обновляется автоматически

### Фаза 4: Мониторинг (30 минут)
1. Следить за логами на предмет ошибок
2. Проверить работу с несколькими пользователями
3. Убедиться в стабильности WebSocket соединений

## 5. Команды для тестирования

### Проверка WebSocket уведомлений в консоли браузера:
```javascript
// Слушать все WebSocket сообщения
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(...args) {
  console.log('[WS OUT]', args);
  return originalSend.apply(this, args);
};

// Проверить получение balance_update
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'balance_update') {
    console.log('[BALANCE UPDATE RECEIVED]', e.data);
  }
});
```

## 6. Откат при проблемах

Если что-то пойдет не так:
1. Восстановить файл `core/BalanceNotificationService.ts` из резервной копии
2. Вернуть оригинальные импорты
3. Перезапустить сервер
4. Система вернется к текущему состоянию (ручное обновление F5)

## Заключение

Предложенный план минимизирует риски и обеспечивает плавный переход на единую версию BalanceNotificationService. После применения изменений пользователи получат автоматическое обновление баланса в реальном времени без необходимости обновлять страницу.