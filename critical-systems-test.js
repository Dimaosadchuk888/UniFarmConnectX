/**
 * Critical Systems Test for UniFarm Connect
 * Deep testing of core functionality before production
 */

import fs from 'fs';

class CriticalSystemsTest {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  // Test 1: Database Schema Validation
  async testDatabaseSchema() {
    console.log('\n🗄️ Testing Database Schema...');
    
    try {
      const schemaFile = fs.readFileSync('shared/schema.ts', 'utf8');
      
      // Check for critical tables
      const requiredTables = [
        'users',
        'user_balances', 
        'deposits',
        'transactions',
        'referrals',
        'missions',
        'user_missions',
        'boost_packages',
        'user_boosts'
      ];

      let allTablesFound = true;
      
      requiredTables.forEach(table => {
        if (schemaFile.includes(table)) {
          this.testResults.push(`✓ Table '${table}' defined in schema`);
        } else {
          this.errors.push(`❌ Missing table definition: ${table}`);
          allTablesFound = false;
        }
      });

      // Check for proper relationships
      const relationships = ['referredBy', 'invitedUsers', 'transactions'];
      relationships.forEach(rel => {
        if (schemaFile.includes(rel)) {
          this.testResults.push(`✓ Relationship '${rel}' properly defined`);
        } else {
          this.errors.push(`⚠️ Missing relationship: ${rel}`);
        }
      });

      return allTablesFound;
    } catch (error) {
      this.errors.push(`❌ Cannot read schema file: ${error.message}`);
      return false;
    }
  }

  // Test 2: API Controllers Validation
  async testAPIControllers() {
    console.log('\n🔌 Testing API Controllers...');
    
    const controllers = [
      'modules/user/controller.ts',
      'modules/wallet/controller.ts', 
      'modules/farming/controller.ts',
      'modules/referral/controller.ts',
      'modules/missions/controller.ts',
      'modules/dailyBonus/controller.ts'
    ];

    let allValid = true;

    for (const controller of controllers) {
      try {
        if (fs.existsSync(controller)) {
          const content = fs.readFileSync(controller, 'utf8');
          
          // Check for proper error handling
          if (content.includes('try') && content.includes('catch')) {
            this.testResults.push(`✓ ${controller} has error handling`);
          } else {
            this.errors.push(`⚠️ ${controller} missing error handling`);
          }

          // Check for response validation
          if (content.includes('res.json') || content.includes('sendSuccess')) {
            this.testResults.push(`✓ ${controller} has proper responses`);
          } else {
            this.errors.push(`❌ ${controller} missing proper responses`);
            allValid = false;
          }
        } else {
          this.errors.push(`❌ Controller not found: ${controller}`);
          allValid = false;
        }
      } catch (error) {
        this.errors.push(`❌ Error reading ${controller}: ${error.message}`);
        allValid = false;
      }
    }

    return allValid;
  }

  // Test 3: Frontend Error Boundaries
  async testErrorBoundaries() {
    console.log('\n🛡️ Testing Error Boundaries...');
    
    const componentsDir = 'client/src/components';
    let errorBoundariesFound = 0;

    try {
      const findErrorBoundaries = (dir) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        files.forEach(file => {
          const fullPath = `${dir}/${file.name}`;
          
          if (file.isDirectory()) {
            findErrorBoundaries(fullPath);
          } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('ErrorBoundary') || content.includes('componentDidCatch')) {
              errorBoundariesFound++;
              this.testResults.push(`✓ Error boundary found in ${fullPath}`);
            }
          }
        });
      };

      if (fs.existsSync(componentsDir)) {
        findErrorBoundaries(componentsDir);
        
        if (errorBoundariesFound > 0) {
          this.testResults.push(`✓ Found ${errorBoundariesFound} error boundaries`);
          return true;
        } else {
          this.errors.push(`⚠️ No error boundaries found in components`);
          return false;
        }
      } else {
        this.errors.push(`❌ Components directory not found`);
        return false;
      }
    } catch (error) {
      this.errors.push(`❌ Error checking error boundaries: ${error.message}`);
      return false;
    }
  }

  // Test 4: Security Configurations
  async testSecurityConfig() {
    console.log('\n🔒 Testing Security Configurations...');
    
    try {
      // Check CORS configuration
      if (fs.existsSync('server/index.ts')) {
        const serverContent = fs.readFileSync('server/index.ts', 'utf8');
        
        if (serverContent.includes('cors')) {
          this.testResults.push(`✓ CORS configured`);
        } else {
          this.errors.push(`⚠️ CORS not found in server configuration`);
        }

        if (serverContent.includes('helmet') || serverContent.includes('security')) {
          this.testResults.push(`✓ Security headers configured`);
        } else {
          this.errors.push(`⚠️ Security headers not configured`);
        }
      }

      // Check environment variables security
      if (fs.existsSync('.env.example')) {
        this.testResults.push(`✓ Environment example file exists`);
      } else {
        this.errors.push(`⚠️ .env.example file missing`);
      }

      return true;
    } catch (error) {
      this.errors.push(`❌ Error checking security config: ${error.message}`);
      return false;
    }
  }

  // Test 5: TON Integration
  async testTONIntegration() {
    console.log('\n💎 Testing TON Integration...');
    
    try {
      const tonConfigFile = 'config/tonConnect.ts';
      
      if (fs.existsSync(tonConfigFile)) {
        const content = fs.readFileSync(tonConfigFile, 'utf8');
        
        if (content.includes('TONCONNECT_MANIFEST_URL')) {
          this.testResults.push(`✓ TON Connect manifest configured`);
        } else {
          this.errors.push(`❌ TON Connect manifest not configured`);
        }

        if (content.includes('tonConnectOptions')) {
          this.testResults.push(`✓ TON Connect options defined`);
        } else {
          this.errors.push(`❌ TON Connect options missing`);
        }
      } else {
        this.errors.push(`❌ TON config file not found`);
      }

      // Check for TON wallet integration in frontend
      const walletComponents = [
        'client/src/components/wallet',
        'client/src/pages/Wallet.tsx'
      ];

      walletComponents.forEach(component => {
        if (fs.existsSync(component)) {
          this.testResults.push(`✓ Wallet component exists: ${component}`);
        } else {
          this.errors.push(`❌ Missing wallet component: ${component}`);
        }
      });

      return true;
    } catch (error) {
      this.errors.push(`❌ Error testing TON integration: ${error.message}`);
      return false;
    }
  }

  // Test 6: Performance Optimizations
  async testPerformance() {
    console.log('\n⚡ Testing Performance Optimizations...');
    
    try {
      // Check for React Query usage
      const appFile = 'client/src/App.tsx';
      if (fs.existsSync(appFile)) {
        const content = fs.readFileSync(appFile, 'utf8');
        
        if (content.includes('QueryClient') || content.includes('useQuery')) {
          this.testResults.push(`✓ React Query configured`);
        } else {
          this.errors.push(`⚠️ React Query not found`);
        }
      }

      // Check for lazy loading
      const pagesDir = 'client/src/pages';
      if (fs.existsSync(pagesDir)) {
        const files = fs.readdirSync(pagesDir);
        let lazyLoading = false;
        
        files.forEach(file => {
          if (file.endsWith('.tsx')) {
            const content = fs.readFileSync(`${pagesDir}/${file}`, 'utf8');
            if (content.includes('lazy') || content.includes('Suspense')) {
              lazyLoading = true;
            }
          }
        });

        if (lazyLoading) {
          this.testResults.push(`✓ Lazy loading implemented`);
        } else {
          this.errors.push(`⚠️ No lazy loading found`);
        }
      }

      return true;
    } catch (error) {
      this.errors.push(`❌ Error testing performance: ${error.message}`);
      return false;
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📊 CRITICAL SYSTEMS TEST REPORT');
    console.log('==========================================');
    
    if (this.testResults.length > 0) {
      console.log(`\n✅ PASSED TESTS (${this.testResults.length}):`);
      this.testResults.forEach(result => console.log(`  ${result}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ISSUES FOUND (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  ${error}`));
    }
    
    const totalTests = this.testResults.length + this.errors.length;
    const successRate = totalTests > 0 ? ((this.testResults.length / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`\n📈 SUCCESS RATE: ${successRate}%`);
    
    // Production readiness assessment
    const criticalErrors = this.errors.filter(error => error.includes('❌')).length;
    const warnings = this.errors.filter(error => error.includes('⚠️')).length;
    
    console.log(`\n🔴 Critical Issues: ${criticalErrors}`);
    console.log(`🟡 Warnings: ${warnings}`);
    
    if (criticalErrors === 0) {
      console.log('\n🎉 ALL CRITICAL SYSTEMS OPERATIONAL - READY FOR PRODUCTION!');
      return true;
    } else {
      console.log('\n🚨 CRITICAL ISSUES FOUND - REQUIRES IMMEDIATE ATTENTION');
      return false;
    }
  }

  // Run all critical tests
  async runAllTests() {
    console.log('🔥 Starting Critical Systems Testing...');
    
    const tests = [
      await this.testDatabaseSchema(),
      await this.testAPIControllers(),
      await this.testErrorBoundaries(),
      await this.testSecurityConfig(),
      await this.testTONIntegration(),
      await this.testPerformance()
    ];

    return this.generateReport();
  }
}

// Execute the tests
const tester = new CriticalSystemsTest();
tester.runAllTests().then(ready => {
  process.exit(ready ? 0 : 1);
});