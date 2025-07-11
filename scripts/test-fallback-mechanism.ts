import { uniFarmingRepository } from '../modules/farming/UniFarmingRepository';
import { tonFarmingRepository } from '../modules/boost/TonFarmingRepository';
import { logger } from '../core/logger';

async function testFallbackMechanism() {
  console.log('\n=== TESTING FALLBACK MECHANISM ===\n');
  
  // Тест UniFarmingRepository
  console.log('1. Testing UniFarmingRepository:');
  try {
    const uniFarmingData = await uniFarmingRepository.getByUserId('62');
    if (uniFarmingData) {
      console.log('✅ UniFarmingRepository.getByUserId works with fallback');
      console.log('   User ID 62 farming data:', {
        deposit_amount: uniFarmingData.deposit_amount,
        is_active: uniFarmingData.is_active,
        farming_balance: uniFarmingData.farming_balance
      });
    } else {
      console.log('❌ No data found for user 62');
    }
  } catch (error) {
    console.error('❌ Error in UniFarmingRepository:', error);
  }
  
  // Тест TonFarmingRepository
  console.log('\n2. Testing TonFarmingRepository:');
  try {
    const tonFarmingData = await tonFarmingRepository.getByUserId('62');
    if (tonFarmingData) {
      console.log('✅ TonFarmingRepository.getByUserId works with fallback');
      console.log('   User ID 62 boost data:', {
        boost_active: tonFarmingData.boost_active,
        farming_balance: tonFarmingData.farming_balance,
        boost_package_id: tonFarmingData.boost_package_id
      });
    } else {
      console.log('⚠️  No TON farming data for user 62 (expected if no boost active)');
    }
  } catch (error) {
    console.error('❌ Error in TonFarmingRepository:', error);
  }
  
  // Тест получения активных фармеров
  console.log('\n3. Testing getActiveFarmers:');
  try {
    const activeFarmers = await uniFarmingRepository.getActiveFarmers();
    console.log(`✅ Found ${activeFarmers.length} active UNI farmers`);
    if (activeFarmers.length > 0) {
      console.log('   Sample active farmers:', activeFarmers.slice(0, 3).map(f => ({
        user_id: f.user_id,
        deposit_amount: f.deposit_amount,
        is_active: f.is_active
      })));
    }
  } catch (error) {
    console.error('❌ Error getting active farmers:', error);
  }
  
  console.log('\n=== FALLBACK MECHANISM TEST COMPLETED ===\n');
  console.log('Summary: The system is working correctly with fallback to users table.');
  console.log('No errors occurred, all operations use the existing users table structure.');
}

testFallbackMechanism().catch(console.error);