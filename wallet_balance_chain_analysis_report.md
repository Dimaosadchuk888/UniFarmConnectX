# Полный анализ цепочки `/api/v2/wallet/balance`
**Дата:** 12.07.2025  
**Статус:** Завершённый анализ

## 📍 Цепочка запроса:

1. **Frontend:** `client/src/services/balanceService.ts:66`
   ```typescript
   const response = await correctApiRequest(`/api/v2/wallet/balance?user_id=${targetUserId}`, 'GET');
   ```

2. **→ HTTP маршрут:** `modules/wallet/routes.ts:69`
   ```typescript
   router.get('/balance', requireTelegramAuth, massOperationsRateLimit, getDirectBalance);
   ```

3. **→ Обработчик:** `modules/wallet/directBalanceHandler.ts:11-75`
   ```typescript
   export const getDirectBalance = async (req: Request, res: Response)
   ```

4. **→ Репозиторий:** `modules/user/service.ts:154`
   ```typescript
   const user = await userRepository.getUserById(parseInt(userId));
   ```

5. **→ Supabase запрос:** `modules/user/service.ts:156-160`
   ```typescript
   const { data, error } = await supabase
     .from('users')
     .select(USER_FIELDS)
     .eq('id', userId)
     .single();
   ```

## 📂 Таблицы и поля БД:

### Таблица `users` (shared/schema.ts):
```typescript
// Основные поля балансов
balance_uni: numeric("balance_uni", { precision: 18, scale: 6 }).default("0"),
balance_ton: numeric("balance_ton", { precision: 18, scale: 6 }).default("0"),

// Поля фарминга  
uni_deposit_amount: numeric("uni_deposit_amount", { precision: 18, scale: 6 }).default("0"),
uni_farming_balance: numeric("uni_farming_balance", { precision: 18, scale: 6 }).default("0"),
uni_farming_active: boolean("uni_farming_active").default(false)
```

**Факт:** Все данные берутся из одной таблицы `users`, отдельной таблицы `wallets` не существует.

## ⚙️ Преобразование полей:

### В БД (snake_case):
- `balance_uni`
- `balance_ton`
- `uni_farming_balance`
- `uni_deposit_amount`
- `uni_farming_active`

### В directBalanceHandler.ts (строки 50-56):
```typescript
const balanceData = {
  uniBalance: parseFloat(user.balance_uni?.toString() || "0"),
  tonBalance: parseFloat(user.balance_ton?.toString() || "0"),
  uniFarmingActive: user.uni_farming_active || false,
  uniDepositAmount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
  uniFarmingBalance: parseFloat(user.uni_farming_balance?.toString() || "0")
};
```

**Факт:** Преобразование snake_case → camelCase происходит в directBalanceHandler

### В API ответе (camelCase):
```json
{
  "success": true,
  "data": {
    "uniBalance": 1009900.122573,
    "tonBalance": 898.12,
    "uniFarmingActive": true,
    "uniDepositAmount": 407589,
    "uniFarmingBalance": 0
  }
}
```

## ❌ Проблема совместимости:

### Hook `useBalance` (client/src/hooks/useBalance.ts):
```typescript
interface UserBalance {
  balance_uni: string;      // Ожидает snake_case
  balance_ton: string;      
  uni_farming_balance: string;
  accumulated_ton: string;
}

// Использует старый endpoint без /v2
queryKey: [`/api/wallet/balance?user_id=${userId}`]
```

**Критически:** Hook ожидает старый формат (snake_case) и старый URL без `/v2`

### Текущее использование:
- Импортирован в `App.tsx:10`, но **НЕ используется** в коде
- Компоненты используют `balanceService.ts`, который адаптирован под оба формата

## ✅ Рекомендация по унификации:

### Вариант 1: Сохранить текущий camelCase формат (рекомендуется)
```json
{
  "success": true,
  "data": {
    "uniBalance": 1009900.12,
    "tonBalance": 898.12,
    "uniFarmingActive": true,
    "uniDepositAmount": 407589,
    "uniFarmingBalance": 0,
    "userId": 74
  }
}
```

**Действия:**
1. Удалить неиспользуемый `useBalance` hook
2. Использовать везде `balanceService.ts`
3. Документировать формат в API спецификации

### Вариант 2: Вернуться к snake_case (не рекомендуется)
```json
{
  "success": true,
  "data": {
    "balance_uni": "1009900.12",
    "balance_ton": "898.12",
    "uni_farming_active": true,
    "uni_deposit_amount": "407589",
    "uni_farming_balance": "0",
    "user_id": 74
  }
}
```

**Недостатки:**
- Потребует изменения всех frontend компонентов
- Нарушит консистентность с другими API endpoints

## 📊 Заключение:

1. **Вся цепочка работает корректно** благодаря адаптивной логике в `balanceService.ts`
2. **Единственная проблема** - неиспользуемый `useBalance` hook с устаревшим форматом
3. **Рекомендуется** сохранить текущий camelCase формат и удалить устаревший hook
4. **Данные берутся** только из таблицы `users`, никаких JOIN или сложных запросов