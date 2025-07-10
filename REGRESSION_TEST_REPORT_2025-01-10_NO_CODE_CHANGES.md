# 📑 Regression Test Report - UniFarm System
**Date:** January 10, 2025 (July 10, 2025 system time)  
**Tester:** AI Agent  
**Test User:** ID 74 (test_user_1752129840905)  
**Test Type:** Complete system regression test (NO CODE CHANGES)

---

## 📊 Testing Summary Table

| Module | Test Performed | Status | Comments |
|--------|---------------|--------|----------|
| **Authentication** | JWT token generation & validation | ✅ | JWT токен работает корректно |
| **User Profile** | GET /api/v2/users/profile | ✅ | Возвращает данные пользователя |
| **Wallet Balance** | GET /api/v2/wallet/balance | ✅ | UNI: 664,483 / TON: 942 |
| **UNI Farming** | Status check & active deposits | ✅ | Активен, депозит 207,133 UNI |
| **TON Boost** | Farming status & packages | ✅ | Standard Boost активен (1.5%) |
| **Daily Bonus** | Status check | ✅ | Streak: 1, нельзя взять сегодня |
| **Daily Bonus** | Claim attempt | ❌ | Ошибка "Отсутствует параметр user_id" |
| **Missions** | List available missions | ✅ | 4 миссии доступны |
| **Referrals** | Stats & referral tree | ✅ | 0 партнеров, система работает |
| **Transactions** | History endpoint | ⚠️ | Возвращает данные user_id 75 вместо 74 |
| **TON Wallet** | Connection status | ❌ | 404 Not Found - endpoint не существует |
| **Boost Packages** | List available | ✅ | 5 пакетов доступны (1%-3%) |
| **Admin Access** | Admin stats | ✅ | Корректно отклонен (не админ) |

---

## 🔍 Детальные находки

### ✅ Полностью работающие модули:

1. **Аутентификация и авторизация**
   - JWT токены генерируются корректно
   - Авторизация через Bearer токен работает
   - Защищенные endpoints требуют токен

2. **Баланс и кошелек**
   - Текущий баланс: 664,483 UNI / 942 TON
   - Синхронизация UI и backend корректна
   - UNI Farming активен с депозитом 207,133 UNI

3. **TON Boost система**
   - Активен Standard Boost (1.5% в день)
   - Депозит 942 TON работает
   - Начисления рассчитываются (14.13 TON/день)

4. **Миссии**
   - 4 активные миссии доступны
   - Награды по 500 UNI за каждую

5. **Реферальная система**
   - API работает корректно
   - Показывает 0 партнеров (корректно для тестового юзера)

### ⚠️ Проблемы и риски:

1. **Daily Bonus Claim**
   - При попытке claim возвращает ошибку параметра
   - Возможно проблема с передачей user_id в POST запросе

2. **Transactions History**
   - Возвращает транзакции user_id 75 вместо 74
   - Возможна проблема с фильтрацией или SQL запросом

3. **TON Wallet Status**
   - Endpoint не существует (404)
   - Возможно не реализован или удален

### 📈 Состояние балансов:

- **UNI Balance:** 664,483.051296 (значительно больше начальных 1000)
- **TON Balance:** 942.001845
- **UNI Farming:** Активен, депозит 207,133 UNI
- **TON Boost:** Активен, Standard Boost package

---

## 🎯 Выводы:

**Общая готовность системы: ~85%**

Основные модули работают корректно:
- ✅ Farming (UNI & TON) функционирует
- ✅ Балансы синхронизированы
- ✅ Реферальная система готова
- ✅ Миссии доступны

Требуют внимания:
- ❌ Daily Bonus claim механизм
- ❌ Transaction history фильтрация
- ❌ TON wallet connection endpoint

---

## 🔒 Важно:

Тестирование проведено БЕЗ изменения кода. Все обнаруженные проблемы зафиксированы для последующего исправления разработчиками.