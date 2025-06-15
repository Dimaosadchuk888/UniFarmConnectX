# 📌 UniFarm Системный Аудит

**Дата:** 15 июня 2025, 11:57 UTC  
**Роль:** Системный аудитор  
**Статус:** В процессе

---

## 🔍 ПЛАН ПРОВЕРКИ

### 1. Авторизация через Telegram
- [ ] window.Telegram.WebApp.initData
- [ ] Создание пользователя и JWT
- [ ] Токен в localStorage/cookies

### 2. API-эндпоинты через Supabase
- [ ] /auth/telegram
- [ ] /me
- [ ] /wallet/balance
- [ ] /farming/start
- [ ] /referral/tree
- [ ] /airdrop/missions

### 3. Подключение к базе
- [ ] Только core/supabase.ts
- [ ] Отсутствие PostgreSQL/drizzle/Neon
- [ ] CRUD в Supabase Dashboard

### 4. Telegram WebApp
- [ ] Открытие через Telegram
- [ ] Инициализация WebApp
- [ ] Передача контекста в initData

### 5. UI и интерфейс
- [ ] Корректное отображение
- [ ] Работа кнопок
- [ ] Отсутствие ошибок в DevTools

### 6. Секреты .env
- [ ] Удалены: DATABASE_URL, PG*
- [ ] Присутствуют: SUPABASE_URL, SUPABASE_KEY
- [ ] Использование Supabase API

### 7. Webhook
- [ ] Production URL
- [ ] Проверка через Telegram API

### 8. Health-эндпоинты
- [ ] /health
- [ ] /api/v2/health

### 9. Manifest
- [ ] manifest.json
- [ ] BotFather регистрация
- [ ] WebApp URL

### 10. Supabase Dashboard
- [ ] Claim бонус → транзакция
- [ ] Старт фарминга → сессия
- [ ] Приглашение → дерево
- [ ] Миссии → записи

---

## 📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ

### ✅ Что работает:
_Заполняется в процессе аудита_

### ❌ Что не работает:
_Заполняется в процессе аудита_

### ⚠️ Подозрительные места:
_Заполняется в процессе аудита_

### 🟢 Общий статус:
_Определяется после завершения аудита_