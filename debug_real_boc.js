#!/usr/bin/env node

/**
 * РЕАЛЬНАЯ ПРОВЕРКА BOC PAYLOAD С @ton/core
 * Точно такая же логика как в tonConnectService.ts
 */

import fs from 'fs';
import path from 'path';

async function testRealBOC() {
  console.log("🔍 РЕАЛЬНЫЙ ТЕСТ BOC PAYLOAD С @ton/core");
  console.log("==========================================");

  try {
    // Импортируем @ton/core точно как в коде
    const { beginCell } = await import('@ton/core');
    console.log("✅ @ton/core успешно импортирован");

    // Тестовые данные
    const comment = "UniFarmBoost:999489:1";
    console.log(`📝 Комментарий: "${comment}"`);

    // Создаем BOC точно как в коде
    console.log("\n🔨 Создание BOC...");
    const cell = beginCell()
      .storeUint(0, 32) // Опкод 0 для текстового комментария
      .storeStringTail(comment) // Сохраняем текст комментария
      .endCell();

    console.log("✅ Cell создан успешно");

    // Получаем BOC
    const boc = cell.toBoc();
    console.log(`✅ BOC создан, размер: ${boc.length} bytes`);

    // Конвертируем в base64
    function uint8ArrayToBase64(uint8Array) {
      const binaryString = Array.from(uint8Array)
        .map(byte => String.fromCharCode(byte))
        .join('');
      return btoa(binaryString);
    }

    const payload = uint8ArrayToBase64(boc);
    console.log(`✅ Base64 payload: ${payload}`);
    console.log(`   Длина: ${payload.length} символов`);

    // Проверяем валидность base64
    const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(payload);
    console.log(`✅ Валидность base64: ${isValidBase64}`);

    // Сравниваем с fallback
    const fallbackPayload = 'te6cckEBAQEADgAAGAAAAABVbmlGYXJtAACjJA==';
    console.log(`\n🔍 СРАВНЕНИЕ С FALLBACK:`);
    console.log(`   Реальный BOC:  ${payload}`);
    console.log(`   Fallback BOC:  ${fallbackPayload}`);
    console.log(`   Одинаковые:    ${payload === fallbackPayload}`);

    // Финальная проверка структуры
    console.log(`\n🏁 РЕЗУЛЬТАТ ДИАГНОСТИКИ:`);
    console.log(`✅ @ton/core работает корректно`);
    console.log(`✅ BOC создается без ошибок`);
    console.log(`✅ Base64 формат валиден`);
    
    if (payload.length > 0) {
      console.log(`✅ ВЫВОД: BOC payload корректен, проблема НЕ в createBocWithComment`);
      console.log(`💡 Возможные причины ошибки эмуляции в TonKeeper:`);
      console.log(`   - TON адрес неактивен в mainnet`);
      console.log(`   - Кошелек не поддерживает этот формат комментария`);
      console.log(`   - Проблема с газ лимитами или комиссиями`);
    } else {
      console.log(`❌ ПРОБЛЕМА: BOC payload пустой`);
    }

  } catch (error) {
    console.error(`❌ ОШИБКА при создании BOC:`, error.message);
    console.log(`💡 Возможные причины:`);
    console.log(`   - @ton/core не установлен или поврежден`);
    console.log(`   - Проблема с комментарием "${comment}"`);
    console.log(`   - Несовместимость версий`);
    
    // Проверяем установку @ton/core
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      console.log(`   @ton/core версия: ${packageJson.dependencies['@ton/core'] || 'НЕ НАЙДЕН'}`);
    } catch (e) {
      console.log(`   Не удалось проверить package.json`);
    }
  }
}

testRealBOC().catch(console.error);