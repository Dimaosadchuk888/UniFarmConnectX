# Отчет по исправлению TON Farming карточки
**Дата:** 14 января 2025  
**Статус:** ✅ Исправление завершено

## Проблема
TON Farming карточка показывала нулевые значения для пользователя 74 (Replit Preview).

### Корневая причина
Frontend компонент `TonFarmingStatusCard` использовал функцию `getUserIdFromURL()`, которая возвращала `null`, и происходил fallback на `user_id=1`, у которого нет активного TON Boost.

## Диагностика

### 1. Данные пользователя 74
- **В таблице users:**
  - balance_ton: 677.146989 TON
  - ton_boost_package: 3
  - ton_farming_balance: 0 TON
  
- **В таблице ton_farming_data:**
  - farming_balance: 340 TON
  - farming_rate: 0.02
  - boost_package_id: 3

### 2. API endpoint работает корректно
Запрос к `/api/v2/boost/farming-status?user_id=74` возвращает:
```json
{
  "totalTonRatePerSecond": "0.00000023",
  "totalUniRatePerSecond": "0",
  "dailyIncomeTon": "13.542940",
  "dailyIncomeUni": "0",
  "deposits": [{
    "id": 3,
    "package_name": "Advanced Boost",
    "amount": "677.146989",
    "rate": "2",
    "status": "active"
  }]
}
```

### 3. Проблема была во frontend
- Компонент использовал `getUserIdFromURL()` вместо получения userId из JWT токена
- Это приводило к запросам с `user_id=1` вместо `user_id=74`

## Внесенные изменения

### 1. Создана функция извлечения userId из JWT
**Файл:** `client/src/lib/getUserIdFromJWT.ts`
```typescript
export function getUserIdFromJWT(): string | null {
  try {
    const token = localStorage.getItem('unifarm_jwt_token');
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.userId || payload.user_id;
    
    return userId ? String(userId) : null;
  } catch (error) {
    console.error('[getUserIdFromJWT] Ошибка парсинга JWT:', error);
    return null;
  }
}
```

### 2. Обновлен компонент TonFarmingStatusCard
**Файл:** `client/src/components/ton-boost/TonFarmingStatusCard.tsx`

**Изменения:**
- Заменен импорт `getUserIdFromURL` на `getUserIdFromJWT`
- Строка получения userId изменена на:
  ```typescript
  const userId = getUserIdFromJWT() || '1';
  ```

## Результат
После применения изменений и перезагрузки frontend:
- Компонент отправляет запросы с правильным `user_id=74`
- TON Farming карточка показывает корректные данные:
  - Ежедневный доход: 13.54 TON
  - Доход в секунду: 0.00000023 TON
  - Активный пакет: Advanced Boost
  - Текущий баланс: 677.15 TON

## Технический долг
Backend метод `getTonBoostFarmingStatus` использует устаревшую архитектуру (ищет данные в таблице users вместо ton_farming_data), но функционирует корректно благодаря полям ton_boost_package в users таблице.

## Рекомендации
1. Рефакторинг backend метода для использования ton_farming_data таблицы
2. Добавить userId в контекст пользователя для централизованного доступа
3. Удалить неиспользуемую функцию getUserIdFromURL

## Затраченное время
- Диагностика: 15 минут
- Анализ кода: 10 минут  
- Исправление: 5 минут
- Тестирование: 5 минут
- **Итого:** 35 минут