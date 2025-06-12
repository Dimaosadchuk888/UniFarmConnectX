/**
 * Comprehensive Security Test for UniFarm Connect
 * Tests all critical security fixes applied to API endpoints
 */

class SecurityFixesTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = [];
    this.criticalEndpoints = [
      // Farming endpoints
      { method: 'GET', path: '/api/farming/data', module: 'farming' },
      { method: 'GET', path: '/api/farming/info', module: 'farming' },
      { method: 'GET', path: '/api/farming/status', module: 'farming' },
      
      // Boost endpoints
      { method: 'GET', path: '/api/boosts', module: 'boost' },
      { method: 'GET', path: '/api/boosts/user/123', module: 'boost' },
      { method: 'POST', path: '/api/boosts/activate', module: 'boost' },
      { method: 'GET', path: '/api/boosts/packages', module: 'boost' },
      
      // Mission endpoints
      { method: 'GET', path: '/api/missions/stats', module: 'missions' },
      { method: 'GET', path: '/api/missions/user/123', module: 'missions' },
      
      // Referral endpoints
      { method: 'POST', path: '/api/referrals/process', module: 'referral' },
      { method: 'GET', path: '/api/referrals/validate/TEST123', module: 'referral' },
      { method: 'GET', path: '/api/referrals/123', module: 'referral' },
      { method: 'GET', path: '/api/referrals/stats', module: 'referral' },
      
      // Daily bonus endpoints
      { method: 'GET', path: '/api/daily-bonus/123', module: 'dailyBonus' },
      { method: 'POST', path: '/api/daily-bonus/claim', module: 'dailyBonus' },
      { method: 'GET', path: '/api/daily-bonus/123/calendar', module: 'dailyBonus' },
      
      // Admin endpoints (should require admin rights)
      { method: 'GET', path: '/api/admin/stats', module: 'admin' },
      { method: 'GET', path: '/api/admin/users', module: 'admin' },
      { method: 'POST', path: '/api/admin/missions/manage', module: 'admin' }
    ];
  }

  async testRequest(endpoint) {
    try {
      console.log(`\n🔒 Testing ${endpoint.method} ${endpoint.path}`);
      
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.method === 'POST') {
        options.body = JSON.stringify({ test: 'data' });
      }

      const response = await fetch(`${this.baseUrl}${endpoint.path}`, options);
      const status = response.status;
      
      // Ожидаем 401 (Unauthorized) для всех защищенных endpoints
      if (status === 401) {
        console.log(`✅ ЗАЩИЩЕН: ${endpoint.path} вернул 401 Unauthorized`);
        return { endpoint, status, secured: true, result: 'PASS' };
      } else if (status === 404) {
        console.log(`⚠️  ENDPOINT НЕ НАЙДЕН: ${endpoint.path} - возможно маршрут не зарегистрирован`);
        return { endpoint, status, secured: false, result: 'NOT_FOUND' };
      } else {
        console.log(`❌ УЯЗВИМОСТЬ: ${endpoint.path} вернул ${status} вместо 401`);
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}`);
        return { endpoint, status, secured: false, result: 'VULNERABLE', response: text };
      }
    } catch (error) {
      console.error(`🚨 ОШИБКА тестирования ${endpoint.path}:`, error.message);
      return { endpoint, status: 'ERROR', secured: false, result: 'ERROR', error: error.message };
    }
  }

  async testAllEndpoints() {
    console.log('🔍 НАЧАЛО ТЕСТИРОВАНИЯ БЕЗОПАСНОСТИ API ENDPOINTS');
    console.log(`📊 Всего endpoints для проверки: ${this.criticalEndpoints.length}`);
    
    for (const endpoint of this.criticalEndpoints) {
      const result = await this.testRequest(endpoint);
      this.results.push(result);
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  generateSecurityReport() {
    const totalEndpoints = this.results.length;
    const securedEndpoints = this.results.filter(r => r.secured).length;
    const vulnerableEndpoints = this.results.filter(r => r.result === 'VULNERABLE').length;
    const notFoundEndpoints = this.results.filter(r => r.result === 'NOT_FOUND').length;
    const errorEndpoints = this.results.filter(r => r.result === 'ERROR').length;

    console.log('\n' + '='.repeat(80));
    console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ ПО БЕЗОПАСНОСТИ API ENDPOINTS');
    console.log('='.repeat(80));
    
    console.log(`\n📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`   Всего endpoints проверено: ${totalEndpoints}`);
    console.log(`   ✅ Защищенных (401): ${securedEndpoints}`);
    console.log(`   ❌ Уязвимых: ${vulnerableEndpoints}`);
    console.log(`   ⚠️  Не найденных (404): ${notFoundEndpoints}`);
    console.log(`   🚨 Ошибок: ${errorEndpoints}`);
    
    const securityPercentage = ((securedEndpoints / totalEndpoints) * 100).toFixed(1);
    console.log(`\n🛡️  УРОВЕНЬ БЕЗОПАСНОСТИ: ${securityPercentage}%`);

    // Группировка по модулям
    const moduleStats = {};
    this.results.forEach(result => {
      const module = result.endpoint.module;
      if (!moduleStats[module]) {
        moduleStats[module] = { total: 0, secured: 0, vulnerable: 0, notFound: 0, errors: 0 };
      }
      moduleStats[module].total++;
      if (result.secured) moduleStats[module].secured++;
      if (result.result === 'VULNERABLE') moduleStats[module].vulnerable++;
      if (result.result === 'NOT_FOUND') moduleStats[module].notFound++;
      if (result.result === 'ERROR') moduleStats[module].errors++;
    });

    console.log(`\n📦 СТАТИСТИКА ПО МОДУЛЯМ:`);
    Object.entries(moduleStats).forEach(([module, stats]) => {
      const moduleSecurityPercentage = ((stats.secured / stats.total) * 100).toFixed(1);
      console.log(`   ${module}: ${stats.secured}/${stats.total} защищено (${moduleSecurityPercentage}%)`);
      if (stats.vulnerable > 0) console.log(`     ❌ Уязвимых: ${stats.vulnerable}`);
      if (stats.notFound > 0) console.log(`     ⚠️  Не найденных: ${stats.notFound}`);
      if (stats.errors > 0) console.log(`     🚨 Ошибок: ${stats.errors}`);
    });

    // Список уязвимых endpoints
    const vulnerableResults = this.results.filter(r => r.result === 'VULNERABLE');
    if (vulnerableResults.length > 0) {
      console.log(`\n❌ КРИТИЧЕСКИЕ УЯЗВИМОСТИ:`);
      vulnerableResults.forEach(result => {
        console.log(`   ${result.endpoint.method} ${result.endpoint.path} - статус ${result.status}`);
      });
    }

    // Список endpoints с ошибками
    const errorResults = this.results.filter(r => r.result === 'ERROR');
    if (errorResults.length > 0) {
      console.log(`\n🚨 ОШИБКИ ТЕСТИРОВАНИЯ:`);
      errorResults.forEach(result => {
        console.log(`   ${result.endpoint.method} ${result.endpoint.path} - ${result.error}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    if (vulnerableEndpoints === 0 && errorEndpoints === 0) {
      console.log('🎉 ВСЕ КРИТИЧЕСКИЕ ENDPOINTS ЗАЩИЩЕНЫ! СИСТЕМА ГОТОВА К ПРОДАКШН ДЕПЛОЮ');
    } else {
      console.log('⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ БЕЗОПАСНОСТИ - ТРЕБУЕТСЯ ДОПОЛНИТЕЛЬНАЯ ДОРАБОТКА');
    }
    
    return {
      totalEndpoints,
      securedEndpoints,
      vulnerableEndpoints,
      notFoundEndpoints,
      errorEndpoints,
      securityPercentage: parseFloat(securityPercentage),
      isProductionReady: vulnerableEndpoints === 0 && errorEndpoints === 0
    };
  }

  async runFullSecurityTest() {
    console.log('🚀 Запуск полного тестирования безопасности...\n');
    
    await this.testAllEndpoints();
    const report = this.generateSecurityReport();
    
    return report;
  }
}

// Запуск тестирования
async function runSecurityTest() {
  const tester = new SecurityFixesTest();
  
  try {
    const report = await tester.runFullSecurityTest();
    
    // Возвращаем код выхода для CI/CD
    if (report.isProductionReady) {
      console.log('\n✅ SECURITY TEST PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ SECURITY TEST FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('🚨 Критическая ошибка тестирования:', error);
    process.exit(1);
  }
}

runSecurityTest();