#!/usr/bin/env node

/**
 * МОНИТОРИНГ ФАРМИНГА В РЕАЛЬНОМ ВРЕМЕНИ
 * Отслеживание изменений баланса без изменения кода
 */

import { execSync } from 'child_process';

console.log('🔍 МОНИТОРИНГ ФАРМИНГА В РЕАЛЬНОМ ВРЕМЕНИ');
console.log('='.repeat(60));

let previousBalance = null;
let transactionCount = 0;

const monitorFarming = () => {
  const now = new Date();
  const time = now.toLocaleTimeString();
  
  try {
    // Получаем текущий баланс через curl
    const balanceResponse = execSync(`curl -s -H "Authorization: Bearer $(cat jwt_token.txt 2>/dev/null || echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6IkFkbWluIiwicmVmX2NvZGUiOiJBRE1JTjQ4OSIsImlhdCI6MTcyMTY0MzYxMCwiZXhwIjoxNzIyMjQ4NDEwfQ.eKAqfQJg0XXL8qsATEm3eaclp0LzCuHeFyFnOo6HQTI')" "http://localhost:3000/api/v2/wallet/balance?user_id=184"`, { encoding: 'utf8' });
    
    const balanceData = JSON.parse(balanceResponse);
    
    if (balanceData.success) {
      const currentBalance = balanceData.data.uniBalance;
      
      if (previousBalance !== null) {
        const change = currentBalance - previousBalance;
        
        if (change > 0) {
          transactionCount++;
          const expectedChange = 0.669826;
          const ratio = change / expectedChange;
          
          console.log(`[${time}] Начисление #${transactionCount}: +${change.toFixed(2)} UNI (${ratio.toFixed(0)}x от нормы)`);
          
          // Анализируем размер начисления
          if (ratio > 100) {
            console.log(`  🚨 АНОМАЛЬНО БОЛЬШОЕ начисление!`);
          } else if (ratio > 10) {
            console.log(`  ⚠️  Большое начисление`);
          } else if (ratio < 2) {
            console.log(`  ✅ Нормальное начисление`);
          }
          
          // Пытаемся определить количество периодов
          const periods = Math.round(change / expectedChange);
          console.log(`  📊 Эквивалент: ~${periods} периодов по 5 минут`);
          
          if (periods > 1) {
            console.log(`  🔍 Накопительная логика: обработано ${periods} пропущенных периодов`);
          }
        }
      }
      
      previousBalance = currentBalance;
      console.log(`[${time}] Баланс: ${currentBalance.toFixed(2)} UNI`);
      
    } else {
      console.log(`[${time}] ❌ Ошибка получения баланса: ${balanceData.error || 'unknown'}`);
    }
    
  } catch (error) {
    console.log(`[${time}] ❌ Ошибка запроса: ${error.message}`);
  }
  
  // Проверяем CRON тайминг
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  if (minute % 5 === 0 && second < 30) {
    console.log(`[${time}] ⏰ CRON окно (0-30 сек после кратности 5 минут)`);
  }
};

console.log('Запуск мониторинга... (проверка каждые 30 секунд)');
console.log('Для остановки нажмите Ctrl+C\n');

// Первоначальная проверка
monitorFarming();

// Мониторинг каждые 30 секунд
const intervalId = setInterval(monitorFarming, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Мониторинг остановлен');
  clearInterval(intervalId);
  
  console.log(`\n📊 СТАТИСТИКА СЕССИИ:`);
  console.log(`├── Зафиксировано начислений: ${transactionCount}`);
  console.log(`├── Время работы: ${new Date().toLocaleTimeString()}`);
  console.log(`└── Финальный баланс: ${previousBalance?.toFixed(2) || 'unknown'} UNI`);
  
  process.exit(0);
});