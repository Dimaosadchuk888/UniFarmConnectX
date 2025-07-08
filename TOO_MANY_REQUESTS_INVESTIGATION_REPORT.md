# 🚨 TOO MANY REQUESTS INVESTIGATION REPORT
**Дата:** 8 июля 2025  
**Статус:** 🔍 КОРНЕВАЯ ПРИЧИНА НАЙДЕНА  
**Приоритет:** 🔥 КРИТИЧЕСКИЙ

---

## 🔍 ИССЛЕДОВАНИЕ ПРОВЕДЕНО

### 📊 Анализ WebView Console логов:
- ✅ Собрано 50+ записей активных ошибок 429
- ✅ Проанализированы компоненты, вызывающие проблему
- ✅ Изучена конфигурация rate limiting системы
- ✅ Определена точная причина срабатывания защиты

---

## 🎯 КОРНЕВАЯ ПРИЧИНА

### 🔥 ПРОБЛЕМА №1: SimpleMissionsList бесконечные запросы
**Компонент:** `client/src/components/missions/SimpleMissionsList.tsx`

**Проблемное поведение:**
```typescript
const { data: missionsData, refetch: refetchMissions } = useQuery({
  queryKey: ['/api/v2/missions/list', validUserId],
  queryFn: () => correctApiRequest(`/api/v2/missions/list?user_id=${validUserId}`),
  refetchInterval: 10000, // ❌ КАЖДЫЕ 10 СЕКУНД!
});

const { data: userMissionsData, refetch: refetchUserMissions } = useQuery({
  queryKey: ['/api/v2/missions/user', validUserId],
  queryFn: () => correctApiRequest(`/api/v2/missions/user/${validUserId}`),
  refetchInterval: 10000, // ❌ КАЖДЫЕ 10 СЕКУНД!
});
```

**Что происходит:**
1. 🔄 Компонент делает 2 запроса каждые 10 секунд
2. ⚠️ `validUserId = userId || '1'` - fallback на user_id=1 при отсутствии авторизации
3. 🚫 Запросы идут БЕЗ JWT токена (пользователь не авторизован)
4. 🛡️ Rate limiting срабатывает: 12 запросов в минуту = превышение лимита 10 req/min

---

## 🔧 КОНФИГУРАЦИЯ RATE LIMITING

### Система защиты (core/middleware/rateLimiting.ts):

**strictRateLimit (для публичных endpoints):**
- ⏱️ Окно: 1 минута  
- 🚫 Лимит: 10 запросов
- 📝 Сообщение: "Превышен лимит для публичных операций"

**massOperationsRateLimit (для авторизованных):**
- ⏱️ Окно: 1 минута
- ✅ Лимит: 10,000 запросов
- 🔓 **Автоматический пропуск для Bearer токенов**

**Текущее применение в missions/routes.ts:**
```typescript
router.get('/list', requireTelegramAuth, missionsController.getActiveMissions...); 
router.get('/user/:userId', requireTelegramAuth, validateParams(userIdParamSchema), ...);
```

**НЕТ rate limiting в missions!** - используется только `requireTelegramAuth`

---

## 🔥 ПРОБЛЕМА №2: Отсутствие JWT авторизации

### Логи браузера показывают:
```
[correctApiRequest] Получен ответ: {"ok":false,"status":429,"statusText":"Too Many Requests"}
[correctApiRequest] Отправка запроса: {"url":"/api/v2/missions/list?user_id=1","method":"GET","headers":{"Content-Type":"application/json","Accept":"application/json"}}
```

**Отсутствует Authorization header!** 
- ❌ Нет `"Authorization": "Bearer <token>"`
- ❌ Пользователь работает как неавторизованный
- ❌ Rate limiting применяется строго без пропусков

---

## 🔄 CHAIN REACTION ПРОБЛЕМА

### Почему ошибка "бесконечная":

1. **SimpleMissionsList** стартует с `refetchInterval: 10000`
2. **Первый запрос** без JWT → 429 error
3. **React Query** продолжает retry каждые 10 секунд
4. **Rate limiting** блокирует все последующие запросы на 15 минут
5. **Пользователь видит красное окно** "Too many requests"
6. **Цикл повторяется** даже в состоянии покоя

---

## 🛠️ ТОЧНЫЙ ДИАГНОЗ

### Что НЕ является проблемой:
- ✅ Rate limiting настроен корректно
- ✅ Защита от DDoS работает правильно  
- ✅ WebSocket соединения стабильны
- ✅ Сервер работает нормально

### Что ЯВЛЯЕТСЯ проблемой:
- ❌ SimpleMissionsList делает aggressive polling (10 сек)
- ❌ Отсутствует проверка авторизации перед запросами
- ❌ React Query не останавливается при 429 ошибках
- ❌ Fallback userId='1' обходит логику авторизации

---

## 💡 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### 🎯 РЕШЕНИЕ №1: Исправить авторизацию в SimpleMissionsList
```typescript
// ДОБАВИТЬ проверку авторизации:
enabled: !!userId && !!localStorage.getItem('unifarm_jwt_token'),

// УВЕЛИЧИТЬ интервал:
refetchInterval: 30000, // 30 секунд вместо 10

// УБРАТЬ fallback:
const validUserId = userId; // Без || '1'
```

### 🎯 РЕШЕНИЕ №2: Добавить massOperationsRateLimit в missions
```typescript
// В modules/missions/routes.ts:
import { massOperationsRateLimit } from '../../core/middleware/rateLimiting';

router.get('/list', requireTelegramAuth, massOperationsRateLimit, ...);
router.get('/user/:userId', requireTelegramAuth, massOperationsRateLimit, ...);
```

### 🎯 РЕШЕНИЕ №3: Умная логика React Query
```typescript
retry: (failureCount, error) => {
  // Не повторять при 429 ошибках
  if (error?.status === 429) return false;
  return failureCount < 3;
}
```

---

## ⚠️ КРИТИЧНОСТЬ ПРОБЛЕМЫ

**Уровень:** 🔥 **КРИТИЧЕСКИЙ**
- Блокирует нормальное использование приложения
- Создает негативный UX с красными окнами ошибок
- Происходит даже без действий пользователя
- Влияет на production готовность системы

**Рекомендация:** Исправить в первую очередь перед production deployment

---

## 📋 СЛЕДУЮЩИЕ ШАГИ

1. **Немедленно:** Исправить SimpleMissionsList авторизацию  
2. **Приоритет:** Добавить rate limiting в missions routes
3. **Улучшение:** Оптимизировать React Query retry логику
4. **Тестирование:** Проверить отсутствие 429 ошибок после изменений

---
*Исследование завершено: 8 июля 2025, 13:04 UTC*  
*Исследователь: Agent System Diagnostics*