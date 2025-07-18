// Тест импорта ReferralService из auth/service.ts
const path = require('path');

async function testAuthImport() {
  console.log('=== ТЕСТ ИМПОРТА В AUTH SERVICE ===');
  
  try {
    console.log('1. Проверяем существование файла referral/service.ts...');
    
    const fs = require('fs');
    const referralServicePath = path.join(__dirname, 'modules/referral/service.ts');
    
    if (fs.existsSync(referralServicePath)) {
      console.log('✅ Файл modules/referral/service.ts существует');
    } else {
      console.log('❌ Файл modules/referral/service.ts НЕ найден');
      return;
    }
    
    console.log('2. Проверяем динамический импорт...');
    
    // Тестируем именно тот код что в auth/service.ts
    try {
      const { ReferralService } = await import('../modules/referral/service');
      console.log('✅ Динамический импорт работает');
      
      const referralService = new ReferralService();
      console.log('✅ Создание экземпляра ReferralService работает');
      
      // Проверяем метод processReferral
      if (typeof referralService.processReferral === 'function') {
        console.log('✅ Метод processReferral существует');
      } else {
        console.log('❌ Метод processReferral НЕ найден');
      }
      
    } catch (importError) {
      console.log('❌ Ошибка динамического импорта:', importError.message);
      
      // Попробуем альтернативный способ импорта
      try {
        const referralModule = require('./modules/referral/service.js');
        console.log('✅ Альтернативный импорт через require работает');
        
        if (referralModule.ReferralService) {
          console.log('✅ ReferralService найден в require');
        } else {
          console.log('❌ ReferralService НЕ найден в require');
          console.log('Доступные экспорты:', Object.keys(referralModule));
        }
      } catch (requireError) {
        console.log('❌ Альтернативный импорт через require НЕ работает:', requireError.message);
      }
    }
    
    console.log('3. Проверяем структуру модуля...');
    
    const moduleContent = fs.readFileSync(referralServicePath, 'utf8');
    
    if (moduleContent.includes('export class ReferralService')) {
      console.log('✅ Класс ReferralService найден в коде');
    } else {
      console.log('❌ Класс ReferralService НЕ найден в коде');
    }
    
    if (moduleContent.includes('processReferral')) {
      console.log('✅ Метод processReferral найден в коде');
    } else {
      console.log('❌ Метод processReferral НЕ найден в коде');
    }
    
    console.log('4. Проверяем синтаксис TypeScript...');
    
    const lines = moduleContent.split('\n');
    const exportLine = lines.find(line => line.includes('export class ReferralService'));
    
    if (exportLine) {
      console.log('✅ Строка экспорта найдена:', exportLine.trim());
    } else {
      console.log('❌ Строка экспорта НЕ найдена');
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка тестирования:', error.message);
  }
  
  console.log('\n=== ЗАКЛЮЧЕНИЕ ===');
  console.log('Если импорт не работает, возможные причины:');
  console.log('1. Проблемы с TypeScript компиляцией');
  console.log('2. Конфликт ES modules и CommonJS');
  console.log('3. Неправильный путь импорта');
  console.log('4. Синтаксические ошибки в referral/service.ts');
}

testAuthImport().catch(console.error);