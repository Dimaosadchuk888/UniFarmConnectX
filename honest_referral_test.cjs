/**
 * ЧЕСТНЫЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ
 * Проверка реальной работы системы без преждевременных выводов
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function honestReferralTest() {
  console.log('=== ЧЕСТНЫЙ ТЕСТ РЕФЕРАЛЬНОЙ СИСТЕМЫ ===\n');
  
  try {
    // Проверка сервера
    console.log('🔍 1. ПРОВЕРКА СЕРВЕРА');
    let serverRunning = false;
    
    try {
      const response = await fetch('http://localhost:3000/health', { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Сервер работает:', data.status);
        serverRunning = true;
      } else {
        console.log('❌ Сервер отвечает с ошибкой:', response.status);
      }
    } catch (error) {
      console.log('❌ Сервер не отвечает:', error.message);
    }
    
    // Проверка состояния БД
    console.log('\n🔍 2. ПРОВЕРКА СОСТОЯНИЯ БД');
    
    const { data: usersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    const { data: referralsCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true });
    
    console.log(`👥 Всего пользователей: ${usersCount?.length || 0}`);
    console.log(`🔗 Всего реферальных связей: ${referralsCount?.length || 0}`);
    
    // Проверка последних регистраций
    console.log('\n🔍 3. ПРОВЕРКА ПОСЛЕДНИХ РЕГИСТРАЦИЙ');
    
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('Последние 5 пользователей:');
    recentUsers?.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, TG: ${user.telegram_id}, referred_by: ${user.referred_by || 'NULL'}`);
    });
    
    // Проверка User 224 (из описания проблемы)
    console.log('\n🔍 4. ПРОВЕРКА USER 224');
    
    const { data: user224 } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', 1768648474)
      .single();
    
    if (user224) {
      console.log('✅ User 224 найден:');
      console.log(`   ID: ${user224.id}`);
      console.log(`   Username: ${user224.username}`);
      console.log(`   referred_by: ${user224.referred_by || 'NULL'}`);
      console.log(`   ref_code: ${user224.ref_code}`);
      
      // Проверка есть ли запись в referrals
      const { data: user224Referral } = await supabase
        .from('referrals')
        .select('*')
        .eq('user_id', user224.id)
        .single();
      
      if (user224Referral) {
        console.log('✅ Запись в referrals найдена');
      } else {
        console.log('❌ Запись в referrals НЕ найдена');
      }
    } else {
      console.log('❌ User 224 не найден в БД');
    }
    
    // Общая статистика проблемы
    console.log('\n📊 5. СТАТИСТИКА ПРОБЛЕМЫ');
    
    const { data: usersWithReferredBy } = await supabase
      .from('users')
      .select('id')
      .not('referred_by', 'is', null);
    
    const { data: referralsRecords } = await supabase
      .from('referrals')
      .select('id');
    
    const usersWithReferredByCount = usersWithReferredBy?.length || 0;
    const referralsRecordsCount = referralsRecords?.length || 0;
    
    console.log(`👥 Пользователи с referred_by: ${usersWithReferredByCount}`);
    console.log(`🔗 Записи в referrals: ${referralsRecordsCount}`);
    
    const discrepancy = usersWithReferredByCount - referralsRecordsCount;
    console.log(`📊 Расхождение: ${discrepancy}`);
    
    if (discrepancy > 0) {
      console.log('❌ ПРОБЛЕМА ПОДТВЕРЖДЕНА: есть пользователи с referred_by, но без записей в referrals');
    } else {
      console.log('✅ Расхождений не найдено');
    }
    
    // Честный вывод
    console.log('\n🎯 6. ЧЕСТНЫЙ ВЫВОД');
    
    if (serverRunning) {
      console.log('✅ Сервер работает - можно проводить реальные тесты');
    } else {
      console.log('❌ Сервер не работает - нельзя проверить исправления');
    }
    
    if (discrepancy > 0) {
      console.log('❌ Реферальная система НЕ РАБОТАЕТ полностью');
      console.log('❌ Архитектурные изменения НЕ ПРОТЕСТИРОВАНЫ');
    } else {
      console.log('✅ Данные в БД согласованы');
    }
    
    console.log('\n📝 ТРЕБУЕТСЯ:');
    console.log('1. Запустить сервер корректно');
    console.log('2. Провести реальный тест с новой регистрацией');
    console.log('3. Проверить создание записей в referred_by И referrals');
    console.log('4. Только после успешного теста утверждать что проблема решена');
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

honestReferralTest();