# TON Connect Transaction Validation Analysis Report

## Задача
Проведение полной технической проверки логики приёма TON через TON Connect согласно техническому заданию по устранению предупреждений:
⚠️ «После подтверждения может произойти что угодно… Мы не смогли промоделировать транзакцию и не знаем, что произойдёт дальше.»

## Анализ текущей реализации

### 1. Формирование транзакции (sendTonTransaction)

**Файл:** `client/src/services/tonConnectService.ts` (строки 306-461)

#### ✅ Правильно реализовано:
- **amount в нанотонах**: Корректная конверсия `Math.round(tonAmount * 1000000000).toString()`
- **Тип данных amount**: Строка (правильно)
- **validUntil**: Корректно установлен (600 секунд = 10 минут)
- **address формат**: Используется user-friendly адрес из переменной окружения

#### ⚠️ Потенциальные проблемы:

**1.1 Адрес получателя**
```typescript
// Текущая реализация
export const TON_PROJECT_ADDRESS = 
  import.meta.env.VITE_TON_BOOST_RECEIVER_ADDRESS || 
  'UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8';
```
- **Проблема**: Адрес может быть неактивным или требовать stateInit
- **Рекомендация**: Проверить активность адреса в блокчейне

**1.2 BOC Payload потенциально некорректен**
```typescript
// Текущая реализация
const cell = beginCell()
  .storeUint(0, 32) // Опкод 0 для текстового комментария
  .storeStringTail(comment) // Сохраняем текст комментария
  .endCell();
```
- **Потенциальная проблема**: `storeStringTail()` может создавать некорректный BOC для длинных комментариев
- **Формат комментария**: `UniFarmBoost:${userId}:${boostId}` - может быть слишком длинным

### 2. BOC и Payload анализ

#### ✅ Правильно:
- Используется `beginCell()` из @ton/core
- Опкод 0 для текстового комментария
- Base64 сериализация через `uint8ArrayToBase64()`

#### ⚠️ Проблемы:
**2.1 Fallback BOC**
```typescript
const fallbackPayload = 'te6cckEBAQEADgAAGAAAAABVbmlGYXJtAACjJA==';
```
- **Проблема**: Хардкоженный BOC может быть некорректным
- **Риск**: Если основной BOC не создается, используется potentially invalid fallback

**2.2 Buffer полифилл**
```typescript
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = { // Custom polyfill
```
- **Проблема**: Кастомный полифилл может не полностью совместим с @ton/core

### 3. Параметры TonConnect

#### ✅ Версия актуальная:
- Используется `@tonconnect/ui-react`
- Импорты корректные

#### ⚠️ Структура транзакции:
```typescript
const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 600,
  messages: [
    {
      address: TON_PROJECT_ADDRESS,
      amount: nanoTonAmount,
      payload: payload
    }
  ]
};
```

**Потенциальные проблемы:**
- Отсутствует `bounce` флаг (может быть важно)
- Отсутствует `stateInit` (может потребоваться для неактивных адресов)

### 4. Адрес получателя проблемы

**4.1 Текущий адрес в манифесте:**
```json
{
  "url": "https://uni-farm-connect-aab49267.replit.app",
  // ...
}
```

**4.2 Проект адрес:**
`UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8`

**Проблемы:**
- Не проверяется активность адреса
- Не проверяется необходимость stateInit
- Не установлен bounce флаг

### 5. Формат структуры

#### ⚠️ Нестандартные элементы:
1. **Эмуляция транзакции**: Функция `emulateTonTransaction()` может мешать эмуляции кошелька
2. **Принудительный обход проверок**: `return true; // Всегда возвращаем true для тестирования` (строка 527)

## Критические находки

### 🚨 Проблема 1: Принудительное отключение проверок
```typescript
// По ТЗ временно отключаем проверку и принудительно возвращаем true
console.log('[DEBUG] ⚠️ ПРОВЕРКА isTonPaymentReady ОТКЛЮЧЕНА ПО ТЗ, ВОЗВРАЩАЕМ TRUE ДЛЯ ДИАГНОСТИКИ');
return true; // Всегда возвращаем true для тестирования sendTransaction
```
**Влияние**: Отправка транзакций даже при неготовом состоянии

### 🚨 Проблема 2: Некорректный BOC для длинных комментариев
Комментарий `UniFarmBoost:userId:boostId` может превышать лимиты для `storeStringTail()`

### 🚨 Проблема 3: Отсутствие bounce флага
```typescript
messages: [
  {
    address: TON_PROJECT_ADDRESS,
    amount: nanoTonAmount,
    payload: payload
    // Отсутствует: bounce: false/true
  }
]
```

### 🚨 Проблема 4: Неизвестный статус адреса получателя
Адрес `UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8` может быть:
- Неактивным (требует stateInit)
- Смарт-контрактом (требует specific bounce настройки)

## Рекомендации для устранения проблем эмуляции

### 1. Проверка и исправление bounce флага
```typescript
messages: [
  {
    address: TON_PROJECT_ADDRESS,
    amount: nanoTonAmount,
    payload: payload,
    bounce: false // Для обычных кошельков, true для смарт-контрактов
  }
]
```

### 2. Упрощение BOC payload
```typescript
// Использовать простой опкод без длинного текста
const cell = beginCell()
  .storeUint(0, 32)
  .storeStringTail("UniFarm") // Короткий комментарий
  .endCell();
```

### 3. Проверка активности адреса получателя
Добавить проверку через TonAPI перед отправкой транзакции

### 4. Восстановление проверок готовности
Убрать принудительный `return true` из `isTonPaymentReady()`

### 5. Стандартизация структуры транзакции
Убедиться что все поля соответствуют TON Connect Transaction Interface

## Следующие шаги

1. ❌ **НЕ ВНОСИТЬ ИЗМЕНЕНИЯ** до согласования
2. ✅ **Проверить адрес получателя** через TonAPI
3. ✅ **Протестировать BOC** с коротким комментарием
4. ✅ **Добавить bounce флаг** согласно типу адреса
5. ✅ **Восстановить проверки** после диагностики

## Ожидаемый результат

После исправления указанных проблем:
- Устранится предупреждение об эмуляции в Tonkeeper/Ton Space
- Транзакции будут проходить валидацию кошелька
- Пользователи смогут успешно пополнять баланс

---
**Дата анализа:** 20 июля 2025  
**Статус:** Готов к обсуждению исправлений