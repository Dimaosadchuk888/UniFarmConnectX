/**
 * Детальная диагностика критических проблем
 */

import fetch from 'node-fetch';

async function diagnoseCriticalIssues() {
  console.log('🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА КРИТИЧЕСКИХ ПРОБЛЕМ\n');

  // 1. Проверка frontend loading
  console.log('1. FRONTEND LOADING:');
  try {
    const response = await fetch('https://uni-farm-connect-x-osadchukdmitro2.replit.app');
    const html = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content length: ${html.length}`);
    console.log(`Contains "UniFarm": ${html.includes('UniFarm')}`);
    console.log(`Contains "<!DOCTYPE html>": ${html.includes('<!DOCTYPE html>')}`);
    console.log(`First 200 chars: ${html.substring(0, 200)}`);
  } catch (error) {
    console.log(`Frontend error: ${error.message}`);
  }

  console.log('\n2. AIRDROP ENDPOINT:');
  try {
    const response = await fetch('http://localhost:3000/api/v2/airdrop/register');
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${await response.text()}`);
  } catch (error) {
    console.log(`Airdrop error: ${error.message}`);
  }

  console.log('\n3. BOT_TOKEN ENV:');
  console.log(`BOT_TOKEN defined: ${!!process.env.BOT_TOKEN}`);
  console.log(`BOT_TOKEN length: ${process.env.BOT_TOKEN ? process.env.BOT_TOKEN.length : 0}`);

  console.log('\n4. WEBHOOK STATUS:');
  try {
    const response = await fetch('https://api.telegram.org/bot7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug/getWebhookInfo');
    const data = await response.json();
    console.log(`Webhook info:`, JSON.stringify(data.result, null, 2));
  } catch (error) {
    console.log(`Webhook check error: ${error.message}`);
  }

  console.log('\n5. SERVER STATUS:');
  try {
    const health = await fetch('http://localhost:3000/health');
    const healthData = await health.json();
    console.log(`Server health:`, healthData);
  } catch (error) {
    console.log(`Server error: ${error.message}`);
  }
}

diagnoseCriticalIssues();