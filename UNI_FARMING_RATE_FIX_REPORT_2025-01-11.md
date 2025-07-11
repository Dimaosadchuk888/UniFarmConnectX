# Отчет об исправлении отображения процентной ставки UNI фарминга
**Дата:** 11 января 2025  
**Модуль:** UNI Farming  
**Компонент:** UniFarmingCard.tsx

## Проблема
Визуальное отображение процентной ставки UNI фарминга показывало 0% вместо реальных значений (0.24% в день, 87.6% годовых).

## Корневая причина
Frontend компонент UniFarmingCard пытался читать несуществующие поля из API:
- `totalRatePerSecond` 
- `ratePerSecond`

В то время как API возвращает только:
- `uni_farming_rate` - процентная ставка в час (0.01%)

## Решение

### 1. Обновлен маппинг данных из API
```typescript
// Было:
const ratePerSecondStr = farmingInfo.totalRatePerSecond || farmingInfo.ratePerSecond;

// Стало:
const hourlyRate = farmingResponse?.data?.uni_farming_rate || 0.01;
```

### 2. Исправлена функция calculateDailyIncome
```typescript
// Теперь правильно рассчитывает дневной доход:
const dailyRatePercent = hourlyRate * 24; // процент за день
const dailyIncome = new BigNumber(depositAmount).multipliedBy(dailyRatePercent).dividedBy(100);
```

### 3. Исправлена функция calculateSecondRate
```typescript
// Правильно рассчитывает доход в секунду:
const secondIncome = new BigNumber(depositAmount).multipliedBy(hourlyRate).dividedBy(100).dividedBy(3600);
```

### 4. Исправлена функция calculateAPR
```typescript
// Динамический расчет на основе реальной ставки:
const DAILY_PERCENTAGE = hourlyRate * 24; // 0.24% в день для 0.01% в час
const ANNUAL_PERCENTAGE = DAILY_PERCENTAGE * 365; // 87.6% в год
```

### 5. Обновлены хардкод значения
Для неактивного состояния фарминга обновлены статические значения:
- Дневная доходность: 0.24% вместо 0.5%
- Годовая доходность: 87.6% вместо 182.5%

## Результат
✅ Правильное отображение процентной ставки фарминга  
✅ Корректный расчет дохода в секунду и в день  
✅ Точное отображение APR (87.6% годовых)  
✅ Соответствие отображаемых данных реальной бизнес-логике  

## Дополнительные проверки
API endpoints работают корректно:
- `/api/v2/auth/refresh` - возвращает 401 (не 404)
- `/api/v2/uni-farming/deposit` - возвращает ошибку авторизации (не 404)
- `/api/v2/wallet/connect-ton` - работает корректно

## Статус
✅ **ИСПРАВЛЕНО**