# 📋 План внедрения кеширования для UniFarm

## Этап 1: Базовое кеширование (1-2 дня)

### 1.1 Создание сервиса кеширования
```typescript
// client/src/services/cacheService.ts
class CacheService {
  private cache = new Map();
  private timers = new Map();
  
  set(key: string, data: any, ttl: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Автоочистка по времени
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    return item.data;
  }
  
  invalidate(key: string) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }
  
  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}
```

### 1.2 Интеграция с существующими запросами
- Обернуть API вызовы в кеширующий слой
- Начать с самых частых запросов:
  - `/api/v2/wallet/balance` - кешировать на 30 сек
  - `/api/v2/uni-farming/status` - кешировать на 30 сек
  - `/api/v2/transactions/history` - кешировать на 60 сек

## Этап 2: Умное обновление кеша (2-3 дня)

### 2.1 Интеграция с WebSocket
- При получении обновления баланса - обновить кеш
- При новой транзакции - инвалидировать кеш истории
- При изменении фарминга - обновить соответствующий кеш

### 2.2 Предзагрузка данных
```typescript
// При входе пользователя
async function preloadUserData(userId: number) {
  // Параллельная загрузка всех данных
  await Promise.all([
    fetchAndCacheBalance(userId),
    fetchAndCacheFarmingStatus(userId),
    fetchAndCacheTransactions(userId)
  ]);
}
```

## Этап 3: Оптимизация React Query (1-2 дня)

### 3.1 Настройка staleTime и cacheTime
```typescript
// В queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,      // Данные свежие 30 сек
      cacheTime: 5 * 60000,  // Кеш живёт 5 минут
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});
```

### 3.2 Использование optimistic updates
- При отправке транзакции - сразу обновить UI
- При ошибке - откатить изменения
- Пользователь видит мгновенный отклик

## Этап 4: Мониторинг и настройка (1 день)

### 4.1 Метрики производительности
- Процент попаданий в кеш
- Время ответа с кешем vs без
- Количество сэкономленных запросов

### 4.2 Тонкая настройка TTL
- Анализ паттернов использования
- Настройка времени жизни для каждого типа данных
- Баланс между свежестью и скоростью

## Ожидаемые результаты:

### Скорость:
- **Было**: 220ms на запрос
- **Станет**: 1-5ms из кеша (улучшение в 50-200 раз!)

### Пользовательский опыт:
- Мгновенная навигация между экранами
- Плавная работа даже на медленном интернете
- Снижение расхода батареи на мобильных

### Нагрузка на систему:
- Снижение запросов к БД на 70-80%
- Экономия трафика пользователей
- Возможность обслуживать больше пользователей

## Риски и их минимизация:

1. **Риск**: Устаревшие данные
   **Решение**: WebSocket обновления + короткий TTL

2. **Риск**: Переполнение памяти
   **Решение**: Ограничение размера кеша + автоочистка

3. **Риск**: Сложность отладки
   **Решение**: Логирование + dev tools для кеша

## Вывод:
Кеширование - это проверенное, безопасное решение, которое кардинально улучшит производительность без изменения архитектуры. Начните с Этапа 1 и постепенно двигайтесь дальше!