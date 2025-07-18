// Проверка работы динамического импорта в Node.js окружении
const path = require('path');

async function testDynamicImport() {
  console.log('=== ТЕСТ ДИНАМИЧЕСКОГО ИМПОРТА ===');
  
  // Проверим рабочую директорию
  console.log('Рабочая директория:', process.cwd());
  
  // Попробуем разные способы импорта
  console.log('\n1. Тестируем различные пути импорта...');
  
  const testPaths = [
    '../modules/referral/service',
    './modules/referral/service',
    '../referral/service',
    './modules/referral/service.js',
    '../modules/referral/service.js',
    path.resolve(__dirname, 'modules/referral/service.js'),
    path.resolve(__dirname, 'modules/referral/service.ts')
  ];
  
  for (const testPath of testPaths) {
    try {
      console.log(`\n  Тестируем путь: ${testPath}`);
      
      // Проверяем существование файла
      const fs = require('fs');
      let fileExists = false;
      
      try {
        if (testPath.endsWith('.js')) {
          fileExists = fs.existsSync(testPath);
        } else if (testPath.endsWith('.ts')) {
          fileExists = fs.existsSync(testPath);
        } else {
          fileExists = fs.existsSync(testPath + '.js') || fs.existsSync(testPath + '.ts');
        }
      } catch (e) {
        fileExists = false;
      }
      
      console.log(`    Файл существует: ${fileExists}`);
      
      if (fileExists) {
        try {
          const importedModule = await import(testPath);
          console.log(`    ✅ Динамический импорт успешен`);
          console.log(`    Экспорты:`, Object.keys(importedModule));
          
          if (importedModule.ReferralService) {
            console.log(`    ✅ ReferralService найден`);
            
            const service = new importedModule.ReferralService();
            if (typeof service.processReferral === 'function') {
              console.log(`    ✅ Метод processReferral найден`);
            } else {
              console.log(`    ❌ Метод processReferral НЕ найден`);
            }
          } else {
            console.log(`    ❌ ReferralService НЕ найден`);
          }
          
        } catch (importError) {
          console.log(`    ❌ Ошибка динамического импорта: ${importError.message}`);
        }
      }
      
    } catch (error) {
      console.log(`    ❌ Общая ошибка: ${error.message}`);
    }
  }
  
  console.log('\n2. Проверяем Node.js окружение...');
  console.log('Node версия:', process.version);
  console.log('ES модули поддерживаются:', process.versions.modules >= 64);
  
  console.log('\n3. Проверяем package.json...');
  try {
    const packageJson = require('./package.json');
    console.log('Type в package.json:', packageJson.type || 'commonjs');
    console.log('Есть ли scripts:', !!packageJson.scripts);
  } catch (e) {
    console.log('❌ package.json не найден');
  }
  
  console.log('\n4. Проверяем tsconfig.json...');
  try {
    const fs = require('fs');
    const tsconfigContent = fs.readFileSync('./tsconfig.json', 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    console.log('Module в tsconfig:', tsconfig.compilerOptions?.module);
    console.log('Target в tsconfig:', tsconfig.compilerOptions?.target);
    console.log('ModuleResolution в tsconfig:', tsconfig.compilerOptions?.moduleResolution);
  } catch (e) {
    console.log('❌ tsconfig.json не найден или некорректен');
  }
  
  console.log('\n=== ВЫВОДЫ ===');
  console.log('Если динамический импорт не работает, возможные причины:');
  console.log('1. Неправильный путь к файлу');
  console.log('2. Файл не скомпилирован из TypeScript в JavaScript');
  console.log('3. Проблемы с настройками модульной системы');
  console.log('4. Циклические зависимости (но мы не нашли их)');
  console.log('5. Проблемы с ES модулями vs CommonJS');
}

testDynamicImport().catch(console.error);