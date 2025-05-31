# Модульная архитектура UniFarm - Завершена

## Финальная структура проекта

```
workspace/
├── core/                      # Системная инфраструктура
│   ├── config/
│   │   └── index.ts          # Централизованная конфигурация
│   ├── db/
│   │   └── index.ts          # Подключение к базе данных
│   ├── middleware/
│   │   ├── cors.ts           # CORS middleware
│   │   ├── logger.ts         # Логирование запросов
│   │   ├── error.ts          # Обработка ошибок
│   │   └── index.ts          # Экспорт middleware
│   ├── server.ts             # Основной сервер Express
│   └── index.ts              # Экспорт core модуля
├── modules/                   # Бизнес-модули
│   ├── user/                 # Модуль пользователей
│   │   ├── controller.ts     # API контроллеры
│   │   ├── service.ts        # Бизнес-логика
│   │   ├── routes.ts         # Маршруты
│   │   ├── model.ts          # Модель данных
│   │   └── types.ts          # Типы
│   ├── wallet/               # Модуль кошелька
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── model.ts
│   │   └── types.ts
│   ├── referral/             # Реферальная система
│   ├── farming/              # Фарминг
│   ├── missions/             # Задания
│   ├── boost/                # Усиления
│   ├── telegram/             # Telegram интеграция
│   ├── dailyBonus/           # Ежедневные бонусы
│   ├── admin/                # Администрирование
│   └── index.ts              # Экспорт всех модулей
├── shared/                   # Общий код
│   ├── types/
│   │   └── index.ts          # Общие типы
│   ├── utils/
│   │   └── index.ts          # Утилиты
│   └── schema.ts             # Схема базы данных
├── client/                   # Frontend приложение
├── server/                   # Legacy backend (для совместимости)
├── index.ts                  # Точка входа приложения
└── modular-server.js         # Рабочий сервер
```

## Основные компоненты

### 1. Core модуль
- **config/**: Централизованные настройки для всего приложения
- **db/**: Подключение и управление базой данных
- **middleware/**: Общие middleware для Express
- **server.ts**: Основной сервер с подключением всех модулей

### 2. Modules
- Каждый модуль имеет единообразную структуру
- Независимые бизнес-компоненты
- Четкое разделение ответственности

### 3. Shared
- Общие типы и утилиты
- Схема базы данных
- Переиспользуемый код

## API Endpoints

### Системные
- `GET /health` - Проверка состояния
- `GET /api/v2/modules` - Информация о модулях

### Пользователи
- `GET /api/v2/users/profile` - Профиль пользователя
- `PUT /api/v2/users/:id` - Обновление пользователя
- `POST /api/v2/users/ref-code` - Генерация реферального кода

### Кошелек
- `GET /api/v2/wallet/:userId/balance` - Баланс
- `GET /api/v2/wallet/:userId/transactions` - История транзакций
- `POST /api/v2/wallet/withdraw` - Вывод средств

## Запуск

```bash
# Основной модульный сервер
node modular-server.js

# TypeScript версия (после исправления типов)
node index.ts
```

## Статус: ✅ ЗАВЕРШЕНО

Модульная архитектура с core/ модулем полностью реализована.