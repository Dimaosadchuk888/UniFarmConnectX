# 🏗️ АРХИТЕКТУРНЫЙ АНАЛИЗ UNIFARM - КАРТА АКТИВНЫХ КОМПОНЕНТОВ

## 📋 ОСНОВНЫЕ АКТИВНЫЕ ФАЙЛЫ (используются в routes-new.ts)

### 🎯 КОНТРОЛЛЕРЫ (АКТИВНЫЕ)
```
✅ server/controllers/sessionController.ts
✅ server/controllers/userController.ts  
✅ server/controllers/transactionController.ts
✅ server/controllers/missionControllerFixed.ts       ← ИСПОЛЬЗУЕТСЯ
✅ server/controllers/referralControllerConsolidated.ts
✅ server/controllers/boostControllerConsolidated.ts
✅ server/controllers/tonBoostControllerConsolidated.ts
✅ server/controllers/walletControllerConsolidated.ts
✅ server/controllers/dailyBonusControllerConsolidated.ts
✅ server/controllers/UniFarmingController.ts
✅ server/controllers/authController.ts              ← Динамический импорт
```

### 🔧 СЕРВИСЫ (АКТИВНЫЕ через services/index.ts)
```
✅ server/services/userServiceInstance.ts
✅ server/services/referralServiceInstance.ts
✅ server/services/transactionServiceInstance.ts
✅ server/services/missionServiceInstance.ts         ← ИСПОЛЬЗУЕТСЯ
✅ server/services/boostServiceInstance.ts
✅ server/services/tonBoostServiceInstance.ts
✅ server/services/walletServiceInstance.ts
✅ server/services/dailyBonusServiceInstance.ts
✅ server/services/uniFarmingServiceInstance.ts
✅ server/services/farmingServiceInstance.ts
✅ server/services/telegramServiceInstance.ts
```

## ⚠️ ПОТЕНЦИАЛЬНЫЕ ДУБЛИКАТЫ (требуют анализа)

### 🔍 КОНТРОЛЛЕРЫ С ПОДОЗРЕНИЕМ НА ДУБЛИРОВАНИЕ
```
❓ server/controllers/missionControllerConsolidated.ts vs missionControllerFixed.ts
❓ server/controllers/authController.ts vs authController.new.ts vs authController.ts.new
❓ server/controllers/newUniFarmingController.ts vs UniFarmingController.ts
```

### 🔍 СЕРВИСЫ С ПОДОЗРЕНИЕМ НА ДУБЛИРОВАНИЕ  
```
❓ server/services/missionService.ts vs missionServiceFixed.ts vs missionServiceInstance.ts
❓ server/services/uniFarmingService.ts vs newUniFarmingService.ts vs uniFarmingServiceInstance.ts
❓ server/services/authService.ts vs authServiceInstance.ts
```

## 📂 АРХИВНЫЕ ФАЙЛЫ (сохранены как backup)
```
🗄️ server/archive/*.bak - резервные копии старых контроллеров
```

## 🎯 ПЛАН БЕЗОПАСНОЙ ДЕДУПЛИКАЦИИ

### ЭТАП 1: АНАЛИЗ ИМПОРТОВ
- Проверить все файлы, которые импортируют подозрительные дубликаты
- Убедиться, что нет скрытых зависимостей

### ЭТАП 2: ФУНКЦИОНАЛЬНОЕ СРАВНЕНИЕ
- Сравнить методы в дублирующихся файлах
- Определить актуальную версию по логике REDMAP

### ЭТАП 3: БЕЗОПАСНАЯ ЗАМЕНА
- Обновить импорты на актуальную версию
- Переместить неактуальные файлы в archive/
- Тестировать после каждого изменения

## 🚨 КРИТИЧЕСКИ ВАЖНО
- НЕ удалять файлы до полного анализа зависимостей
- Сначала анализировать весь граф импортов
- Тестировать функционал после каждого изменения