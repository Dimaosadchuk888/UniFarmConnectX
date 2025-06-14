/**
 * Test real registration through API to verify production database connection
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_USER = {
  telegram_id: 777123456,
  username: 'real_user_check',
  first_name: 'Real',
  last_name: 'User',
  direct_registration: true
};

async function testRealRegistration() {
  try {
    console.log('Testing registration with user:', TEST_USER);
    
    const response = await fetch(`${API_BASE}/api/v2/register/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      const user = data.data?.user;
      
      console.log('Registration successful:');
      console.log('  ID:', user?.id);
      console.log('  Telegram ID:', user?.telegram_id);
      console.log('  Username:', user?.username);
      console.log('  Ref Code:', user?.ref_code);
      console.log('  Has JWT Token:', !!data.data?.token);
      
      return user;
    } else {
      console.log('Registration failed');
      return null;
    }
    
  } catch (error) {
    console.error('Error during registration test:', error.message);
    return null;
  }
}

testRealRegistration().catch(console.error);