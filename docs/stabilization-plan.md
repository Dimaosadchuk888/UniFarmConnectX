# План стабилизации и внедрения UniFarm Connect

## Анализ текущих проблем

### Критические проблемы (требуют немедленного решения)
1. **WebSocket постоянно отключается** - ошибки соединения каждые 3-4 секунды
2. **API возвращает 500 ошибки** - особенно эндпоинты фарминга
3. **Отсутствует пользователь в Telegram WebApp** - user.id не найден
4. **Ошибки TypeScript** - множественные ошибки типов в модулях

### Архитектурные проблемы
1. **Дублирование логики** - одинаковый код в разных модулях
2. **Слабая обработка ошибок** - нет централизованной системы
3. **Проблемы с базой данных** - несоответствие схемы и запросов
4. **Отсутствует валидация данных** - некорректные типы полей

## План стабилизации (Фаза 0) - 1 неделя

### День 1-2: Исправление критических ошибок

#### Задача 1: Исправить WebSocket соединение
- Исправить логику reconnection в WebSocket клиенте
- Добавить proper error handling
- Реализовать exponential backoff для переподключений
- Добавить heartbeat mechanism

#### Задача 2: Исправить Telegram WebApp интеграцию
- Починить получение user.id из Telegram WebApp
- Исправить валидацию initData
- Добавить fallback для development окружения

#### Задача 3: Исправить API ошибки 500
- Исправить ошибки в farming endpoints
- Добавить proper error handling в контроллерах
- Исправить SQL запросы с неправильными полями

### День 3-4: Исправление TypeScript ошибок

#### Задача 4: Исправить типы в модулях
- Исправить ошибки в boost/service.ts
- Починить типы в farming/service.ts
- Исправить проблемы с user/service.ts

#### Задача 5: Обновить схему базы данных
- Синхронизировать схему с реальными запросами
- Исправить несоответствия полей (started_at vs start_date)
- Добавить недостающие поля

### День 5-7: Улучшение обработки ошибок

#### Задача 6: Централизованная обработка ошибок
- Расширить BaseController с лучшим error handling
- Добавить логирование всех ошибок
- Создать стандартизированные ответы API

#### Задача 7: Валидация входящих данных
- Добавить Zod схемы для всех API endpoints
- Реализовать middleware для валидации
- Добавить sanitization входящих данных

## План внедрения entity архитектуры (Фаза 1) - 2 недели

### Неделя 1: Подготовка и интеграция базовых entity

#### День 1-3: Настройка infrastructure
```typescript
// 1. Создать репозитории для всех entity
// 2. Настроить DI контейнер
// 3. Создать адаптеры между старой и новой системой
```

#### День 4-7: Интеграция User и Farmer entity
```typescript
// 1. Обновить UserService для использования Farmer entity
// 2. Интегрировать farming logic в Farmer класс
// 3. Создать migration utilities для существующих данных
```

### Неделя 2: Полная интеграция

#### День 8-10: Wallet и Mission entity
```typescript
// 1. Интегрировать Wallet entity в wallet service
// 2. Перенести mission logic в Mission entity
// 3. Обновить API endpoints для использования entity
```

#### День 11-14: Admin entity и тестирование
```typescript
// 1. Интегрировать Admin entity
// 2. Comprehensive testing всех entity
// 3. Performance testing и оптимизация
```

## План рефакторинга (Фаза 2) - 2 недели

### Неделя 3: Миграция бизнес-логики

#### Перенос логики в entity классы
- Перенести все расчеты фарминга в Farmer
- Перенести financial операции в Wallet
- Перенести administrative logic в Admin

### Неделя 4: Оптимизация и cleanup

#### Удаление legacy кода
- Удалить дублирующиеся функции
- Очистить неиспользуемые файлы
- Оптимизировать database queries

## Конкретные шаги реализации

### Шаг 1: Исправление WebSocket (Приоритет: Критический)
```typescript
// client/src/hooks/useWebSocket.ts
const useWebSocket = () => {
  const [reconnectDelay, setReconnectDelay] = useState(1000);
  const maxReconnectDelay = 30000;
  
  const connect = useCallback(() => {
    // Proper connection logic with exponential backoff
    // Heartbeat implementation
    // Error recovery
  }, []);
};
```

### Шаг 2: Исправление Telegram интеграции
```typescript
// utils/telegramUtils.ts
export const getTelegramUser = () => {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.initDataUnsafe?.user?.id) {
    return webApp.initDataUnsafe.user;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return { id: 1, username: 'devuser' };
  }
  
  throw new Error('Telegram user not available');
};
```

### Шаг 3: Исправление API ошибок
```typescript
// modules/farming/service.ts
export class FarmingService {
  async getFarmingInfo(userId: number) {
    try {
      // Исправить SQL запрос
      const result = await db.select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!result[0]) {
        throw new Error('User not found');
      }
      
      return this.formatFarmingData(result[0]);
    } catch (error) {
      logger.error('Farming info error:', error);
      throw error;
    }
  }
}
```

### Шаг 4: Repository pattern для entity
```typescript
// modules/repositories/UserRepository.ts
export class UserRepository implements IUserRepository {
  async findFarmerById(id: number): Promise<Farmer | null> {
    const dbUser = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
      
    return dbUser[0] ? EntityUtils.fromDbToFarmer(dbUser[0]) : null;
  }
  
  async saveFarmer(farmer: Farmer): Promise<void> {
    await db.update(users)
      .set({
        balance_uni: farmer.balanceUni.toString(),
        uni_deposit_amount: farmer.totalFarmed.toString(),
        uni_farming_rate: farmer.farmingRate.toString(),
        farming_start_time: farmer.farmingStartTime,
        last_farming_claim: farmer.lastFarmingClaim
      })
      .where(eq(users.id, farmer.id));
  }
}
```

## Метрики успеха

### Технические метрики
- **Uptime**: >99.5% (сейчас ~85%)
- **API Response Time**: <200ms (сейчас >500ms)
- **Error Rate**: <1% (сейчас ~15%)
- **WebSocket Stability**: >95% соединений без разрывов

### Качество кода
- **Test Coverage**: >80% (сейчас ~30%)
- **TypeScript Errors**: 0 (сейчас >50)
- **Code Duplication**: <5% (сейчас ~15%)
- **Cyclomatic Complexity**: Medium (сейчас High)

## Risk Management

### Высокие риски
1. **Downtime во время миграции** 
   - Митигация: Blue-green deployment
   - Rollback plan в течение 5 минут

2. **Performance degradation**
   - Митигация: Comprehensive performance testing
   - Мониторинг всех key metrics

3. **Data loss**
   - Митигация: Полный backup перед каждым изменением
   - Database transaction safety

### Мониторинг
```typescript
// core/HealthMonitor.ts
class SystemMonitor {
  checkCriticalSystems() {
    return {
      database: this.checkDatabase(),
      websocket: this.checkWebSocket(),
      telegramIntegration: this.checkTelegram(),
      apiHealth: this.checkApiEndpoints()
    };
  }
}
```

## Timeline Overview

```
Неделя 1: Стабилизация (критические багфиксы)
Неделя 2-3: Entity интеграция
Неделя 4-5: Рефакторинг и оптимизация
Неделя 6: Testing и deployment
```

Этот план обеспечивает стабильную работу системы на каждом этапе с возможностью быстрого отката в случае проблем.