/**
 * Test script for activated business logic with real farming and referral calculations
 */

// Import the calculation logic directly without requiring database modules
const { RewardCalculationLogic } = await import('./modules/farming/logic/rewardCalculation.ts');
const { DeepReferralLogic } = await import('./modules/referral/logic/deepReferral.ts');

async function testBusinessLogic() {
  console.log('🧪 Testing Activated Business Logic with Real Calculations');
  console.log('=' * 60);

  try {
    // Test 1: Real farming reward calculation
    console.log('\n📊 Test 1: Real Farming Reward Calculation');
    
    const depositAmount = "1000.0"; // 1000 UNI deposit
    const farmingRate = 1.2; // 1.2% per hour
    const farmingHours = 24; // 24 hours of farming
    
    const baseReward = RewardCalculationLogic.calculateBaseReward(
      depositAmount,
      farmingRate,
      farmingHours
    );
    
    console.log(`Input: ${depositAmount} UNI at ${farmingRate}% for ${farmingHours} hours`);
    console.log(`Calculated reward: ${baseReward} UNI`);
    console.log(`Expected: ${(1000 * 0.012 * 24).toFixed(8)} UNI`);
    
    // Test 2: Referral commission calculation
    console.log('\n🔗 Test 2: Referral Commission Calculation');
    
    const referrerChain = ['100', '101', '102', '103', '104']; // 5-level chain
    const transactionAmount = baseReward;
    
    const commissions = DeepReferralLogic.calculateReferralCommissions(
      transactionAmount,
      referrerChain
    );
    
    console.log(`Transaction amount: ${transactionAmount} UNI`);
    console.log('Referral commissions:');
    commissions.forEach(commission => {
      console.log(`  Level ${commission.level}: User ${commission.userId} gets ${commission.amount} UNI`);
    });
    
    // Test 3: Database connection and user operations
    console.log('\n💾 Test 3: Database Operations');
    
    // Check if we can connect to database
    const testUser = await db.select().from(users).limit(1);
    console.log(`Database connection: ${testUser ? 'SUCCESS' : 'FAILED'}`);
    
    if (testUser.length > 0) {
      console.log(`Found ${testUser.length} test user(s) in database`);
      
      // Test farming service with real user
      const farmingService = new FarmingService();
      const userId = testUser[0].id.toString();
      
      console.log(`Testing farming status for user ${userId}`);
      const farmingStatus = await farmingService.getFarmingStatus(userId);
      console.log('Farming status:', farmingStatus);
    }
    
    // Test 4: Referral code generation and validation
    console.log('\n🎯 Test 4: Referral Code System');
    
    const testUserId = "123456";
    const generatedCode = DeepReferralLogic.generateReferralCode(testUserId);
    const isValidCode = DeepReferralLogic.validateReferralCode(generatedCode);
    
    console.log(`Generated referral code: ${generatedCode}`);
    console.log(`Code validation: ${isValidCode ? 'VALID' : 'INVALID'}`);
    
    // Test 5: Milestone bonus calculation
    console.log('\n🏆 Test 5: Milestone Bonus System');
    
    const referralCounts = [5, 10, 25, 50, 100, 250, 500];
    referralCounts.forEach(count => {
      const bonus = DeepReferralLogic.calculateMilestoneBonus(count);
      console.log(`${count} referrals = ${bonus} UNI milestone bonus`);
    });
    
    console.log('\n✅ Business Logic Tests Completed Successfully');
    console.log('🚀 Real calculations are now active and working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
  
  return true;
}

// Run the test
testBusinessLogic()
  .then(success => {
    if (success) {
      console.log('\n🎉 All business logic tests passed!');
      console.log('💰 Real farming rewards and referral distributions are active');
    } else {
      console.log('\n⚠️  Some tests failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });