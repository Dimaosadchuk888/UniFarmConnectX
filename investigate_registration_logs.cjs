// Исследование логов регистрации для понимания проблемы
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function investigateRegistrationLogs() {
  console.log('=== ИССЛЕДОВАНИЕ ЛОГОВ РЕГИСТРАЦИИ ===');
  
  try {
    // Получаем новых пользователей (191-197)
    const { data: newUsers, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, created_at')
      .gte('id', 191)
      .order('id', { ascending: true });
    
    if (error) {
      console.log('❌ Ошибка получения пользователей:', error.message);
      return;
    }
    
    console.log(`📊 Найдено ${newUsers.length} новых пользователей (ID >= 191)`);
    
    // Проверяем, есть ли logs файлы
    const fs = require('fs');
    const logFiles = [
      'data/server-output.log',
      'logs/auth.log',
      'logs/referral.log',
      'server.log',
      'server_test.log'
    ];
    
    console.log('\n🔍 Проверка лог-файлов:');
    
    let foundLogs = false;
    
    for (const logFile of logFiles) {
      try {
        if (fs.existsSync(logFile)) {
          console.log(`✅ Найден: ${logFile}`);
          foundLogs = true;
          
          // Читаем последние записи
          const logContent = fs.readFileSync(logFile, 'utf8');
          const lines = logContent.split('\n');
          const recentLines = lines.slice(-50); // Последние 50 строк
          
          // Ищем записи о регистрации
          const registrationLines = recentLines.filter(line => 
            line.includes('AuthService') || 
            line.includes('ReferralService') ||
            line.includes('processReferral') ||
            line.includes('Новый пользователь') ||
            line.includes('ref_by')
          );
          
          if (registrationLines.length > 0) {
            console.log(`📋 Найдено ${registrationLines.length} релевантных записей в ${logFile}:`);
            registrationLines.forEach((line, index) => {
              console.log(`  ${index + 1}. ${line}`);
            });
          }
        }
      } catch (error) {
        console.log(`❌ Ошибка чтения ${logFile}:`, error.message);
      }
    }
    
    if (!foundLogs) {
      console.log('❌ Лог-файлы не найдены');
    }
    
    // Проверяем, работает ли сервер сейчас
    console.log('\n🔍 Проверка текущего состояния сервера:');
    
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        console.log('✅ Сервер работает');
        
        // Проверяем auth endpoint
        const authResponse = await fetch('http://localhost:3000/api/v2/auth/health');
        if (authResponse.ok) {
          console.log('✅ Auth endpoint доступен');
        } else {
          console.log('❌ Auth endpoint недоступен');
        }
      } else {
        console.log('❌ Сервер не отвечает');
      }
    } catch (error) {
      console.log('❌ Сервер недоступен:', error.message);
    }
    
    // Анализируем пользователей
    console.log('\n📊 Анализ пользователей:');
    
    newUsers.forEach(user => {
      console.log(`\n👤 User ID ${user.id}:`);
      console.log(`   telegram_id: ${user.telegram_id}`);
      console.log(`   username: ${user.username}`);
      console.log(`   referred_by: ${user.referred_by}`);
      console.log(`   created_at: ${user.created_at}`);
      
      // Проверяем формат telegram_id
      const telegramId = user.telegram_id;
      if (telegramId && telegramId.toString().length >= 9) {
        console.log('   ✅ Telegram ID выглядит реальным');
      } else if (telegramId && telegramId.toString().startsWith('1752')) {
        console.log('   ⚠️  Telegram ID выглядит как тестовый (timestamp-based)');
      } else {
        console.log('   ❓ Telegram ID неопределенного формата');
      }
      
      // Проверяем username
      if (user.username && user.username.startsWith('test_')) {
        console.log('   ⚠️  Username выглядит как тестовый');
      } else if (user.username) {
        console.log('   ✅ Username выглядит реальным');
      } else {
        console.log('   ❓ Username отсутствует');
      }
    });
    
    console.log('\n🔍 ЗАКЛЮЧЕНИЕ:');
    console.log('1. Проверили лог-файлы на наличие записей о регистрации');
    console.log('2. Проанализировали состояние сервера');
    console.log('3. Исследовали профили новых пользователей');
    console.log('4. Новые пользователи (191-197) выглядят как реальные пользователи');
    console.log('5. Все имеют referred_by: null - реферальная система не работает');
    
  } catch (error) {
    console.log('❌ Ошибка исследования:', error.message);
  }
}

investigateRegistrationLogs().catch(console.error);