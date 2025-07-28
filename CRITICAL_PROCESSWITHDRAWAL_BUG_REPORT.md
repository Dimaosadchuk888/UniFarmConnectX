# КРИТИЧЕСКАЯ ОШИБКА: processWithdrawal НЕ СПИСЫВАЕТ TON

**Дата**: 28 июля 2025  
**Проблема**: Финансовая уязвимость - пользователи получают TON Boost без списания средств  
**Пострадавший**: Пользователь 25 (@DimaOsadchuk) - 4 покупки по 1 TON без списания  

## НАЙДЕННАЯ ПРИЧИНА

В `modules/wallet/service.ts` методе `processWithdrawal()` строки 554-600:

**ЧТО ПРОИСХОДИТ СЕЙЧАС**:
1. Создается `withdraw_request` для TON (строки 572-575)
2. **НЕТ СПИСАНИЯ СРЕДСТВ С БАЛАНСА для TON!**
3. Создается транзакция 'withdrawal' (строки 619-630)
4. Возвращается `true` - "успешно"

**КОД ОШИБКИ** (строки 583-598):
```typescript
// Обновляем баланс через централизованный BalanceManager
const { balanceManager } = await import('../../core/BalanceManager');
const result = await balanceManager.subtractBalance(
  parseInt(userId),
  type === 'UNI' ? withdrawAmount : 0, // UNI списание
  type === 'TON' ? withdrawAmount : 0, // ❌ TON списание НЕ РАБОТАЕТ!
  `WalletService.processWithdrawal(${type})`
);
```

## ПРОБЛЕМА В BalanceManager

BalanceManager.subtractBalance() НЕ СПИСЫВАЕТ TON средства!
- Обрабатывает только UNI 
- TON остается нетронутым
- Но возвращает success=true

## ДОКАЗАТЕЛЬСТВА УЩЕРБА

**Пользователь 25**:
- Баланс: 1.301309 TON (должен быть -2.7 TON)
- 4 покупки BOOST_PURCHASE по 1 TON каждая
- 4 UNI бонуса по 10,000 каждый (незаслуженно)
- TON Boost активен (незаслуженно)

**Транзакции**:
- ID: 1379088 - BOOST_PURCHASE +1 TON (должно быть -1)
- ID: 1379082 - BOOST_PURCHASE +1 TON (должно быть -1)  
- ID: 1379067 - BOOST_PURCHASE +1 TON (должно быть -1)
- ID: 1379061 - BOOST_PURCHASE +1 TON (должно быть -1)

## ФИНАНСОВЫЙ УЩЕРБ

- **Прямые потери**: 4 TON (не списано)
- **UNI бонусы**: 40,000 UNI (незаслуженно)
- **TON Boost доходы**: Активны без оплаты
- **Масштаб**: Возможны массовые злоупотребления

## НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ

1. **БЛОКИРОВАТЬ** все TON Boost покупки
2. **ИСПРАВИТЬ** BalanceManager.subtractBalance()
3. **КОМПЕНСИРОВАТЬ** ущерб - списать 4 TON с User 25
4. **ПРОВЕРИТЬ** всех пользователей с TON Boost на легитимность
5. **УВЕДОМИТЬ** о временной недоступности TON Boost

## КРИТИЧНОСТЬ: МАКСИМАЛЬНАЯ

Система позволяет покупать TON Boost за "бесплатно" и получать доходы без оплаты.