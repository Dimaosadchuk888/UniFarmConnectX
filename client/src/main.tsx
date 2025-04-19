import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Определяем глобальный Buffer для использования в TON SDK
// Добавим комплексный полифилл для Buffer, чтобы его можно было использовать в TON SDK

/**
 * Расширенный полифилл для Buffer, имитирующий часть функциональности Node.js Buffer
 */
class BufferPolyfill {
  private bytes: Uint8Array;
  
  // Конструктор Buffer 
  constructor(arg: number | number[] | string | Uint8Array | ArrayBuffer, encodingOrOffset?: string | number, length?: number) {
    if (typeof arg === 'number') {
      // Создаем буфер заданного размера
      this.bytes = new Uint8Array(arg);
    } else if (Array.isArray(arg)) {
      // Создаем буфер из массива чисел
      this.bytes = new Uint8Array(arg);
    } else if (arg instanceof Uint8Array) {
      // Используем существующий Uint8Array
      this.bytes = arg;
    } else if (arg instanceof ArrayBuffer) {
      // Создаем из ArrayBuffer
      this.bytes = new Uint8Array(arg);
    } else if (typeof arg === 'string') {
      // Кодируем строку в буфер
      const encoding = encodingOrOffset as string || 'utf-8';
      if (encoding === 'utf-8' || encoding === 'utf8') {
        // Преобразуем строку в UTF-8 байты
        const utf8: number[] = [];
        for (let i = 0; i < arg.length; i++) {
          let charcode = arg.charCodeAt(i);
          if (charcode < 0x80) utf8.push(charcode);
          else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
          }
          else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
          }
          else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (arg.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18), 
                      0x80 | ((charcode>>12) & 0x3f), 
                      0x80 | ((charcode>>6) & 0x3f), 
                      0x80 | (charcode & 0x3f));
          }
        }
        this.bytes = new Uint8Array(utf8);
      } else if (encoding === 'hex') {
        // Парсинг hex строки
        if (arg.length % 2 !== 0) {
          throw new Error('Invalid hex string');
        }
        this.bytes = new Uint8Array(arg.length / 2);
        for (let i = 0; i < arg.length; i += 2) {
          this.bytes[i / 2] = parseInt(arg.substring(i, i + 2), 16);
        }
      } else if (encoding === 'base64') {
        // Base64 декодирование
        try {
          const binary_string = window.atob(arg);
          this.bytes = new Uint8Array(binary_string.length);
          for (let i = 0; i < binary_string.length; i++) {
            this.bytes[i] = binary_string.charCodeAt(i);
          }
        } catch (e) {
          throw new Error('Invalid base64 string');
        }
      } else {
        // По умолчанию UTF-8
        const encoder = new TextEncoder();
        this.bytes = encoder.encode(arg);
      }
    } else {
      throw new Error('Invalid buffer input');
    }

    // Устанавливаем свойство length для совместимости
    Object.defineProperty(this, 'length', {
      get: function() { return this.bytes.length; }
    });
  }

  // Прокси методы для доступа к байтам, как к массиву
  [index: number]: number;

  // Статические методы
  static from(data: string | number[] | ArrayBuffer | Uint8Array, encodingOrOffset?: string | number, length?: number): BufferPolyfill {
    return new BufferPolyfill(data, encodingOrOffset, length);
  }
  
  static alloc(size: number, fill?: number | string | BufferPolyfill, encoding?: string): BufferPolyfill {
    const buffer = new BufferPolyfill(size);
    if (fill !== undefined) {
      if (typeof fill === 'number') {
        buffer.fill(fill);
      } else if (typeof fill === 'string') {
        buffer.fill(fill, encoding);
      } else {
        buffer.fill(fill);
      }
    }
    return buffer;
  }
  
  static allocUnsafe(size: number): BufferPolyfill {
    return new BufferPolyfill(size);
  }
  
  static concat(list: BufferPolyfill[], totalLength?: number): BufferPolyfill {
    if (totalLength === undefined) {
      totalLength = list.reduce((acc, buf) => acc + buf.length, 0);
    }
    
    const result = BufferPolyfill.alloc(totalLength);
    let offset = 0;
    for (const buf of list) {
      const len = Math.min(buf.length, totalLength - offset);
      for (let i = 0; i < len; i++) {
        result[offset + i] = buf[i];
      }
      offset += len;
    }
    
    return result;
  }
  
  // Методы экземпляра
  toString(encoding?: string, start?: number, end?: number): string {
    const slice = this.slice(start || 0, end === undefined ? this.length : end);
    
    if (!encoding || encoding === 'utf8' || encoding === 'utf-8') {
      return new TextDecoder().decode(slice.bytes);
    } else if (encoding === 'hex') {
      let result = '';
      for (let i = 0; i < slice.length; i++) {
        result += slice[i].toString(16).padStart(2, '0');
      }
      return result;
    } else if (encoding === 'base64') {
      const binary = Array.from(slice.bytes)
        .map(byte => String.fromCharCode(byte))
        .join('');
      return btoa(binary);
    } else {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }
  
  slice(start?: number, end?: number): BufferPolyfill {
    start = start || 0;
    end = end === undefined ? this.length : end;
    return new BufferPolyfill(this.bytes.slice(start, end));
  }
  
  copy(target: BufferPolyfill, targetStart?: number, sourceStart?: number, sourceEnd?: number): number {
    targetStart = targetStart || 0;
    sourceStart = sourceStart || 0;
    sourceEnd = sourceEnd === undefined ? this.length : sourceEnd;
    
    const bytesCopied = Math.min(
      sourceEnd - sourceStart,
      target.length - targetStart,
      this.length - sourceStart
    );
    
    for (let i = 0; i < bytesCopied; i++) {
      target[targetStart + i] = this[sourceStart + i];
    }
    
    return bytesCopied;
  }
  
  fill(value: number | string | BufferPolyfill, offset?: number, end?: number, encoding?: string): this {
    offset = offset || 0;
    end = end === undefined ? this.length : end;
    
    if (typeof value === 'number') {
      for (let i = offset; i < end; i++) {
        this.bytes[i] = value & 0xFF;
      }
    } else if (typeof value === 'string') {
      const fillBuf = new BufferPolyfill(value, encoding || 'utf8');
      const fillLen = fillBuf.length;
      if (fillLen === 0) {
        throw new Error('Cannot fill with empty string');
      }
      
      let fillOffset = 0;
      for (let i = offset; i < end; i++) {
        this.bytes[i] = fillBuf.bytes[fillOffset++ % fillLen];
      }
    } else {
      // value is a BufferPolyfill
      const fillLen = value.length;
      if (fillLen === 0) {
        throw new Error('Cannot fill with empty buffer');
      }
      
      let fillOffset = 0;
      for (let i = offset; i < end; i++) {
        this.bytes[i] = value.bytes[fillOffset++ % fillLen];
      }
    }
    
    return this;
  }
  
  write(string: string, offset?: number, length?: number, encoding?: string): number {
    offset = offset || 0;
    const buf = new BufferPolyfill(string, encoding || 'utf8');
    length = length === undefined ? this.length - offset : length;
    
    const bytesWritten = Math.min(length, buf.length);
    for (let i = 0; i < bytesWritten; i++) {
      this.bytes[offset + i] = buf.bytes[i];
    }
    
    return bytesWritten;
  }
  
  writeUInt8(value: number, offset: number): number {
    this.bytes[offset] = value & 0xFF;
    return offset + 1;
  }
  
  // Прокси для индексного доступа
  // Этот метод вызывается при использовании индексов buffer[0], buffer[1] и т.д.
  get(index: number): number {
    return this.bytes[index];
  }
  
  set(index: number, value: number): void {
    this.bytes[index] = value;
  }
  
  readUInt8(offset: number): number {
    return this.bytes[offset];
  }
  
  readUInt16BE(offset: number): number {
    return (this.bytes[offset] << 8) | this.bytes[offset + 1];
  }
  
  readUInt32BE(offset: number): number {
    return (this.bytes[offset] << 24) |
           (this.bytes[offset + 1] << 16) |
           (this.bytes[offset + 2] << 8) |
           this.bytes[offset + 3];
  }
  
  writeUInt16BE(value: number, offset: number): number {
    this.bytes[offset] = (value >> 8) & 0xFF;
    this.bytes[offset + 1] = value & 0xFF;
    return offset + 2;
  }
  
  writeUInt32BE(value: number, offset: number): number {
    this.bytes[offset] = (value >> 24) & 0xFF;
    this.bytes[offset + 1] = (value >> 16) & 0xFF;
    this.bytes[offset + 2] = (value >> 8) & 0xFF;
    this.bytes[offset + 3] = value & 0xFF;
    return offset + 4;
  }
  
  // Преобразование в Uint8Array (для внутреннего использования и совместимости)
  toUint8Array(): Uint8Array {
    return this.bytes;
  }
}

// Создаем Proxy для имитации индексного доступа
const BufferHandler = {
  get(target: any, prop: string | number | symbol) {
    // Если prop - число или строковое представление числа
    if (typeof prop === 'number' || (typeof prop === 'string' && !isNaN(parseInt(prop)))) {
      const index = typeof prop === 'string' ? parseInt(prop) : prop;
      if (index >= 0 && index < target.bytes.length) {
        return target.bytes[index];
      }
    }
    return target[prop];
  },
  
  set(target: any, prop: string | number | symbol, value: any) {
    // Если prop - число или строковое представление числа
    if (typeof prop === 'number' || (typeof prop === 'string' && !isNaN(parseInt(prop)))) {
      const index = typeof prop === 'string' ? parseInt(prop) : prop;
      if (index >= 0 && index < target.bytes.length) {
        target.bytes[index] = value;
        return true;
      }
    }
    target[prop] = value;
    return true;
  }
};

// Применяем Proxy к каждому созданному BufferPolyfill
const originalBufferConstructor = BufferPolyfill;
function ProxifiedBufferConstructor(this: any, ...args: any[]) {
  if (!(this instanceof ProxifiedBufferConstructor)) {
    return new (ProxifiedBufferConstructor as any)(...args);
  }
  
  const instance = new originalBufferConstructor(...args);
  return new Proxy(instance, BufferHandler);
}

// Копируем статические методы
Object.getOwnPropertyNames(BufferPolyfill).forEach(prop => {
  if (prop !== 'prototype' && prop !== 'constructor') {
    (ProxifiedBufferConstructor as any)[prop] = (BufferPolyfill as any)[prop];
  }
});
ProxifiedBufferConstructor.prototype = BufferPolyfill.prototype;

// Создаем улучшенный статический метод from
ProxifiedBufferConstructor.from = function(...args: any[]) {
  const buffer = BufferPolyfill.from.apply(BufferPolyfill, args as any);
  return new Proxy(buffer, BufferHandler);
};

// Создаем улучшенный статический метод alloc
ProxifiedBufferConstructor.alloc = function(...args: any[]) {
  const buffer = BufferPolyfill.alloc.apply(BufferPolyfill, args as any);
  return new Proxy(buffer, BufferHandler);
};

// Создаем полифилл для isBuffer
ProxifiedBufferConstructor.isBuffer = function(obj: any): boolean {
  return obj instanceof BufferPolyfill || 
         (obj instanceof Proxy && obj.constructor === ProxifiedBufferConstructor);
};

// Добавляем другие методы, которые могут быть необходимы
ProxifiedBufferConstructor.isEncoding = function(encoding: string): boolean {
  return ['utf8', 'utf-8', 'hex', 'base64'].includes(encoding);
};

// Добавляем свойство prototype.constructor (для проверок instanceof)
ProxifiedBufferConstructor.prototype.constructor = ProxifiedBufferConstructor;

// Добавляем статический toString для совместимости с некоторыми библиотеками
ProxifiedBufferConstructor.toString = function() {
  return 'function Buffer() { [native code] }';
};

// Делаем Buffer доступным глобально
// @ts-ignore - игнорируем ошибки типов, т.к. мы добавляем Buffer в Window
window.Buffer = ProxifiedBufferConstructor as any;
// @ts-ignore
globalThis.Buffer = ProxifiedBufferConstructor as any;

// Добавим дополнительный вывод для отладки
console.log('✅ Buffer polyfill initialized:', {
  hasWindowBuffer: typeof window.Buffer !== 'undefined',
  hasGlobalThisBuffer: typeof globalThis.Buffer !== 'undefined',
  hasStaticFromMethod: typeof window.Buffer.from === 'function',
  hasStaticAllocMethod: typeof window.Buffer.alloc === 'function',
  hasStaticIsBufferMethod: typeof window.Buffer.isBuffer === 'function'
});

// Telegram WebApp integration setup
const initTelegramWebApp = () => {
  if (window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    webApp.expand();
    webApp.ready();
  }
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initTelegramWebApp);

createRoot(document.getElementById("root")!).render(<App />);
