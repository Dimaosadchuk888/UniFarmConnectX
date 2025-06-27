# 📋 ПОЛНЫЙ СПИСОК API ENDPOINTS - UniFarm

**Создано:** 27 июня 2025  
**Статус:** Production Ready  
**Всего endpoints:** 79  

---

## 🔐 АУТЕНТИФИКАЦИЯ (/api/v2/auth)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| POST | `/api/v2/auth/telegram` | Авторизация через Telegram initData | - |
| POST | `/api/v2/auth/register` | Регистрация нового пользователя | - |
| GET | `/api/v2/auth/profile` | Получение профиля авторизованного пользователя | requireTelegramAuth |
| POST | `/api/v2/auth/validate-token` | Валидация JWT токена | - |

---

## 👤 ПОЛЬЗОВАТЕЛИ (/api/v2/user)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/user/profile` | Детальный профиль пользователя | requireTelegramAuth |
| PUT | `/api/v2/user/profile` | Обновление профиля | requireTelegramAuth |
| GET | `/api/v2/user/stats` | Статистика пользователя | requireTelegramAuth |
| GET | `/api/v2/user/search` | Поиск пользователей | requireTelegramAuth |
| DELETE | `/api/v2/user/account` | Удаление аккаунта | requireTelegramAuth |

---

## 💰 КОШЕЛЕК (/api/v2/wallet)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/wallet/balance` | Баланс UNI и TON | requireTelegramAuth |
| POST | `/api/v2/wallet/deposit` | Пополнение кошелька | requireTelegramAuth, strictRateLimit |
| POST | `/api/v2/wallet/withdraw` | Вывод средств | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/wallet/transactions` | История транзакций | requireTelegramAuth |
| POST | `/api/v2/wallet/transfer` | Перевод между пользователями | requireTelegramAuth, strictRateLimit |

---

## 🌾 UNI FARMING (/api/v2/farming + /api/v2/uni-farming)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/farming/status` | Статус UNI farming | requireTelegramAuth |
| POST | `/api/v2/farming/deposit` | Депозит UNI для farming | requireTelegramAuth, strictRateLimit |
| POST | `/api/v2/farming/harvest` | Сбор урожая UNI | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/farming/history` | История farming операций | requireTelegramAuth |
| POST | `/api/v2/farming/claim` | Клейм накопленных доходов | requireTelegramAuth |
| GET | `/api/v2/uni-farming/status` | Алиас для farming/status | requireTelegramAuth |
| POST | `/api/v2/uni-farming/deposit` | Алиас для farming/deposit | requireTelegramAuth, strictRateLimit |
| POST | `/api/v2/uni-farming/harvest` | Алиас для farming/harvest | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/uni-farming/history` | Алиас для farming/history | requireTelegramAuth |

---

## ⚡ TON FARMING (/api/v2/ton-farming)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| POST | `/api/v2/ton-farming/start` | Запуск TON farming | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/ton-farming/info` | Информация о TON farming | requireTelegramAuth |
| GET | `/api/v2/ton-farming/history` | История TON farming | requireTelegramAuth |
| POST | `/api/v2/ton-farming/claim` | Клейм TON rewards | requireTelegramAuth, strictRateLimit |

---

## 🚀 BOOST ПАКЕТЫ (/api/v2/boost + /api/v2/boosts)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/boost/packages` | Список доступных Boost пакетов | requireTelegramAuth |
| POST | `/api/v2/boost/purchase` | Покупка Boost пакета | requireTelegramAuth, strictRateLimit |
| POST | `/api/v2/boost/activate` | Активация Boost пакета | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/boost/status` | Статус активных Boost | requireTelegramAuth |
| GET | `/api/v2/boost/history` | История покупок Boost | requireTelegramAuth |
| GET | `/api/v2/boosts/packages` | Алиас для boost/packages | requireTelegramAuth |
| POST | `/api/v2/boosts/purchase` | Алиас для boost/purchase | requireTelegramAuth, strictRateLimit |

---

## 🎯 ЗАДАНИЯ (/api/v2/missions + /api/v2/user-missions)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/missions/list` | Список доступных заданий | requireTelegramAuth |
| POST | `/api/v2/missions/complete` | Выполнение задания | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/missions/user/:userId` | Прогресс пользователя по заданиям | requireTelegramAuth |
| GET | `/api/v2/missions/stats` | Статистика заданий | requireTelegramAuth |
| GET | `/api/v2/user-missions/list` | Алиас для missions/list | requireTelegramAuth |
| POST | `/api/v2/user-missions/complete` | Алиас для missions/complete | requireTelegramAuth, strictRateLimit |

---

## 👥 РЕФЕРАЛЫ (/api/v2/referral + /api/v2/referrals)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/referral/code` | Получение реферального кода | requireTelegramAuth |
| POST | `/api/v2/referral/generate-code` | Генерация нового реферального кода | requireTelegramAuth |
| GET | `/api/v2/referral/stats` | Статистика рефералов | requireTelegramAuth |
| GET | `/api/v2/referral/levels` | Информация о 20 уровнях | requireTelegramAuth |
| GET | `/api/v2/referral/earnings` | Доходы от рефералов | requireTelegramAuth |
| GET | `/api/v2/referrals/code` | Алиас для referral/code | requireTelegramAuth |
| GET | `/api/v2/referrals/stats` | Алиас для referral/stats | requireTelegramAuth |

---

## 🎁 ЕЖЕДНЕВНЫЕ БОНУСЫ (/api/v2/daily-bonus)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/daily-bonus/status` | Статус ежедневного бонуса | requireTelegramAuth |
| POST | `/api/v2/daily-bonus/claim` | Получение ежедневного бонуса | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/daily-bonus/streak` | Информация о streak | requireTelegramAuth |
| GET | `/api/v2/daily-bonus/history` | История бонусов | requireTelegramAuth |

---

## 📊 ТРАНЗАКЦИИ (/api/v2/transactions)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/transactions/history` | История всех транзакций | requireTelegramAuth |
| GET | `/api/v2/transactions/:id` | Детали транзакции | requireTelegramAuth |
| GET | `/api/v2/transactions/stats` | Статистика транзакций | requireTelegramAuth |
| GET | `/api/v2/transactions/export` | Экспорт транзакций в CSV | requireTelegramAuth |

---

## 🎪 AIRDROP (/api/v2/airdrop)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/airdrop/campaigns` | Активные airdrop кампании | requireTelegramAuth |
| POST | `/api/v2/airdrop/claim` | Участие в airdrop | requireTelegramAuth, strictRateLimit |
| GET | `/api/v2/airdrop/history` | История airdrop участий | requireTelegramAuth |
| GET | `/api/v2/airdrop/eligibility` | Проверка права на airdrop | requireTelegramAuth |

---

## 🔧 АДМИНИСТРИРОВАНИЕ (/api/v2/admin)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/admin/stats` | Системная статистика | requireTelegramAuth, requireAdminAuth |
| GET | `/api/v2/admin/users` | Управление пользователями | requireTelegramAuth, requireAdminAuth |
| POST | `/api/v2/admin/users/:userId/moderate` | Модерация пользователя | requireTelegramAuth, requireAdminAuth |
| POST | `/api/v2/admin/missions/manage` | Управление заданиями | requireTelegramAuth, requireAdminAuth |
| GET | `/api/v2/admin/system/health` | Здоровье системы | requireTelegramAuth, requireAdminAuth |

---

## 📈 МОНИТОРИНГ (/api/v2/monitor)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/api/v2/monitor/health` | Проверка работоспособности | - |
| GET | `/api/v2/monitor/performance` | Метрики производительности | requireTelegramAuth |
| GET | `/api/v2/monitor/stats` | Статистика системы | requireTelegramAuth |
| GET | `/api/v2/monitor/logs` | Системные логи | requireTelegramAuth, requireAdminAuth |

---

## 🤖 TELEGRAM WEBHOOK (/api/v2/telegram)

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| POST | `/api/v2/telegram/webhook` | Webhook для Telegram Bot | - |
| GET | `/api/v2/telegram/webhook` | Статус webhook | - |
| POST | `/webhook` | Альтернативный webhook endpoint | - |

---

## 🛠️ СИСТЕМНЫЕ ENDPOINTS

| Method | Endpoint | Описание | Middleware |
|--------|----------|----------|------------|
| GET | `/health` | Базовая проверка здоровья | - |
| GET | `/api/v2/health` | Расширенная проверка здоровья | - |
| GET | `/debug/routes` | Диагностика маршрутов | - |
| GET | `/debug/db-users` | Диагностика пользователей БД | - |

---

## 🔒 MIDDLEWARE SYSTEM

### Rate Limiting Уровни:
- **strictRateLimit**: Финансовые операции (100 запросов/час)
- **standardRateLimit**: Обычные операции (1000 запросов/час) 
- **liberalRateLimit**: Чтение данных (5000 запросов/час)
- **adminRateLimit**: Админ операции (50 запросов/час)

### Авторизация:
- **requireTelegramAuth**: JWT токен валидация
- **requireAdminAuth**: Проверка admin статуса
- **Zod Validation**: Входные данные в критических endpoints

---

## 📊 СТАТИСТИКА API

**По модулям:**
- **Auth**: 4 endpoints
- **User**: 5 endpoints  
- **Wallet**: 5 endpoints
- **Farming**: 9 endpoints (включая алиасы)
- **TON Farming**: 4 endpoints
- **Boost**: 7 endpoints (включая алиасы)
- **Missions**: 6 endpoints (включая алиасы)
- **Referral**: 7 endpoints (включая алиасы)
- **Daily Bonus**: 4 endpoints
- **Transactions**: 4 endpoints
- **Airdrop**: 4 endpoints
- **Admin**: 5 endpoints
- **Monitor**: 4 endpoints
- **Telegram**: 3 endpoints
- **System**: 4 endpoints

**По типам безопасности:**
- **Публичные**: 8 endpoints
- **Авторизованные**: 66 endpoints  
- **Админские**: 5 endpoints

**По rate limiting:**
- **Strict**: 18 endpoints (финансовые операции)
- **Standard**: 48 endpoints (основные функции)
- **Liberal**: 8 endpoints (чтение данных)
- **Admin**: 5 endpoints (администрирование)

---

*Документ отражает актуальное состояние API на 27 июня 2025*