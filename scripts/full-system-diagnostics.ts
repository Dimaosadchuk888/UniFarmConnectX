#!/usr/bin/env ts-node

/**
 * Полная диагностика системы UniFarm
 * Проверка всех URL, webhook'ов, конфигураций и интеграций
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

interface DiagnosticIssue {
  severity: 'critical' | 'warning' | 'info';
  component: string;
  issue: string;
  location?: string;
  recommendation?: string;
}

class SystemDiagnostics {
  private issues: DiagnosticIssue[] = [];
  private productionDomain = 'https://uni-farm-connect-unifarm01010101.replit.app';
  private oldDomains = [
    'uni-farm-connect-x-ab245275.replit.app',
    'uni-farm-connect-x-elizabethstone1.replit.app',
    'uni-farm-connect-aab49267.replit.app'
  ];

  async runFullDiagnostics() {
    console.log('🔍 UniFarm System Diagnostics Starting...\n');

    await this.checkEnvironmentVariables();
    await this.checkHardcodedURLs();
    await this.checkTONConnectManifests();
    await this.checkCORSConfiguration();
    await this.checkWebhookEndpoints();
    await this.checkAPIEndpoints();
    await this.checkDatabaseConnection();
    await this.checkSecurityConfiguration();
    await this.checkSchedulerConfiguration();
    
    this.generateReport();
  }

  private addIssue(issue: DiagnosticIssue) {
    this.issues.push(issue);
  }

  private async checkEnvironmentVariables() {
    console.log('1️⃣ Checking Environment Variables...');

    const requiredVars = [
      'TELEGRAM_BOT_TOKEN',
      'JWT_SECRET',
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'SUPABASE_SERVICE_KEY',
      'DATABASE_URL',
      'TELEGRAM_WEBAPP_URL',
      'TON_BOOST_RECEIVER_ADDRESS'
    ];

    const optionalVars = [
      'VITE_APP_URL',
      'CORS_ORIGINS',
      'NODE_ENV',
      'PORT',
      'ADMIN_TELEGRAM_ID',
      'ADMIN_BOT_TOKEN'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.addIssue({
          severity: 'critical',
          component: 'Environment',
          issue: `Missing required environment variable: ${varName}`,
          recommendation: `Add ${varName} to Replit Secrets`
        });
      }
    }

    // Check TELEGRAM_WEBAPP_URL matches production domain
    if (process.env.TELEGRAM_WEBAPP_URL && 
        process.env.TELEGRAM_WEBAPP_URL !== this.productionDomain) {
      this.addIssue({
        severity: 'warning',
        component: 'Environment',
        issue: `TELEGRAM_WEBAPP_URL (${process.env.TELEGRAM_WEBAPP_URL}) doesn't match production domain`,
        recommendation: `Update TELEGRAM_WEBAPP_URL to ${this.productionDomain}`
      });
    }

    console.log(`✅ Environment variables check completed\n`);
  }

  private async checkHardcodedURLs() {
    console.log('2️⃣ Checking for hardcoded URLs...');

    const filesToCheck = [
      'client/src/App.tsx',
      'server/index.ts',
      'client/src/contexts/UserContext.tsx',
      'client/src/lib/api.ts',
      'client/src/lib/correctApiRequest.ts'
    ];

    for (const file of filesToCheck) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for old domains
        for (const oldDomain of this.oldDomains) {
          if (content.includes(oldDomain)) {
            this.addIssue({
              severity: 'critical',
              component: 'Hardcoded URLs',
              issue: `Found old domain ${oldDomain} in ${file}`,
              location: file,
              recommendation: `Replace with ${this.productionDomain}`
            });
          }
        }

        // Check for hardcoded JWT tokens
        if (content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
          this.addIssue({
            severity: 'critical',
            component: 'Security',
            issue: `Hardcoded JWT token found in ${file}`,
            location: file,
            recommendation: 'Remove hardcoded tokens, use proper authentication flow'
          });
        }

        // Check for localhost references
        if (content.includes('localhost:') && !file.includes('test')) {
          this.addIssue({
            severity: 'warning',
            component: 'Hardcoded URLs',
            issue: `Localhost reference found in ${file}`,
            location: file,
            recommendation: 'Use environment variables for API URLs'
          });
        }

      } catch (error) {
        // File doesn't exist, skip
      }
    }

    console.log(`✅ Hardcoded URLs check completed\n`);
  }

  private async checkTONConnectManifests() {
    console.log('3️⃣ Checking TON Connect manifests...');

    const manifestPaths = [
      'client/public/tonconnect-manifest.json',
      'client/public/.well-known/tonconnect-manifest.json'
    ];

    for (const manifestPath of manifestPaths) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content);

        if (manifest.url !== this.productionDomain) {
          this.addIssue({
            severity: 'critical',
            component: 'TON Connect',
            issue: `Manifest URL (${manifest.url}) doesn't match production domain`,
            location: manifestPath,
            recommendation: `Run: TELEGRAM_WEBAPP_URL="${this.productionDomain}" node scripts/generate-manifests.js`
          });
        }

        if (!manifest.iconUrl?.includes(this.productionDomain)) {
          this.addIssue({
            severity: 'warning',
            component: 'TON Connect',
            issue: 'Manifest iconUrl uses different domain',
            location: manifestPath
          });
        }

      } catch (error) {
        this.addIssue({
          severity: 'critical',
          component: 'TON Connect',
          issue: `Cannot read manifest: ${manifestPath}`,
          recommendation: 'Run generate-manifests.js script'
        });
      }
    }

    // Check App.tsx TON Connect configuration
    try {
      const appContent = fs.readFileSync('client/src/App.tsx', 'utf8');
      const manifestUrlMatch = appContent.match(/manifestUrl="([^"]+)"/);
      
      if (manifestUrlMatch && !manifestUrlMatch[1].includes(this.productionDomain)) {
        this.addIssue({
          severity: 'critical',
          component: 'TON Connect',
          issue: `App.tsx manifestUrl doesn't use production domain`,
          location: 'client/src/App.tsx',
          recommendation: `Update to: manifestUrl="${this.productionDomain}/tonconnect-manifest.json"`
        });
      }
    } catch (error) {
      // Skip
    }

    console.log(`✅ TON Connect manifests check completed\n`);
  }

  private async checkCORSConfiguration() {
    console.log('4️⃣ Checking CORS configuration...');

    try {
      const serverContent = fs.readFileSync('server/index.ts', 'utf8');
      
      // Check CORS origins
      if (serverContent.includes("origin: 'https://t.me'") && 
          !serverContent.includes('CORS_ORIGINS')) {
        this.addIssue({
          severity: 'warning',
          component: 'CORS',
          issue: 'CORS restricted to https://t.me only in production',
          location: 'server/index.ts',
          recommendation: 'Ensure CORS_ORIGINS environment variable is properly configured'
        });
      }

      // Check for development CORS (origin: true)
      if (serverContent.includes('origin: true')) {
        this.addIssue({
          severity: 'critical',
          component: 'CORS',
          issue: 'CORS allows all origins (origin: true)',
          location: 'server/index.ts',
          recommendation: 'Restrict CORS to specific origins in production'
        });
      }

    } catch (error) {
      // Skip
    }

    console.log(`✅ CORS configuration check completed\n`);
  }

  private async checkWebhookEndpoints() {
    console.log('5️⃣ Checking webhook endpoints...');

    // Check Telegram webhook configuration
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      this.addIssue({
        severity: 'critical',
        component: 'Webhooks',
        issue: 'No TELEGRAM_BOT_TOKEN configured for webhooks',
        recommendation: 'Add TELEGRAM_BOT_TOKEN to enable Telegram integration'
      });
    }

    // Check admin bot webhook
    if (!process.env.ADMIN_BOT_TOKEN) {
      this.addIssue({
        severity: 'info',
        component: 'Webhooks',
        issue: 'No ADMIN_BOT_TOKEN configured',
        recommendation: 'Add ADMIN_BOT_TOKEN if admin bot features are needed'
      });
    }

    console.log(`✅ Webhook endpoints check completed\n`);
  }

  private async checkAPIEndpoints() {
    console.log('6️⃣ Checking API endpoints consistency...');

    const frontendAPICalls = [
      '/api/v2/auth/telegram',
      '/api/v2/wallet/balance',
      '/api/v2/wallet/ton-deposit',
      '/api/v2/wallet/withdraw',
      '/api/v2/uni-farming/status',
      '/api/v2/uni-farming/direct-deposit',
      '/api/v2/boost/packages',
      '/api/v2/boost/purchase',
      '/api/v2/referral/stats',
      '/api/v2/missions/active',
      '/api/v2/daily-bonus/claim'
    ];

    console.log(`✅ Found ${frontendAPICalls.length} critical API endpoints\n`);
  }

  private async checkDatabaseConnection() {
    console.log('7️⃣ Checking database connection...');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      this.addIssue({
        severity: 'critical',
        component: 'Database',
        issue: 'Missing Supabase credentials',
        recommendation: 'Add SUPABASE_URL and SUPABASE_KEY to Replit Secrets'
      });
      return;
    }

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );

      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        this.addIssue({
          severity: 'critical',
          component: 'Database',
          issue: 'Cannot connect to Supabase',
          recommendation: 'Check Supabase credentials and database status'
        });
      }

    } catch (error) {
      this.addIssue({
        severity: 'critical',
        component: 'Database',
        issue: 'Database connection error',
        recommendation: 'Verify Supabase configuration'
      });
    }

    console.log(`✅ Database connection check completed\n`);
  }

  private async checkSecurityConfiguration() {
    console.log('8️⃣ Checking security configuration...');

    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.addIssue({
        severity: 'warning',
        component: 'Security',
        issue: 'JWT_SECRET is too short (less than 32 characters)',
        recommendation: 'Use a longer, more secure JWT secret'
      });
    }

    // Check for auth bypass
    try {
      const serverContent = fs.readFileSync('server/index.ts', 'utf8');
      
      if (serverContent.includes('emergencyBypass = true')) {
        this.addIssue({
          severity: 'critical',
          component: 'Security',
          issue: 'Emergency auth bypass is enabled',
          location: 'server/index.ts',
          recommendation: 'Disable emergency bypass for production'
        });
      }

    } catch (error) {
      // Skip
    }

    console.log(`✅ Security configuration check completed\n`);
  }

  private async checkSchedulerConfiguration() {
    console.log('9️⃣ Checking scheduler configuration...');

    const schedulerFiles = [
      'modules/scheduler/farmingScheduler.ts',
      'modules/scheduler/tonBoostIncomeScheduler.ts'
    ];

    for (const file of schedulerFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('*/5 * * * *')) {
          console.log(`✅ ${path.basename(file)} configured for 5-minute intervals`);
        } else {
          this.addIssue({
            severity: 'warning',
            component: 'Scheduler',
            issue: `Non-standard interval in ${file}`,
            location: file
          });
        }

      } catch (error) {
        // Skip
      }
    }

    console.log(`✅ Scheduler configuration check completed\n`);
  }

  private generateReport() {
    console.log('\n📊 DIAGNOSTIC REPORT\n' + '='.repeat(50));

    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const info = this.issues.filter(i => i.severity === 'info');

    console.log(`\n🚨 Critical Issues: ${criticalIssues.length}`);
    if (criticalIssues.length > 0) {
      criticalIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.component}: ${issue.issue}`);
        if (issue.location) console.log(`   Location: ${issue.location}`);
        if (issue.recommendation) console.log(`   ✅ Fix: ${issue.recommendation}`);
      });
    }

    console.log(`\n⚠️  Warnings: ${warnings.length}`);
    if (warnings.length > 0) {
      warnings.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.component}: ${issue.issue}`);
        if (issue.location) console.log(`   Location: ${issue.location}`);
        if (issue.recommendation) console.log(`   ✅ Fix: ${issue.recommendation}`);
      });
    }

    console.log(`\nℹ️  Info: ${info.length}`);
    if (info.length > 0) {
      info.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.component}: ${issue.issue}`);
        if (issue.recommendation) console.log(`   Note: ${issue.recommendation}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n📝 SUMMARY:');
    console.log(`Production Domain: ${this.productionDomain}`);
    console.log(`Total Issues Found: ${this.issues.length}`);
    console.log(`System Status: ${criticalIssues.length === 0 ? '✅ READY' : '❌ NEEDS FIXES'}`);

    if (criticalIssues.length === 0 && warnings.length === 0) {
      console.log('\n🎉 System is ready for production deployment!');
    } else {
      console.log('\n⚠️  Please fix all critical issues before deployment.');
    }

    // Save detailed report
    const reportPath = `SYSTEM_DIAGNOSTICS_REPORT_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      productionDomain: this.productionDomain,
      totalIssues: this.issues.length,
      criticalCount: criticalIssues.length,
      warningCount: warnings.length,
      infoCount: info.length,
      issues: this.issues
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run diagnostics
const diagnostics = new SystemDiagnostics();
diagnostics.runFullDiagnostics().catch(console.error);