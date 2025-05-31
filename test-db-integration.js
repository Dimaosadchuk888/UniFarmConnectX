import { db } from './server/db.ts';
import { users } from './shared/schema.ts';

async function testDatabaseIntegration() {
  try {
    console.log('Testing database integration...');
    
    // Test 1: Count users
    const userList = await db.select().from(users).limit(3);
    console.log(`✅ Database connected successfully`);
    console.log(`   Found ${userList.length} users in database`);
    
    if (userList.length > 0) {
      const sampleUser = userList[0];
      console.log(`   Sample user: ID ${sampleUser.id}, Telegram ID: ${sampleUser.telegram_id}`);
      console.log(`   Balance: ${sampleUser.balance_uni} UNI, ${sampleUser.balance_ton} TON`);
    }
    
    console.log('✅ Database integration test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database integration test failed:', error.message);
    process.exit(1);
  }
}

testDatabaseIntegration();