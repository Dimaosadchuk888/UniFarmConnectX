/**
 * ПРОВЕРКА ЗАПУСКА СЕРВЕРА
 * Диагностика проблем с запуском после изменений
 */

const fs = require('fs');
const path = require('path');

async function testServerStartup() {
  console.log('=== ДИАГНОСТИКА ЗАПУСКА СЕРВЕРА ===\n');
  
  try {
    // Проверяем наличие файлов
    console.log('🔍 1. ПРОВЕРКА ФАЙЛОВ:');
    
    const files = [
      'start-unifarm.cjs',
      'modules/auth/service.ts',
      'modules/referral/service.ts',
      'server/index.ts'
    ];
    
    for (const file of files) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file} найден`);
      } else {
        console.log(`❌ ${file} НЕ найден`);
      }
    }
    
    // Проверяем синтаксис TypeScript
    console.log('\n🔍 2. ПРОВЕРКА СИНТАКСИСА:');
    
    const { execSync } = require('child_process');
    
    try {
      console.log('Проверка modules/auth/service.ts...');
      const result = execSync('tsx --check modules/auth/service.ts', { encoding: 'utf8', timeout: 5000 });
      console.log('✅ Синтаксис auth/service.ts корректен');
    } catch (error) {
      console.log('❌ Ошибка в auth/service.ts:', error.message);
    }
    
    try {
      console.log('Проверка modules/referral/service.ts...');
      const result = execSync('tsx --check modules/referral/service.ts', { encoding: 'utf8', timeout: 5000 });
      console.log('✅ Синтаксис referral/service.ts корректен');
    } catch (error) {
      console.log('❌ Ошибка в referral/service.ts:', error.message);
    }
    
    // Проверяем импорты
    console.log('\n🔍 3. ПРОВЕРКА ИМПОРТОВ:');
    
    const authContent = fs.readFileSync('modules/auth/service.ts', 'utf8');
    
    if (authContent.includes('import { ReferralService }')) {
      console.log('❌ Найден статический импорт ReferralService');
    } else {
      console.log('✅ Статический импорт ReferralService удален');
    }
    
    if (authContent.includes('processReferralInline')) {
      console.log('✅ Найден метод processReferralInline');
    } else {
      console.log('❌ Метод processReferralInline НЕ найден');
    }
    
    // Попытка запуска сервера
    console.log('\n🔍 4. ПОПЫТКА ЗАПУСКА СЕРВЕРА:');
    
    try {
      console.log('Запуск сервера...');
      const { spawn } = require('child_process');
      
      const server = spawn('node', ['start-unifarm.cjs'], {
        stdio: 'pipe',
        timeout: 10000
      });
      
      let output = '';
      let errorOutput = '';
      
      server.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      server.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      setTimeout(() => {
        server.kill();
        
        console.log('📋 Вывод сервера:');
        console.log(output);
        
        if (errorOutput) {
          console.log('📋 Ошибки сервера:');
          console.log(errorOutput);
        }
        
        // Проверяем, запустился ли сервер
        if (output.includes('listening on port') || output.includes('Server running')) {
          console.log('✅ Сервер успешно запустился');
        } else {
          console.log('❌ Сервер НЕ запустился');
        }
        
      }, 8000);
      
    } catch (error) {
      console.log('❌ Ошибка запуска:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testServerStartup();