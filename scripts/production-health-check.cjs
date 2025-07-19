#!/usr/bin/env node
/**
 * КОМПЛЕКСНАЯ PRODUCTION ДИАГНОСТИКА
 * Безопасная проверка всех систем без изменений
 */

const fetch = require('node-fetch');

class ProductionHealthCheck {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.timeout = 5000; // 5 seconds
  }

  async checkEndpoint(endpoint, description) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'HealthCheck/1.0' }
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      return {
        endpoint,
        description,
        status: response.status,
        ok: response.ok,
        duration,
        healthy: response.ok && duration < 2000
      };
    } catch (error) {
      return {
        endpoint,
        description,
        status: 0,
        ok: false,
        duration: this.timeout,
        healthy: false,
        error: error.message
      };
    }
  }

  async runSystemHealthCheck() {
    console.log('🏥 PRODUCTION SYSTEM HEALTH CHECK');
    console.log('=' .repeat(50));
    
    const checks = [
      { endpoint: '/health', desc: 'Server Health' },
      { endpoint: '/api/v2/wallet/balance?user_id=184', desc: 'Balance API' },
      { endpoint: '/api/v2/uni-farming/status?user_id=184', desc: 'UNI Farming' },
      { endpoint: '/api/v2/transactions?user_id=184&page=1&limit=5', desc: 'Transactions' }
    ];
    
    const results = [];
    
    for (const check of checks) {
      console.log(`\n🔍 Testing: ${check.desc} (${check.endpoint})`);
      const result = await this.checkEndpoint(check.endpoint, check.desc);
      
      const statusIcon = result.healthy ? '✅' : '❌';
      const statusText = result.ok ? 'OK' : 'FAILED';
      
      console.log(`   ${statusIcon} ${statusText} - ${result.duration}ms`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      results.push(result);
    }
    
    return results;
  }

  async checkMemoryHealth() {
    console.log('\n🧠 MEMORY HEALTH CHECK');
    console.log('─'.repeat(30));
    
    const memUsage = process.memoryUsage();
    const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    const health = {
      percentage: Math.round(percentage * 100) / 100,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      healthy: percentage < 85
    };
    
    const icon = health.healthy ? '✅' : '❌';
    console.log(`${icon} Memory Usage: ${health.percentage}% (${health.heapUsed}/${health.heapTotal} MB)`);
    console.log(`   RSS: ${health.rss} MB`);
    
    if (!health.healthy) {
      console.log(`   ⚠️  WARNING: High memory usage detected!`);
    }
    
    return health;
  }

  async checkProcessHealth() {
    console.log('\n⚙️  PROCESS HEALTH CHECK');
    console.log('─'.repeat(30));
    
    const uptime = process.uptime();
    const uptimeHours = Math.round(uptime / 3600 * 100) / 100;
    
    console.log(`✅ Process Uptime: ${uptimeHours} hours`);
    console.log(`✅ Node Version: ${process.version}`);
    console.log(`✅ Process PID: ${process.pid}`);
    
    return {
      uptime: uptimeHours,
      nodeVersion: process.version,
      pid: process.pid,
      healthy: uptime > 60 // Running for more than 1 minute
    };
  }

  generateHealthReport(apiResults, memoryHealth, processHealth) {
    console.log('\n📊 HEALTH SUMMARY REPORT');
    console.log('=' .repeat(50));
    
    const healthyApis = apiResults.filter(r => r.healthy).length;
    const totalApis = apiResults.length;
    const apiHealthPercentage = Math.round((healthyApis / totalApis) * 100);
    
    console.log(`🌐 API Health: ${healthyApis}/${totalApis} endpoints (${apiHealthPercentage}%)`);
    console.log(`🧠 Memory Health: ${memoryHealth.healthy ? 'HEALTHY' : 'CRITICAL'} (${memoryHealth.percentage}%)`);
    console.log(`⚙️  Process Health: ${processHealth.healthy ? 'HEALTHY' : 'STARTING'}`);
    
    const overallHealth = apiHealthPercentage >= 80 && memoryHealth.healthy && processHealth.healthy;
    
    console.log(`\n🎯 OVERALL SYSTEM STATUS: ${overallHealth ? '✅ HEALTHY' : '❌ REQUIRES ATTENTION'}`);
    
    if (!overallHealth) {
      console.log('\n⚠️  RECOMMENDATIONS:');
      
      if (apiHealthPercentage < 80) {
        console.log('   • Check API endpoints and server connectivity');
      }
      
      if (!memoryHealth.healthy) {
        console.log('   • Consider memory cleanup or server restart');
      }
      
      if (!processHealth.healthy) {
        console.log('   • Allow more time for system stabilization');
      }
    }
    
    return {
      overall: overallHealth,
      api: { healthy: healthyApis, total: totalApis, percentage: apiHealthPercentage },
      memory: memoryHealth,
      process: processHealth,
      timestamp: new Date().toISOString()
    };
  }

  async runCompleteHealthCheck() {
    try {
      // Run all health checks
      const apiResults = await this.runSystemHealthCheck();
      const memoryHealth = await this.checkMemoryHealth();
      const processHealth = await this.checkProcessHealth();
      
      // Generate report
      const report = this.generateHealthReport(apiResults, memoryHealth, processHealth);
      
      return report;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return { overall: false, error: error.message };
    }
  }
}

// Run health check
const healthCheck = new ProductionHealthCheck();

healthCheck.runCompleteHealthCheck().then(report => {
  if (report.overall) {
    process.exit(0); // Success
  } else {
    process.exit(1); // Issues detected
  }
}).catch(error => {
  console.error('💥 Critical error during health check:', error.message);
  process.exit(2); // Critical failure
});