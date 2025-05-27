/**
 * Быстрое исправление имен контроллеров в маршрутах
 */

import fs from 'fs';

const CONTROLLER_MAPPINGS = [
  // Исправляем имена контроллеров на правильные
  { wrong: 'BoostController', correct: 'BoostController' }, // уже правильно
  { wrong: 'TonBoostController', correct: 'TonBoostController' }, // уже правильно  
  { wrong: 'ReferralController', correct: 'ReferralController' }, // уже правильно
  { wrong: 'WalletController', correct: 'WalletController' }, // уже правильно
  { wrong: 'DailyBonusController', correct: 'DailyBonusController' }, // уже правильно
  { wrong: 'MissionControllerFixed', correct: 'MissionControllerFixed' } // уже правильно
];

function checkRoutesFile() {
  const content = fs.readFileSync('server/routes-new.ts', 'utf8');
  
  console.log('🔍 Проверка используемых контроллеров в маршрутах:');
  
  // Проверим, какие контроллеры действительно импортированы
  const importLines = content.split('\n').filter(line => line.includes('import') && line.includes('Controller'));
  
  console.log('\n📦 Импортированные контроллеры:');
  importLines.forEach(line => {
    console.log(`   ${line.trim()}`);
  });
  
  // Проверим, какие контроллеры используются в маршрутах
  const routeLines = content.split('\n').filter(line => 
    line.includes('Controller') && (line.includes('app.get') || line.includes('app.post'))
  );
  
  console.log('\n🔗 Контроллеры в маршрутах:');
  routeLines.forEach(line => {
    console.log(`   ${line.trim()}`);
  });
  
  return content;
}

// Запускаем проверку
checkRoutesFile();