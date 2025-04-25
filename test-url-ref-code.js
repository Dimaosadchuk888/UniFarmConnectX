/**
 * Скрипт для тестирования извлечения реферального кода из URL
 */

// Эмулируем работу ReferralService.getRefCodeFromUrl()
function getRefCodeFromUrl(url) {
  try {
    // Создаем URL объект для парсинга
    const urlObject = new URL(url);
    
    // Проверяем наличие параметра startapp
    const startapp = urlObject.searchParams.get('startapp');
    
    console.log(`Извлечен параметр startapp из URL: ${startapp || 'не найден'}`);
    
    return startapp;
  } catch (error) {
    console.error('Ошибка при извлечении параметра startapp из URL:', error);
    return null;
  }
}

// Проверяем, является ли строка допустимым реферальным кодом
function isValidRefCode(code) {
  if (!code) return false;
  
  // Проверяем, что код состоит только из допустимых символов (буквы и цифры)
  // и имеет допустимую длину (от 6 до 16 символов)
  const isValid = /^[a-zA-Z0-9]{6,16}$/.test(code);
  
  console.log(`Проверка валидности реферального кода "${code}": ${isValid ? 'валидный' : 'невалидный'}`);
  
  return isValid;
}

// Тестовые URL для проверки
const testUrls = [
  'https://example.com/?startapp=QltFGzKh', // Валидный код
  'https://example.com/?startapp=ABC123', // Валидный код, минимальной длины
  'https://example.com/?startapp=ABCDEF1234567890', // Валидный код, максимальной длины
  'https://example.com/?startapp=ABC', // Невалидный код (слишком короткий)
  'https://example.com/?startapp=ABCDEF1234567890123', // Невалидный код (слишком длинный)
  'https://example.com/?startapp=ABC-123', // Невалидный код (запрещенные символы)
  'https://example.com/?startapp=', // Пустой код
  'https://example.com/', // Без параметра startapp
  'https://example.com/?ref=QltFGzKh', // Неправильный параметр
  'https://t.me/UniFarming_Bot/UniFarm?startapp=QltFGzKh', // Telegram Mini App с валидным кодом
];

// Запускаем тестирование
console.log('Начинаем тестирование извлечения реферальных кодов из URL...\n');

for (const url of testUrls) {
  console.log(`Тестируем URL: ${url}`);
  
  // Извлекаем код
  const refCode = getRefCodeFromUrl(url);
  
  // Проверяем валидность кода
  if (refCode) {
    const isValid = isValidRefCode(refCode);
    
    if (isValid) {
      console.log(`✅ Успешно: URL содержит валидный реферальный код: ${refCode}`);
    } else {
      console.log(`❌ Ошибка: URL содержит невалидный реферальный код: ${refCode}`);
    }
  } else {
    console.log('❌ Информация: URL не содержит реферального кода');
  }
  
  console.log('-'.repeat(50));
}

console.log('\nТестирование извлечения реферальных кодов завершено!')