#!/usr/bin/env tsx

/**
 * CACHE CLEANUP VERIFICATION SCRIPT
 * Проверяет состояние системы после полной очистки кэша
 */

import dotenv from 'dotenv';
dotenv.config();

interface VerificationResult {
  component: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  details: string;
}

class CacheCleanupVerifier {
  private results: VerificationResult[] = [];
  
  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
  
  private addResult(component: string, status: 'OK' | 'WARNING' | 'ERROR', details: string) {
    this.results.push({ component, status, details });
    const emoji = status === 'OK' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    this.log(`${emoji} ${component}: ${details}`);
  }
  
  async verifyServerProcess() {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('ps aux | grep "tsx server" | grep -v grep | wc -l');
      const processCount = parseInt(stdout.trim());
      
      if (processCount === 1) {
        this.addResult('Server Process', 'OK', 'Один активный серверный процесс');
      } else if (processCount === 0) {
        this.addResult('Server Process', 'ERROR', 'Сервер не запущен');
      } else {
        this.addResult('Server Process', 'WARNING', `${processCount} процессов (возможно дублирование)`);
      }
    } catch (error) {
      this.addResult('Server Process', 'ERROR', `Ошибка проверки: ${error}`);
    }
  }
  
  async verifyMemoryState() {
    try {
      const memInfo = process.memoryUsage();
      const usedMB = Math.round(memInfo.heapUsed / 1024 / 1024);
      const totalMB = Math.round(memInfo.heapTotal / 1024 / 1024);
      
      if (usedMB < 100) {
        this.addResult('Memory Usage', 'OK', `${usedMB}MB/${totalMB}MB (чистое состояние)`);
      } else if (usedMB < 200) {
        this.addResult('Memory Usage', 'WARNING', `${usedMB}MB/${totalMB}MB (умеренное использование)`);
      } else {
        this.addResult('Memory Usage', 'ERROR', `${usedMB}MB/${totalMB}MB (высокое использование)`);
      }
    } catch (error) {
      this.addResult('Memory Usage', 'ERROR', `Ошибка проверки памяти: ${error}`);
    }
  }
  
  async verifyEnvironmentVariables() {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_ADMIN_BOT_TOKEN'
    ];
    
    let allPresent = true;
    const missing: string[] = [];
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        allPresent = false;
        missing.push(varName);
      }
    });
    
    if (allPresent) {
      this.addResult('Environment Variables', 'OK', `Все ${requiredVars.length} переменных присутствуют`);
    } else {
      this.addResult('Environment Variables', 'ERROR', `Отсутствуют: ${missing.join(', ')}`);
    }
  }
  
  async verifyWebhookEndpoints() {
    try {
      const baseUrl = 'https://uni-farm-connect-unifarm01010101.replit.app';
      const endpoints = [
        '/api/v2/telegram/webhook',
        '/api/v2/admin-bot/webhook'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          });
          
          if (response.ok) {
            this.addResult(`Webhook ${endpoint}`, 'OK', `HTTP ${response.status} ${response.statusText}`);
          } else {
            this.addResult(`Webhook ${endpoint}`, 'WARNING', `HTTP ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          this.addResult(`Webhook ${endpoint}`, 'ERROR', `Ошибка соединения: ${error}`);
        }
      }
    } catch (error) {
      this.addResult('Webhook Endpoints', 'ERROR', `Общая ошибка: ${error}`);
    }
  }
  
  async runVerification() {
    this.log('🔍 ЗАПУСК ВЕРИФИКАЦИИ ПОСЛЕ ОЧИСТКИ КЭША');
    this.log('===============================================');
    
    await this.verifyServerProcess();
    await this.verifyMemoryState();
    await this.verifyEnvironmentVariables();
    await this.verifyWebhookEndpoints();
    
    this.log('\n📊 ИТОГОВЫЙ ОТЧЕТ');
    this.log('==================');
    
    const okCount = this.results.filter(r => r.status === 'OK').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;
    
    this.log(`✅ OK: ${okCount}`);
    this.log(`⚠️ WARNING: ${warningCount}`);
    this.log(`❌ ERROR: ${errorCount}`);
    
    if (errorCount === 0 && warningCount === 0) {
      this.log('\n🎉 СИСТЕМА ПОЛНОСТЬЮ ОЧИЩЕНА И ГОТОВА К РАБОТЕ');
    } else if (errorCount === 0) {
      this.log('\n🟡 СИСТЕМА РАБОТАЕТ, НО ЕСТЬ ПРЕДУПРЕЖДЕНИЯ');
    } else {
      this.log('\n🔴 ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ');
    }
    
    return { ok: okCount, warnings: warningCount, errors: errorCount };
  }
}

// Запуск верификации
const verifier = new CacheCleanupVerifier();
verifier.runVerification()
  .then(result => {
    console.log(`\nВерификация завершена: ${result.errors === 0 ? 'УСПЕШНО' : 'С ОШИБКАМИ'}`);
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Ошибка верификации:', error);
    process.exit(1);
  });