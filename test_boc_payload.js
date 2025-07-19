#!/usr/bin/env node

/**
 * ТЕСТ BOC PAYLOAD БЕЗ ИЗМЕНЕНИЯ КОДА
 * Проверяем корректность формирования BOC payload для TON транзакций
 */

console.log("🔍 ТЕСТ BOC PAYLOAD GENERATION");
console.log("=====================================");

// Симулируем данные как в реальном коде
const testData = {
  userId: "999489", // Реальный telegram_id
  boostId: "1",
  tonAmount: 1.0,
  address: "UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8"
};

// 1. Проверяем rawPayload
const rawPayload = `UniFarmBoost:${testData.userId}:${testData.boostId}`;
console.log(`✅ Raw Payload: "${rawPayload}"`);
console.log(`   Длина: ${rawPayload.length} символов`);

// 2. Проверяем nanoTON conversion
const nanoTonAmount = Math.round(testData.tonAmount * 1000000000).toString();
console.log(`✅ TON Amount: ${testData.tonAmount} TON`);
console.log(`   NanoTON: ${nanoTonAmount} (${nanoTonAmount.length} цифр)`);

// 3. Проверяем TON адрес
const addressRegex = /^(EQ|UQ)[A-Za-z0-9_-]{46}$/;
console.log(`✅ TON Address: ${testData.address}`);
console.log(`   Формат валиден: ${addressRegex.test(testData.address)}`);
console.log(`   Длина: ${testData.address.length} символов`);

// 4. Симулируем BOC создание (без реального @ton/core)
console.log("\n🔍 ПРОВЕРКА BOC PAYLOAD:");
console.log("=====================================");

// Проверяем fallback BOC
const fallbackBOC = 'te6cckEBAQEADgAAGAAAAABVbmlGYXJtAACjJA==';
console.log(`✅ Fallback BOC: ${fallbackBOC}`);
console.log(`   Длина: ${fallbackBOC.length} символов`);
console.log(`   Base64 валиден: ${/^[A-Za-z0-9+/]*={0,2}$/.test(fallbackBOC)}`);

// 5. Проверяем структуру транзакции
const validUntil = Math.floor(Date.now() / 1000) + 600;
const transaction = {
  validUntil: validUntil,
  messages: [
    {
      address: testData.address,
      amount: nanoTonAmount,
      payload: fallbackBOC
    }
  ]
};

console.log("\n🔍 СТРУКТУРА ТРАНЗАКЦИИ:");
console.log("=====================================");
console.log(`✅ ValidUntil: ${validUntil} (через ${Math.floor((validUntil - Date.now()/1000)/60)} минут)`);
console.log(`✅ Messages count: ${transaction.messages.length}`);
console.log(`✅ Message structure:`);
console.log(`   - Address: ${transaction.messages[0].address}`);
console.log(`   - Amount: ${transaction.messages[0].amount} nanoTON`);
console.log(`   - Payload length: ${transaction.messages[0].payload.length}`);

// 6. Возможные проблемы
console.log("\n⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ:");
console.log("=====================================");

const issues = [];

if (rawPayload.length > 50) {
  issues.push("❌ RawPayload слишком длинный для BOC");
}

if (nanoTonAmount.length > 15) {
  issues.push("❌ NanoTON сумма слишком большая");
}

if (!testData.address.startsWith('UQ') && !testData.address.startsWith('EQ')) {
  issues.push("❌ TON адрес неправильного формата");
}

if (fallbackBOC.length < 10) {
  issues.push("❌ BOC payload слишком короткий");
}

if (issues.length === 0) {
  console.log("✅ Структурных проблем не найдено");
  console.log("\n💡 РЕКОМЕНДАЦИИ:");
  console.log("- Проверьте реальное создание BOC с @ton/core");
  console.log("- Убедитесь что TON адрес активен в mainnet");
  console.log("- Проверьте что кошелек поддерживает этот формат BOC");
} else {
  issues.forEach(issue => console.log(issue));
}

console.log("\n🏁 ТЕСТ ЗАВЕРШЕН");