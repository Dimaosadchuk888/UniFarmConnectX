/**
 * Система кеширования балансов для оптимизации производительности
 * Использует in-memory кеш с TTL для уменьшения нагрузки на БД
 */

import { logger } from './logger';

interface CachedBalance {
  userId: number;
  uniBalance: number;
  tonBalance: number;
  lastUpdated: Date;
  expiresAt: Date;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

export class BalanceCache {
  private static instance: BalanceCache;
  private cache: Map<number, CachedBalance> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  };
  
  // Настройки кеша
  private readonly TTL_SECONDS = 300; // 5 минут
  private readonly MAX_CACHE_SIZE = 10000; // Максимум 10k записей
  private readonly CLEANUP_INTERVAL = 60000; // Очистка каждую минуту
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Запускаем периодическую очистку устаревших записей
    this.startCleanupTimer();
  }

  public static getInstance(): BalanceCache {
    if (!BalanceCache.instance) {
      BalanceCache.instance = new BalanceCache();
    }
    return BalanceCache.instance;
  }

  /**
   * Получить баланс из кеша
   */
  get(userId: number): { uniBalance: number; tonBalance: number } | null {
    const cached = this.cache.get(userId);
    
    if (!cached) {
      this.stats.misses++;
      console.log(`[BalanceCache] ❌ Кеш не найден для user ${userId}`);
      logger.debug('[BalanceCache] Cache miss', { userId });
      return null;
    }

    const now = new Date();
    const isExpired = cached.expiresAt < now;
    const age = Math.round((now.getTime() - cached.lastUpdated.getTime()) / 1000);

    // ДИАГНОСТИКА: Логируем состояние backend кеша
    console.log(`[BalanceCache] Проверка кеша для user ${userId}:`, {
      exists: true,
      age: `${age}с`,
      ttl: `${this.TTL_SECONDS}с`,
      isExpired,
      uniBalance: cached.uniBalance,
      tonBalance: cached.tonBalance,
      expiresAt: cached.expiresAt.toISOString()
    });

    if (isExpired) {
      this.cache.delete(userId);
      this.stats.evictions++;
      this.stats.misses++;
      console.log(`[BalanceCache] 🚨 Backend кеш истек для user ${userId}, удаляем`);
      logger.debug('[BalanceCache] Cache expired', { userId });
      return null;
    }

    this.stats.hits++;
    console.log(`[BalanceCache] ✅ Возвращаем BACKEND кеш для user ${userId}`);
    logger.debug('[BalanceCache] Cache hit', { 
      userId, 
      uniBalance: cached.uniBalance,
      tonBalance: cached.tonBalance 
    });
    
    return {
      uniBalance: cached.uniBalance,
      tonBalance: cached.tonBalance
    };
  }

  /**
   * Сохранить баланс в кеш
   */
  set(userId: number, uniBalance: number, tonBalance: number): void {
    // Проверяем размер кеша
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.TTL_SECONDS * 1000);

    this.cache.set(userId, {
      userId,
      uniBalance,
      tonBalance,
      lastUpdated: now,
      expiresAt
    });

    this.stats.size = this.cache.size;
    
    logger.debug('[BalanceCache] Balance cached', {
      userId,
      uniBalance,
      tonBalance,
      ttl: this.TTL_SECONDS
    });
  }

  /**
   * Обновить только UNI баланс
   */
  updateUni(userId: number, uniBalance: number): void {
    const cached = this.cache.get(userId);
    if (cached) {
      cached.uniBalance = uniBalance;
      cached.lastUpdated = new Date();
      cached.expiresAt = new Date(Date.now() + this.TTL_SECONDS * 1000);
    }
  }

  /**
   * Обновить только TON баланс
   */
  updateTon(userId: number, tonBalance: number): void {
    const cached = this.cache.get(userId);
    if (cached) {
      cached.tonBalance = tonBalance;
      cached.lastUpdated = new Date();
      cached.expiresAt = new Date(Date.now() + this.TTL_SECONDS * 1000);
    }
  }

  /**
   * Инвалидировать кеш для пользователя
   */
  invalidate(userId: number): void {
    if (this.cache.delete(userId)) {
      this.stats.evictions++;
      logger.debug('[BalanceCache] Cache invalidated', { userId });
    }
  }

  /**
   * Инвалидировать кеш для нескольких пользователей
   */
  invalidateBatch(userIds: number[]): void {
    let invalidated = 0;
    for (const userId of userIds) {
      if (this.cache.delete(userId)) {
        invalidated++;
      }
    }
    this.stats.evictions += invalidated;
    logger.debug('[BalanceCache] Batch invalidation', { 
      count: invalidated,
      total: userIds.length 
    });
  }

  /**
   * Очистить весь кеш
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
    this.stats.size = 0;
    logger.info('[BalanceCache] Cache cleared', { evicted: size });
  }

  /**
   * Получить статистику кеша
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Удалить самые старые записи при переполнении
   */
  private evictOldest(): void {
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastUpdated.getTime() - b[1].lastUpdated.getTime());
    
    // Удаляем 10% самых старых записей
    const toEvict = Math.ceil(this.MAX_CACHE_SIZE * 0.1);
    
    for (let i = 0; i < toEvict && i < sortedEntries.length; i++) {
      this.cache.delete(sortedEntries[i][0]);
      this.stats.evictions++;
    }
    
    logger.debug('[BalanceCache] Evicted oldest entries', { count: toEvict });
  }

  /**
   * Периодическая очистка устаревших записей
   */
  private cleanup(): void {
    const now = new Date();
    let expired = 0;

    for (const [userId, cached] of Array.from(this.cache.entries())) {
      if (cached.expiresAt < now) {
        this.cache.delete(userId);
        expired++;
      }
    }

    if (expired > 0) {
      this.stats.evictions += expired;
      this.stats.size = this.cache.size;
      logger.debug('[BalanceCache] Cleanup completed', { expired });
    }
  }

  /**
   * Запустить таймер очистки
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Остановить таймер очистки
   */
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Экспортируем синглтон
export const balanceCache = BalanceCache.getInstance();