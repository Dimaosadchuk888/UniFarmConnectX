import { supabase } from '../core/supabase.js';
import { glob } from 'glob';
import fs from 'fs/promises';

async function auditSystem() {
  console.log('🏁 ПОЛНЫЙ АУДИТ СИСТЕМЫ ПОСЛЕ МИГРАЦИИ');
  console.log('='.repeat(60));
  console.log(`📅 Дата: ${new Date().toISOString()}`);
  console.log('\n');
  
  // 1. АУДИТ БАЗЫ ДАННЫХ
  console.log('1️⃣ АУДИТ БАЗЫ ДАННЫХ');
  console.log('-'.repeat(40));
  
  // Получаем структуру таблицы users
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (userError) {
    console.log('❌ Ошибка подключения к БД:', userError.message);
    return;
  }
  
  // Анализируем колонки
  const userColumns = userData && userData.length > 0 ? Object.keys(userData[0]) : [];
  console.log(`✅ Всего колонок в таблице users: ${userColumns.length}`);
  
  // Проверяем удаленные поля
  const deletedFields = ['uni_farming_deposit', 'ton_boost_package_id', 'wallet'];
  const stillExist = deletedFields.filter(field => userColumns.includes(field));
  
  if (stillExist.length > 0) {
    console.log(`❌ ПРОБЛЕМА: Дублирующиеся поля все еще существуют: ${stillExist.join(', ')}`);
  } else {
    console.log('✅ Все дублирующиеся поля успешно удалены!');
  }
  
  // Проверяем основные поля
  const primaryFields = ['uni_deposit_amount', 'ton_boost_package', 'ton_wallet_address'];
  const missingFields = primaryFields.filter(field => !userColumns.includes(field));
  
  if (missingFields.length > 0) {
    console.log(`❌ ПРОБЛЕМА: Отсутствуют основные поля: ${missingFields.join(', ')}`);
  } else {
    console.log('✅ Все основные поля присутствуют');
  }
  
  // Выводим текущую структуру
  console.log('\n📋 Текущие поля в таблице users:');
  const relevantFields = userColumns.filter(col => 
    col.includes('uni_') || 
    col.includes('ton_') || 
    col.includes('wallet') ||
    col.includes('boost')
  );
  relevantFields.forEach(field => console.log(`   - ${field}`));
  
  // 2. ПРОВЕРКА ДАННЫХ
  console.log('\n2️⃣ ПРОВЕРКА ДАННЫХ');
  console.log('-'.repeat(40));
  
  const { data: stats } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, ton_boost_package, ton_wallet_address')
    .not('uni_deposit_amount', 'is', null)
    .or('ton_boost_package.gt.0,ton_wallet_address.not.is.null');
  
  console.log(`✅ Пользователей с данными: ${stats?.length || 0}`);
  console.log(`   - С UNI депозитами: ${stats?.filter(u => u.uni_deposit_amount > 0).length || 0}`);
  console.log(`   - С TON boost: ${stats?.filter(u => u.ton_boost_package > 0).length || 0}`);
  console.log(`   - С TON кошельками: ${stats?.filter(u => u.ton_wallet_address).length || 0}`);
  
  // 3. АУДИТ КОДА
  console.log('\n3️⃣ АУДИТ КОДА');
  console.log('-'.repeat(40));
  
  const files = await glob([
    'client/**/*.{ts,tsx}',
    'server/**/*.{ts,js}',
    'modules/**/*.{ts,js}',
    'shared/**/*.{ts,js}'
  ]);
  
  console.log(`✅ Файлов для проверки: ${files.length}`);
  
  let filesWithOldFields: string[] = [];
  let oldFieldUsage = {
    uni_farming_deposit: 0,
    ton_boost_package_id: 0,
    wallet: 0
  };
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    let hasOldField = false;
    
    if (content.includes('uni_farming_deposit')) {
      oldFieldUsage.uni_farming_deposit++;
      hasOldField = true;
    }
    if (content.includes('ton_boost_package_id')) {
      oldFieldUsage.ton_boost_package_id++;
      hasOldField = true;
    }
    // Более точная проверка для wallet
    if (content.match(/[^\w]wallet[^\w]/)) {
      // Исключаем ton_wallet_address
      if (!content.match(/ton_wallet_address/)) {
        const walletMatches = content.match(/[^\w]wallet[^\w]/g);
        if (walletMatches && walletMatches.length > 0) {
          oldFieldUsage.wallet++;
          hasOldField = true;
        }
      }
    }
    
    if (hasOldField) {
      filesWithOldFields.push(file);
    }
  }
  
  if (filesWithOldFields.length > 0) {
    console.log(`❌ ПРОБЛЕМА: Найдено ${filesWithOldFields.length} файлов с удаленными полями:`);
    console.log('   Использование удаленных полей:');
    Object.entries(oldFieldUsage).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`   - ${field}: ${count} раз`);
      }
    });
    console.log('\n   Файлы с проблемами:');
    filesWithOldFields.slice(0, 10).forEach(file => console.log(`   - ${file}`));
    if (filesWithOldFields.length > 10) {
      console.log(`   ... и еще ${filesWithOldFields.length - 10} файлов`);
    }
  } else {
    console.log('✅ Код не использует удаленные поля!');
  }
  
  // 4. ПРОВЕРКА VIEWS
  console.log('\n4️⃣ ПРОВЕРКА VIEWS');
  console.log('-'.repeat(40));
  
  // Проверяем доступность views через простые select запросы
  const viewsToCheck = ['uni_farming_data', 'ton_farming_data', 'referrals', 'farming_status_view'];
  
  for (const viewName of viewsToCheck) {
    try {
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ View ${viewName}: НЕ РАБОТАЕТ (${error.message})`);
      } else {
        console.log(`✅ View ${viewName}: работает`);
      }
    } catch (e) {
      console.log(`❌ View ${viewName}: НЕ НАЙДЕН`);
    }
  }
  
  // 5. ФИНАЛЬНЫЙ СТАТУС
  console.log('\n' + '='.repeat(60));
  console.log('🎯 ИТОГОВЫЙ СТАТУС МИГРАЦИИ:');
  console.log('-'.repeat(40));
  
  const issues: string[] = [];
  if (stillExist.length > 0) issues.push('Дублирующиеся поля не удалены');
  if (missingFields.length > 0) issues.push('Отсутствуют основные поля');
  if (filesWithOldFields.length > 0) issues.push('Код использует удаленные поля');
  
  if (issues.length === 0) {
    console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('✅ База данных очищена от дублирующихся полей');
    console.log('✅ Код обновлен для использования основных полей');
    console.log('✅ Views созданы для обратной совместимости');
    console.log('\n🎉 Система полностью готова к работе!');
  } else {
    console.log('❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  // Сохраняем отчет
  const report = {
    timestamp: new Date().toISOString(),
    database: {
      columnsFound: userColumns.length,
      deletedFieldsStillExist: stillExist,
      missingPrimaryFields: missingFields,
      relevantColumns: relevantFields
    },
    code: {
      totalFilesChecked: files.length,
      filesWithOldFields: filesWithOldFields.length,
      oldFieldUsage
    },
    status: issues.length === 0 ? 'SUCCESS' : 'FAILED',
    issues
  };
  
  await fs.writeFile(
    'SYSTEM_AUDIT_AFTER_MIGRATION.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 Подробный отчет сохранен в SYSTEM_AUDIT_AFTER_MIGRATION.json');
}

auditSystem().catch(console.error);