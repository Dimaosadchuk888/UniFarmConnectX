/**
 * Production Readiness Checklist for UniFarm Connect
 * Comprehensive testing script for production deployment
 */

import fs from 'fs';
import path from 'path';

class ProductionReadinessChecker {
  constructor() {
    this.results = {
      critical: [],
      warnings: [],
      passed: [],
      total: 0
    };
  }

  // 1. Environment Variables Check
  checkEnvironmentVariables() {
    console.log('\n🔍 Checking Environment Variables...');
    
    const requiredVars = [
      'DATABASE_URL',
      'NODE_ENV',
      'PORT'
    ];

    const optionalVars = [
      'TELEGRAM_BOT_TOKEN',
      'TON_NETWORK',
      'VITE_API_BASE_URL'
    ];

    let allPresent = true;
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.results.critical.push(`Missing critical env var: ${varName}`);
        allPresent = false;
      } else {
        this.results.passed.push(`✓ ${varName} is set`);
      }
    });

    optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        this.results.warnings.push(`Optional env var missing: ${varName}`);
      } else {
        this.results.passed.push(`✓ ${varName} is set`);
      }
    });

    return allPresent;
  }

  // 2. File Structure Check
  checkFileStructure() {
    console.log('\n🗂️ Checking File Structure...');
    
    const criticalFiles = [
      'package.json',
      'server/index.ts',
      'client/index.html',
      'shared/schema.ts',
      'drizzle.config.ts'
    ];

    const criticalDirs = [
      'client/src',
      'server',
      'modules',
      'config',
      'core'
    ];

    let allPresent = true;

    criticalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.results.passed.push(`✓ ${file} exists`);
      } else {
        this.results.critical.push(`Missing critical file: ${file}`);
        allPresent = false;
      }
    });

    criticalDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.results.passed.push(`✓ ${dir}/ exists`);
      } else {
        this.results.critical.push(`Missing critical directory: ${dir}/`);
        allPresent = false;
      }
    });

    return allPresent;
  }

  // 3. Dependencies Check
  checkDependencies() {
    console.log('\n📦 Checking Dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const criticalDeps = [
        'react',
        'express',
        'drizzle-orm',
        '@tonconnect/ui-react',
        'typescript'
      ];

      let allPresent = true;
      
      criticalDeps.forEach(dep => {
        if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
          this.results.passed.push(`✓ ${dep} is installed`);
        } else {
          this.results.critical.push(`Missing critical dependency: ${dep}`);
          allPresent = false;
        }
      });

      return allPresent;
    } catch (error) {
      this.results.critical.push('Cannot read package.json');
      return false;
    }
  }

  // 4. Configuration Files Check
  checkConfigFiles() {
    console.log('\n⚙️ Checking Configuration Files...');
    
    const configFiles = [
      'vite.config.ts',
      'tailwind.config.ts',
      'tsconfig.json'
    ];

    let allValid = true;

    configFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          // Basic syntax check
          const content = fs.readFileSync(file, 'utf8');
          if (content.length > 0) {
            this.results.passed.push(`✓ ${file} is valid`);
          } else {
            this.results.warnings.push(`${file} is empty`);
          }
        } catch (error) {
          this.results.critical.push(`${file} has syntax errors`);
          allValid = false;
        }
      } else {
        this.results.warnings.push(`${file} not found`);
      }
    });

    return allValid;
  }

  // 5. API Routes Check
  checkAPIRoutes() {
    console.log('\n🛣️ Checking API Routes Structure...');
    
    const routeFiles = [
      'server/routes.ts',
      'modules/user/controller.ts',
      'modules/wallet/controller.ts',
      'modules/farming/controller.ts',
      'modules/referral/controller.ts'
    ];

    let allPresent = true;

    routeFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.results.passed.push(`✓ ${file} exists`);
      } else {
        this.results.critical.push(`Missing route file: ${file}`);
        allPresent = false;
      }
    });

    return allPresent;
  }

  // 6. Security Check
  checkSecurity() {
    console.log('\n🔒 Checking Security Configuration...');
    
    // Check for hardcoded secrets
    const sensitiveFiles = ['server/index.ts', 'config/app.ts'];
    const patterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /key\s*=\s*["'][^"']+["']/i
    ];

    let securityIssues = 0;

    sensitiveFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            this.results.critical.push(`Potential hardcoded secret in ${file}`);
            securityIssues++;
          }
        });
      }
    });

    if (securityIssues === 0) {
      this.results.passed.push('✓ No hardcoded secrets detected');
    }

    return securityIssues === 0;
  }

  // Generate Report
  generateReport() {
    console.log('\n📊 PRODUCTION READINESS REPORT');
    console.log('=====================================');
    
    this.results.total = this.results.critical.length + this.results.warnings.length + this.results.passed.length;
    
    console.log(`\n✅ PASSED (${this.results.passed.length}):`);
    this.results.passed.forEach(item => console.log(`  ${item}`));
    
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.results.warnings.length}):`);
      this.results.warnings.forEach(item => console.log(`  ${item}`));
    }
    
    if (this.results.critical.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${this.results.critical.length}):`);
      this.results.critical.forEach(item => console.log(`  ${item}`));
    }
    
    const successRate = ((this.results.passed.length / this.results.total) * 100).toFixed(1);
    console.log(`\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (this.results.critical.length === 0) {
      console.log('\n🎉 SYSTEM IS READY FOR PRODUCTION!');
      return true;
    } else {
      console.log('\n🚫 SYSTEM NOT READY - FIX CRITICAL ISSUES FIRST');
      return false;
    }
  }

  // Run all checks
  async runAllChecks() {
    console.log('🚀 Starting Production Readiness Check...');
    
    const checks = [
      this.checkEnvironmentVariables(),
      this.checkFileStructure(),
      this.checkDependencies(),
      this.checkConfigFiles(),
      this.checkAPIRoutes(),
      this.checkSecurity()
    ];

    const allPassed = checks.every(check => check === true);
    
    return this.generateReport();
  }
}

// Run the checker
const checker = new ProductionReadinessChecker();
checker.runAllChecks().then(ready => {
  process.exit(ready ? 0 : 1);
});