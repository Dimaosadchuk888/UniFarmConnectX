# UniFarm - Следующие шаги для деплоя

**Дата:** 9 июля 2025  
**Статус:** Требуется выполнение

## ✅ Что уже сделано

1. **Фарминг активирован** для пользователя 62
   - Флаг `uni_farming_active = true`
   - Статус в UI: "Активен"

2. **Код обновлен** для будущих депозитов
   - Добавлен тип транзакции `FARMING_DEPOSIT`
   - Обновлена логика создания транзакций
   - Флаг активации будет устанавливаться автоматически

3. **Сервер перезапущен**
   - Workflow "UniFarm Development" запущен
   - Изменения кода применяются

## 📋 Что осталось сделать

### 1. Добавить поля TON-кошелька в базу данных

В Supabase Dashboard:
1. Откройте SQL Editor
2. Выполните запрос из файла `scripts/add-ton-wallet-fields.sql`:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ton_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS ton_wallet_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ton_wallet_linked_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_ton_wallet_address 
  ON users(ton_wallet_address) 
  WHERE ton_wallet_address IS NOT NULL;
```

### 2. Протестировать новый депозит

После перезапуска сервера:
1. Сделайте новый депозит UNI
2. Проверьте, что:
   - Флаг `uni_farming_active` автоматически стал `true`
   - Создалась транзакция типа `FARMING_DEPOSIT`
   - Начисления работают корректно

### 3. Мониторинг

Следите за логами:
- Проверьте, что нет ошибок с типом транзакции
- Убедитесь, что депозиты проходят успешно
- Мониторьте начисления фарминга

## 🚀 Готовность к продакшену

После выполнения всех шагов система будет готова к production использованию с:
- ✅ Автоматической активацией фарминга
- ✅ Корректным отображением депозитов
- ✅ Синхронизированной структурой БД

## 📞 Поддержка

При возникновении проблем обратитесь к файлам:
- `docs/UNIFARM_FIXES_APPLIED_REPORT.md` - детали примененных исправлений
- `scripts/fix-user-62-active-farming.js` - скрипт ручной активации
- `scripts/check-transaction-types.js` - проверка типов транзакций