/**
 * Детальная проверка фактических курсов в системе
 */

import { supabase } from '../core/supabase';

async function checkActualRates() {
  console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА ФАКТИЧЕСКИХ КУРСОВ');
  console.log('=' .repeat(55));
  
  try {
    // 1. Проверяем boost_packages таблицу - эталонные курсы
    console.log('\n📦 ЭТАЛОННЫЕ КУРСЫ В BOOST_PACKAGES:');
    const { data: packages } = await supabase
      .from('boost_packages')
      .select('*')
      .order('id');
    
    if (packages) {
      packages.forEach(p => {
        const ratePerSecond = parseFloat(p.rate_ton_per_second);
        const dailyRate = ratePerSecond * 86400; // секунд в дне
        const minAmount = parseFloat(p.min_amount);
        const dailyPercent = (dailyRate / minAmount) * 100;
        
        console.log(`\nПакет ID ${p.id}: "${p.name}"`);
        console.log(`  Курс в БД: ${p.rate_ton_per_second} TON/сек`);
        console.log(`  Дневной доход: ${dailyRate} TON`);
        console.log(`  Минимальная сумма: ${minAmount} TON`);
        console.log(`  Дневной процент: ${dailyPercent.toFixed(4)}%`);
      });
    }
    
    // 2. Проверяем фактические курсы пользователя 184
    console.log('\n👤 ФАКТИЧЕСКИЕ КУРСЫ ПОЛЬЗОВАТЕЛЯ 184:');
    const { data: user } = await supabase
      .from('users')
      .select('ton_boost_rate, ton_boost_package, ton_boost_active')
      .eq('id', 184)
      .single();
    
    if (user) {
      const userRate = parseFloat(user.ton_boost_rate || '0');
      const userDailyRate = userRate * 86400;
      
      console.log(`Курс пользователя: ${user.ton_boost_rate} TON/сек`);
      console.log(`Дневной доход: ${userDailyRate} TON`);
      console.log(`Пакет ID: ${user.ton_boost_package}`);
      console.log(`Статус: ${user.ton_boost_active ? 'Активен' : 'Неактивен'}`);
    }
    
    // 3. Проверяем ton_farming_data - фактические депозиты
    console.log('\n💰 ФАКТИЧЕСКИЕ ДЕПОЗИТЫ И КУРСЫ:');
    const { data: farmingData } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', '184');
    
    if (farmingData && farmingData.length > 0) {
      farmingData.forEach((f, i) => {
        const deposit = parseFloat(f.farming_balance);
        const rate = parseFloat(f.farming_rate);
        const dailyIncome = rate * 86400;
        const dailyPercent = (dailyIncome / deposit) * 100;
        
        console.log(`\nЗапись ${i+1}:`);
        console.log(`  Депозит: ${deposit} TON`);
        console.log(`  Курс: ${rate} TON/сек`);
        console.log(`  Дневной доход: ${dailyIncome} TON`);
        console.log(`  Дневной процент: ${dailyPercent.toFixed(4)}%`);
        console.log(`  Создано: ${f.created_at}`);
        console.log(`  Обновлено: ${f.updated_at}`);
      });
    }
    
    // 4. Проверяем логику планировщика - ищем файл
    console.log('\n⚙️ АНАЛИЗ ПРАВИЛЬНОСТИ КУРСОВ:');
    
    if (packages && packages.length > 0) {
      const starterPackage = packages.find(p => p.id === 1);
      if (starterPackage) {
        const etalon = parseFloat(starterPackage.rate_ton_per_second);
        const actual = user ? parseFloat(user.ton_boost_rate || '0') : 0;
        
        console.log(`\nСравнение курсов для пакета "Starter Boost":`);
        console.log(`Эталон в boost_packages: ${etalon} TON/сек`);
        console.log(`Фактический у пользователя: ${actual} TON/сек`);
        
        if (Math.abs(etalon - actual) < 0.001) {
          console.log('✅ Курсы СОВПАДАЮТ');
        } else {
          console.log('❌ Курсы НЕ СОВПАДАЮТ');
          console.log(`Отклонение: ${Math.abs(etalon - actual)} TON/сек`);
        }
        
        // Проверяем логичность 1% в день
        const dailyRate = etalon * 86400;
        const minAmount = parseFloat(starterPackage.min_amount);
        const realDailyPercent = (dailyRate / minAmount) * 100;
        
        console.log(`\nПроверка "1% в день":`);
        console.log(`Реальный дневной процент: ${realDailyPercent.toFixed(6)}%`);
        
        if (realDailyPercent >= 0.9 && realDailyPercent <= 1.1) {
          console.log('✅ КУРС БЛИЗОК К 1% В ДЕНЬ');
        } else {
          console.log('❌ КУРС НЕ СООТВЕТСТВУЕТ 1% В ДЕНЬ');
        }
      }
    }
    
    // 5. Проверяем историю изменений курсов
    console.log('\n📅 ПОСЛЕДНИЕ ИЗМЕНЕНИЯ В BOOST_PACKAGES:');
    console.log('(Проверяем, были ли недавние изменения курсов)');
    
    // Простая проверка корректности текущих настроек
    if (farmingData && farmingData.length > 0) {
      const totalDeposit = farmingData.reduce((sum, f) => sum + parseFloat(f.farming_balance), 0);
      const totalRate = farmingData.reduce((sum, f) => sum + parseFloat(f.farming_rate), 0);
      const totalDailyIncome = totalRate * 86400;
      const avgDailyPercent = (totalDailyIncome / totalDeposit) * 100;
      
      console.log(`\nОБЩИЕ ПОКАЗАТЕЛИ:`);
      console.log(`Общий депозит: ${totalDeposit} TON`);
      console.log(`Общий курс: ${totalRate} TON/сек`);
      console.log(`Общий дневной доход: ${totalDailyIncome} TON`);
      console.log(`Средний дневной процент: ${avgDailyPercent.toFixed(6)}%`);
      
      if (avgDailyPercent > 100) {
        console.log('⚠️ ВНИМАНИЕ: Курс превышает 100% в день!');
      } else if (avgDailyPercent > 10) {
        console.log('⚠️ ПРЕДУПРЕЖДЕНИЕ: Курс превышает 10% в день');
      } else if (avgDailyPercent >= 0.5 && avgDailyPercent <= 2) {
        console.log('✅ КУРС В РАЗУМНЫХ ПРЕДЕЛАХ (0.5-2% в день)');
      }
    }
    
  } catch (error) {
    console.error('Ошибка при проверке:', error);
  }
}

checkActualRates().then(() => {
  console.log('\n✅ Детальная проверка курсов завершена');
  process.exit(0);
});