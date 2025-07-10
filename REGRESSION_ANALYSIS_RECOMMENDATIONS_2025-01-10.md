# АНАЛИЗ И РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ ПРОБЛЕМ
## Регрессионный отчет UniFarm (10.01.2025)

---

### 🔧 МОДУЛЬ: Реферальная система

📌 **Проблема:** таблица referrals пуста (0 записей), хотя ref_code генерируются и награды начисляются

🔍 **Анализ:** 
- В методе `processReferral()` (modules/referral/service.ts, строки 75-139) происходит только обновление поля `referred_by` в таблице users
- НЕТ вставки записи в таблицу referrals
- Система работает через поле referred_by, а таблица referrals не используется
- Реферальные комиссии рассчитываются через цепочку referred_by

📁 **Найденный участок кода:**
- `/modules/referral/service.ts`, строки 106-119 - только UPDATE users SET referred_by
- Отсутствует INSERT INTO referrals

🛠 **Рекомендации:**
1. Добавить после обновления referred_by (строка 120) вставку в таблицу referrals:
   ```typescript
   // Создаем запись в таблице referrals
   await supabase
     .from('referrals')
     .insert({
       referrer_id: inviter.id,
       referred_id: parseInt(newUserId),
       level: 1,
       created_at: new Date().toISOString()
     });
   ```
2. Обновить метод buildReferrerChain для использования таблицы referrals вместо referred_by
3. При миграции запустить скрипт scripts/supabase-fill-data.js для заполнения referrals из существующих связей

---

### 🔧 МОДУЛЬ: TON Wallet Connect

📌 **Проблема:** В системе нет ни одного подключенного адреса, поля ton_wallet_address пустые

🔍 **Анализ:**
- Frontend имеет функцию connectTonWallet() в client/src/services/tonConnectService.ts
- В UserContext есть connectWallet() (строка 387), но НЕТ сохранения адреса в БД
- Отсутствует API endpoint для сохранения TON адреса после подключения
- TonConnect UI возвращает адрес, но он не передается на backend

📁 **Найденный участок кода:**
- `/client/src/contexts/userContext.tsx`, строка 387 - connectWallet() только возвращает boolean
- `/client/src/services/tonConnectService.ts` - получает адрес, но не сохраняет
- Отсутствует API endpoint типа POST /api/v2/wallet/save-ton-address

🛠 **Рекомендации:**
1. Создать API endpoint в modules/wallet/controller.ts:
   ```typescript
   async saveTonAddress(req, res) {
     const { address } = req.body;
     const userId = req.user.id;
     // UPDATE users SET ton_wallet_address = address
   }
   ```
2. В UserContext.connectWallet() после успешного подключения:
   ```typescript
   const address = tonConnectUI.account?.address;
   if (address) {
     await apiRequest('/api/v2/wallet/save-ton-address', {
       method: 'POST',
       body: JSON.stringify({ address })
     });
   }
   ```
3. Добавить поле ton_wallet_verified = true при сохранении
4. Сохранять ton_wallet_linked_at = текущее время

---

### 🔧 МОДУЛЬ: Типы транзакций

📌 **Проблема:** В БД только FARMING_REWARD и REFERRAL_REWARD, остальные типы отсутствуют

🔍 **Анализ:**
- Frontend определяет типы в client/src/services/transactionService.ts (boost_purchase, farming_deposit, daily_bonus)
- Backend в modules/transactions/model.ts не имеет полного списка типов
- При создании транзакций используются типы, которых нет в enum БД
- Supabase отклоняет транзакции с ошибкой "invalid input value for enum transaction_type"

📁 **Найденный участок кода:**
- `/scripts/add-farming-deposit-type.sql` - попытка добавить FARMING_DEPOSIT
- `/client/src/services/transactionService.ts` - маппинг типов на frontend
- Enum в БД не соответствует используемым типам

🛠 **Рекомендации:**
1. Выполнить SQL для добавления недостающих типов:
   ```sql
   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'BOOST_PURCHASE';
   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'FARMING_DEPOSIT';
   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DAILY_BONUS';
   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DEPOSIT';
   ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
   ```
2. Обновить modules/transactions/model.ts с полным списком типов
3. Синхронизировать типы между frontend и backend
4. При покупке boost пакетов создавать транзакцию BOOST_PURCHASE
5. При депозите в farming создавать FARMING_DEPOSIT вместо отрицательного FARMING_REWARD

---

### 🔧 МОДУЛЬ: Daily Bonus

📌 **Проблема:** Транзакции DAILY_BONUS создаются, но таблица daily_bonus_logs пуста

🔍 **Анализ:**
- В методе claimDailyBonus() создается транзакция (строки 93-104)
- Есть попытка записи в 'daily_bonus_history' (строки 108-116)
- НО таблица называется 'daily_bonus_logs', а не 'daily_bonus_history'
- Ошибка записи игнорируется, поэтому система продолжает работать

📁 **Найденный участок кода:**
- `/modules/dailyBonus/service.ts`, строки 108-116 - запись в неправильную таблицу
- Используется 'daily_bonus_history' вместо 'daily_bonus_logs'

🛠 **Рекомендации:**
1. Исправить название таблицы в service.ts:
   ```typescript
   // Заменить 'daily_bonus_history' на 'daily_bonus_logs'
   await supabase
     .from('daily_bonus_logs')  // Правильное название
     .insert({
       user_id: userIdNumber,
       amount: parseFloat(bonusAmount),
       streak_day: newStreak,
       claimed_at: now.toISOString()
     });
   ```
2. Добавить обработку ошибок для этой вставки
3. Проверить соответствие полей (amount vs bonus_amount)
4. Убедиться что поля в daily_bonus_logs соответствуют вставляемым данным

---

## 📊 ИТОГОВЫЕ ВЫВОДЫ

1. **Реферальная система** работает через старую схему (referred_by), новая таблица не используется
2. **TON Wallet** - отсутствует backend часть для сохранения адресов
3. **Типы транзакций** - рассинхрон между enum в БД и кодом
4. **Daily Bonus** - опечатка в названии таблицы

Все проблемы решаемы без глобальных изменений архитектуры.