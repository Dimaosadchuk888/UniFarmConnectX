# 🚀 План исправления несоответствий системы UniFarm роадмапу

**Дата создания**: 8 января 2025  
**Базовый документ**: ROADMAP_COMPLIANCE_AUDIT_REPORT.md  
**Источник правды**: ROADMAP.md (только для чтения/дополнения)  
**Текущее соответствие**: 78%  
**Целевое соответствие**: 100%  

---

## 📋 Приоритетные задачи для исправления

### 🔥 ПРИОРИТЕТ 1 - КРИТИЧЕСКИЕ НЕДОСТАТКИ (Срочно)

#### 1.1 Отсутствующие API endpoints модуля Authentication
**Проблема**: Отсутствует `/api/v2/auth/refresh` - обновление JWT токенов
**Файл**: `modules/auth/routes.ts`, `modules/auth/controller.ts`, `modules/auth/service.ts`
**Задача**:
```typescript
// Добавить в routes.ts:
router.post('/refresh', liberalRateLimit, validateBody(refreshTokenSchema), authController.refreshToken.bind(authController));

// Добавить в controller.ts:
async refreshToken(req: Request, res: Response): Promise<void>

// Добавить в service.ts:
async refreshToken(oldToken: string): Promise<{success: boolean, newToken?: string, error?: string}>
```

#### 1.2 Отсутствующие API endpoints модуля User Management
**Проблема**: Отсутствуют `/api/v2/user/stats` и `/api/v2/user/search/:query`
**Файл**: `modules/user/routes.ts`, `modules/user/controller.ts`, `modules/user/service.ts`
**Задача**:
```typescript
// Добавить в routes.ts:
router.get('/stats', requireTelegramAuth, liberalRateLimit, userController.getUserStats.bind(userController));
router.get('/search/:query', requireTelegramAuth, liberalRateLimit, validateParams(searchParamsSchema), userController.searchUsers.bind(userController));

// Добавить в controller.ts:
async getUserStats(req: Request, res: Response): Promise<void>
async searchUsers(req: Request, res: Response): Promise<void>
```

#### 1.3 Отсутствующие API endpoints модуля Wallet
**Проблема**: Отсутствует `/api/v2/wallet/transfer` - внутренние переводы
**Файл**: `modules/wallet/routes.ts`, `modules/wallet/controller.ts`, `modules/wallet/service.ts`
**Задача**:
```typescript
// Добавить в routes.ts:
router.post('/transfer', requireTelegramAuth, strictRateLimit, validateBody(transferSchema), walletController.transfer.bind(walletController));

// Добавить в controller.ts:
async transfer(req: Request, res: Response): Promise<void>
```

#### 1.4 Отсутствующие API endpoints модуля Farming
**Проблема**: Отсутствует `/api/v2/farming/rates` - текущие ставки фарминга
**Файл**: `modules/farming/routes.ts`, `modules/farming/controller.ts`, `modules/farming/service.ts`
**Задача**:
```typescript
// Добавить в routes.ts:
router.get('/rates', requireTelegramAuth, liberalRateLimit, farmingController.getFarmingRates.bind(farmingController));

// Добавить в controller.ts:
async getFarmingRates(req: Request, res: Response): Promise<void>
```

---

### 🔥 ПРИОРИТЕТ 2 - КРИТИЧЕСКИЕ МОДУЛИ (Высокий)

#### 2.1 Завершение TON Farming модуля (25% → 100%)
**Проблема**: Из 4 требуемых endpoints реализован только 1
**Файл**: `modules/tonFarming/routes.ts`, `modules/tonFarming/controller.ts`, `modules/tonFarming/service.ts`
**Отсутствующие endpoints**:
```typescript
// Добавить в routes.ts:
router.post('/start', requireTelegramAuth, massOperationsRateLimit, validateBody(tonFarmingStartSchema), tonFarmingController.startTonFarming.bind(tonFarmingController));
router.post('/claim', requireTelegramAuth, massOperationsRateLimit, tonFarmingController.claimTonFarming.bind(tonFarmingController));
router.get('/balance', requireTelegramAuth, liberalRateLimit, tonFarmingController.getTonFarmingBalance.bind(tonFarmingController));

// Добавить в controller.ts:
async startTonFarming(req: Request, res: Response): Promise<void>
async claimTonFarming(req: Request, res: Response): Promise<void>
async getTonFarmingBalance(req: Request, res: Response): Promise<void>
```

#### 2.2 Расширение Referral System (20% → 100%)
**Проблема**: Из 5 требуемых endpoints реализован только 1
**Файл**: `modules/referral/routes.ts`, `modules/referral/controller.ts`, `modules/referral/service.ts`
**Отсутствующие endpoints**:
```typescript
// Добавить в routes.ts:
router.get('/levels', requireTelegramAuth, liberalRateLimit, referralController.getReferralLevels.bind(referralController));
router.post('/generate-code', requireTelegramAuth, standardRateLimit, referralController.generateReferralCode.bind(referralController));
router.get('/history', requireTelegramAuth, liberalRateLimit, referralController.getReferralHistory.bind(referralController));
router.get('/chain', requireTelegramAuth, liberalRateLimit, referralController.getReferralChain.bind(referralController));

// Добавить в controller.ts:
async getReferralLevels(req: Request, res: Response): Promise<void>
async generateReferralCode(req: Request, res: Response): Promise<void>
async getReferralHistory(req: Request, res: Response): Promise<void>
async getReferralChain(req: Request, res: Response): Promise<void>
```

#### 2.3 Исправление Boost System (60% → 100%)
**Проблема**: Отсутствуют `/api/v2/boost/active` и `/api/v2/boost/history`
**Файл**: `modules/boost/routes.ts`, `modules/boost/controller.ts`, `modules/boost/service.ts`
**Отсутствующие endpoints**:
```typescript
// Добавить в routes.ts:
router.get('/active', requireTelegramAuth, liberalRateLimit, boostController.getActiveBoosts.bind(boostController));
router.get('/history', requireTelegramAuth, liberalRateLimit, boostController.getBoostHistory.bind(boostController));

// Добавить в controller.ts:
async getActiveBoosts(req: Request, res: Response): Promise<void>
async getBoostHistory(req: Request, res: Response): Promise<void>
```

---

### 🔥 ПРИОРИТЕТ 3 - ДОПОЛНИТЕЛЬНЫЕ МОДУЛИ (Средний)

#### 3.1 Завершение Airdrop System (50% → 100%)
**Проблема**: Из 4 требуемых endpoints реализованы только 2
**Файл**: `modules/airdrop/routes.ts`, `modules/airdrop/controller.ts`, `modules/airdrop/service.ts`
**Отсутствующие endpoints**:
```typescript
// Добавить в routes.ts:
router.get('/active', requireTelegramAuth, liberalRateLimit, airdropController.getActiveAirdrops.bind(airdropController));
router.get('/eligibility', requireTelegramAuth, liberalRateLimit, airdropController.checkEligibility.bind(airdropController));

// Добавить в controller.ts:
async getActiveAirdrops(req: Request, res: Response): Promise<void>
async checkEligibility(req: Request, res: Response): Promise<void>
```

#### 3.2 Расширение User Management (40% → 100%)
**Проблема**: Отсутствует `/api/v2/user/update-settings`
**Файл**: `modules/user/routes.ts`, `modules/user/controller.ts`, `modules/user/service.ts`
**Отсутствующий endpoint**:
```typescript
// Добавить в routes.ts:
router.post('/update-settings', requireTelegramAuth, standardRateLimit, validateBody(userSettingsSchema), userController.updateSettings.bind(userController));

// Добавить в controller.ts:
async updateSettings(req: Request, res: Response): Promise<void>
```

---

### 🔥 ПРИОРИТЕТ 4 - FRONTEND КОМПОНЕНТЫ (Низкий)

#### 4.1 Отсутствующие компоненты (75% → 100%)
**Проблема**: Отсутствуют 3 из 20 требуемых компонентов
**Файлы для создания**:
```typescript
// client/src/components/farming/FarmingHistory.tsx
export const FarmingHistory = () => {
  // Компонент для отображения истории фарминга
  // Использует API: /api/v2/farming/history
}

// client/src/components/boost/BoostPurchaseModal.tsx
export const BoostPurchaseModal = () => {
  // Модальное окно для покупки boost пакетов
  // Использует API: /api/v2/boost/purchase
}

// client/src/components/missions/MissionStats.tsx
export const MissionStats = () => {
  // Компонент статистики выполненных миссий
  // Использует API: /api/v2/missions/rewards
}
```

---

## 🎯 Детальный план выполнения по этапам

### ЭТАП 1: Критические API endpoints (3-4 часа)
```
1. modules/auth/routes.ts - добавить /refresh endpoint
2. modules/auth/controller.ts - реализовать refreshToken метод
3. modules/auth/service.ts - логика обновления JWT токена
4. modules/user/routes.ts - добавить /stats и /search endpoints
5. modules/user/controller.ts - реализовать getUserStats и searchUsers
6. modules/wallet/routes.ts - добавить /transfer endpoint
7. modules/wallet/controller.ts - реализовать transfer метод
8. modules/farming/routes.ts - добавить /rates endpoint
9. modules/farming/controller.ts - реализовать getFarmingRates
```

### ЭТАП 2: TON Farming модуль (2-3 часа)
```
1. modules/tonFarming/routes.ts - добавить /start, /claim, /balance endpoints
2. modules/tonFarming/controller.ts - реализовать все методы
3. modules/tonFarming/service.ts - бизнес-логика TON фарминга
4. Тестирование TON фарминга с реальными данными
```

### ЭТАП 3: Referral System (2-3 часа)
```
1. modules/referral/routes.ts - добавить 4 недостающих endpoint
2. modules/referral/controller.ts - реализовать все методы
3. modules/referral/service.ts - 20-уровневая логика рефералов
4. Проверка корректности процентов комиссии
```

### ЭТАП 4: Boost и Airdrop системы (1-2 часа)
```
1. modules/boost/routes.ts - добавить /active и /history
2. modules/boost/controller.ts - реализовать методы
3. modules/airdrop/routes.ts - добавить /active и /eligibility
4. modules/airdrop/controller.ts - реализовать методы
```

### ЭТАП 5: Frontend компоненты (1-2 часа)
```
1. Создать FarmingHistory.tsx компонент
2. Создать BoostPurchaseModal.tsx компонент
3. Создать MissionStats.tsx компонент
4. Интегрировать компоненты в соответствующие страницы
```

---

## 🧪 План тестирования

### Тестирование API endpoints
```bash
# Тест каждого нового endpoint
curl -X POST /api/v2/auth/refresh -H "Authorization: Bearer {token}"
curl -X GET /api/v2/user/stats -H "Authorization: Bearer {token}"
curl -X GET /api/v2/user/search/username -H "Authorization: Bearer {token}"
curl -X POST /api/v2/wallet/transfer -H "Authorization: Bearer {token}" -d '{"to_user_id": 1, "amount": 10, "currency": "UNI"}'
curl -X GET /api/v2/farming/rates -H "Authorization: Bearer {token}"
```

### Тестирование TON Farming
```bash
# Полный цикл TON фарминга
curl -X POST /api/v2/ton-farming/start -H "Authorization: Bearer {token}" -d '{"amount": "100"}'
curl -X GET /api/v2/ton-farming/balance -H "Authorization: Bearer {token}"
curl -X POST /api/v2/ton-farming/claim -H "Authorization: Bearer {token}"
```

### Тестирование Referral System
```bash
# Тест реферальной системы
curl -X GET /api/v2/referral/levels -H "Authorization: Bearer {token}"
curl -X POST /api/v2/referral/generate-code -H "Authorization: Bearer {token}"
curl -X GET /api/v2/referral/history -H "Authorization: Bearer {token}"
curl -X GET /api/v2/referral/chain -H "Authorization: Bearer {token}"
```

---

## 📊 Метрики успеха

### Целевые показатели
- **API endpoints**: 79/79 (100% соответствие)
- **Модули**: 14/14 (100% соответствие)
- **Frontend компоненты**: 20/20 (100% соответствие)
- **Общая готовность**: 78% → 100%

### Контрольные точки
```
✅ ЭТАП 1 завершен: 78% → 85% (критические API)
✅ ЭТАП 2 завершен: 85% → 92% (TON Farming)
✅ ЭТАП 3 завершен: 92% → 97% (Referral System)
✅ ЭТАП 4 завершен: 97% → 99% (Boost/Airdrop)
✅ ЭТАП 5 завершен: 99% → 100% (Frontend)
```

---

## 🔒 Важные ограничения

### Что НЕЛЬЗЯ делать:
- ❌ Изменять содержимое ROADMAP.md
- ❌ Удалять существующие endpoints
- ❌ Изменять структуру базы данных без необходимости
- ❌ Ломать существующую функциональность

### Что МОЖНО делать:
- ✅ Добавлять новые endpoints согласно роадмапу
- ✅ Расширять существующие сервисы
- ✅ Создавать новые компоненты
- ✅ Дополнять ROADMAP.md ТОЛЬКО при системных обновлениях

---

## 🎯 Итоговый результат

После выполнения всех этапов плана система UniFarm достигнет **100% соответствия** официальному роадмапу:

- **79/79 API endpoints** реализованы
- **14/14 модулей** полностью функциональны
- **20/20 frontend компонентов** созданы
- **100% бизнес-логика** соответствует требованиям

**Время выполнения**: 10-14 часов  
**Сложность**: Средняя (требует знание архитектуры)  
**Результат**: Полное соответствие роадмапу UniFarm

---

**Дата создания плана**: 8 января 2025  
**Статус**: 🟡 ГОТОВ К РЕАЛИЗАЦИИ  
**Следующий шаг**: Начать с ЭТАПА 1 - Критические API endpoints