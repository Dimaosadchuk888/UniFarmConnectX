#!/usr/bin/env node
/**
 * БЕЗОПАСНЫЙ PRODUCTION MEMORY MONITOR
 * Только чтение данных, никаких изменений
 */

const fs = require('fs');
const path = require('path');

class ProductionMemoryMonitor {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/memory-monitor.log');
    this.criticalThreshold = 85; // 85% memory usage
    this.emergencyThreshold = 90; // 90% memory usage
  }

  getCurrentMemoryStats() {
    const memUsage = process.memoryUsage();
    const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    return {
      timestamp: new Date().toISOString(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      percentage: Math.round(percentage * 100) / 100,
      rss: memUsage.rss,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    };
  }

  assessMemoryHealth(stats) {
    if (stats.percentage >= this.emergencyThreshold) {
      return {
        level: 'EMERGENCY',
        status: 'КРИТИЧНО',
        action: 'Требует немедленного вмешательства',
        color: '\x1b[41m' // Red background
      };
    } else if (stats.percentage >= this.criticalThreshold) {
      return {
        level: 'CRITICAL',
        status: 'ВЫСОКИЙ',
        action: 'Требует внимания',
        color: '\x1b[43m' // Yellow background
      };
    } else {
      return {
        level: 'NORMAL',
        status: 'НОРМАЛЬНО',
        action: 'Monitoring продолжается',
        color: '\x1b[42m' // Green background
      };
    }
  }

  formatMemorySize(bytes) {
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb * 100) / 100} MB`;
  }

  logToFile(stats, health) {
    const logEntry = `${stats.timestamp} [${health.level}] Memory: ${stats.percentage}% (${this.formatMemorySize(stats.heapUsed)}/${this.formatMemorySize(stats.heapTotal)}) - ${health.action}\n`;
    
    try {
      // Ensure logs directory exists
      const logsDir = path.dirname(this.logFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  displayStats(stats, health) {
    const reset = '\x1b[0m';
    
    console.log(`\n${health.color}                                          ${reset}`);
    console.log(`${health.color} PRODUCTION MEMORY MONITOR - ${health.status} ${reset}`);
    console.log(`${health.color}                                          ${reset}`);
    
    console.log(`\n📊 Memory Statistics:`);
    console.log(`   Heap Used:     ${this.formatMemorySize(stats.heapUsed)}`);
    console.log(`   Heap Total:    ${this.formatMemorySize(stats.heapTotal)}`);
    console.log(`   Usage:         ${stats.percentage}%`);
    console.log(`   RSS:           ${this.formatMemorySize(stats.rss)}`);
    console.log(`   External:      ${this.formatMemorySize(stats.external)}`);
    
    console.log(`\n🎯 Health Assessment:`);
    console.log(`   Level:         ${health.level}`);
    console.log(`   Action:        ${health.action}`);
    console.log(`   Timestamp:     ${stats.timestamp}`);
    
    if (health.level !== 'NORMAL') {
      console.log(`\n⚠️  РЕКОМЕНДАЦИИ:`);
      if (health.level === 'EMERGENCY') {
        console.log(`   1. НЕМЕДЛЕННО рассмотреть restart сервера`);
        console.log(`   2. Проверить active WebSocket connections`);
        console.log(`   3. Принудительно очистить все кэши`);
      } else {
        console.log(`   1. Мониторить изменения каждые 30 секунд`);
        console.log(`   2. Подготовить план очистки кэшей`);
        console.log(`   3. Проверить memory leaks в WebSocket`);
      }
    }
  }

  async runSingleCheck() {
    console.log('🔍 PRODUCTION MEMORY CHECK - SINGLE SCAN');
    console.log('=' .repeat(50));
    
    const stats = this.getCurrentMemoryStats();
    const health = this.assessMemoryHealth(stats);
    
    this.displayStats(stats, health);
    this.logToFile(stats, health);
    
    return { stats, health };
  }

  async runContinuousMonitoring(intervalSeconds = 30) {
    console.log(`🔄 CONTINUOUS MEMORY MONITORING (every ${intervalSeconds}s)`);
    console.log('Press Ctrl+C to stop');
    console.log('=' .repeat(50));
    
    const monitor = async () => {
      const result = await this.runSingleCheck();
      
      // Auto-trigger warnings for critical levels
      if (result.health.level === 'EMERGENCY') {
        console.log('\n🚨 EMERGENCY ALERT TRIGGERED!');
        console.log('Система требует немедленного вмешательства!');
      }
      
      console.log('\n' + '─'.repeat(50));
    };
    
    // Initial check
    await monitor();
    
    // Continuous monitoring
    const interval = setInterval(monitor, intervalSeconds * 1000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Stopping memory monitor...');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// CLI interface
const monitor = new ProductionMemoryMonitor();

const command = process.argv[2];
switch (command) {
  case 'check':
    monitor.runSingleCheck();
    break;
  case 'watch':
    const interval = parseInt(process.argv[3]) || 30;
    monitor.runContinuousMonitoring(interval);
    break;
  default:
    console.log('🛠️  PRODUCTION MEMORY MONITOR');
    console.log('');
    console.log('Usage:');
    console.log('  node production-memory-monitor.js check       - Single memory check');
    console.log('  node production-memory-monitor.js watch [30]  - Continuous monitoring');
    console.log('');
    console.log('Examples:');
    console.log('  node production-memory-monitor.js check');
    console.log('  node production-memory-monitor.js watch 15');
    break;
}