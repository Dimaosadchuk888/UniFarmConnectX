# План безопасного внедрения Telegram start_param в UniFarm

## 📅 Дата создания: 12 января 2025

## 🎯 Цель
Интегрировать официальный Telegram start_param без нарушения работы существующей реферальной системы

## 📊 Результаты исследования

### 1. Текущая архитектура реферальной системы

**Точки входа реферальных кодов:**
1. **Frontend (App.tsx):**
   - URL параметры: `ref_code`, `refCode`
   - sessionStorage: `referrer_code`
   - Передача на backend: поле `ref_by`

2. **Backend (auth/service.ts):**
   - Получение `ref_by` из тела запроса
   - Сохранение в БД: поле `referred_by`

3. **Хранилища:**
   - sessionStorage: `referrer_code`
   - localStorage: НЕ используется для реферальных кодов

### 2. Компоненты, затрагиваемые изменениями

**Frontend:**
- `client/src/App.tsx` - основная логика авторизации
- `client/src/lib/utils.ts` - функция getReferrerIdFromUrl() (готова, но не используется)
- `client/src/services/referralService.ts` - сервис работы с реферальными кодами
- `client/src/utils/referralUtils.ts` - генерация ссылок

**Backend:**
- `modules/auth/controller.ts` - обработка авторизации
- `modules/auth/service.ts` - сохранение реферальной связи
- `modules/referral/service.ts` - обработка реферальных связей

**База данных:**
- Таблица `users`, поле `referred_by` - хранение ID пригласившего

### 3. Форматы реферальных кодов

**Поддерживаемые форматы:**
- `REF_1234567890_abc123` - основной формат
- `userXXX` - legacy формат для start параметра
- Любая строка 6-12 символов A-Z0-9

### 4. Критические зависимости

1. **Генерация реферальных ссылок:**
   ```typescript
   https://t.me/UniFarmBot/unifarm?startapp=REF_123456
   ```

2. **Проверка циклов:**
   - Пользователь не может использовать свой код
   - Нет циклических реферальных связей

3. **Начисление комиссий:**
   - 20-уровневая система (100% на L1, 2-20% на L2-L20)
   - Комиссии от farming и boost доходов

## 🔧 План внедрения start_param

### Этап 1: Подготовка (без изменения функциональности)

**1.1 Создание резервных копий:**
```bash
# Создаем backup ветку
git checkout -b backup/before-start-param
git add .
git commit -m "Backup before start_param implementation"
```

**1.2 Добавление логирования:**
- Добавить детальное логирование в App.tsx
- Логировать все источники реферальных кодов
- Логировать наличие start_param в Telegram WebApp

### Этап 2: Безопасная интеграция

**2.1 Обновление App.tsx с обратной совместимостью:**
```typescript
// Строка 107, заменяем:
const refCode = urlParams.get('ref_code') || urlParams.get('refCode') || 
               sessionStorage.getItem('referrer_code');

// На:
import { getReferrerIdFromUrl } from './lib/utils';

// Приоритет источников:
// 1. Telegram start_param (если есть)
// 2. URL параметры (текущая логика)
// 3. sessionStorage (fallback)
const telegramRefCode = getReferrerIdFromUrl();
const urlRefCode = urlParams.get('ref_code') || urlParams.get('refCode');
const savedRefCode = sessionStorage.getItem('referrer_code');

// Выбираем с приоритетом
const refCode = telegramRefCode || urlRefCode || savedRefCode;

// Логируем источник для отладки
console.log('[App] Referral code sources:', {
  telegram: telegramRefCode,
  url: urlRefCode,
  saved: savedRefCode,
  selected: refCode,
  source: telegramRefCode ? 'telegram' : (urlRefCode ? 'url' : 'saved')
});
```

**2.2 Обновление хранения в sessionStorage:**
```typescript
// Сохраняем с метаданными
if (refCode) {
  sessionStorage.setItem('referrer_code', refCode);
  sessionStorage.setItem('referrer_source', 
    telegramRefCode ? 'telegram' : 'url'
  );
}
```

### Этап 3: Тестирование без развертывания

**3.1 Создание тестовых сценариев:**
```typescript
// test-start-param.html
const testScenarios = [
  {
    name: "Telegram start_param",
    setup: () => {
      window.Telegram = {
        WebApp: {
          startParam: "REF_123456_test",
          initData: "..."
        }
      };
    }
  },
  {
    name: "URL ref_code",
    setup: () => {
      window.history.pushState({}, '', '?ref_code=REF_789012_test');
    }
  },
  {
    name: "Combined sources",
    setup: () => {
      window.Telegram.WebApp.startParam = "REF_111_telegram";
      window.history.pushState({}, '', '?ref_code=REF_222_url');
    }
  }
];
```

### Этап 4: Миграция данных (если требуется)

**4.1 Анализ существующих реферальных связей:**
```sql
-- Проверка форматов реферальных кодов
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN ref_code LIKE 'REF_%' THEN 1 END) as standard_format,
  COUNT(CASE WHEN ref_code LIKE 'user%' THEN 1 END) as legacy_format
FROM users
WHERE ref_code IS NOT NULL;
```

### Этап 5: Развертывание

**5.1 Поэтапное развертывание:**
1. Deploy с логированием (без изменения логики)
2. Мониторинг логов 24 часа
3. Deploy с новой логикой приоритетов
4. A/B тестирование (если возможно)

### Этап 6: Очистка

**6.1 Удаление устаревшего кода:**
- НЕ удалять поддержку URL параметров (обратная совместимость)
- Можно удалить дублирующие функции генерации кодов
- Оставить все форматы для поддержки старых ссылок

## ⚠️ Риски и их минимизация

### Риск 1: Потеря реферальных связей
**Минимизация:** 
- Сохраняем ВСЕ источники (не удаляем старую логику)
- Добавляем fallback на каждом уровне

### Риск 2: Конфликт источников
**Минимизация:**
- Четкий приоритет: Telegram > URL > Storage
- Логирование источника для каждого кода

### Риск 3: Несовместимость форматов
**Минимизация:**
- getReferrerIdFromUrl() уже поддерживает все форматы
- Валидация на backend остается без изменений

## 📋 Чек-лист готовности

- [ ] Резервные копии созданы
- [ ] Логирование добавлено
- [ ] Тесты написаны
- [ ] План отката подготовлен
- [ ] Мониторинг настроен
- [ ] Документация обновлена

## 🎯 Итоговый результат

После внедрения система будет:
1. **Приоритетно** использовать официальный Telegram start_param
2. **Сохранять** поддержку всех текущих способов передачи реферальных кодов
3. **Логировать** источник каждого реферального кода
4. **Работать** без изменений для существующих пользователей

## 🔄 План отката

В случае проблем:
```bash
# Быстрый откат
git checkout backup/before-start-param -- client/src/App.tsx
npm run build
# Deploy
```

Время отката: < 5 минут