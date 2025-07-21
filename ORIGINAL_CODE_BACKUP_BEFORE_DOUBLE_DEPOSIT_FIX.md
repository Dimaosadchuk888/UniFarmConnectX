# 📋 ОРИГИНАЛЬНЫЙ КОД ПЕРЕД ИСПРАВЛЕНИЕМ ДУБЛИРОВАНИЯ

**Дата:** 21 июля 2025  
**Файл:** `modules/farming/service.ts`  
**Проблема:** Создание двойных транзакций при UNI депозите  
**Решение:** Убираем избыточное создание транзакции в FarmingService  

---

## ФИКСАЦИЯ ИЗМЕНЕНИЙ

### **УБИРАЕМ БЛОК КОДА (строки 322-436):**

```typescript
      // Создаем транзакцию напрямую с правильными полями для Supabase
      logger.info('[FarmingService] ЭТАП 9: Создание транзакции фарминга', {
        userId: user.id,
        depositAmount
      });
      
      // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
      console.log('[FARMING DEPOSIT] === НАЧАЛО СОЗДАНИЯ ТРАНЗАКЦИИ ===');
      console.log('[FARMING DEPOSIT] User ID:', user.id);
      console.log('[FARMING DEPOSIT] Deposit Amount:', depositAmount);
      console.log('[FARMING DEPOSIT] Timestamp:', new Date().toISOString());

      try {
        const transactionPayload = {
          user_id: user.id,
          type: 'FARMING_DEPOSIT',  // ИСПРАВЛЕНО: Используем новый тип для депозитов
          amount: depositAmount.toString(),  // ДОБАВЛЕНО: общее поле amount
          amount_uni: depositAmount.toString(),  // ИСПРАВЛЕНО: Положительная сумма для депозита
          amount_ton: '0',  // Правильное поле для TON
          currency: 'UNI',  // ДОБАВЛЕНО: поле currency
          status: 'completed',  // Используем completed для завершенных операций
          description: `UNI farming deposit: ${amount}`
        };

        logger.info('[FarmingService] ЭТАП 9.1: Подготовка payload транзакции', { 
          payload: transactionPayload,
          userId: user.id,
          depositAmount: depositAmount
        });
        
        console.log('[FARMING DEPOSIT] Transaction Payload:', JSON.stringify(transactionPayload, null, 2));

        const { data: transactionData, error: transactionError } = await supabase
          .from(FARMING_TABLES.TRANSACTIONS)
          .insert([transactionPayload])
          .select()
          .single();

        if (transactionError) {
          logger.error('[FarmingService] ЭТАП 9.2: Ошибка создания транзакции', { 
            error: transactionError.message,
            details: transactionError.details,
            code: transactionError.code,
            hint: transactionError.hint,
            payload: transactionPayload
          });
          
          // Выводим ошибку в консоль для отладки
          console.error('[TRANSACTION ERROR]', {
            message: transactionError.message,
            details: transactionError.details,
            code: transactionError.code,
            hint: transactionError.hint
          });
        } else {
          logger.info('[FarmingService] ЭТАП 9.3: Транзакция фарминга успешно создана', { 
            transactionId: transactionData?.id,
            type: transactionData?.type,
            amount: transactionData?.amount_uni
          });
          
          console.log('[TRANSACTION SUCCESS]', {
            id: transactionData?.id,
            type: transactionData?.type
          });
        }
        
      } catch (transactionError) {
        logger.error('[FarmingService] ЭТАП 9.4: Исключение при создании транзакции', { 
          error: transactionError instanceof Error ? transactionError.message : String(transactionError),
          stack: transactionError instanceof Error ? transactionError.stack : undefined,
          userId: user.id
        });
        console.error('[TRANSACTION EXCEPTION]', transactionError);
        throw transactionError;
      }

      // Создаём запись в farming_sessions после успешного депозита
      logger.info('[FarmingService] ЭТАП 10: Создание записи в farming_sessions', {
        userId: user.id,
        depositAmount
      });

      try {
        const farmingSessionPayload = {
          user_id: user.id,
          session_type: 'UNI_FARMING',
          deposit_amount: depositAmount,
          farming_rate: parseFloat(FARMING_CONFIG.DEFAULT_RATE.toString()),
          session_start: new Date().toISOString(),
          currency: 'UNI',
          status: 'active',
          created_at: new Date().toISOString()
        };

        const { data: sessionData, error: sessionError } = await supabase
          .from('farming_sessions')
          .insert([farmingSessionPayload])
          .select()
          .single();

        if (sessionError) {
          logger.error('[FarmingService] Ошибка создания farming_sessions', {
            error: sessionError.message,
            details: sessionError.details,
            payload: farmingSessionPayload
          });
        } else {
          logger.info('[FarmingService] Запись farming_sessions успешно создана', {
            sessionId: sessionData?.id,
            userId: sessionData?.user_id,
            depositAmount: sessionData?.deposit_amount
          });
        }
      } catch (sessionError) {
        logger.error('[FarmingService] Исключение создания farming_sessions', {
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
          userId: user.id
        });
      }
```

### **ОСТАВЛЯЕМ ПОСЛЕ ИСПРАВЛЕНИЯ:**

```typescript
      logger.info('[FarmingService] ЭТАП 7: Депозит выполнен успешно', {
        userId: user.id,
        balanceBeforeDeposit: currentBalance,
        balanceAfterDeposit: newBalance,
        depositAmount,
        newDepositAmount,
        updateSuccess: true
      });

      // Транзакция будет создана в UniFarmingRepository.addDeposit()
      // Убираем дублирующую логику создания транзакций

      return { success: true, message: 'Депозит успешно добавлен в фарминг' };
```

### **ПРИЧИНА ИЗМЕНЕНИЯ:**
UniFarmingRepository.addDeposit() уже создает транзакцию, поэтому создание второй транзакции в FarmingService вызывает дублирование.

### **ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:**
1 депозит = 1 транзакция (вместо 2)