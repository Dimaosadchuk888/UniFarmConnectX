# Минималистичный план внедрения Telegram start_param

## 🎯 Цель
Добавить поддержку start_param с минимальными изменениями кода

## 📝 План (всего 1 изменение)

### Единственное изменение в App.tsx

**Файл:** `client/src/App.tsx`  
**Строка:** 107-110

**Было:**
```typescript
// Get referral code from URL
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref_code') || urlParams.get('refCode') || 
               sessionStorage.getItem('referrer_code');
```

**Станет:**
```typescript
// Get referral code from URL
const urlParams = new URLSearchParams(window.location.search);
const telegramStartParam = window.Telegram?.WebApp?.startParam;
const refCode = telegramStartParam || 
                urlParams.get('ref_code') || 
                urlParams.get('refCode') || 
                sessionStorage.getItem('referrer_code');
```

## ✅ Что это дает

1. **Telegram start_param имеет высший приоритет**
2. **Все старые способы продолжают работать**
3. **Никаких других изменений не требуется**

## 🚀 Внедрение

1. Открыть `client/src/App.tsx`
2. Найти строку 107
3. Добавить одну строку кода
4. Сохранить и задеплоить

## 🔒 Безопасность

- Если `start_param` нет - работает как раньше
- Если есть - используется в первую очередь
- Никаких рисков потери данных

## ⏱️ Время внедрения

**5 минут** включая деплой

## Вот и всё!

Никаких:
- ❌ Резервных копий
- ❌ Миграций данных
- ❌ Сложного тестирования
- ❌ Этапов развертывания
- ❌ Логирования
- ❌ Мониторинга

Просто одно изменение, которое решает задачу.