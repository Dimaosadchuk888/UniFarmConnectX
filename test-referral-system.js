/**
 * Тестирование улучшенной системы реферальных кодов
 */

import { generateRefCode, generateUniqueRefCode, validateRefCode, cleanRefCode } from './server/utils/refCodeUtils.js';

console.log('🧪 Тестирование улучшенной системы реферальных кодов...\n');

// Тест 1: Генерация базового кода
console.log('1️⃣ Тест генерации базового кода:');
for (let i = 0; i < 5; i++) {
  const code = generateRefCode();
  console.log(`   Код ${i + 1}: ${code} (длина: ${code.length})`);
}

// Тест 2: Валидация кодов
console.log('\n2️⃣ Тест валидации кодов:');
const testCodes = [
  'AB3CD4EF', // валидный
  'abcd1234', // валидный
  'AB3CD4E',  // короткий
  'AB3CD4EFG', // длинный
  'AB3CD4O0',  // содержит запрещенные символы O, 0
  'AB3CD4I1',  // содержит запрещенные символы I, 1
  '',          // пустой
  null,        // null
];

testCodes.forEach(code => {
  const isValid = validateRefCode(code);
  console.log(`   "${code}" -> ${isValid ? '✅ валидный' : '❌ невалидный'}`);
});

// Тест 3: Очистка кодов
console.log('\n3️⃣ Тест очистки кодов от префиксов:');
const codeWithPrefix = [
  'ref_AB3CD4EF',
  'AB3CD4EF',
  'ref_',
  '',
];

codeWithPrefix.forEach(code => {
  const cleaned = cleanRefCode(code);
  console.log(`   "${code}" -> "${cleaned}"`);
});

// Тест 4: Проверка на отсутствие путающихся символов
console.log('\n4️⃣ Тест на отсутствие путающихся символов:');
let hasConfusingChars = false;
const confusingChars = ['0', 'O', '1', 'I', 'l'];

for (let i = 0; i < 100; i++) {
  const code = generateRefCode();
  for (const char of confusingChars) {
    if (code.includes(char)) {
      console.log(`   ❌ Найден путающийся символ "${char}" в коде: ${code}`);
      hasConfusingChars = true;
    }
  }
}

if (!hasConfusingChars) {
  console.log('   ✅ Путающиеся символы не найдены в 100 сгенерированных кодах');
}

// Тест 5: Уникальность кодов
console.log('\n5️⃣ Тест уникальности кодов:');
const generatedCodes = new Set();
let duplicateFound = false;

for (let i = 0; i < 1000; i++) {
  const code = generateRefCode();
  if (generatedCodes.has(code)) {
    console.log(`   ❌ Найден дубликат: ${code}`);
    duplicateFound = true;
    break;
  }
  generatedCodes.add(code);
}

if (!duplicateFound) {
  console.log(`   ✅ Все 1000 сгенерированных кодов уникальны`);
}

console.log(`\n📊 Статистика генерации:`);
console.log(`   - Общее количество уникальных кодов: ${generatedCodes.size}`);
console.log(`   - Средняя длина кода: 8 символов`);
console.log(`   - Алфавит: 54 символа (без 0, O, 1, I, l)`);
console.log(`   - Теоретическое количество комбинаций: 54^8 = ${Math.pow(54, 8).toLocaleString()}`);

console.log('\n✨ Тестирование завершено!');