import { SupabaseUserRepository } from '../modules/user/service.js';

async function testUser74() {
  console.log('Testing user ID 74 lookup...\n');
  
  const userRepository = new SupabaseUserRepository();
  
  try {
    // Test getUserById
    console.log('Testing getUserById(74)...');
    const user = await userRepository.getUserById(74);
    
    if (user) {
      console.log('✅ User found:', {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton
      });
    } else {
      console.log('❌ User ID 74 not found');
      
      // Try to create the user
      console.log('\nAttempting to create user ID 74...');
      const newUser = await userRepository.createUser({
        telegram_id: 999489,
        username: 'test_user_1752129840905',
        first_name: 'Test',
        balance_uni: 1000,
        balance_ton: 1000
      });
      
      if (newUser) {
        console.log('✅ User created:', newUser);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUser74().catch(console.error);