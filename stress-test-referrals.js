/**
 * Stress test для реферальной системы UniFarm
 * Проверяет производительность при нагрузке
 */

const { performance } = require('perf_hooks');

class ReferralStressTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      errors: []
    };
  }

  async testReferralChainPerformance() {
    console.log('🧪 Testing referral chain performance...');
    
    const testCases = [
      { depth: 5, concurrent: 10 },
      { depth: 10, concurrent: 20 },
      { depth: 15, concurrent: 30 },
      { depth: 20, concurrent: 50 }
    ];

    for (const testCase of testCases) {
      console.log(`Testing depth: ${testCase.depth}, concurrent: ${testCase.concurrent}`);
      await this.runConcurrentRequests(testCase.depth, testCase.concurrent);
    }
  }

  async runConcurrentRequests(depth, concurrent) {
    const promises = [];
    
    for (let i = 0; i < concurrent; i++) {
      promises.push(this.simulateReferralRequest(depth, i));
    }

    const results = await Promise.allSettled(promises);
    this.processResults(results);
  }

  async simulateReferralRequest(depth, requestId) {
    const startTime = performance.now();
    
    try {
      // Симуляция запроса к реферальному API
      const response = await fetch(`${this.baseUrl}/api/v2/referrals/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `StressTest-${requestId}`
        }
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.results.totalRequests++;
      
      if (response.ok) {
        this.results.successfulRequests++;
      } else {
        this.results.failedRequests++;
        this.results.errors.push({
          status: response.status,
          statusText: response.statusText,
          requestId,
          depth
        });
      }

      this.updateResponseTimes(responseTime);
      
      return {
        success: response.ok,
        responseTime,
        status: response.status
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.errors.push({
        error: error.message,
        requestId,
        depth
      });

      this.updateResponseTimes(responseTime);
      
      return {
        success: false,
        responseTime,
        error: error.message
      };
    }
  }

  updateResponseTimes(responseTime) {
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    
    // Обновляем среднее время ответа
    this.results.averageResponseTime = 
      (this.results.averageResponseTime * (this.results.totalRequests - 1) + responseTime) / 
      this.results.totalRequests;
  }

  async testMemoryUsage() {
    console.log('🧠 Testing memory usage during referral operations...');
    
    const initialMemory = process.memoryUsage();
    console.log('Initial memory:', this.formatMemory(initialMemory));

    // Симуляция создания множественных реферальных операций
    const operations = [];
    for (let i = 0; i < 1000; i++) {
      operations.push(this.createMockReferralOperation(i));
    }

    await Promise.all(operations);

    const finalMemory = process.memoryUsage();
    console.log('Final memory:', this.formatMemory(finalMemory));
    
    const memoryDiff = {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    };

    console.log('Memory difference:', this.formatMemory(memoryDiff));
    
    return memoryDiff;
  }

  async createMockReferralOperation(id) {
    // Симуляция реферальной операции без реального API вызова
    const mockReferralData = {
      id,
      referralCode: `REF${id.toString().padStart(6, '0')}`,
      level: Math.floor(Math.random() * 20) + 1,
      reward: (Math.random() * 100).toFixed(6),
      timestamp: new Date().toISOString()
    };

    // Симуляция обработки данных
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    return mockReferralData;
  }

  formatMemory(memory) {
    return {
      rss: `${Math.round(memory.rss / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100} MB`
    };
  }

  generateReport() {
    console.log('\n📊 STRESS TEST RESULTS:');
    console.log('=' .repeat(50));
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful: ${this.results.successfulRequests}`);
    console.log(`Failed: ${this.results.failedRequests}`);
    console.log(`Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${this.results.minResponseTime.toFixed(2)}ms`);
    
    if (this.results.errors.length > 0) {
      console.log(`\nErrors (showing first 5):`);
      this.results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${JSON.stringify(error)}`);
      });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting UniFarm Referral Stress Tests...\n');
    
    try {
      await this.testMemoryUsage();
      await this.testReferralChainPerformance();
      this.generateReport();
    } catch (error) {
      console.error('❌ Stress test failed:', error);
    }
  }
}

// Запуск тестов
if (require.main === module) {
  const stressTest = new ReferralStressTest();
  stressTest.runAllTests();
}

module.exports = ReferralStressTest;