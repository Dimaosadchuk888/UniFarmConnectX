# 🚀 ADMIN BOT PRODUCTION DEPLOYMENT PLAN
**Date:** January 14, 2025  
**Purpose:** Четкий план действий для достижения 100% готовности к продакшену

---

## 📋 КРИТИЧЕСКИЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### 1. ❌ ПРОБЛЕМА: Webhook endpoint возвращает 404
**Текущее состояние:** Все API маршруты недоступны (404 Not Found)

**РЕШЕНИЕ:**

#### Шаг 1.1: Проверить статус сервера
```bash
# Убедиться, что сервер запущен
npm run dev
# или
npm start
```

#### Шаг 1.2: Проверить правильность домена Replit
- Текущий URL: `https://uni-farm-connect-x-ab245275.replit.app`
- Если домен изменился, обновить в:
  - `server/index.ts` (строка 978): переменная `appUrl`
  - Переустановить webhook с новым URL

#### Шаг 1.3: Проверить монтирование маршрутов
В файле `server/routes.ts` (строка 324):
```typescript
router.use('/admin-bot', adminBotRoutes); // Убедиться, что эта строка не закомментирована
```

#### Шаг 1.4: Добавить логирование для отладки
В `server/index.ts` после строки 324:
```typescript
console.log('Admin bot routes mounted at:', '/api/v2/admin-bot');
```

---

### 2. ⚠️ ПРОБЛЕМА: Админы не найдены в базе данных
**Текущее состояние:** @a888bnd и @DimaOsadchuk отсутствуют в таблице users

**РЕШЕНИЕ:**

#### Шаг 2.1: Добавить админов в БД (опционально)
Создать SQL скрипт:
```sql
-- Добавить флаг is_admin для существующих пользователей
UPDATE users SET is_admin = true WHERE username IN ('a888bnd', 'DimaOsadchuk');

-- Или создать новых пользователей-админов, если их нет
INSERT INTO users (username, telegram_id, is_admin, balance_uni, balance_ton) 
VALUES 
  ('a888bnd', 999999901, true, 0, 0),
  ('DimaOsadchuk', 999999902, true, 0, 0)
ON CONFLICT (username) DO UPDATE SET is_admin = true;
```

**Примечание:** Это не блокирует работу бота, так как проверка идет по username в коде.

---

### 3. 🔄 ПРОБЛЕМА: Telegram webhook получает ошибку 404
**Текущее состояние:** "Wrong response from the webhook: 404 Not Found"

**РЕШЕНИЕ:**

#### Шаг 3.1: После исправления маршрутов переустановить webhook
```bash
# Создать скрипт для переустановки webhook
npx tsx scripts/reset-admin-bot-webhook.ts
```

Содержимое скрипта:
```typescript
import { AdminBotService } from '../modules/adminBot/service';

async function resetWebhook() {
  const adminBot = new AdminBotService();
  const appUrl = process.env.APP_URL || 'https://uni-farm-connect-x-ab245275.replit.app';
  const webhookUrl = `${appUrl}/api/v2/admin-bot/webhook`;
  
  // Удалить старый webhook
  await adminBot.bot.telegram.deleteWebhook();
  
  // Установить новый
  const result = await adminBot.setupWebhook(webhookUrl);
  console.log('Webhook reset result:', result);
}

resetWebhook();
```

---

## 🛠️ ТЕХНИЧЕСКИЕ ШАГИ ПО ПОРЯДКУ

### ЭТАП 1: Диагностика и исправление сервера
1. **Перезапустить сервер** через Replit workflow
2. **Проверить логи** на наличие ошибок при старте
3. **Убедиться**, что все модули загружаются без ошибок
4. **Проверить переменные окружения**:
   - `TELEGRAM_BOT_TOKEN`
   - `APP_URL` (должен совпадать с текущим доменом Replit)

### ЭТАП 2: Проверка маршрутизации
1. **Временно добавить тестовый маршрут** в `server/index.ts`:
   ```typescript
   app.get('/test-server', (req, res) => {
     res.json({ status: 'Server is running', timestamp: new Date() });
   });
   ```
2. **Проверить доступность**: `https://[your-domain]/test-server`
3. **Если работает**, проблема в маршрутах API v2

### ЭТАП 3: Исправление webhook
1. **Проверить инициализацию бота** в `server/index.ts` (строки 976-991)
2. **Добавить обработку ошибок**:
   ```typescript
   try {
     const webhookSet = await adminBot.setupWebhook(webhookUrl);
     console.log('Webhook setup result:', webhookSet);
   } catch (error) {
     console.error('Webhook setup error:', error);
   }
   ```
3. **Переустановить webhook** после исправления маршрутов

### ЭТАП 4: Тестирование функциональности
1. **Проверить команды** через Telegram:
   - `/start` - главное меню
   - `/stats` - статистика системы
   - `/users` - список пользователей
   - `/withdrawals` - заявки на вывод
2. **Проверить inline кнопки** в главном меню
3. **Создать тестовую заявку на вывод** и проверить команды:
   - `/approve <id>`
   - `/reject <id>`

### ЭТАП 5: Мониторинг и логирование
1. **Добавить webhook health check** в `modules/adminBot/routes.ts`:
   ```typescript
   router.get('/webhook/health', (req, res) => {
     res.json({ 
       status: 'ok', 
       endpoint: '/api/v2/admin-bot/webhook',
       timestamp: new Date()
     });
   });
   ```
2. **Настроить логирование** всех команд админов
3. **Мониторить** ошибки webhook через Telegram API

---

## ✅ КОНТРОЛЬНЫЙ СПИСОК ГОТОВНОСТИ

- [ ] Сервер запущен и доступен
- [ ] API маршруты отвечают (не 404)
- [ ] Webhook endpoint `/api/v2/admin-bot/webhook` доступен
- [ ] Telegram webhook установлен без ошибок
- [ ] Все команды бота работают корректно
- [ ] Админы могут управлять выводами средств
- [ ] Транзакции сохраняются в БД
- [ ] Логирование работает для аудита

---

## 🔐 ФИНАЛЬНЫЕ ПРОВЕРКИ БЕЗОПАСНОСТИ

1. **Убедиться**, что только авторизованные админы имеют доступ
2. **Проверить**, что все критические действия требуют подтверждения
3. **Убедиться**, что логируются все административные действия
4. **Проверить**, что бот не отвечает неавторизованным пользователям

---

## 📊 МЕТРИКИ УСПЕХА

После выполнения всех шагов:
- ✅ Webhook отвечает статусом 200
- ✅ Нет ошибок в логах Telegram webhook
- ✅ Все команды выполняются успешно
- ✅ Изменения в БД применяются корректно
- ✅ Бот работает стабильно 24/7

---

**ВАЖНО:** Не изменять логику бота или добавлять новые функции. Только исправить инфраструктурные проблемы для запуска существующего функционала.