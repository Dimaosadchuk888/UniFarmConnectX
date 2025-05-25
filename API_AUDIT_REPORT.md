# Отчет о тестировании API-эндпоинтов UniFarm

## Результаты аудита API

Дата и время проведения: 29 апреля 2025, 18:55:16

### Базовый URL
https://uni-farm-connect-x-lukyanenkolawfa.replit.appsisko.replit.dev

### Сводная таблица результатов

| Метод | Эндпоинт | Статус | HTTP код | Формат | Структура | Вердикт |
|-------|----------|--------|----------|--------|-----------|---------|
| GET | /api/me | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |
| GET | /api/uni-farming/info | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |
| POST | /api/uni-farming/deposit | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |
| GET | /api/uni-farming/deposits | ✅ | 200 OK | JSON | success: true, data: [...] | API работает корректно |
| POST | /api/harvest | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |
| GET | /api/referral/tree | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |
| POST | /api/airdrop/register | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |
| POST | /api/withdraw | ✅ | 200 OK | JSON | success: true, data: {...} | API работает корректно |

### Детальные результаты

#### 1. GET /api/me
- **Описание**: Получение информации о текущем пользователе
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Поля в ответе**: id, telegram_id, username, balance_uni, balance_ton, language, ref_code
- **Вердикт**: API работает корректно

#### 2. GET /api/uni-farming/info
- **Описание**: Получение информации о фарминге UNI
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Ключевые поля**: isActive, totalDepositAmount, depositCount, totalRatePerSecond, dailyIncomeUni, deposits
- **Вердикт**: API работает корректно

#### 3. POST /api/uni-farming/deposit
- **Описание**: Создание депозита UNI
- **Тело запроса**: `{"user_id":1,"amount":"5"}`
- **Важно**: Значение `amount` передается как строка, не как число
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Поля в ответе**: success, message, depositId, depositAmount, ratePerSecond
- **Вердикт**: API работает корректно

#### 4. GET /api/uni-farming/deposits
- **Описание**: Получение списка депозитов пользователя
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data (массив)
- **Поля в элементах массива**: id, user_id, amount, created_at, rate_per_second, last_updated_at, is_active
- **Вердикт**: API работает корректно

#### 5. POST /api/harvest
- **Описание**: Сбор доходности фарминга
- **Тело запроса**: `{"user_id":1}`
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Ключевые поля**: harvestedAmount, newBalance
- **Вердикт**: API работает корректно

#### 6. GET /api/referral/tree
- **Описание**: Получение структуры рефералов
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Ключевые поля**: ownRefCode, personalReferrals, referralCounts, referralRewards, totalReferralCount
- **Вердикт**: API работает корректно

#### 7. POST /api/airdrop/register
- **Описание**: Регистрация пользователя в airdrop
- **Тело запроса**: `{"guest_id":"test-guest-id-f2nyrxzc"}`
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Ключевые поля**: user_id, username, ref_code, guest_id, parent_ref_code, balance_uni, created_at, is_new_user
- **Вердикт**: API работает корректно

#### 8. POST /api/withdraw
- **Описание**: Запрос на вывод средств
- **Тело запроса**: `{"user_id":1,"amount":"1","currency":"UNI","address":"UQDtM3H8YMatbHqQH9nGxnshJJBnzZs1u2qYLiaZXfS6h6bH"}`
- **Важно**: Значение `amount` передается как строка, не как число
- **Статус**: 200 OK
- **Content-Type**: application/json; charset=utf-8
- **Структура ответа**: ✅ success, ✅ data
- **Поля в ответе**: transaction_id
- **Вердикт**: API работает корректно

## Важные замечания

1. Для всех API-эндпоинтов, где передается параметр `amount` (например, `/api/uni-farming/deposit` и `/api/withdraw`), значение должно быть передано как строка, а не как числовое значение. Исправление этой проблемы уже внедрено через:
   - Модуль `client/src/lib/apiFix.ts` с функцией `fixRequestBody`
   - Усовершенствование в `client/src/lib/correctApiRequest.ts` для принудительного преобразования

2. Все эндпоинты возвращают корректную структуру ответа:
   ```json
   {
     "success": true,
     "data": { ... }
   }
   ```

3. Все проверенные API-эндпоинты работают корректно и возвращают ожидаемые результаты.

## Заключение

По результатам тестирования не выявлено критических проблем в работе API-эндпоинтов. Все проверенные маршруты возвращают корректные ответы с ожидаемой структурой. API готово к использованию в проекте.