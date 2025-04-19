/**
 * simplePayloadService.ts
 * Простая реализация создания payload для TON транзакций 
 * без зависимости от библиотек, требующих Buffer
 */

/**
 * Конвертирует строку в UTF-8 байты (Uint8Array)
 * @param str Исходная строка
 * @returns Uint8Array с UTF-8 представлением строки
 */
function stringToUtf8Bytes(str: string): Uint8Array {
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 
                0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 
                0x80 | ((charcode >> 6) & 0x3f), 
                0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10)
                | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 
                0x80 | ((charcode >> 12) & 0x3f), 
                0x80 | ((charcode >> 6) & 0x3f), 
                0x80 | (charcode & 0x3f));
    }
  }
  return new Uint8Array(utf8);
}

/**
 * Преобразует Uint8Array в base64 строку
 * @param bytes Массив байтов
 * @returns Base64 строка
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  try {
    const binaryString = Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join('');
    return btoa(binaryString);
  } catch (error) {
    console.error('Ошибка при преобразовании Uint8Array в base64:', error);
    
    // Альтернативный способ
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

/**
 * Создает простой base64-payload из текста комментария
 * Это НЕ BOC формат, но может использоваться для тестирования
 * 
 * @param comment Комментарий для транзакции
 * @returns Base64-encoded строка с комментарием
 */
export function createSimpleBase64Payload(comment: string): string {
  try {
    // Просто кодируем текст комментария в base64
    return btoa(comment);
  } catch (error) {
    console.error('Ошибка при кодировании комментария в base64:', error);
    return '';
  }
}

/**
 * Создает простой payload в формате TextCell (аналог TL-B ячейки с текстом)
 * Это НЕ полный формат BOC, но содержит маркер ячейки с комментарием
 * 
 * @param comment Комментарий для транзакции
 * @returns Base64 payload или пустую строку в случае ошибки
 */
export function createSimpleTextCellPayload(comment: string): string {
  try {
    console.log('Создаем упрощенный TextCell payload с комментарием:', comment);
    
    // Создаем префикс для ячейки (0 = обычный текст, 4 байта)
    const prefix = new Uint8Array([0, 0, 0, 0]);
    
    // Преобразуем комментарий в UTF-8 байты
    const commentBytes = stringToUtf8Bytes(comment);
    
    // Соединяем префикс и комментарий
    const payload = new Uint8Array(prefix.length + commentBytes.length);
    payload.set(prefix);
    payload.set(commentBytes, prefix.length);
    
    // Преобразуем в base64
    const base64Result = uint8ArrayToBase64(payload);
    console.log('Payload создан, длина:', base64Result.length);
    
    return base64Result;
  } catch (error) {
    console.error('Ошибка при создании упрощенного payload:', error);
    return createSimpleBase64Payload(comment); // fallback
  }
}