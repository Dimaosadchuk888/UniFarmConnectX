/**
 * Тест исправления синхронизации API с базой данных
 * Проверяет возврат актуальных данных через API после фикса UserController
 */

import { createClient } from '@supabase/supabase-js';

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testApiSyncFix() {
  console.log('🔄 ТЕСТ ИСПРАВЛЕНИЯ СИНХРОНИЗАЦИИ API');
  console.log('='.repeat(50));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const baseUrl = 'https://9e8e72ca-ad0e-4d1b-b689-b91a4832fe73-00-7a29dnah0ryx.spock.replit.dev';
  const userId = 48;
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTMzMDAsImV4cCI6MTc1MjIxODEwMH0.itCnOpcM4WQEksdm8M7L7tj1dGKuALNVFY0HQdIIk2I';
  
  try {
    // 1. Получаем данные напрямую из Supabase
    console.log('\n📊 1. ДАННЫЕ ИЗ SUPABASE (эталон):');
    
    const { data: supabaseUser, error: supabaseError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, ref_code')
      .eq('id', userId)
      .single();
    
    if (supabaseError) {
      console.log('❌ Ошибка Supabase:', supabaseError.message);
      return;
    }
    
    console.log(`   ID: ${supabaseUser.id}`);
    console.log(`   Username: ${supabaseUser.username}`);
    console.log(`   UNI Balance: ${supabaseUser.balance_uni}`);
    console.log(`   TON Balance: ${supabaseUser.balance_ton}`);
    console.log(`   Ref Code: ${supabaseUser.ref_code}`);
    
    // 2. Получаем данные через API
    console.log('\n🌐 2. ДАННЫЕ ИЗ API (после фикса):');
    
    const apiResponse = await fetch(`${baseUrl}/api/v2/users/profile`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!apiResponse.ok) {
      console.log(`❌ API ошибка: ${apiResponse.status} ${apiResponse.statusText}`);
      return;
    }
    
    const apiData = await apiResponse.json();
    const apiUser = apiData.data?.user;
    
    if (!apiUser) {
      console.log('❌ API не вернул данные пользователя');
      console.log('Полный ответ:', JSON.stringify(apiData, null, 2));
      return;
    }
    
    console.log(`   ID: ${apiUser.id}`);
    console.log(`   Username: ${apiUser.username}`);
    console.log(`   UNI Balance: ${apiUser.balance_uni || apiUser.uni_balance}`);
    console.log(`   TON Balance: ${apiUser.balance_ton || apiUser.ton_balance}`);
    console.log(`   Ref Code: ${apiUser.ref_code}`);
    
    // 3. Сравнение данных
    console.log('\n🔍 3. СРАВНЕНИЕ ДАННЫХ:');
    
    const checks = [
      {
        field: 'ID',
        supabase: supabaseUser.id,
        api: apiUser.id,
        match: supabaseUser.id === apiUser.id
      },
      {
        field: 'Username',
        supabase: supabaseUser.username,
        api: apiUser.username,
        match: supabaseUser.username === apiUser.username
      },
      {
        field: 'UNI Balance',
        supabase: supabaseUser.balance_uni,
        api: apiUser.balance_uni || apiUser.uni_balance,
        match: supabaseUser.balance_uni === (apiUser.balance_uni || apiUser.uni_balance)
      },
      {
        field: 'TON Balance',
        supabase: supabaseUser.balance_ton,
        api: apiUser.balance_ton || apiUser.ton_balance,
        match: supabaseUser.balance_ton === (apiUser.balance_ton || apiUser.ton_balance)
      },
      {
        field: 'Ref Code',
        supabase: supabaseUser.ref_code,
        api: apiUser.ref_code,
        match: supabaseUser.ref_code === apiUser.ref_code
      }
    ];
    
    let syncedFields = 0;
    
    checks.forEach(check => {
      const status = check.match ? '✅' : '❌';
      console.log(`   ${status} ${check.field}: Supabase=${check.supabase}, API=${check.api}`);
      if (check.match) syncedFields++;
    });
    
    // 4. Итоговая оценка
    console.log('\n📋 4. ИТОГОВАЯ ОЦЕНКА:');
    
    const syncPercentage = (syncedFields / checks.length) * 100;
    console.log(`   📊 Синхронизированных полей: ${syncedFields}/${checks.length} (${syncPercentage.toFixed(1)}%)`);
    
    if (syncPercentage === 100) {
      console.log('   🟢 СИНХРОНИЗАЦИЯ ИСПРАВЛЕНА - API возвращает актуальные данные');
    } else if (syncPercentage >= 80) {
      console.log('   🟡 ЧАСТИЧНАЯ СИНХРОНИЗАЦИЯ - большинство данных синхронизировано');
    } else {
      console.log('   🔴 ПРОБЛЕМЫ С СИНХРОНИЗАЦИЕЙ - требуется дополнительная доработка');
    }
    
    // 5. Специальная проверка TON баланса (главная проблема)
    console.log('\n💰 5. СПЕЦИАЛЬНАЯ ПРОВЕРКА TON БАЛАНСА:');
    
    const supabaseTon = parseFloat(supabaseUser.balance_ton);
    const apiTon = parseFloat(apiUser.balance_ton || apiUser.ton_balance || '0');
    
    console.log(`   Supabase TON: ${supabaseTon}`);
    console.log(`   API TON: ${apiTon}`);
    console.log(`   Разница: ${Math.abs(supabaseTon - apiTon).toFixed(6)} TON`);
    
    if (Math.abs(supabaseTon - apiTon) < 0.000001) {
      console.log('   ✅ TON БАЛАНС СИНХРОНИЗИРОВАН');
    } else {
      console.log('   ❌ TON БАЛАНС НЕ СИНХРОНИЗИРОВАН');
      console.log(`   📈 Ожидалось: ${supabaseTon} TON, получено: ${apiTon} TON`);
    }
    
  } catch (error) {
    console.log('❌ Общая ошибка тестирования:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🔄 ТЕСТ СИНХРОНИЗАЦИИ ЗАВЕРШЕН');
}

testApiSyncFix();