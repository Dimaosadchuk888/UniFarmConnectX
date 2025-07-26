# 🛠️ БЕЗОПАСНОЕ ИСПРАВЛЕНИЕ TELEGRAM WEBAPP - ПОШАГОВЫЙ ПЛАН

**Дата**: 26 июля 2025  
**Проблема**: React Hook Error `TypeError: null is not an object (evaluating 'U.current.useState')`  
**Цель**: Устранить проблему без нарушения работающей системы  
**Приоритет**: 🔒 **PRODUCTION SAFETY FIRST**

---

## 🎯 СТРАТЕГИЯ БЕЗОПАСНОГО ИСПРАВЛЕНИЯ

### Принципы безопасности:
1. ✅ **Поэтапная реализация** - изменения маленькими шагами
2. ✅ **Обратная совместимость** - старая система продолжает работать
3. ✅ **Graceful degradation** - при ошибке показываем fallback UI
4. ✅ **Тестирование на каждом шаге** - проверяем работоспособность
5. ✅ **Возможность отката** - легко вернуть изменения назад

---

## 🔧 ВАРИАНТ 1: ОТЛОЖЕННАЯ ИНИЦИАЛИЗАЦИЯ TONCONNECT (САМЫЙ БЕЗОПАСНЫЙ)

### Описание:
Заменить прямой вызов `useTonConnectUI()` на отложенную инициализацию через `useEffect` с таймером.

### Преимущества:
- ✅ Минимальные изменения кода
- ✅ Полная обратная совместимость
- ✅ Легко откатить при проблемах
- ✅ Не затрагивает другие компоненты

### Реализация:

**Шаг 1: Backup существующего кода**
```bash
cp client/src/contexts/userContext.tsx client/src/contexts/userContext.tsx.backup
```

**Шаг 2: Безопасная замена в userContext.tsx**
```typescript
// БЫЛО (строка 3):
import { useTonConnectUI } from '@tonconnect/ui-react';

// СТАЛО:
import { TonConnectUI } from '@tonconnect/ui-react';

// БЫЛО (где-то в компоненте):
const [tonConnectUI] = useTonConnectUI();

// СТАЛО:
const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);

useEffect(() => {
  // Ждем полную инициализацию Telegram WebApp
  const initTonConnect = () => {
    try {
      if (window.Telegram?.WebApp?.ready) {
        const ui = new TonConnectUI({
          manifestUrl: 'https://uni-farm-connect-unifarm01010101.replit.app/tonconnect-manifest.json'
        });
        setTonConnectUI(ui);
        console.log('[TonConnect] Успешно инициализирован отложенно');
      }
    } catch (error) {
      console.error('[TonConnect] Ошибка отложенной инициализации:', error);
      // Продолжаем работу без TonConnect
    }
  };

  // Инициализация с задержкой
  const timer = setTimeout(initTonConnect, 500);
  return () => clearTimeout(timer);
}, []);
```

**Шаг 3: Добавить fallback для компонентов**
```typescript
// Везде где используется tonConnectUI
if (!tonConnectUI) {
  return <div>Инициализация кошелька...</div>;
}
```

### Риски: 🟢 **МИНИМАЛЬНЫЕ**
- Небольшая задержка инициализации TonConnect (500мс)
- Временное сообщение "Инициализация кошелька..."

---

## 🔧 ВАРИАНТ 2: ENHANCED ERROR BOUNDARY (ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА)

### Описание:
Добавить специальную обработку React Hook ошибок в Error Boundary с автоматическим восстановлением.

### Преимущества:
- ✅ Ловит любые React Hook ошибки
- ✅ Автоматическое восстановление
- ✅ Не влияет на существующий код
- ✅ Улучшает общую стабильность

### Реализация:

**Шаг 1: Создать специальный Hook Error Boundary**
```typescript
// client/src/components/ui/TelegramWebAppErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasHookError: boolean;
  retryCount: number;
}

class TelegramWebAppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasHookError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Проверяем, это ли React Hook ошибка
    if (error.message.includes('useState') || 
        error.message.includes('U.current') ||
        error.message.includes('useEffect')) {
      console.log('[TelegramWebApp] React Hook ошибка обнаружена, включаем восстановление');
      return { hasHookError: true };
    }
    return {};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.state.hasHookError) {
      console.error('[TelegramWebApp] Hook Error:', error);
      
      // Пытаемся восстановиться через Telegram WebApp
      if (window.Telegram?.WebApp) {
        console.log('[TelegramWebApp] Попытка graceful recovery через Telegram SDK');
        
        // Опция 1: Мягкий перезапуск
        setTimeout(() => {
          if (this.state.retryCount < 3) {
            this.setState({ 
              hasHookError: false, 
              retryCount: this.state.retryCount + 1 
            });
          } else {
            // Опция 2: Закрыть и переоткрыть
            window.Telegram.WebApp.close();
          }
        }, 2000);
      }
    }
  }

  render(): ReactNode {
    if (this.state.hasHookError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-6 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold">Инициализация приложения...</h2>
            <p className="text-muted-foreground">
              Настраиваем подключение к Telegram WebApp
            </p>
            <p className="text-xs text-muted-foreground">
              Попытка {this.state.retryCount + 1} из 3
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TelegramWebAppErrorBoundary;
```

**Шаг 2: Обернуть App.tsx**
```typescript
// В App.tsx
import TelegramWebAppErrorBoundary from '@/components/ui/TelegramWebAppErrorBoundary';

function App() {
  return (
    <TelegramWebAppErrorBoundary>
      <TonConnectUIProvider manifestUrl="...">
        {/* существующий контент */}
      </TonConnectUIProvider>
    </TelegramWebAppErrorBoundary>
  );
}
```

### Риски: 🟢 **МИНИМАЛЬНЫЕ**
- Добавляет дополнительный компонент в дерево
- Небольшая задержка при восстановлении (2 секунды)

---

## 🔧 ВАРИАНТ 3: TELEGRAM WEBAPP LIFECYCLE HANDLING (ПРОФИЛАКТИКА)

### Описание:
Правильная обработка событий Telegram WebApp для предотвращения преждевременной инициализации хуков.

### Преимущества:
- ✅ Предотвращает проблему в корне
- ✅ Улучшает интеграцию с Telegram
- ✅ Не влияет на работающие компоненты

### Реализация:

**Шаг 1: Добавить Telegram Ready Handler**
```typescript
// client/src/hooks/useTelegramReady.ts
import { useState, useEffect } from 'react';

export function useTelegramReady() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const checkReady = () => {
      if (window.Telegram?.WebApp?.ready) {
        setIsReady(true);
        console.log('[Telegram] WebApp готов для инициализации хуков');
      }
    };
    
    // Проверяем сразу
    checkReady();
    
    // Слушаем событие ready
    window.Telegram?.WebApp?.onEvent?.('ready', checkReady);
    
    // Fallback таймер
    const timer = setTimeout(() => {
      if (!isReady) {
        console.log('[Telegram] Fallback ready после 1 секунды');
        setIsReady(true);
      }
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      window.Telegram?.WebApp?.offEvent?.('ready', checkReady);
    };
  }, []);
  
  return isReady;
}
```

**Шаг 2: Использовать в userContext.tsx**
```typescript
import { useTelegramReady } from '@/hooks/useTelegramReady';

function UserProvider({ children }) {
  const telegramReady = useTelegramReady();
  
  // Инициализируем TonConnect только после готовности Telegram
  useEffect(() => {
    if (telegramReady) {
      initializeTonConnect();
    }
  }, [telegramReady]);
  
  // Показываем loader пока Telegram не готов
  if (!telegramReady) {
    return <TelegramInitializationLoader />;
  }
  
  return (
    // обычный контент
  );
}
```

### Риски: 🟢 **МИНИМАЛЬНЫЕ**
- Небольшая задержка загрузки (до 1 секунды)
- Дополнительный loader экран

---

## 🔧 ВАРИАНТ 4: CONDITIONAL HOOK INITIALIZATION (РАСШИРЕННАЯ ЗАЩИТА)

### Описание:
Использование условной инициализации хуков с proper guards для предотвращения null reference errors.

### Реализация:

```typescript
// client/src/contexts/userContext.tsx
function UserProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [tonConnectUI, setTonConnectUI] = useState(null);
  
  // Используем хуки только после инициализации
  const shouldUseTonConnect = isInitialized && window.Telegram?.WebApp?.ready;
  
  useEffect(() => {
    const initApp = async () => {
      try {
        // Ждем полной готовности
        await new Promise(resolve => {
          if (window.Telegram?.WebApp?.ready) {
            resolve(true);
          } else {
            window.Telegram?.WebApp?.onEvent('ready', resolve);
          }
        });
        
        setIsInitialized(true);
        console.log('[UserContext] Безопасная инициализация завершена');
      } catch (error) {
        console.error('[UserContext] Ошибка инициализации:', error);
        // Продолжаем без TonConnect
        setIsInitialized(true);
      }
    };
    
    initApp();
  }, []);
  
  // Инициализируем TonConnect только после ready
  useEffect(() => {
    if (shouldUseTonConnect && !tonConnectUI) {
      try {
        // Безопасная инициализация
        import('@tonconnect/ui-react').then(({ TonConnectUI }) => {
          const ui = new TonConnectUI({
            manifestUrl: 'https://uni-farm-connect-unifarm01010101.replit.app/tonconnect-manifest.json'
          });
          setTonConnectUI(ui);
        });
      } catch (error) {
        console.error('[TonConnect] Ошибка динамической загрузки:', error);
      }
    }
  }, [shouldUseTonConnect]);
  
  if (!isInitialized) {
    return <InitializationLoader />;
  }
  
  return (
    // контент с tonConnectUI
  );
}
```

### Риски: 🟡 **СРЕДНИЕ**
- Более сложная логика инициализации
- Необходимо тестирование всех путей выполнения

---

## 🎯 РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ

### Фаза 1: Быстрое исправление (Низкий риск)
1. **Вариант 1**: Отложенная инициализация TonConnect
2. **Тестирование**: Проверить загрузку приложения в Telegram
3. **Мониторинг**: Наблюдать за React Hook ошибками в логах

### Фаза 2: Усиленная защита (Если нужно)
1. **Вариант 2**: Enhanced Error Boundary
2. **Вариант 3**: Telegram WebApp Lifecycle
3. **Комплексное тестирование**: Все сценарии загрузки

### Фаза 3: Долгосрочная стабилизация
1. **Мониторинг производительности**: Время загрузки, ошибки
2. **Пользовательская обратная связь**: Улучшения UX
3. **Оптимизация**: Уменьшение задержек инициализации

---

## 🛡️ ПЛАН ОТКАТА

### Если что-то пойдет не так:

**Быстрый откат (30 секунд)**:
```bash
cp client/src/contexts/userContext.tsx.backup client/src/contexts/userContext.tsx
git checkout HEAD -- client/src/contexts/userContext.tsx
```

**Полный откат**:
```bash
git stash push -m "TonConnect fix attempt"
git reset --hard HEAD~1
```

**Временное решение**:
```typescript
// Добавить в App.tsx для emergency fallback
if (window.Telegram?.WebApp && !window.Telegram.WebApp.ready) {
  return <div>Loading Telegram WebApp...</div>;
}
```

---

## 🎯 ЗАКЛЮЧЕНИЕ

### Самый безопасный подход:
1. ✅ **Начать с Варианта 1** (отложенная инициализация)
2. ✅ **Добавить Вариант 2** (error boundary) для дополнительной защиты
3. ✅ **Тестировать на каждом шаге**
4. ✅ **Готовый план отката**

### Ожидаемый результат:
- 🚫 Больше никаких React Hook ошибок
- ✅ Пользователи видят loading screen вместо JSON
- ✅ Приложение стабильно работает в Telegram WebApp
- ✅ Система остается полностью функциональной

**Готов начать реализацию?** Рекомендую начать с Варианта 1 как наименее рискованного.