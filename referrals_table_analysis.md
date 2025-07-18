# АНАЛИЗ ЗАПОЛНЕНИЯ ТАБЛИЦЫ REFERRALS

## Найденные функции, которые заполняют таблицу referrals:

### 1. **ReferralService.processReferral()** - modules/referral/service.ts (строки 129-139)
```typescript
const { error: referralError } = await supabase
  .from(REFERRAL_TABLES.REFERRALS)
  .insert({
    user_id: parseInt(newUserId),          // ID приглашенного пользователя
    referred_user_id: parseInt(newUserId), // Дублируем ID для совместимости с БД
    inviter_id: inviter.id,                // ID пригласившего
    level: 1,
    reward_uni: '0',
    reward_ton: '0',
    ref_path: [inviter.id] // Путь начинается с прямого пригласителя
  });
```
**Статус:** ❌ НЕ ВЫЗЫВАЕТСЯ из-за циклических зависимостей

### 2. **AuthService.processReferralInline()** - modules/auth/service.ts (строки 82-95)
```typescript
const { error: referralError } = await supabase
  .from('referrals')
  .insert({
    user_id: newUserId,
    referred_user_id: newUserId,
    inviter_id: referrer.id,
    level: 1,
    ref_path: [referrer.id],
    reward_uni: 0,
    reward_ton: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
```
**Статус:** ✅ НОВАЯ ФУНКЦИЯ, создана для решения проблемы

### 3. **Скрипты миграции** - scripts/
- `fix-referrals-both-fields.ts` - исправляет существующие записи
- `migrate-existing-referrals.ts` - мигрирует данные из users.referred_by

## КРИТИЧЕСКИЕ РАЗЛИЧИЯ В СТРУКТУРЕ ДАННЫХ:

### ReferralService.processReferral():
- `user_id: parseInt(newUserId)` (число)
- `referred_user_id: parseInt(newUserId)` (число)
- `reward_uni: '0'` (строка)
- `reward_ton: '0'` (строка)
- НЕТ created_at/updated_at

### AuthService.processReferralInline():
- `user_id: newUserId` (может быть строкой)
- `referred_user_id: newUserId` (может быть строкой)
- `reward_uni: 0` (число)
- `reward_ton: 0` (число)
- ЕСТЬ created_at/updated_at

## ПРОБЛЕМЫ С ВЫЗОВОМ:

### 1. ReferralService.processReferral() НЕ ВЫЗЫВАЕТСЯ:
- Циклические зависимости между AuthService ↔ ReferralService
- Должен вызываться из modules/auth/service.ts после создания пользователя

### 2. AuthService.processReferralInline() МОЖЕТ НЕ ВЫЗЫВАТЬСЯ:
- Возможные проблемы с условием `if (userData.ref_by && user)`
- Возможные ошибки в самом методе

## ПРОВЕРКА ЛОГОВ:

Нужно проверить логи на наличие:
- `[AuthService] НАЧИНАЕТСЯ НЕМЕДЛЕННАЯ ОБРАБОТКА РЕФЕРАЛЬНОЙ СВЯЗИ`
- `[AuthService] ✅ РЕФЕРАЛЬНАЯ СВЯЗЬ УСПЕШНО СОЗДАНА`
- `[AuthService] ❌ НЕ УДАЛОСЬ СОЗДАТЬ РЕФЕРАЛЬНУЮ СВЯЗЬ`

## ЗАКЛЮЧЕНИЕ:

Таблица `referrals` должна заполняться через `processReferralInline()` в AuthService, 
но судя по тому, что User 224 имеет `referred_by: NULL`, этот метод не выполняется при реальных регистрациях.

Возможные причины:
1. Поле `userData.ref_by` не передается в метод
2. Метод падает с ошибкой
3. Условие `if (userData.ref_by && user)` не срабатывает
4. Сервер не доходит до этого места кода