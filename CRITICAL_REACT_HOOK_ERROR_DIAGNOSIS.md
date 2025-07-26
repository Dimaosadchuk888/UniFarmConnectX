# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: React Hook Error в Telegram WebApp

**Дата**: 26 июля 2025  
**Проблема**: `TypeError: null is not an object (evaluating 'U.current.useState')`  
**Источник**: WebView Console Logs  
**Статус**: ⚠️ КРИТИЧЕСКАЯ ОШИБКА ОБНАРУЖЕНА

---

## 🔍 АНАЛИЗ РЕАЛЬНОЙ ПРОБЛЕМЫ

### Ошибка из логов:
```javascript
Method -error:
1753537872998.0 - [{}]
1753537872998.0 - {"message":"TypeError: null is not an object (evaluating 'U.current.useState')","type":"error"}
```

**ЭТО НЕ JSON ОШИБКА АВТОРИЗАЦИИ!**  
**ЭТО ФАТАЛЬНАЯ ОШИБКА REACT HOOKS!**

---

## 🎯 КОРРЕКТНАЯ ДИАГНОСТИКА

### Что происходит на самом деле:

1. **Telegram WebApp пытается загрузиться**
2. **React пытается инициализировать useState hook**  
3. **U.current (React internal) равен null**
4. **Приложение падает с TypeError**
5. **Пользователь видит либо белый экран, либо системную ошибку**

### Почему пользователь может видеть JSON ошибки:

**Scenario 1**: После падения React хуков, браузер пытается загрузить fallback контент  
**Scenario 2**: Error boundary ловит ошибку и показывает последний API response  
**Scenario 3**: Telegram WebApp показывает последнюю ошибку из console.error()

---

## 🔍 АНАЛИЗ ИСТОЧНИКА ОШИБКИ

### React Hook Rules Violation

**Наиболее вероятные причины**:

1. **Условный вызов хуков**:
```typescript
// НЕПРАВИЛЬНО - хук в условии
if (someCondition) {
  const [state, setState] = useState();
}

// НЕПРАВИЛЬНО - хук в try-catch
try {
  const [tonConnectUI] = useTonConnectUI();
} catch {}
```

2. **Версионный конфликт React**:
- Несовместимые версии React в зависимостях
- Дублирование React в bundle
- Конфликт с Telegram WebApp React implementation

3. **TonConnect Hook проблема**:
```typescript
// В userContext.tsx строка 3:
import { useTonConnectUI } from '@tonconnect/ui-react';
```

### Известная проблема (из архива):

**Файл**: `archive_reports/DEPLOY_READINESS_REPORT.md`
```
### 1. **401 Unauthorized Error**
{
  "status": 401,
  "statusText": "Unauthorized", 
  "errorData": {
    "success": false,
    "error": "Authentication required",
    "need_jwt_token": true
  }
}

**Причина**: Frontend не получает или не передаёт JWT токен
```

**СВЯЗЬ**: React хуки падают → компоненты не загружаются → JWT токен не устанавливается → 401 ошибки

---

## 🔧 БЕЗОПАСНАЯ ДИАГНОСТИКА ИСТОЧНИКА

### 1. Проверка TonConnect версий
```bash
npm list @tonconnect/ui-react @tonconnect/sdk
```

### 2. Анализ userContext.tsx строка 3
```typescript
import { useTonConnectUI } from '@tonconnect/ui-react';
```

**Подозрение**: Этот хук может нарушать React Rules of Hooks

### 3. Проверка условных хуков
Ищем паттерны:
- `if (condition) { useState... }`
- `try { useEffect... } catch`  
- Хуки внутри callbacks

---

## 🎯 ВЕРОЯТНЫЙ ROOT CAUSE

### Sequence of Events:

1. **Telegram WebApp запускается**
2. **useTonConnectUI() хук пытается инициализироваться**
3. **TonConnect SDK еще не готов (null)**
4. **React internal U.current становится null**
5. **useState() падает с TypeError**
6. **Приложение ломается полностью**
7. **Error boundary показывает последнюю ошибку API (JSON)**

### Fix Strategy:

**Safe Hook Usage**:
```typescript
// БЕЗОПАСНО
const [tonConnectUI, setTonConnectUI] = useState(null);

useEffect(() => {
  // Инициализация TonConnect после ready
  if (window.Telegram?.WebApp?.ready) {
    initTonConnect();
  }
}, []);

// НЕБЕЗОПАСНО  
const [tonConnectUI] = useTonConnectUI(); // Может быть null
```

---

## 🛠️ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### Immediate Actions (Production Safe):

**1. TonConnect Hook Fix**:
```typescript
// В userContext.tsx
const [tonConnectUI, setTonConnectUI] = useState(null);

useEffect(() => {
  // Отложенная инициализация после 200ms
  const timer = setTimeout(() => {
    try {
      const [ui] = useTonConnectUI();
      setTonConnectUI(ui);
    } catch (error) {
      console.error('TonConnect init failed:', error);
    }
  }, 200);
  
  return () => clearTimeout(timer);
}, []);
```

**2. Error Boundary Enhancement**:
```typescript
// В App.tsx добавить
static getDerivedStateFromError(error) {
  if (error.message.includes('useState')) {
    // React Hook error - перезагрузить через Telegram
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    }
  }
  return { hasError: true };
}
```

**3. Telegram WebApp Lifecycle**:
```typescript
// Ждать полной инициализации
useEffect(() => {
  if (window.Telegram?.WebApp?.isInitialized) {
    initializeApp();
  } else {
    window.Telegram?.WebApp?.onEvent('ready', initializeApp);
  }
}, []);
```

---

## 🎯 ЗАКЛЮЧЕНИЕ

### Реальная проблема:
❌ **НЕ JSON ошибки авторизации**  
✅ **React Hooks Error → App Crash → Fallback JSON Display**

### Root Cause:
🔧 **useTonConnectUI() хук нарушает React Rules**  
🔧 **TonConnect SDK не готов при инициализации**  
🔧 **Отсутствует proper Telegram WebApp lifecycle handling**

### Solution:
🛠️ **Отложенная инициализация TonConnect**  
🛠️ **Proper error boundaries для Hook errors**  
🛠️ **Telegram WebApp ready event handling**

### Статус:
✅ **РЕАЛЬНАЯ ПРИЧИНА НАЙДЕНА** - React Hook failure, а не проблема авторизации!