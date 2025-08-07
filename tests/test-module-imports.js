// Test module imports one by one

async function testImports() {
  const modules = [
    { name: 'auth', path: './modules/auth/routes.js' },
    { name: 'monitor', path: './modules/monitor/routes.js' },
    { name: 'farming', path: './modules/farming/routes.js' },
    { name: 'user', path: './modules/user/routes.js' },
    { name: 'wallet', path: './modules/wallet/routes.js' },
    { name: 'boost', path: './modules/boost/routes.js' },
    { name: 'missions', path: './modules/missions/routes.js' },
    { name: 'referral', path: './modules/referral/routes.js' },
    { name: 'dailyBonus', path: './modules/dailyBonus/routes.js' },
    { name: 'telegram', path: './modules/telegram/routes.js' },
    { name: 'tonFarming', path: './modules/tonFarming/routes.js' },
    { name: 'transactions', path: './modules/transactions/routes.js' },
    { name: 'airdrop', path: './modules/airdrop/routes.js' },
    { name: 'admin', path: './modules/admin/routes.js' },
    { name: 'adminBot', path: './modules/adminBot/routes.js' },
    { name: 'debug', path: './modules/debug/debugRoutes.js' }
  ];

  for (const mod of modules) {
    try {
      console.log(`Testing import: ${mod.name}...`);
      const moduleImport = await import(mod.path);
      console.log(`✅ ${mod.name}: SUCCESS`);
    } catch (error) {
      console.error(`❌ ${mod.name}: FAILED`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

testImports().catch(console.error);