# 📋 План задач для подготовки UniFarm к Production

📅 **Дата составления:** 06 июля 2025  
🎯 **Цель:** Привести систему к 100% production-ready состоянию  
⏱ **Оценочное время:** 2-3 дня  
📊 **Текущая готовность:** 65%

---

## 🚨 Важные принципы работы:
1. ⚠️ **НЕ трогать работающие части системы**
2. ✅ **Тестировать каждое изменение перед переходом к следующему**
3. 🔄 **Делать резервные копии критических файлов перед изменением**
4. 📝 **Документировать все изменения в replit.md**

---

## 🔴 КРИТИЧЕСКИЕ ЗАДАЧИ (Production-blocking)

### 1. Исправить API Routing проблемы
**Проблема:** 5 из 6 критических endpoints возвращают 404 (walletTransactions, verifyTon, farmingDeposits, userProfile, wsStatus)  
**Причина:** Неправильная регистрация роутов или отсутствие endpoints  
**Файлы для проверки:**
- `server/routes.ts` - главный файл маршрутизации
- `modules/wallet/routes.ts` - проверить endpoint /transactions
- `modules/ton/routes.ts` или `modules/boost/routes.ts` - проверить /verify
- `modules/farming/routes.ts` - проверить /deposits
- `modules/user/routes.ts` - проверить /profile
- `modules/monitor/service.ts` - проверить пути в checkCriticalEndpoints()

**Действия:**
1. Проверить правильность импорта и регистрации роутов в server/routes.ts
2. Убедиться, что пути в monitor соответствуют реальным endpoints
3. Добавить недостающие endpoints если они отсутствуют

### 2. Внедрить централизованный BalanceManager
**Проблема:** Логика обновления баланса дублируется в 7 модулях  
**Причина:** Риск рассинхронизации данных и потери средств  
**Файлы для изменения:**
- `core/BalanceManager.ts` - уже создан, но не используется
- `modules/user/model.ts` - метод updateBalance()
- `modules/wallet/service.ts` - обновление balance_uni/balance_ton
- `modules/referral/service.ts` - обновление баланса при начислении комиссий
- `modules/farming/service.ts` - обновление баланса при фарминге
- `modules/boost/service.ts` - обновление баланса при бустах
- `modules/missions/service.ts` - обновление баланса при выполнении миссий
- `modules/dailyBonus/service.ts` - обновление баланса при daily bonus

**Действия:**
1. Импортировать BalanceManager во все модули
2. Заменить прямые SQL запросы на вызовы balanceManager.updateUserBalance()
3. Протестировать каждый модуль после изменения

---

## 🟡 ВАЖНЫЕ ЗАДАЧИ (Стабильность и масштабируемость)

### 3. Исправить название проекта
**Проблема:** package.json содержит "name": "rest-express" вместо "unifarm"  
**Причина:** Может вызвать проблемы при deployment и путаницу в CI/CD  
**Файлы:**
- `package.json` - изменить name с "rest-express" на "unifarm"

### 4. Очистить корневую директорию
**Проблема:** 23 тестовых файла засоряют корень проекта  
**Причина:** Усложняет навигацию и может попасть в production  
**Файлы для перемещения в папку /tests:**
```
test-jwt-generation.js
test-monitor.js
test-referral-security.js
generate-jwt.js
test-jwt-auth.html
check-preview-auth.html
test-preview-auth.html
auto-jwt-update.html
fix-auth-complete.html
set-jwt-token.html
generate-jwt-token.html
```

**Файлы для перемещения в папку /scripts:**
```
build-deploy.js
build-production.js
build-simple.js
start-server.js
start-with-client.js
```

### 5. Заменить типы `any` на конкретные интерфейсы
**Проблема:** Избыточное использование `any` снижает типобезопасность  
**Причина:** Потенциальные runtime ошибки  
**Файлы с критическими `any`:**
- `modules/user/controller.ts` (строки 28-30)
- `modules/wallet/logic/withdrawals.ts` (строки 7-10)
- `modules/auth/service.ts` - jwt.verify результат
- `modules/boost/service.ts` - API responses

**Действия:**
1. Создать интерфейсы для JWT payload
2. Типизировать API responses
3. Использовать generics для Promise типов

### 6. Исправить потенциальные undefined/NaN в UI
**Проблема:** Компоненты могут отображать undefined/NaN  
**Причина:** Недостаточная валидация данных  
**Файлы:**
- `client/src/components/dashboard/DailyBonusCard.tsx`
- `client/src/components/farming/FarmingHistory.tsx`
- `client/src/components/wallet/BalanceCard.tsx`

**Действия:**
1. Добавить проверки на undefined/null перед использованием
2. Использовать fallback значения (0 для чисел, пустая строка для текста)
3. Добавить loading состояния

---

## 🟢 НЕОБЯЗАТЕЛЬНЫЕ ЗАДАЧИ (Улучшения и рефакторинг)

### 7. Проанализировать необходимость двух admin модулей
**Проблема:** Существует `admin` и `adminBot` модули  
**Причина:** Возможное дублирование функционала  
**Файлы:**
- `modules/admin/` - проверить использование
- `modules/adminBot/` - основной модуль для админ-бота

### 8. Очистить attached_assets
**Проблема:** Папка содержит временные файлы промптов  
**Причина:** Не нужны в production  
**Действие:** Очистить папку `attached_assets/`

### 9. Обработать TODO комментарии
**Проблема:** Незавершенная функциональность  
**Файлы:**
- `modules/dailyBonus/service.ts:42` - TODO: Track max streak separately
- `modules/adminBot/service.ts:156` - TODO: Here you would integrate with actual TON wallet

### 10. Обновить .gitignore
**Проблема:** Тестовые файлы могут попасть в репозиторий  
**Действие:** Добавить правила в `.gitignore`:
```
/tests/
test-*.js
test-*.html
check-*.js
debug-*.js
```

---

## 📅 ПОРЯДОК ВЫПОЛНЕНИЯ (Step by Step)

### День 1: Критические исправления
1. **Шаг 1:** Резервное копирование критических файлов
2. **Шаг 2:** Исправление API routing проблем (задача #1)
3. **Шаг 3:** Тестирование всех API endpoints через monitor
4. **Шаг 4:** Начало внедрения BalanceManager (задача #2)

### День 2: Стабилизация
5. **Шаг 5:** Завершение внедрения BalanceManager
6. **Шаг 6:** Очистка корневой директории (задача #4)
7. **Шаг 7:** Исправление названия проекта (задача #3)
8. **Шаг 8:** Типизация критических `any` (задача #5)

### День 3: Финальная полировка
9. **Шаг 9:** Исправление UI проблем (задача #6)
10. **Шаг 10:** Очистка attached_assets (задача #8)
11. **Шаг 11:** Финальное тестирование всей системы
12. **Шаг 12:** Обновление документации и отчетов

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ К PRODUCTION

После выполнения всех задач система должна:
1. **API:** Все 6 критических endpoints возвращают статус OK
2. **Баланс:** Все операции с балансом идут через единый BalanceManager
3. **Типы:** Нет критических использований `any` в бизнес-логике
4. **UI:** Нет отображения undefined/NaN в интерфейсе
5. **Структура:** Корневая директория содержит только необходимые файлы
6. **Тесты:** E2E тесты проходят успешно

---

## ⚠️ ВАЖНЫЕ ПРЕДУПРЕЖДЕНИЯ

1. **НЕ удалять** работающие модули без подтверждения
2. **НЕ изменять** Supabase схему без миграций
3. **НЕ трогать** .env файл с production секретами
4. **НЕ изменять** vite.config.ts и связанные файлы сборки
5. **ВСЕГДА** тестировать в Preview режиме перед применением

---

*План составлен на основе финального аудита от 06.07.2025*  
*Перед началом работ рекомендуется создать полный backup проекта*