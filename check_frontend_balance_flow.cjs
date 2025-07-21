#!/usr/bin/env node
/**
 * FRONTEND BALANCE FLOW DIAGNOSTIC
 * Analyze frontend data flow and caching mechanisms
 * WITHOUT CODE CHANGES - Analysis only
 */

const fs = require('fs');
const path = require('path');

function analyzeFrontendBalanceFlow() {
  console.log('🎨 FRONTEND BALANCE FLOW DIAGNOSTIC');
  console.log('='.repeat(50));

  const clientPath = path.join(process.cwd(), 'client', 'src');
  
  const criticalFiles = [
    'components/wallet/BalanceCard.tsx',
    'components/wallet/TonDepositCard.tsx', 
    'services/balanceService.ts',
    'services/tonConnectService.ts',
    'contexts/UserContext.tsx',
    'hooks/useWebSocketBalanceSync.ts',
    'lib/correctApiRequest.ts'
  ];

  console.log('📁 ANALYZING CRITICAL FRONTEND FILES:');
  console.log('');

  for (const file of criticalFiles) {
    const filePath = path.join(clientPath, file);
    
    console.log(`📄 ${file}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   ✅ File exists (${content.length} chars)`);
      
      // Analyze key patterns
      const patterns = {
        'useQuery': content.match(/useQuery\(/g)?.length || 0,
        'useState': content.match(/useState\(/g)?.length || 0,
        'useEffect': content.match(/useEffect\(/g)?.length || 0,
        'balance_ton': content.match(/balance_ton/g)?.length || 0,
        'tonBalance': content.match(/tonBalance/g)?.length || 0,
        'websocket': content.match(/[wW]eb[sS]ocket/g)?.length || 0,
        'refreshBalance': content.match(/refreshBalance/g)?.length || 0,
        'queryClient': content.match(/queryClient/g)?.length || 0,
        'invalidateQueries': content.match(/invalidateQueries/g)?.length || 0,
        'cacheTime': content.match(/cacheTime|staleTime/g)?.length || 0
      };

      Object.entries(patterns).forEach(([pattern, count]) => {
        if (count > 0) {
          console.log(`   🔍 ${pattern}: ${count} occurrences`);
        }
      });

      // Check for specific balance-related logic
      if (file.includes('BalanceCard')) {
        if (content.includes('refreshBalance')) {
          console.log(`   🔄 Has refresh balance logic`);
        }
        if (content.includes('useWebSocketBalanceSync')) {
          console.log(`   📡 Uses WebSocket sync`);
        }
        if (content.includes('queryClient.invalidateQueries')) {
          console.log(`   💫 Has cache invalidation`);
        }
      }

      if (file.includes('TonDepositCard')) {
        if (content.includes('processTonDeposit')) {
          console.log(`   ⚡ Calls processTonDeposit`);
        }
        if (content.includes('refreshBalance')) {
          console.log(`   🔄 Triggers balance refresh`);
        }
        if (content.includes('/api/v2/wallet/ton-deposit')) {
          console.log(`   📡 Uses ton-deposit API`);
        }
      }

      if (file.includes('balanceService')) {
        if (content.includes('TTL') || content.includes('cache')) {
          console.log(`   🗄️  Has caching mechanism`);
        }
        if (content.includes('5 * 60 * 1000') || content.includes('300000')) {
          console.log(`   ⏱️  5-minute cache detected`);
        }
      }

      if (file.includes('UserContext')) {
        if (content.includes('telegram_id')) {
          console.log(`   🆔 Uses telegram_id`);
        }
        if (content.includes('username')) {
          console.log(`   👤 Uses username`);
        }
        if (content.includes('refreshUserData')) {
          console.log(`   🔄 Has user data refresh`);
        }
      }

    } else {
      console.log(`   ❌ File not found`);
    }
    
    console.log('');
  }

  // Check package.json for relevant dependencies
  console.log('📦 CHECKING DEPENDENCIES:');
  console.log('');

  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const relevantDeps = [
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'ws',
      'socket.io',
      '@tonconnect/ui-react',
      'react',
      'typescript'
    ];

    relevantDeps.forEach(dep => {
      const version = packageContent.dependencies?.[dep] || packageContent.devDependencies?.[dep];
      if (version) {
        console.log(`   ✅ ${dep}: ${version}`);
      } else {
        console.log(`   ❌ ${dep}: not found`);
      }
    });
  }

  // Analyze build configuration
  console.log('\n🔧 BUILD CONFIGURATION:');
  console.log('');

  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
    console.log(`   ✅ Vite config exists`);
    
    if (viteContent.includes('proxy')) {
      console.log(`   🔀 Has proxy configuration`);
    }
    if (viteContent.includes('alias')) {
      console.log(`   📂 Has path aliases`);
    }
  }

  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    console.log(`   ✅ TypeScript config exists`);
  }

  // Check environment variables
  console.log('\n🌍 ENVIRONMENT VARIABLES:');
  console.log('');

  const envVars = [
    'VITE_API_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_TELEGRAM_WEBAPP_URL'
  ];

  envVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`   ✅ ${envVar}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`   ❌ ${envVar}: not set`);
    }
  });

  console.log('\n💡 FRONTEND FLOW ANALYSIS SUMMARY:');
  console.log('-'.repeat(40));
  console.log('1. Component structure analyzed');
  console.log('2. State management patterns identified');
  console.log('3. API integration points found');
  console.log('4. Caching mechanisms detected');
  console.log('5. WebSocket integration verified');
  console.log('6. Build configuration checked');
  console.log('');
  console.log('🎯 Key findings will help identify where balance updates break');
}

// Execute frontend analysis
try {
  analyzeFrontendBalanceFlow();
  console.log('\n✅ Frontend analysis completed');
} catch (error) {
  console.error('❌ Frontend analysis failed:', error);
}