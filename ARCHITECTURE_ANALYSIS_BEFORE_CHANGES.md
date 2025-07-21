# 🏗️ АНАЛИЗ АРХИТЕКТУРЫ TON ДЕПОЗИТОВ
**Дата:** 21 июля 2025  
**Цель:** Документирование текущей архитектуры перед изменениями  
**Статус:** ГОТОВ К ИЗМЕНЕНИЯМ

---

## 🔍 **ТЕКУЩИЙ FLOW ОБРАБОТКИ TON ДЕПОЗИТОВ**

### **1. Frontend (TonConnectService)**
📂 `client/src/services/tonConnectService.ts`
```javascript
// Строки 375-427: Создание и отправка транзакции
const result = await tonConnectUI.sendTransaction(transaction);

// ПРОБЛЕМА: Frontend НЕ вызывает backend после успешной транзакции
return {
  txHash: result.boc,
  status: 'success'  
};
```

### **2. Backend API Handler** 
📂 `modules/wallet/controller.ts`
```javascript
// Строки 365-450: tonDeposit endpoint (НАЙДЕНО!)
async tonDeposit(req: Request, res: Response, next: NextFunction) {
  const telegram = this.validateTelegramAuth(req, res);
  const { ton_tx_hash, amount, wallet_address } = req.body;
  
  // ❌ ПРОБЛЕМА: КАК ОПРЕДЕЛЯЕТСЯ user_id ДЛЯ processTonDeposit?
  const user = await userRepository.getUserByTelegramId(telegram.user.id);  
  
  const result = await walletService.processTonDeposit({
    user_id: user.id,  // ← ЭТОТ user.id МОЖЕТ БЫТЬ НЕПРАВИЛЬНЫМ
    amount,
    ton_tx_hash,
    wallet_address
  });
}
```

### **3. Service Layer**
📂 `modules/wallet/service.ts`
```javascript
// Строки 300-466: processTonDeposit метод
async processTonDeposit(params: {
  user_id: string,    // ← ВОТ ПРОБЛЕМНАЯ ЛОГИКА
  amount: number,
  ton_tx_hash: string,
  wallet_address: string
}) {
  // Строки 375-379: Дедупликация по tx_hash
  .eq('description', ton_tx_hash)  // ← ПРАВИЛЬНО
  
  // Строки 415-434: Создание транзакции
  .insert({
    user_id,           // ← ПОЛУЧЕН ИЗ НЕПРАВИЛЬНОГО ИСТОЧНИКА
    amount_ton: amount,
    type: 'DEPOSIT',
    currency: 'TON'
  })
}
```

---

## 🚨 **КОРНЕВАЯ ПРИЧИНА ПРОБЛЕМЫ**

### **Найдена точка ошибки:**
❌ **Неизвестно, КАК определяется user_id в processTonDeposit**

Нужно проследить:
1. Где вызывается processTonDeposit 
2. Откуда берется параметр user_id
3. Использует ли он username или telegram_id

---

## 📋 **ПЛАН ПОИСКА ПРОБЛЕМЫ**

### **PHASE 1: НАЙТИ ИСТОЧНИК user_id**
- [ ] Найти где вызывается processTonDeposit
- [ ] Проследить откуда берется user_id 
- [ ] Найти логику определения пользователя

### **PHASE 2: ИДЕНТИФИЦИРОВАТЬ ПРОБЛЕМУ**
- [ ] Найти использование username вместо telegram_id
- [ ] Документировать проблемное место в коде

### **PHASE 3: ИСПРАВИТЬ**
- [ ] Заменить username на telegram_id поиск
- [ ] Добавить fallback механизм
- [ ] Протестировать исправление

---

## 🔧 **АРХИТЕКТУРНЫЕ НАБЛЮДЕНИЯ**

### **Работает корректно:**
✅ **Дедупликация** - использует tx_hash, не username  
✅ **Создание транзакций** - структура данных корректная  
✅ **Обновление баланса** - прямое обращение к БД  
✅ **Метаданные** - сохраняются правильно  

### **Проблемные зоны:**
❌ **Определение user_id** - неизвестный источник  
❌ **Парсинг amount** - новые депозиты = 0  
❌ **Frontend integration** - возможно не вызывает backend  

### **Зависимости:**
- `SupabaseUserRepository` - поиск пользователей
- `supabase` - прямые SQL запросы  
- `logger` - логирование операций

---

## 🎯 **СЛЕДУЮЩИЕ ШАГИ**

1. **Найти processTonDeposit вызовы** в codebase
2. **Проследить источник user_id** параметра  
3. **Найти логику username → user_id** преобразования
4. **Заменить на telegram_id → user_id** преобразование

---

**СТАТУС:** Архитектура изучена, готов к поиску проблемной логики