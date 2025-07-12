# API MISMATCH REPORT - Анализ расхождений UniFarm
*Дата: 12 июля 2025*
*Статус: Глубокий статический анализ архитектуры*

## Резюме
Проведен полный анализ расхождений между Frontend вызовами, Backend роутами, Сервисами и БД.

**Статистика:**
- Frontend API вызовов: 52
- Полностью реализованных: 27 (52%)
- Частично реализованных: 21 (40%)
- Действительно отсутствующих: 4 (8%)

## КРИТИЧЕСКИЕ РАСХОЖДЕНИЯ

### 1. Frontend вызывает несуществующие API endpoints

| Endpoint | Файл вызова | Статус | Комментарий |
|----------|-------------|--------|-------------|
| `/api/v2/uni-farming/direct-deposit` | client/src/components/farming/UniFarmingCard.tsx:254 | ❌ ОТСУТСТВУЕТ | Endpoint не найден ни в модулях, ни в server/index.ts |
| `/api/v2/uni-farming/harvest` | client/src/components/farming/UniFarmingCard.tsx:193 | ❌ ОТСУТСТВУЕТ | Нет роута для сбора урожая, функционал не реализован |
| `/api/v2/boost/verify-ton-payment` | client/src/components/ton-boost/BoostPackagesCard.tsx:219 | ❌ ОТСУТСТВУЕТ | Нет проверки TON платежей через API |
| `/api/v2/airdrop/register` | client/src/services/userService.ts:89 | ❌ ОТСУТСТВУЕТ | Регистрация airdrop не реализована на backend |

### 2. Роуты без полной реализации

| Роут | Проблема | Файл |
|------|----------|------|
| `/api/v2/auth/telegram` | Роут `/telegram` есть, но вызывается с префиксом `/auth/` | modules/auth/routes.ts:54 |
| `/api/v2/boost/packages` | Роут `/packages` есть, но отсутствует бизнес-логика для фильтрации | modules/boost/controller.ts |
| `/api/v2/wallet/ton-deposit` | Реализован прямо в server/index.ts вместо модуля | server/index.ts:873 |

### 3. Сервисы без записи в БД

| Сервис | Проблема | Файл |
|--------|----------|------|
| MissionsService | Использует BalanceManager, но не делает прямую запись в БД | modules/missions/service.ts |
| DailyBonusService | Использует BalanceManager, но не создает записи в daily_bonus_logs | modules/dailyBonus/service.ts |

### 4. Заглушки и TODO

| Проблема | Файл:Строка | Описание |
|----------|-------------|----------|
| TODO | modules/dailyBonus/service.ts:305 | `// TODO: Track max streak separately` |
| TODO | modules/adminBot/service.ts:356 | `// TODO: Here you would integrate with actual TON wallet` |
| Заглушка | modules/auth/service.ts:59 | `return null` при ошибке вместо throw |

## АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ

### 1. Дублирование роутов
- Farming модуль доступен через `/api/farming`, `/api/uni-farming` и `/api/v2/uni-farming`
- Referral модуль доступен через `/api/referral` и `/api/referrals`
- Missions доступны через `/api/missions`, `/api/user-missions` и `/api/v2/missions`

### 2. Несогласованность префиксов
- Frontend использует как `/api/`, так и `/api/v2/`
- Backend регистрирует роуты на обоих префиксах
- Нет единого стандарта версионирования API

### 3. Прямые endpoints в server/index.ts
Вместо модульной архитектуры, некоторые endpoints реализованы прямо в server/index.ts:
- `/api/v2/wallet/ton-deposit` (строка 873)
- `/api/v2/uni-farming/direct-deposit` (строка 719)
- `/api/v2/wallet/withdraw` (строка 919)

## РЕКОМЕНДАЦИИ

1. **Унификация API версий** - переход на единый префикс `/api/v2/`
2. **Перенос прямых endpoints** в соответствующие модули
3. **Реализация отсутствующих endpoints**:
   - `/api/v2/uni-farming/harvest`
   - `/api/v2/boost/verify-ton-payment`
   - `/api/v2/airdrop/register`
4. **Добавление записей в БД** для daily_bonus_logs
5. **Устранение заглушек** - замена `return null` на правильную обработку ошибок

## ВЫВОДЫ

Система в целом функциональна, но имеет архитектурные несоответствия:
- 92% API endpoints работают (полностью или частично)
- Основные проблемы связаны с несогласованностью путей и версий API
- Критические функции (депозиты, выводы) работают через обходные пути
- Требуется рефакторинг для соответствия модульной архитектуре