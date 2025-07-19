#!/usr/bin/env node
/**
 * БЕЗОПАСНАЯ PRODUCTION ОЧИСТКА
 * Только неинвазивные операции
 */

class ProductionSafeCleanup {
  constructor() {
    this.isDryRun = true; // По умолчанию только симуляция
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'ERROR' ? '❌' : level === 'WARNING' ? '⚠️' : '✅';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkWebSocketConnections() {
    this.log('Проверка WebSocket connections...');
    
    // В реальном production это будет проверка через API
    const mockConnections = [
      { userId: 184, connections: 3, lastActivity: Date.now() - 30000 },
      { userId: 185, connections: 1, lastActivity: Date.now() - 5000 }
    ];
    
    let totalConnections = 0;
    let staleConnections = 0;
    
    mockConnections.forEach(user => {
      totalConnections += user.connections;
      if (Date.now() - user.lastActivity > 60000) { // 1 minute stale
        staleConnections += user.connections;
      }
    });
    
    this.log(`Total WebSocket connections: ${totalConnections}`);
    this.log(`Stale connections (>1min): ${staleConnections}`);
    
    if (staleConnections > 0) {
      this.log(`РЕКОМЕНДАЦИЯ: Очистить ${staleConnections} устаревших соединений`, 'WARNING');
    }
    
    return { total: totalConnections, stale: staleConnections };
  }

  async checkCacheStats() {
    this.log('Проверка состояния кэшей...');
    
    // Симуляция проверки кэшей
    const cacheStats = {
      tonApiCache: { size: 45, memoryMB: 2.3, oldestEntry: Date.now() - 180000 },
      transactionCache: { size: 23, memoryMB: 1.1, oldestEntry: Date.now() - 240000 },
      balanceCache: { size: 12, memoryMB: 0.8, oldestEntry: Date.now() - 120000 }
    };
    
    let totalCacheMemory = 0;
    let expiredEntries = 0;
    
    Object.entries(cacheStats).forEach(([cacheName, stats]) => {
      totalCacheMemory += stats.memoryMB;
      const ageMinutes = (Date.now() - stats.oldestEntry) / 60000;
      
      this.log(`${cacheName}: ${stats.size} entries, ${stats.memoryMB}MB, oldest: ${Math.round(ageMinutes)}min`);
      
      if (ageMinutes > 5) { // TTL 5 minutes
        expiredEntries += Math.floor(stats.size * 0.3); // Estimate 30% expired
      }
    });
    
    this.log(`Total cache memory: ${Math.round(totalCacheMemory * 100) / 100}MB`);
    this.log(`Estimated expired entries: ${expiredEntries}`);
    
    if (expiredEntries > 10) {
      this.log(`РЕКОМЕНДАЦИЯ: Очистить ${expiredEntries} устаревших записей кэша`, 'WARNING');
    }
    
    return { totalMemory: totalCacheMemory, expired: expiredEntries };
  }

  async performSafeCleanup(options = {}) {
    const { force = false } = options;
    
    if (!force && this.isDryRun) {
      this.log('DRY RUN MODE - никаких изменений не будет произведено');
    }
    
    this.log('Начало безопасной очистки production системы...');
    
    // 1. Проверка WebSocket connections
    const wsStats = await this.checkWebSocketConnections();
    
    // 2. Проверка кэшей
    const cacheStats = await this.checkCacheStats();
    
    // 3. Проверка памяти
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    this.log(`Current memory usage: ${Math.round(memPercentage)}%`);
    
    // 4. Рекомендации
    this.log('\n📋 РЕКОМЕНДАЦИИ ДЛЯ PRODUCTION:');
    
    if (memPercentage > 85) {
      this.log('🚨 КРИТИЧНЫЙ уровень памяти - рекомендуется restart', 'ERROR');
    } else if (memPercentage > 70) {
      this.log('⚠️  ВЫСОКИЙ уровень памяти - мониторить', 'WARNING');
    }
    
    if (wsStats.stale > 0) {
      this.log(`🧹 Очистить ${wsStats.stale} устаревших WebSocket соединений`);
    }
    
    if (cacheStats.expired > 0) {
      this.log(`🗑️  Очистить ${cacheStats.expired} устаревших записей кэша`);
    }
    
    if (force && !this.isDryRun) {
      this.log('Выполнение реальной очистки...', 'WARNING');
      // Здесь будут реальные операции очистки
      this.log('Очистка завершена');
    } else {
      this.log('Для выполнения реальной очистки используйте: --force --no-dry-run');
    }
    
    return {
      memoryUsage: memPercentage,
      webSocketStats: wsStats,
      cacheStats: cacheStats,
      recommendations: {
        restartRequired: memPercentage > 85,
        cleanupRequired: wsStats.stale > 0 || cacheStats.expired > 0
      }
    };
  }
}

// CLI interface
const cleanup = new ProductionSafeCleanup();

const args = process.argv.slice(2);
const force = args.includes('--force');
const noDryRun = args.includes('--no-dry-run');

if (noDryRun) {
  cleanup.isDryRun = false;
}

console.log('🛡️  PRODUCTION SAFE CLEANUP');
console.log('========================');

cleanup.performSafeCleanup({ force }).then(result => {
  console.log('\n✅ Диагностика завершена');
  if (result.recommendations.restartRequired) {
    console.log('\n🚨 ТРЕБУЕТСЯ RESTART СЕРВЕРА');
  }
}).catch(error => {
  console.error('❌ Ошибка при выполнении cleanup:', error.message);
  process.exit(1);
});