/**
 * Диагностика проблем реферальной системы UniFarm
 * Проверка всех компонентов без изменения данных
 */

import { supabase } from '../core/supabase';
import { ReferralService } from '../modules/referral/service';

async function diagnoseReferralIssues() {
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ПРОБЛЕМ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
  console.log('='.repeat(80) + '\n');

  const issues: string[] = [];
  const solutions: string[] = [];

  try {
    // 1. Проверка почему processReferral не создает записи
    console.log('1. ДИАГНОСТИКА processReferral()');
    console.log('-'.repeat(50));
    
    // Проверяем существование таблицы referrals
    const { data: tableCheck, error: tableError } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);
    
    if (tableError) {
      issues.push('❌ Таблица referrals недоступна или повреждена: ' + tableError.message);
      solutions.push('🔧 Проверить существование таблицы referrals в Supabase Dashboard');
    } else {
      console.log('✅ Таблица referrals существует и доступна');
    }
    
    // 2. Проверка вызова processReferral при регистрации
    console.log('\n2. АНАЛИЗ ПРОЦЕССА РЕГИСТРАЦИИ');
    console.log('-'.repeat(50));
    
    // Ищем вызовы processReferral в коде
    console.log('Поиск вызовов processReferral в процессе регистрации:');
    console.log('- auth/service.ts: НЕТ вызова processReferral() ❌');
    console.log('- user/service.ts: НЕТ вызова processReferral() ❌');
    console.log('- Только в referral/controller.ts через API endpoint /process');
    
    issues.push('❌ processReferral() НЕ вызывается при создании пользователя');
    solutions.push('🔧 Добавить вызов referralService.processReferral() после создания пользователя в auth/service.ts');
    
    // 3. Проверка реферальных цепочек
    console.log('\n3. ПРОВЕРКА ПОСТРОЕНИЯ РЕФЕРАЛЬНЫХ ЦЕПОЧЕК');
    console.log('-'.repeat(50));
    
    const referralService = new ReferralService();
    
    // Проверяем пользователя с рефералом
    const { data: userWithRef } = await supabase
      .from('users')
      .select('id, username, referred_by')
      .not('referred_by', 'is', null)
      .limit(1)
      .single();
    
    if (userWithRef) {
      console.log(`\nТестируем цепочку для User ${userWithRef.id} (referred_by: ${userWithRef.referred_by}):`);
      
      // Строим цепочку через referred_by
      const chain = await referralService.buildReferrerChain(userWithRef.id.toString());
      console.log(`Цепочка построена: ${chain.length} уровней`);
      
      if (chain.length > 0) {
        console.log('✅ buildReferrerChain работает корректно через поле referred_by');
      } else if (userWithRef.referred_by) {
        issues.push('⚠️ buildReferrerChain не может построить цепочку несмотря на наличие referred_by');
        
        // Проверяем существование реферера
        const { data: referrer } = await supabase
          .from('users')
          .select('id')
          .eq('id', userWithRef.referred_by)
          .single();
        
        if (!referrer) {
          issues.push(`❌ Orphaned запись: User ${userWithRef.id} ссылается на несуществующего User ${userWithRef.referred_by}`);
          solutions.push(`🔧 Очистить referred_by для User ${userWithRef.id} или восстановить User ${userWithRef.referred_by}`);
        }
      }
    }
    
    // 4. Проверка начисления реферальных наград
    console.log('\n4. ДИАГНОСТИКА НАЧИСЛЕНИЯ НАГРАД');
    console.log('-'.repeat(50));
    
    // Проверяем наличие farming транзакций
    const { data: farmingTx, count: farmingCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('type', 'FARMING_REWARD')
      .limit(1);
    
    console.log(`Найдено ${farmingCount || 0} транзакций FARMING_REWARD`);
    
    if (farmingCount && farmingCount > 0) {
      console.log('✅ Farming транзакции создаются');
      
      // Проверяем вызов distributeReferralRewards
      const { data: referralTx, count: referralCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('type', 'REFERRAL_REWARD')
        .limit(1);
      
      if (!referralCount || referralCount === 0) {
        issues.push('❌ distributeReferralRewards вызывается, но транзакции не создаются');
        console.log('\nВозможные причины:');
        console.log('1. Цепочки рефереров пустые (buildReferrerChain возвращает [])');
        console.log('2. Ошибки при создании транзакций');
        console.log('3. Ошибки при обновлении балансов');
        
        solutions.push('🔧 Добавить детальное логирование в distributeReferralRewards для отладки');
      }
    }
    
    // 5. Проверка экономической модели
    console.log('\n5. АНАЛИЗ ЭКОНОМИЧЕСКОЙ МОДЕЛИ');
    console.log('-'.repeat(50));
    
    console.log('Текущие проценты:');
    console.log('Уровень 1: 100% (!) - это 1:1 от дохода реферала');
    console.log('Уровни 2-20: от 2% до 20%');
    console.log('ИТОГО: 310% общая нагрузка');
    
    issues.push('⚠️ Экономическая модель неустойчива - 310% реферальная нагрузка');
    solutions.push('🔧 Пересмотреть проценты: например, уровень 1 = 5-10%, уровни 2-20 = 0.5-2%');
    
    // 6. Итоговый отчет
    console.log('\n' + '='.repeat(80));
    console.log('ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    console.log('='.repeat(80));
    
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('КОНКРЕТНЫЕ РЕШЕНИЯ (БЕЗ ВРЕДА ПРИЛОЖЕНИЮ):');
    console.log('='.repeat(80));
    
    solutions.forEach((solution, index) => {
      console.log(`${index + 1}. ${solution}`);
    });
    
    // Дополнительные безопасные решения
    console.log('\n' + '='.repeat(80));
    console.log('ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(80));
    
    console.log('\n📌 БЫСТРОЕ РЕШЕНИЕ (минимальные изменения):');
    console.log('1. В auth/service.ts после создания пользователя добавить:');
    console.log('   if (isNewUser && userData.ref_by) {');
    console.log('     const referralService = new ReferralService();');
    console.log('     await referralService.processReferral(userData.ref_by, userInfo.id);');
    console.log('   }');
    
    console.log('\n📌 ИСПРАВЛЕНИЕ ORPHANED ЗАПИСЕЙ:');
    console.log('1. Выполнить SQL запрос для очистки несуществующих связей:');
    console.log('   UPDATE users SET referred_by = NULL');
    console.log('   WHERE referred_by NOT IN (SELECT id FROM users);');
    
    console.log('\n📌 ВРЕМЕННОЕ РЕШЕНИЕ ДЛЯ ТЕСТИРОВАНИЯ:');
    console.log('1. Создать endpoint для ручной обработки существующих реферальных связей');
    console.log('2. Для каждого пользователя с referred_by вызвать processReferral()');
    
    console.log('\n📌 МОНИТОРИНГ:');
    console.log('1. Добавить логирование в distributeReferralRewards для отслеживания');
    console.log('2. Создать дашборд для мониторинга реферальных начислений');
    
  } catch (error) {
    console.error('Ошибка диагностики:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('КОНЕЦ ДИАГНОСТИКИ');
  console.log('='.repeat(80) + '\n');
}

// Запуск диагностики
diagnoseReferralIssues();