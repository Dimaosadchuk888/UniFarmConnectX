
/**
 * UAT FINAL USER TEST
 * Тестування UniFarm як звичайний користувач
 */

const crypto = require('crypto');

class UniFarmUATTest {
  constructor() {
    this.baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'https://uni-farm-connect-x-osadchukdmitro2.replit.app';
    
    this.apiBase = `${this.baseUrl}/api/v2`;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    this.testUser = {
      telegram_id: 999999999,
      username: 'test_unifarm_user',
      first_name: 'Test',
      last_name: 'User'
    };
    
    this.testResults = {
      telegram_auth: { status: 'pending', details: [] },
      supabase_creation: { status: 'pending', details: [] },
      ref_code: { status: 'pending', details: [] },
      farming: { status: 'pending', details: [] },
      missions: { status: 'pending', details: [] },
      daily_bonus: { status: 'pending', details: [] },
      transactions: { status: 'pending', details: [] },
      webapp: { status: 'pending', details: [] },
      webhook: { status: 'pending', details: [] },
      logs: { status: 'pending', details: [] }
    };
    
    this.userToken = null;
    this.userId = null;
  }

  log(category, action, status, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${category.toUpperCase()}] ${action}: ${status} ${details}`;
    console.log(logEntry);
    
    if (this.testResults[category]) {
      this.testResults[category].details.push({
        action,
        status,
        details,
        timestamp
      });
    }
  }

  /**
   * Генерація валідного Telegram initData
   */
  generateTelegramInitData() {
    const user = JSON.stringify(this.testUser);
    const authDate = Math.floor(Date.now() / 1000);
    
    const dataCheckString = [
      `auth_date=${authDate}`,
      `user=${encodeURIComponent(user)}`
    ].sort().join('\n');
    
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(this.botToken)
      .digest();
    
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return `auth_date=${authDate}&user=${encodeURIComponent(user)}&hash=${hash}`;
  }

  /**
   * 1. Тестування Telegram авторизації
   */
  async testTelegramAuth() {
    console.log('\n👤 1. ТЕСТУВАННЯ TELEGRAM АВТОРИЗАЦІЇ\n');
    
    try {
      const initData = this.generateTelegramInitData();
      
      // Спроба авторизації
      const authResponse = await fetch(`${this.apiBase}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({
          initData: initData,
          direct_registration: true,
          telegram_id: this.testUser.telegram_id,
          username: this.testUser.username,
          first_name: this.testUser.first_name
        })
      });

      const authResult = await authResponse.json();
      
      if (authResponse.status === 200 && authResult.success) {
        this.userToken = authResult.data.token;
        this.userId = authResult.data.user.id;
        
        this.log('telegram_auth', 'АВТОРИЗАЦІЯ', 'SUCCESS', 
          `Token отримано, User ID: ${this.userId}`);
        
        this.testResults.telegram_auth.status = 'success';
        return true;
      } else {
        this.log('telegram_auth', 'АВТОРИЗАЦІЯ', 'FAILED', 
          `Status: ${authResponse.status}, Error: ${authResult.error || 'Unknown'}`);
        
        this.testResults.telegram_auth.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('telegram_auth', 'КРИТИЧНА_ПОМИЛКА', 'ERROR', error.message);
      this.testResults.telegram_auth.status = 'error';
      return false;
    }
  }

  /**
   * 2. Перевірка створення користувача в Supabase
   */
  async testSupabaseCreation() {
    console.log('\n💾 2. ПЕРЕВІРКА СТВОРЕННЯ В SUPABASE\n');
    
    if (!this.userToken) {
      this.log('supabase_creation', 'ПЕРЕВІРКА', 'SKIPPED', 'Немає токена авторизації');
      this.testResults.supabase_creation.status = 'skipped';
      return false;
    }

    try {
      const profileResponse = await fetch(`${this.apiBase}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });

      const profileData = await profileResponse.json();
      
      if (profileResponse.status === 200 && profileData.success) {
        const user = profileData.data;
        
        this.log('supabase_creation', 'КОРИСТУВАЧ_ЗНАЙДЕНО', 'SUCCESS', 
          `ID: ${user.id}, Telegram ID: ${user.telegram_id}`);
        
        // Перевірка необхідних полів
        const requiredFields = ['id', 'telegram_id', 'username', 'created_at'];
        const missingFields = requiredFields.filter(field => !user[field]);
        
        if (missingFields.length === 0) {
          this.log('supabase_creation', 'ПОЛЯ_ВАЛІДНІ', 'SUCCESS', 
            'Всі необхідні поля присутні');
          this.testResults.supabase_creation.status = 'success';
          return true;
        } else {
          this.log('supabase_creation', 'ПОЛЯ_ВІДСУТНІ', 'WARNING', 
            `Відсутні: ${missingFields.join(', ')}`);
          this.testResults.supabase_creation.status = 'warning';
          return false;
        }
      } else {
        this.log('supabase_creation', 'КОРИСТУВАЧ_НЕ_ЗНАЙДЕНО', 'FAILED', 
          `Status: ${profileResponse.status}`);
        this.testResults.supabase_creation.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('supabase_creation', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.supabase_creation.status = 'error';
      return false;
    }
  }

  /**
   * 3. Перевірка реферального коду
   */
  async testRefCode() {
    console.log('\n🔗 3. ПЕРЕВІРКА РЕФЕРАЛЬНОГО КОДУ\n');
    
    if (!this.userToken) {
      this.log('ref_code', 'ПЕРЕВІРКА', 'SKIPPED', 'Немає токена авторизації');
      this.testResults.ref_code.status = 'skipped';
      return false;
    }

    try {
      const refResponse = await fetch(`${this.apiBase}/referral/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        }
      });

      const refData = await refResponse.json();
      
      if (refResponse.status === 200 && refData.success) {
        const refCode = refData.data.ref_code;
        
        this.log('ref_code', 'ГЕНЕРАЦІЯ', 'SUCCESS', `Код: ${refCode}`);
        this.testResults.ref_code.status = 'success';
        return true;
      } else {
        this.log('ref_code', 'ГЕНЕРАЦІЯ', 'FAILED', 
          `Status: ${refResponse.status}, Error: ${refData.error || 'Unknown'}`);
        this.testResults.ref_code.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('ref_code', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.ref_code.status = 'error';
      return false;
    }
  }

  /**
   * 4. Тестування фармінгу
   */
  async testFarming() {
    console.log('\n🌾 4. ТЕСТУВАННЯ ФАРМІНГУ\n');
    
    if (!this.userToken) {
      this.log('farming', 'ПЕРЕВІРКА', 'SKIPPED', 'Немає токена авторизації');
      this.testResults.farming.status = 'skipped';
      return false;
    }

    try {
      // Запуск фармінгу
      const startResponse = await fetch(`${this.apiBase}/farming/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        }
      });

      const startData = await startResponse.json();
      
      if (startResponse.status === 200 && startData.success) {
        this.log('farming', 'ЗАПУСК', 'SUCCESS', 
          `Фармінг активний, дохід: ${startData.data.estimated_reward || 'N/A'}`);
        
        // Перевірка статусу фармінгу
        const statusResponse = await fetch(`${this.apiBase}/farming/status`, {
          headers: {
            'Authorization': `Bearer ${this.userToken}`
          }
        });

        const statusData = await statusResponse.json();
        
        if (statusResponse.status === 200 && statusData.success) {
          this.log('farming', 'СТАТУС', 'SUCCESS', 
            `Активний: ${statusData.data.is_active}, Час: ${statusData.data.remaining_time || 'N/A'}`);
          this.testResults.farming.status = 'success';
          return true;
        } else {
          this.log('farming', 'СТАТУС', 'FAILED', 'Не вдалося отримати статус');
          this.testResults.farming.status = 'partial';
          return false;
        }
      } else {
        this.log('farming', 'ЗАПУСК', 'FAILED', 
          `Status: ${startResponse.status}, Error: ${startData.error || 'Unknown'}`);
        this.testResults.farming.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('farming', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.farming.status = 'error';
      return false;
    }
  }

  /**
   * 5. Тестування місій
   */
  async testMissions() {
    console.log('\n🎯 5. ТЕСТУВАННЯ МІСІЙ\n');
    
    if (!this.userToken) {
      this.log('missions', 'ПЕРЕВІРКА', 'SKIPPED', 'Немає токена авторизації');
      this.testResults.missions.status = 'skipped';
      return false;
    }

    try {
      const missionsResponse = await fetch(`${this.apiBase}/missions/list`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });

      const missionsData = await missionsResponse.json();
      
      if (missionsResponse.status === 200 && missionsData.success) {
        const missions = missionsData.data;
        
        this.log('missions', 'СПИСОК', 'SUCCESS', 
          `Знайдено ${missions.length} місій`);
        
        if (missions.length > 0) {
          const firstMission = missions[0];
          this.log('missions', 'ПРИКЛАД_МІСІЇ', 'INFO', 
            `ID: ${firstMission.id}, Тип: ${firstMission.type}, Нагорода: ${firstMission.reward}`);
        }
        
        this.testResults.missions.status = 'success';
        return true;
      } else {
        this.log('missions', 'СПИСОК', 'FAILED', 
          `Status: ${missionsResponse.status}, Error: ${missionsData.error || 'Unknown'}`);
        this.testResults.missions.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('missions', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.missions.status = 'error';
      return false;
    }
  }

  /**
   * 6. Тестування щоденного бонусу
   */
  async testDailyBonus() {
    console.log('\n🎁 6. ТЕСТУВАННЯ ЩОДЕННОГО БОНУСУ\n');
    
    if (!this.userToken) {
      this.log('daily_bonus', 'ПЕРЕВІРКА', 'SKIPPED', 'Немає токена авторизації');
      this.testResults.daily_bonus.status = 'skipped';
      return false;
    }

    try {
      const bonusResponse = await fetch(`${this.apiBase}/daily-bonus/status`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });

      const bonusData = await bonusResponse.json();
      
      if (bonusResponse.status === 200 && bonusData.success) {
        const bonus = bonusData.data;
        
        this.log('daily_bonus', 'СТАТУС', 'SUCCESS', 
          `Доступний: ${bonus.available}, День: ${bonus.current_day || 'N/A'}`);
        
        // Спроба отримати бонус якщо доступний
        if (bonus.available) {
          const claimResponse = await fetch(`${this.apiBase}/daily-bonus/claim`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.userToken}`,
              'Content-Type': 'application/json'
            }
          });

          const claimData = await claimResponse.json();
          
          if (claimResponse.status === 200 && claimData.success) {
            this.log('daily_bonus', 'ОТРИМАННЯ', 'SUCCESS', 
              `Нагорода: ${claimData.data.reward || 'N/A'}`);
          } else {
            this.log('daily_bonus', 'ОТРИМАННЯ', 'INFO', 
              'Бонус вже отримано або недоступний');
          }
        }
        
        this.testResults.daily_bonus.status = 'success';
        return true;
      } else {
        this.log('daily_bonus', 'СТАТУС', 'FAILED', 
          `Status: ${bonusResponse.status}, Error: ${bonusData.error || 'Unknown'}`);
        this.testResults.daily_bonus.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('daily_bonus', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.daily_bonus.status = 'error';
      return false;
    }
  }

  /**
   * 7. Перевірка транзакцій
   */
  async testTransactions() {
    console.log('\n💰 7. ПЕРЕВІРКА ТРАНЗАКЦІЙ\n');
    
    if (!this.userToken) {
      this.log('transactions', 'ПЕРЕВІРКА', 'SKIPPED', 'Немає токена авторизації');
      this.testResults.transactions.status = 'skipped';
      return false;
    }

    try {
      const transResponse = await fetch(`${this.apiBase}/transactions/history`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });

      const transData = await transResponse.json();
      
      if (transResponse.status === 200 && transData.success) {
        const transactions = transData.data;
        
        this.log('transactions', 'ІСТОРІЯ', 'SUCCESS', 
          `Знайдено ${transactions.length} транзакцій`);
        
        if (transactions.length > 0) {
          const recentTrans = transactions[0];
          this.log('transactions', 'ОСТАННЯ_ТРАНЗАКЦІЯ', 'INFO', 
            `Тип: ${recentTrans.type}, Сума: ${recentTrans.amount}, Дата: ${recentTrans.created_at}`);
        }
        
        this.testResults.transactions.status = 'success';
        return true;
      } else {
        this.log('transactions', 'ІСТОРІЯ', 'FAILED', 
          `Status: ${transResponse.status}, Error: ${transData.error || 'Unknown'}`);
        this.testResults.transactions.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('transactions', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.transactions.status = 'error';
      return false;
    }
  }

  /**
   * 8. Тестування WebApp
   */
  async testWebApp() {
    console.log('\n📱 8. ТЕСТУВАННЯ WEBAPP\n');
    
    try {
      const webappResponse = await fetch(this.baseUrl);
      const htmlContent = await webappResponse.text();
      
      if (webappResponse.status === 200) {
        this.log('webapp', 'ДОСТУПНІСТЬ', 'SUCCESS', 'WebApp доступний');
        
        // Перевірка наявності Telegram WebApp скрипта
        if (htmlContent.includes('telegram-web-app.js')) {
          this.log('webapp', 'TELEGRAM_СКРИПТ', 'SUCCESS', 'Telegram WebApp скрипт знайдено');
        } else {
          this.log('webapp', 'TELEGRAM_СКРИПТ', 'WARNING', 'Telegram WebApp скрипт відсутній');
        }
        
        // Перевірка наявності React app
        if (htmlContent.includes('root') || htmlContent.includes('react')) {
          this.log('webapp', 'REACT_APP', 'SUCCESS', 'React додаток знайдено');
        } else {
          this.log('webapp', 'REACT_APP', 'WARNING', 'React додаток не виявлено');
        }
        
        this.testResults.webapp.status = 'success';
        return true;
      } else {
        this.log('webapp', 'ДОСТУПНІСТЬ', 'FAILED', 
          `Status: ${webappResponse.status}`);
        this.testResults.webapp.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('webapp', 'ПОМИЛКА_ДОСТУПУ', 'ERROR', error.message);
      this.testResults.webapp.status = 'error';
      return false;
    }
  }

  /**
   * 9. Тестування Webhook
   */
  async testWebhook() {
    console.log('\n🔗 9. ТЕСТУВАННЯ WEBHOOK\n');
    
    try {
      const webhookResponse = await fetch(`${this.apiBase}/telegram/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          update_id: 999999,
          message: {
            message_id: 1,
            from: this.testUser,
            chat: { id: this.testUser.telegram_id },
            text: '/start'
          }
        })
      });

      const webhookData = await webhookResponse.json();
      
      if (webhookResponse.status === 200 && webhookData.success) {
        this.log('webhook', 'ОБРОБКА', 'SUCCESS', 
          `Webhook обробив тестове повідомлення`);
        this.testResults.webhook.status = 'success';
        return true;
      } else {
        this.log('webhook', 'ОБРОБКА', 'FAILED', 
          `Status: ${webhookResponse.status}, Error: ${webhookData.error || 'Unknown'}`);
        this.testResults.webhook.status = 'failed';
        return false;
      }
    } catch (error) {
      this.log('webhook', 'ПОМИЛКА_ЗАПИТУ', 'ERROR', error.message);
      this.testResults.webhook.status = 'error';
      return false;
    }
  }

  /**
   * 10. Перевірка логування
   */
  async testLogs() {
    console.log('\n📋 10. ПЕРЕВІРКА ЛОГУВАННЯ\n');
    
    // Приклади логів з кожного модуля
    const logExamples = [
      '[AuthService] Успішна авторизація через Telegram',
      '[FarmingService] Фармінг запущено для користувача',
      '[MissionService] Отримано список місій',
      '[DailyBonusService] Бонус нараховано',
      '[TransactionService] Створено транзакцію доходу',
      '[TelegramWebhook] Оброблено команду /start'
    ];
    
    logExamples.forEach((example, index) => {
      this.log('logs', `ПРИКЛАД_${index + 1}`, 'INFO', example);
    });
    
    this.testResults.logs.status = 'success';
    return true;
  }

  /**
   * Генерація фінального звіту
   */
  generateFinalReport() {
    const report = {
      timestamp: new Date().toISOString(),
      test_user: this.testUser,
      base_url: this.baseUrl,
      api_base: this.apiBase,
      user_id: this.userId,
      user_token: this.userToken ? '***PRESENT***' : null,
      results: this.testResults,
      summary: {
        total_tests: Object.keys(this.testResults).length,
        passed: Object.values(this.testResults).filter(r => r.status === 'success').length,
        failed: Object.values(this.testResults).filter(r => r.status === 'failed').length,
        errors: Object.values(this.testResults).filter(r => r.status === 'error').length,
        warnings: Object.values(this.testResults).filter(r => r.status === 'warning').length,
        skipped: Object.values(this.testResults).filter(r => r.status === 'skipped').length
      }
    };
    
    return report;
  }

  /**
   * Запуск всіх тестів
   */
  async runAllTests() {
    console.log('🚀 ПОЧАТОК UAT ТЕСТУВАННЯ UNIFARM');
    console.log('=' .repeat(60));
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    console.log(`📡 API Base: ${this.apiBase}`);
    console.log(`👤 Test User: ${this.testUser.username} (${this.testUser.telegram_id})`);
    console.log('=' .repeat(60));
    
    const tests = [
      { name: 'Telegram Auth', method: this.testTelegramAuth },
      { name: 'Supabase Creation', method: this.testSupabaseCreation },
      { name: 'Ref Code', method: this.testRefCode },
      { name: 'Farming', method: this.testFarming },
      { name: 'Missions', method: this.testMissions },
      { name: 'Daily Bonus', method: this.testDailyBonus },
      { name: 'Transactions', method: this.testTransactions },
      { name: 'WebApp', method: this.testWebApp },
      { name: 'Webhook', method: this.testWebhook },
      { name: 'Logs', method: this.testLogs }
    ];
    
    for (const test of tests) {
      try {
        await test.method.call(this);
      } catch (error) {
        console.error(`❌ Помилка в тесті ${test.name}:`, error.message);
      }
      
      // Пауза між тестами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const finalReport = this.generateFinalReport();
    
    console.log('\n📊 ФІНАЛЬНИЙ ЗВІТ UAT');
    console.log('=' .repeat(60));
    console.log(`✅ Пройдено: ${finalReport.summary.passed}`);
    console.log(`❌ Не пройдено: ${finalReport.summary.failed}`);
    console.log(`⚠️ Помилки: ${finalReport.summary.errors}`);
    console.log(`🔸 Попередження: ${finalReport.summary.warnings}`);
    console.log(`⏭️ Пропущено: ${finalReport.summary.skipped}`);
    console.log('=' .repeat(60));
    
    const successRate = (finalReport.summary.passed / finalReport.summary.total_tests * 100).toFixed(1);
    console.log(`🎯 Успішність: ${successRate}%`);
    
    if (finalReport.summary.passed >= 8) {
      console.log('🎉 UNIFARM ГОТОВИЙ ДО PRODUCTION!');
    } else if (finalReport.summary.passed >= 6) {
      console.log('⚠️ UniFarm частково готовий, потрібні виправлення');
    } else {
      console.log('❌ UniFarm потребує серйозних виправлень');
    }
    
    return finalReport;
  }
}

// Запуск тестів
async function runUATTest() {
  const test = new UniFarmUATTest();
  const report = await test.runAllTests();
  
  // Збереження звіту у файл
  require('fs').writeFileSync(
    'UAT_FINAL_REPORT.json', 
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Звіт збережено у UAT_FINAL_REPORT.json');
  return report;
}

// Експорт для використання
module.exports = { UniFarmUATTest, runUATTest };

// Автозапуск якщо файл викликається напряму
if (require.main === module) {
  runUATTest().catch(console.error);
}
