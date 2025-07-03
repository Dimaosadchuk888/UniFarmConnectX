#!/usr/bin/env node

/**
 * 🎯 UniFarm E2E Test Runner
 * Утилита для запуска и мониторинга E2E тестов
 */

const { runE2ETests, TestLogger } = require('./full_e2e_check');
const fs = require('fs');
const path = require('path');

// Конфигурация запуска
const RUN_CONFIG = {
  server_check_attempts: 5,
  server_check_interval: 2000, // 2 секунды
  report_format: 'json', // json | html | console
  save_logs: true,
  log_file: 'test_execution.log'
};

let fetch;

async function initFetch() {
  if (!fetch) {
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  }
  return fetch;
}

// Проверка доступности сервера
async function waitForServer() {
  await initFetch();
  
  for (let attempt = 1; attempt <= RUN_CONFIG.server_check_attempts; attempt++) {
    try {
      TestLogger.info(`Checking server availability (attempt ${attempt}/${RUN_CONFIG.server_check_attempts})...`);
      
      const response = await fetch('http://localhost:3000/health', {
        timeout: 5000
      });
      
      if (response.ok) {
        TestLogger.success('Server is ready for testing');
        return true;
      }
    } catch (error) {
      TestLogger.warn(`Server check failed: ${error.message}`);
      
      if (attempt < RUN_CONFIG.server_check_attempts) {
        TestLogger.info(`Waiting ${RUN_CONFIG.server_check_interval/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, RUN_CONFIG.server_check_interval));
      }
    }
  }
  
  return false;
}

// Генерация HTML отчета
function generateHtmlReport(jsonReport) {
  const template = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UniFarm E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin: 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #ecf0f1; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #34495e; }
        .summary-card .value { font-size: 24px; font-weight: bold; }
        .passed { color: #27ae60; }
        .failed { color: #e74c3c; }
        .success-rate { color: #3498db; }
        .test-details { margin-top: 30px; }
        .test-item { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .test-item.passed { border-left: 4px solid #27ae60; }
        .test-item.failed { border-left: 4px solid #e74c3c; }
        .test-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .test-name { font-weight: bold; font-size: 16px; }
        .test-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .test-status.passed { background: #27ae60; color: white; }
        .test-status.failed { background: #e74c3c; color: white; }
        .test-details-content { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .config-section { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 UniFarm E2E Test Report</h1>
            <p>Generated on: ${new Date(jsonReport.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${jsonReport.test_summary.total_tests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value passed">${jsonReport.test_summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value failed">${jsonReport.test_summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value success-rate">${jsonReport.test_summary.success_rate}%</div>
            </div>
        </div>
        
        <div class="test-details">
            <h2>Test Details</h2>
            ${jsonReport.test_details.map(test => `
                <div class="test-item ${test.status.toLowerCase()}">
                    <div class="test-header">
                        <span class="test-name">${test.name}</span>
                        <span class="test-status ${test.status.toLowerCase()}">${test.status}</span>
                    </div>
                    ${test.details ? `<div class="test-details-content">${JSON.stringify(test.details, null, 2)}</div>` : ''}
                    ${test.error ? `<div class="test-details-content" style="color: #e74c3c;">Error: ${test.error}</div>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="config-section">
            <h3>Test Configuration</h3>
            <pre>${JSON.stringify(jsonReport.configuration, null, 2)}</pre>
        </div>
        
        <div class="footer">
            <p>UniFarm E2E Test Suite - Safe Testing Environment</p>
        </div>
    </div>
</body>
</html>
  `;
  
  return template;
}

// Сохранение лог-файла
function saveExecutionLog(content) {
  if (RUN_CONFIG.save_logs) {
    const logPath = path.join(__dirname, RUN_CONFIG.log_file);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${content}\n`;
    
    fs.appendFileSync(logPath, logEntry);
  }
}

// Основная функция запуска
async function main() {
  console.log('🚀 Starting UniFarm E2E Test Runner...');
  
  try {
    // Проверка доступности сервера
    const serverReady = await waitForServer();
    if (!serverReady) {
      throw new Error('Server is not available. Please start the UniFarm server first.');
    }
    
    // Запуск тестов
    TestLogger.info('Starting E2E test execution...');
    saveExecutionLog('E2E test execution started');
    
    await runE2ETests();
    
    // Обработка результатов
    const reportPath = path.join(__dirname, 'e2e_test_report.json');
    
    if (fs.existsSync(reportPath)) {
      const jsonReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      // Генерация HTML отчета
      if (RUN_CONFIG.report_format === 'html') {
        const htmlReport = generateHtmlReport(jsonReport);
        const htmlPath = path.join(__dirname, 'e2e_test_report.html');
        fs.writeFileSync(htmlPath, htmlReport);
        
        TestLogger.success(`HTML report generated: ${htmlPath}`);
      }
      
      // Сводка результатов
      console.log('\n📊 EXECUTION SUMMARY:');
      console.log(`✅ Tests Passed: ${jsonReport.test_summary.passed}`);
      console.log(`❌ Tests Failed: ${jsonReport.test_summary.failed}`);
      console.log(`📈 Success Rate: ${jsonReport.test_summary.success_rate}%`);
      
      saveExecutionLog(`E2E test execution completed. Success rate: ${jsonReport.test_summary.success_rate}%`);
      
      // Выход с кодом состояния
      process.exit(jsonReport.test_summary.failed === 0 ? 0 : 1);
    } else {
      throw new Error('Test report not found');
    }
    
  } catch (error) {
    TestLogger.error(`Test runner failed: ${error.message}`);
    saveExecutionLog(`E2E test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Обработчики сигналов
process.on('SIGINT', () => {
  TestLogger.warn('Test execution interrupted by user');
  saveExecutionLog('Test execution interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  TestLogger.warn('Test execution terminated');
  saveExecutionLog('Test execution terminated');
  process.exit(143);
});

// Запуск
if (require.main === module) {
  main();
}

module.exports = {
  main,
  waitForServer,
  generateHtmlReport,
  RUN_CONFIG
};