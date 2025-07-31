# КРИТИЧЕСКИЙ ПЛАН МОНИТОРИНГА JWT ПРОБЛЕМ

## 🎯 ЦЕЛЬ
Собрать полную картину JWT нестабильности без изменения кода для понимания причин потери 3 TON User ID 25.

## 📊 ТЕКУЩИЕ ФАКТЫ

### ✅ ПОДТВЕРЖДЕННЫЕ ПРОБЛЕМЫ
1. **JWT токены исчезают каждые несколько минут** (не 7 дней как заложено)
2. **Browser console:** "JWT токен отсутствует" постоянно
3. **User 25:** Потерял 3 TON (hash: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaK...)
4. **Текущий баланс User 25:** 1.117185 TON (ожидается 4+ TON)
5. **1% выводов возвращается** на баланс после списания
6. **Система сейчас:** Работает БЕЗ JWT токена (все API запросы падают)

### 🔍 КОРНЕВАЯ ПРИЧИНА
JWT токены **принудительно удаляются** системой, а НЕ истекают естественно. При пересоздании токенов возможна загрузка устаревших данных из БД.

## 📋 ПЛАН МОНИТОРИНГА

### 1️⃣ НЕМЕДЛЕННАЯ ДИАГНОСТИКА
- [ ] Проверить Browser DevTools → Application → LocalStorage → ключ "unifarm_jwt_token"
- [ ] Проверить Network Tab → количество 401 ошибок
- [ ] Зафиксировать частоту появления "JWT токен отсутствует" 
- [ ] Проверить корреляцию с операциями депозита/вывода

### 2️⃣ BACKEND АНАЛИЗ  
- [ ] Логи сервера: JWT validation failures
- [ ] Частота вызовов `/api/v2/auth/telegram`
- [ ] 401 ошибки по эндпоинтам
- [ ] JWT_SECRET стабильность при рестартах

### 3️⃣ TIMING ИССЛЕДОВАНИЕ
- [ ] Время между balance updates и JWT recreation
- [ ] Database commit vs read timing
- [ ] WebSocket notification delays
- [ ] Race conditions в UserContext

### 4️⃣ ВОСПРОИЗВЕДЕНИЕ
- [ ] Попытаться воспроизвести потерю депозита
- [ ] Тестировать withdrawal reversals
- [ ] Изучить точный timing критических операций

## 🚨 КРИТИЧЕСКИЕ СЦЕНАРИИ

### СЦЕНАРИЙ A: ПОТЕРЯ 3 TON
```
31.07.2025, 08:07:00 - TON Connect депозит 3 TON ✅
31.07.2025, 08:07:05 - Backend получает депозит → БД +3 TON ✅  
31.07.2025, 08:07:10 - WebSocket → UI показывает +3 TON ✅
31.07.2025, 08:07:15 - JWT ТОКЕН ИСЧЕЗАЕТ ❌
31.07.2025, 08:07:20 - UserContext → переавторизация ❌
31.07.2025, 08:07:25 - Новый JWT с устаревшими данными БД ❌
РЕЗУЛЬТАТ: Актуальный баланс перезаписан старым
```

### СЦЕНАРИЙ B: ВОЗВРАТ ВЫВОДОВ
```
XX:XX:00 - processWithdrawal() списывает 1 TON ✅
XX:XX:01 - БД обновлена: баланс -1 TON ✅
XX:XX:02 - UI показывает новый баланс ✅
XX:XX:05 - JWT ТОКЕН ИСЧЕЗАЕТ (1% вероятность) ❌
XX:XX:06 - Переавторизация с данными ДО списания ❌
РЕЗУЛЬТАТ: Деньги "возвращаются"
```

## 🔍 МЕСТА ИСЧЕЗНОВЕНИЯ JWT

### 1. TELEGRAM WEBAPP
- Переключение чатов
- Background/foreground transitions
- Memory pressure cleanup
- App updates

### 2. BROWSER POLICIES
- Storage quota limits
- Incognito restrictions
- Security policies

### 3. BACKEND REJECTION
- verifyJWTToken() failures
- JWT_SECRET changes
- Clock skew issues

### 4. APPLICATION LOGIC
- Error handling cleanup
- Race conditions
- Multiple localStorage access

## ⚡ СЛЕДУЮЩИЕ ШАГИ

1. **МОНИТОРИНГ** - отследить частоту исчезновения токенов
2. **BACKEND ЛОГИ** - анализ JWT validation errors
3. **TIMING АНАЛИЗ** - database vs token recreation races
4. **ВОСПРОИЗВЕДЕНИЕ** - попытаться повторить проблему

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ
Полное понимание механизма JWT нестабильности для последующего исправления без потери функциональности системы.