import fetch from 'node-fetch';

async function testHealth() {
    try {
        const response = await fetch('https://uni-farm-connect-unifarm01010101.replit.app/health');
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testHealth();