#!/usr/bin/env tsx

/**
 * Скрипт перезапуска для проверки отображения TON Boost пакетов после восстановления UI
 * 
 * Выполняется после:
 * 1. Включения ActiveTonBoostsCard обратно в Farming.tsx
 * 2. Исправления getTonBoostFarmingStatus() - убрано требование 10 TON
 * 3. Дополнения getUserActiveBoosts() полными данными пакета
 * 4. Исправления activateBoost() для передачи депозита
 */

import { BoostService } from './modules/boost/service';
import { TonFarmingRepository } from './modules/boost/TonFarmingRepository';
import { logger } from './core/logger';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function testTonBoostDisplayComponents() {
  console.log(`${COLORS.cyan}${COLORS.bright}🔄 ТЕСТИРОВАНИЕ ВОССТАНОВЛЕННЫХ КОМПОНЕНТОВ TON BOOST${COLORS.reset}\n`);
  
  const boostService = new BoostService();
  const userId = '184'; // Тестовый пользователь
  
  try {
    // 1. Тестируем getUserActiveBoosts() - должен возвращать полные данные
    console.log(`${COLORS.blue}1️⃣ Тестирование getUserActiveBoosts()...${COLORS.reset}`);
    const activeBoosts = await boostService.getUserActiveBoosts(userId);
    
    if (activeBoosts.length > 0) {
      console.log(`${COLORS.green}✅ Найдено ${activeBoosts.length} активных boost(ов)${COLORS.reset}`);
      activeBoosts.forEach((boost, index) => {
        console.log(`${COLORS.cyan}   Boost ${index + 1}:${COLORS.reset}`);
        console.log(`     ID: ${boost.id}`);
        console.log(`     Название: ${boost.package_name || 'НЕ УСТАНОВЛЕНО'}`);
        console.log(`     Сумма TON: ${boost.ton_amount || 'НЕ УСТАНОВЛЕНО'}`);
        console.log(`     Ставка/сек: ${boost.rate_ton_per_second || 'НЕ УСТАНОВЛЕНО'}`);
        console.log(`     Статус: ${boost.status || 'НЕ УСТАНОВЛЕНО'}`);
        console.log(`     UNI бонус: ${boost.bonus_uni || 'НЕ УСТАНОВЛЕНО'}`);
      });
    } else {
      console.log(`${COLORS.red}❌ Активные boosts не найдены${COLORS.reset}`);
    }
    
    // 2. Тестируем getTonBoostFarmingStatus() - должен работать без требования 10 TON
    console.log(`\n${COLORS.blue}2️⃣ Тестирование getTonBoostFarmingStatus()...${COLORS.reset}`);
    const farmingStatus = await boostService.getTonBoostFarmingStatus(userId);
    
    console.log(`${COLORS.cyan}   Статус TON фарминга:${COLORS.reset}`);
    console.log(`     TON ставка в секунду: ${farmingStatus.totalTonRatePerSecond}`);
    console.log(`     Дневной доход TON: ${farmingStatus.dailyIncomeTon}`);
    console.log(`     Количество депозитов: ${farmingStatus.deposits.length}`);
    
    if (farmingStatus.deposits.length > 0) {
      console.log(`${COLORS.green}✅ Депозиты найдены для отображения${COLORS.reset}`);
      farmingStatus.deposits.forEach((deposit, index) => {
        console.log(`${COLORS.cyan}     Депозит ${index + 1}:${COLORS.reset}`);
        console.log(`       ID: ${deposit.id}`);
        console.log(`       Название: ${deposit.package_name || 'НЕ УСТАНОВЛЕНО'}`);
        console.log(`       Сумма: ${deposit.amount}`);
        console.log(`       Ставка: ${deposit.rate}%`);
        console.log(`       Статус: ${deposit.status}`);
      });
    } else {
      console.log(`${COLORS.red}❌ Депозиты не найдены для отображения${COLORS.reset}`);
    }
    
    // 3. Проверяем TonFarmingRepository данные
    console.log(`\n${COLORS.blue}3️⃣ Проверка данных в ton_farming_data...${COLORS.reset}`);
    const tonFarmingRepo = new TonFarmingRepository();
    const farmingData = await tonFarmingRepo.getByUserId(userId);
    
    if (farmingData) {
      console.log(`${COLORS.green}✅ Найдены данные в ton_farming_data${COLORS.reset}`);
      console.log(`${COLORS.cyan}   Данные фарминга:${COLORS.reset}`);
      console.log(`     Баланс фарминга: ${farmingData.farming_balance}`);
      console.log(`     Ставка фарминга: ${farmingData.farming_rate}`);
      console.log(`     Boost активен: ${farmingData.boost_active}`);
      console.log(`     Package ID: ${farmingData.boost_package_id}`);
      console.log(`     Истекает: ${farmingData.boost_expires_at || 'НЕ УСТАНОВЛЕНО'}`);
    } else {
      console.log(`${COLORS.yellow}⚠️ Записи ton_farming_data НЕ НАЙДЕНЫ${COLORS.reset}`);
      console.log(`${COLORS.yellow}   Возможно используется fallback через users таблицу${COLORS.reset}`);
    }
    
    // 4. Проверяем UI компоненты
    console.log(`\n${COLORS.blue}4️⃣ Статус UI компонентов...${COLORS.reset}`);
    
    // Проверяем что ActiveTonBoostsCard включен
    const fs = await import('fs/promises');
    const farmingPageContent = await fs.readFile('client/src/pages/Farming.tsx', 'utf8');
    
    if (farmingPageContent.includes('import ActiveTonBoostsCardWithErrorBoundary')) {
      console.log(`${COLORS.green}✅ ActiveTonBoostsCard включен в импорты${COLORS.reset}`);
    } else {
      console.log(`${COLORS.red}❌ ActiveTonBoostsCard НЕ включен в импорты${COLORS.reset}`);
    }
    
    if (farmingPageContent.includes('<ActiveTonBoostsCardWithErrorBoundary />')) {
      console.log(`${COLORS.green}✅ ActiveTonBoostsCard используется в JSX${COLORS.reset}`);
    } else {
      console.log(`${COLORS.red}❌ ActiveTonBoostsCard НЕ используется в JSX${COLORS.reset}`);
    }
    
    // Итоговый отчет
    console.log(`\n${COLORS.magenta}${COLORS.bright}📊 ИТОГОВЫЙ ОТЧЕТ ВОССТАНОВЛЕНИЯ:${COLORS.reset}`);
    
    const hasActiveBoosts = activeBoosts.length > 0;
    const hasValidData = activeBoosts.some(b => b.package_name && b.ton_amount);
    const hasDeposits = farmingStatus.deposits.length > 0;
    const nonZeroIncome = parseFloat(farmingStatus.dailyIncomeTon) > 0;
    
    console.log(`${COLORS.cyan}Статус компонентов:${COLORS.reset}`);
    console.log(`  📦 ActiveTonBoosts API: ${hasActiveBoosts ? '✅ Работает' : '❌ Не работает'}`);
    console.log(`  📋 Полные данные пакетов: ${hasValidData ? '✅ Есть' : '❌ Отсутствуют'}`);
    console.log(`  💰 Депозиты для UI: ${hasDeposits ? '✅ Найдены' : '❌ Не найдены'}`);
    console.log(`  📈 Дневной доход TON: ${nonZeroIncome ? '✅ Больше 0' : '❌ Равен 0'}`);
    
    if (hasActiveBoosts && hasValidData && hasDeposits && nonZeroIncome) {
      console.log(`\n${COLORS.green}${COLORS.bright}🎉 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!${COLORS.reset}`);
      console.log(`${COLORS.green}Пользователи теперь должны видеть свои TON Boost пакеты в UI${COLORS.reset}`);
    } else {
      console.log(`\n${COLORS.yellow}${COLORS.bright}⚠️ ВОССТАНОВЛЕНИЕ ЧАСТИЧНО ЗАВЕРШЕНО${COLORS.reset}`);
      console.log(`${COLORS.yellow}Некоторые компоненты требуют дополнительной настройки${COLORS.reset}`);
    }
    
  } catch (error) {
    console.error(`${COLORS.red}❌ Ошибка тестирования:${COLORS.reset}`, error);
  }
}

// Запуск скрипта
testTonBoostDisplayComponents().catch(console.error);