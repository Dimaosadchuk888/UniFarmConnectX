# 🚨 ИСТОЧНИК ДУБЛИРОВАНИЯ НАЙДЕН! КРИТИЧЕСКАЯ ОШИБКА

**Дата:** 24 июля 2025 18:15 MSK  
**Статус:** 🔍 КОРНЕВАЯ ПРИЧИНА ОБНАРУЖЕНА  
**Проблема:** Система создает две различные транзакции с разными метаданными  

---

## 📋 КРИТИЧЕСКОЕ ОБНАРУЖЕНИЕ

### **НАЙДЕНА ОШИБКА В ДВУХ МЕСТАХ ОДНОВРЕМЕННО!**

#### **МЕСТО 1: modules/wallet/service.ts (строки 400-406)**
```typescript
metadata: {
  source: 'ton_deposit',
  original_type: 'TON_DEPOSIT',
  wallet_address,
  tx_hash: ton_tx_hash  // ❌ НЕПРАВИЛЬНОЕ ПОЛЕ!
}
```

#### **МЕСТО 2: core/TransactionService.ts (строка 118)**
```typescript
tx_hash_unique: metadata?.ton_tx_hash || null, // ✅ ИСПРАВЛЕНО НА ton_tx_hash
```

---

## 🎯 **ПРОБЛЕМА В НЕСООТВЕТСТВИИ ПОЛЕЙ**

### **Что происходит**:
1. **WalletService отправляет**: `metadata.tx_hash = "te6cckECBAEAAL0..."`
2. **TransactionService ищет**: `metadata.ton_tx_hash` 
3. **Результат**: `tx_hash_unique = null` (поле не найдено!)
4. **Дедупликация НЕ РАБОТАЕТ** = создаются дубликаты

### **Техническая цепочка дублирования**:
```
Frontend вызывает API →
metadata = { tx_hash: "hash123" } →
TransactionService ищет metadata.ton_tx_hash →
НЕ НАХОДИТ! →
tx_hash_unique = null →
Unique constraint НЕ СРАБАТЫВАЕТ →
Создается дубликат транзакции →
+2 TON вместо +1 TON
```

---

## 🔍 **ДВОЙНАЯ ОШИБКА ОБНАРУЖЕНА**

### **Ошибка #1: В WalletService (modules/wallet/service.ts:404)**
```typescript
// ❌ НЕПРАВИЛЬНО:
tx_hash: ton_tx_hash

// ✅ ДОЛЖНО БЫТЬ:
ton_tx_hash: ton_tx_hash
```

### **Ошибка #2: Я исправил только TransactionService**
- Исправил `metadata?.tx_hash` → `metadata?.ton_tx_hash` 
- НО НЕ ИСПРАВИЛ источник проблемы в WalletService!
- Поэтому дедупликация по-прежнему не работает!

---

## 📊 **ПОЛНАЯ СХЕМА ПРОБЛЕМЫ**

### **Frontend (tonConnectService.ts)**:
```typescript
await correctApiRequest('/api/v2/wallet/ton-deposit', 'POST', {
  ton_tx_hash: result.boc,  // ✅ Правильно
  amount: tonAmount,
  wallet_address: address
});
```

### **Backend получает и ПЕРЕМАТЫВАЕТ в WalletService**:
```typescript
// WalletService создает metadata с НЕПРАВИЛЬНЫМ полем:
metadata: {
  tx_hash: ton_tx_hash  // ❌ Должно быть ton_tx_hash!
}
```

### **TransactionService пытается найти**:
```typescript
tx_hash_unique: metadata?.ton_tx_hash || null  // НЕ НАХОДИТ!
```

---

## ⚡ **КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ ТРЕБУЕТСЯ**

### **Нужно исправить в modules/wallet/service.ts строка 404**:
```typescript
// БЫЛО:
tx_hash: ton_tx_hash

// ИСПРАВИТЬ НА:
ton_tx_hash: ton_tx_hash
```

---

## 🎯 **СТАТУС**

**✅ ПРОБЛЕМА ДИАГНОСТИРОВАНА**: Несоответствие полей metadata  
**⏳ ТРЕБУЕТ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ**: Одна строка кода  
**🚨 КРИТИЧНО**: Каждый новый депозит создает дубликат  

---

**ВЫВОД: Redeploy не помог, потому что источник проблемы не был исправлен в WalletService!**