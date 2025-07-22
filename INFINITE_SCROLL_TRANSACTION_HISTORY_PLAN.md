# ТЕХНИЧЕСКИЙ ПЛАН: Плавная подгрузка транзакций по скроллу
**Дата создания:** 22 июля 2025  
**Задача:** Реализовать infinite scroll для истории транзакций в разделе "Кошелек"

---

## 🎯 ЦЕЛЬ
Заменить кнопку "Загрузить еще" на автоматическую подгрузку транзакций при прокрутке до конца списка, как в разделе "Партнерка".

---

## 📋 ТЕКУЩЕЕ СОСТОЯНИЕ

### **АНАЛИЗ СУЩЕСТВУЮЩЕГО КОДА**
**Файл:** `client/src/components/wallet/TransactionHistory.tsx`

#### **Текущая архитектура:**
- ✅ **useQuery** с ручной пагинацией (page/limit)
- ✅ **Состояние:** `allTransactions` для накопления данных
- ✅ **Фильтрация:** 3 вкладки (ALL/UNI/TON) через `activeFilter`
- ✅ **Дедупликация:** проверка по `transaction.id`
- ❌ **Кнопка "Загрузить еще"** требует ручного клика

#### **Существующие параметры:**
- `page` (текущая страница)
- `limit = 20` (количество за раз)  
- `activeFilter` (ALL/UNI/TON)
- `allTransactions[]` (накопленные данные)

---

## 🚀 ПРЕДЛАГАЕМОЕ РЕШЕНИЕ

### **ПОДХОД: Гибридная архитектура**
**Сохраняем existing useQuery + добавляем IntersectionObserver**

#### **ПОЧЕМУ НЕ useInfiniteQuery:**
1. Текущий backend API не поддерживает cursor-based pagination
2. Существующая логика фильтрации работает стабильно
3. Минимальные изменения = минимальные риски

#### **ПОЧЕМУ IntersectionObserver:**
1. Нативная браузерная технология
2. Высокая производительность
3. Автоматическое срабатывание при достижении элемента
4. Поддержка всех современных браузеров

---

## 🔧 ТЕХНИЧЕСКИЙ ПЛАН РЕАЛИЗАЦИИ

### **PHASE 1: Создание хука useInfiniteScroll**
**Файл:** `client/src/hooks/useInfiniteScroll.ts`

```typescript
interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  threshold?: number;
}

const useInfiniteScroll = (options: UseInfiniteScrollOptions) => {
  const [targetRef, setTargetRef] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!targetRef || !options.hasMore || options.isLoading) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          options.onLoadMore();
        }
      },
      {
        rootMargin: options.rootMargin || '100px',
        threshold: options.threshold || 0.1
      }
    );
    
    observer.observe(targetRef);
    
    return () => observer.disconnect();
  }, [targetRef, options.hasMore, options.isLoading, options.onLoadMore]);
  
  return { targetRef: setTargetRef };
};
```

### **PHASE 2: Обновление TransactionHistory.tsx**
**Минимальные изменения существующего кода:**

#### **2.1 Добавить useInfiniteScroll:**
```typescript
const { targetRef } = useInfiniteScroll({
  hasMore: allTransactions.length < totalTransactions,
  isLoading: isFetching,
  onLoadMore: handleLoadMore,
  rootMargin: '50px'
});
```

#### **2.2 Заменить кнопку на invisible trigger:**
```tsx
// Убираем кнопку "Загрузить еще"
{allTransactions.length > 0 && allTransactions.length < totalTransactions && (
  <div 
    ref={targetRef}
    className="h-20 flex items-center justify-center mt-4"
  >
    {isFetching && (
      <div className="flex items-center text-gray-400">
        <i className="fas fa-spinner fa-spin mr-2"></i>
        Загружаем еще транзакции...
      </div>
    )}
  </div>
)}
```

### **PHASE 3: Улучшения UX**

#### **3.1 Skeleton Loading для подгрузки:**
```tsx
{isFetching && allTransactions.length > 0 && (
  Array.from({ length: 3 }).map((_, index) => (
    <TransactionSkeleton key={`loading-${index}`} />
  ))
)}
```

#### **3.2 Плавные анимации:**
```css
.transaction-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 📱 UX СПЕЦИФИКАЦИЯ

### **ПОВЕДЕНИЕ ПРИ СКРОЛЛЕ:**

1. **Пользователь скроллит вниз** → автоматическая подгрузка за 50px до конца
2. **Во время загрузки** → показываем spinner "Загружаем еще транзакции..."
3. **После загрузки** → плавно добавляем новые элементы с анимацией
4. **При достижении конца** → скрываем trigger элемент

### **ФИЛЬТРАЦИЯ:**
- При смене фильтра → **сброс на первую страницу** (как сейчас)
- Отдельная подгрузка для каждого фильтра (ALL/UNI/TON)
- Кэширование результатов через React Query

### **ПРОИЗВОДИТЕЛЬНОСТЬ:**
- **Лимит:** максимум 100-200 транзакций в памяти
- **Виртуализация:** не нужна (транзакции компактные)
- **Дебаунсинг:** предотвращает множественные запросы

---

## 🔒 БЕЗОПАСНОСТЬ И СОВМЕСТИМОСТЬ

### **СОХРАНЯЕМАЯ ФУНКЦИОНАЛЬНОСТЬ:**
- ✅ Фильтрация по валютам (ALL/UNI/TON)
- ✅ Обновление по кнопке "Обновить"
- ✅ Автообновление каждую минуту  
- ✅ Дедупликация транзакций по ID
- ✅ Обработка ошибок и пустых состояний

### **BACKWARD COMPATIBILITY:**
- ✅ Никаких изменений в backend API
- ✅ Тот же формат данных
- ✅ Тот же алгоритм накопления `allTransactions`

### **FALLBACK STRATEGY:**
```typescript
// Если IntersectionObserver не поддерживается
if (!window.IntersectionObserver) {
  // Возвращаемся к кнопке "Загрузить еще"
  return <LoadMoreButton />;
}
```

---

## 📊 ДЕТАЛИ IMPLEMENTATION

### **НАСТРОЙКИ INFINITE SCROLL:**

#### **Timing параметры:**
- `rootMargin: '50px'` - начинаем загрузку за 50px до конца
- `threshold: 0.1` - срабатывает при 10% видимости trigger
- `debounceTime: 300ms` - защита от множественных вызовов

#### **Лимиты производительности:**
- `maxItemsInMemory: 200` - максимум транзакций в DOM
- `initialBatchSize: 10` - первая загрузка (меньше для быстроты)
- `subsequentBatchSize: 20` - последующие загрузки

#### **Error Handling:**
```typescript
const handleScrollError = useCallback((error: Error) => {
  console.error('[InfiniteScroll] Error loading more transactions:', error);
  showError('Не удалось загрузить дополнительные транзакции');
  // Возвращаемся к кнопке как fallback
  setUseButtonFallback(true);
}, [showError]);
```

---

## 🎨 ВИЗУАЛЬНЫЕ УЛУЧШЕНИЯ

### **LOADING STATES:**

1. **Первая загрузка:** Skeleton для 5 элементов (как сейчас)
2. **Подгрузка:** Mini-skeleton для 3 элементов внизу списка
3. **Ошибка загрузки:** Плавное показание кнопки "Попробовать еще раз"

### **АНИМАЦИИ:**
- **Появление:** `fadeInUp` для новых элементов
- **Загрузка:** Пульсирующий индикатор загрузки
- **Переходы:** Плавное изменение высоты контейнера

---

## 🧪 TESTING STRATEGY

### **TEST CASES:**

1. **Базовый скролл:** 
   - Скролл вниз → подгружаются новые транзакции
   - Дубликаты не появляются

2. **Смена фильтров:**
   - ALL → UNI → сброс пагинации, новая подгрузка
   - UNI → TON → корректная фильтрация

3. **Edge Cases:**
   - Нет интернета → fallback на кнопку
   - API ошибка → уведомление + кнопка "Повторить"
   - Достижение конца → скрытие trigger

4. **Производительность:**
   - 1000+ транзакций → плавная работа
   - Быстрый скролл → дебаунсинг работает

---

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### **UX УЛУЧШЕНИЯ:**
- 🚀 **Удобство:** Никаких кликов по кнопкам
- 🚀 **Скорость:** Мгновенная подгрузка при скролле  
- 🚀 **Плавность:** Анимированное появление элементов
- 🚀 **Интуитивность:** Естественное поведение как в соцсетях

### **ТЕХНИЧЕСКИЕ ПРЕИМУЩЕСТВА:**
- ✅ **Минимальные изменения** существующего кода
- ✅ **Zero Breaking Changes** для существующей функциональности
- ✅ **Высокая производительность** IntersectionObserver API
- ✅ **Graceful Fallback** для старых браузеров

---

## 🛠️ ПЛАН ВНЕДРЕНИЯ

### **ЭТАП 1: Подготовка (30 мин)**
1. Создать хук `useInfiniteScroll.ts`
2. Добавить анимации в CSS
3. Подготовить skeleton компоненты

### **ЭТАП 2: Интеграция (45 мин)**
1. Обновить `TransactionHistory.tsx`
2. Заменить кнопку на trigger элемент
3. Добавить loading states

### **ЭТАП 3: Тестирование (15 мин)**
1. Проверить все 3 фильтра (ALL/UNI/TON)
2. Протестировать edge cases
3. Валидировать производительность

---

## 🎉 ГОТОВНОСТЬ К PRODUCTION

### **КРИТЕРИИ ГОТОВНОСТИ:**
- ✅ Плавная подгрузка без кнопок
- ✅ Корректная работа всех 3 фильтров
- ✅ Нет дублирующихся транзакций
- ✅ Graceful error handling
- ✅ Анимированные переходы
- ✅ Поддержка мобильных устройств

**ИТОГО ВРЕМЕНИ:** ~90 минут для полной реализации

---

*План создан: 22 июля 2025*  
*Готовность к реализации: ✅ READY TO IMPLEMENT*