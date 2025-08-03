/**
 * Сервис кеширования для улучшения производительности
 * Хранит часто используемые данные в памяти для мгновенного доступа
 */

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache = new Map<string, CacheItem>();
  private timers = new Map<string, NodeJS.Timeout>();
  
  // Статистика использования кеша
  private stats = {
    hits: 0,
    misses: 0,
    expired: 0,
    fallbackUsed: 0,
    staleFallbackRejected: 0
  };
  
  // Делаем cache доступным для проверки возраста (только для чтения)
  get cacheMap() { return this.cache; }

  /**
   * Сохранить данные в кеш
   * @param key - Уникальный ключ для данных
   * @param data - Данные для сохранения
   * @param ttl - Время жизни в миллисекундах (по умолчанию 60 секунд)
   */
  set(key: string, data: any, ttl: number = 60000): void {
    // Очищаем старый таймер если есть
    this.invalidate(key);

    // Сохраняем данные
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Устанавливаем автоочистку
    const timer = setTimeout(() => {
      this.invalidate(key);
    }, ttl);

    this.timers.set(key, timer);

    console.log(`[CacheService] Данные сохранены в кеш: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * Получить данные из кеша
   * @param key - Ключ данных
   * @returns Данные или null если не найдены/устарели
   */
  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      console.log(`[CacheService] Промах кеша: ${key}`);
      this.stats.misses++;
      return null;
    }

    // Проверяем не устарели ли данные
    const age = Date.now() - item.timestamp;
    if (age > item.ttl) {
      console.log(`[CacheService] Данные устарели: ${key}`);
      this.stats.expired++;
      this.stats.misses++;
      this.invalidate(key);
      return null;
    }

    console.log(`[CacheService] Попадание в кеш: ${key}, возраст: ${age}ms`);
    this.stats.hits++;
    return item.data as T;
  }

  /**
   * Проверить наличие актуальных данных в кеше
   * @param key - Ключ данных
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const age = Date.now() - item.timestamp;
    return age <= item.ttl;
  }

  /**
   * Удалить данные из кеша
   * @param key - Ключ данных
   */
  invalidate(key: string): void {
    // Очищаем таймер
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    // Удаляем данные
    if (this.cache.delete(key)) {
      console.log(`[CacheService] Кеш инвалидирован: ${key}`);
    }
  }

  /**
   * Инвалидировать все ключи по паттерну
   * @param pattern - Паттерн для поиска (например, 'user:*')
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.invalidate(key));
    console.log(`[CacheService] Инвалидировано по паттерну ${pattern}: ${keysToDelete.length} ключей`);
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    // Очищаем все таймеры
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Очищаем данные
    const size = this.cache.size;
    this.cache.clear();

    console.log(`[CacheService] Кеш полностью очищен, удалено записей: ${size}`);
  }

  /**
   * Получить детальную статистику кеша с информацией о fallback
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    expired: number;
    fallbackUsed: number;
    staleFallbackRejected: number;
  } {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      expired: this.stats.expired,
      fallbackUsed: this.stats.fallbackUsed,
      staleFallbackRejected: this.stats.staleFallbackRejected
    };
  }

  /**
   * Записать использование fallback в статистику
   */
  recordFallbackUsed(): void {
    this.stats.fallbackUsed++;
  }

  /**
   * Записать отклонение устаревшего fallback в статистику
   */
  recordStaleFallbackRejected(): void {
    this.stats.staleFallbackRejected++;
  }

  /**
   * Получить все ключи кеша
   */
  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Получить информацию об использовании памяти кешем
   */
  getMemoryUsage(): number {
    // Примерная оценка использования памяти
    let totalSize = 0;
    this.cache.forEach((item) => {
      // Приблизительный размер JSON представления
      totalSize += JSON.stringify(item).length * 2; // UTF-16 = 2 байта на символ
    });
    return totalSize;
  }

  /**
   * Асинхронная обертка для кеширования результатов функций
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) return cached;

    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      // В случае ошибки не кэшируем результат
      throw error;
    }
  }
}

// Создаем глобальный экземпляр
export const cacheService = new CacheService();

// Очищаем кеш при выходе пользователя
window.addEventListener('beforeunload', () => {
  cacheService.clear();
});

// Экспортируем для использования в других модулях
export default cacheService;