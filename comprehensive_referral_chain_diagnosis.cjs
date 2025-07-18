// Комплексная диагностика цепочки передачи реферальных данных
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function diagnoseReferralChain() {
  console.log('=== КОМПЛЕКСНАЯ ДИАГНОСТИКА РЕФЕРАЛЬНОЙ ЦЕПОЧКИ ===');
  
  // 1. Анализ структуры таблицы referrals
  console.log('\n1. АНАЛИЗ СТРУКТУРЫ ТАБЛИЦЫ REFERRALS');
  
  try {
    // Получаем все записи из referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (referralsError) {
      console.log('❌ Ошибка получения данных referrals:', referralsError.message);
      return;
    }
    
    console.log(`✅ Найдено ${referrals.length} записей в таблице referrals`);
    
    if (referrals.length > 0) {
      console.log('📊 Структура первой записи:');
      console.log(JSON.stringify(referrals[0], null, 2));
      
      // Анализ полей
      const firstRecord = referrals[0];
      const fields = Object.keys(firstRecord);
      console.log('\n📋 Поля в таблице referrals:', fields.join(', '));
      
      // Проверка целостности данных
      console.log('\n🔍 Проверка целостности данных:');
      let validRecords = 0;
      let invalidRecords = 0;
      
      for (const record of referrals) {
        const hasUserId = record.user_id !== null;
        const hasReferrerId = record.referrer_id !== null;
        const hasReferralCode = record.referral_code !== null;
        
        if (hasUserId && hasReferrerId && hasReferralCode) {
          validRecords++;
        } else {
          invalidRecords++;
          console.log(`❌ Невалидная запись ID ${record.id}: user_id=${record.user_id}, referrer_id=${record.referrer_id}, referral_code=${record.referral_code}`);
        }
      }
      
      console.log(`✅ Валидные записи: ${validRecords}`);
      console.log(`❌ Невалидные записи: ${invalidRecords}`);
      
    } else {
      console.log('⚠️  Таблица referrals пуста');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа таблицы referrals:', error.message);
  }
  
  // 2. Анализ связей между users и referrals
  console.log('\n2. АНАЛИЗ СВЯЗЕЙ МЕЖДУ USERS И REFERRALS');
  
  try {
    // Получаем пользователей с referred_by
    const { data: usersWithReferrals, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, referred_by, ref_code, created_at')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false });
      
    if (usersError) {
      console.log('❌ Ошибка получения пользователей с рефералами:', usersError.message);
      return;
    }
    
    console.log(`✅ Найдено ${usersWithReferrals.length} пользователей с referred_by`);
    
    if (usersWithReferrals.length > 0) {
      console.log('\n📊 Последние 5 пользователей с рефералами:');
      usersWithReferrals.slice(0, 5).forEach(user => {
        console.log(`  ID ${user.id}: telegram_id=${user.telegram_id}, referred_by=${user.referred_by}, created_at=${user.created_at}`);
      });
      
      // Проверяем соответствие записей в referrals
      console.log('\n🔍 Проверка соответствия записей в referrals:');
      
      let matchedRecords = 0;
      let missingRecords = 0;
      
      for (const user of usersWithReferrals) {
        const { data: referralRecord } = await supabase
          .from('referrals')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (referralRecord) {
          matchedRecords++;
        } else {
          missingRecords++;
          console.log(`❌ Пользователь ID ${user.id} имеет referred_by=${user.referred_by}, но НЕТ записи в referrals`);
        }
      }
      
      console.log(`✅ Пользователи с записями в referrals: ${matchedRecords}`);
      console.log(`❌ Пользователи БЕЗ записей в referrals: ${missingRecords}`);
      
    } else {
      console.log('⚠️  Пользователи с referred_by не найдены');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа связей:', error.message);
  }
  
  // 3. Анализ процесса создания записей в referrals
  console.log('\n3. АНАЛИЗ ПРОЦЕССА СОЗДАНИЯ ЗАПИСЕЙ В REFERRALS');
  
  try {
    // Проверяем код ReferralService.processReferral
    console.log('📋 Анализ метода processReferral:');
    
    const fs = require('fs');
    const referralServiceContent = fs.readFileSync('modules/referral/service.ts', 'utf8');
    
    // Ищем метод processReferral
    const processReferralMatch = referralServiceContent.match(/async processReferral\([\s\S]*?\n  \}/);
    
    if (processReferralMatch) {
      console.log('✅ Метод processReferral найден');
      
      // Проверяем создание записи в referrals
      const hasReferralInsert = processReferralMatch[0].includes('from(REFERRAL_TABLES.REFERRALS)') && 
                               processReferralMatch[0].includes('.insert(');
      
      if (hasReferralInsert) {
        console.log('✅ Код создания записи в referrals найден');
        
        // Ищем поля для вставки
        const insertMatch = processReferralMatch[0].match(/\.insert\(\s*\{[\s\S]*?\}\s*\)/);
        if (insertMatch) {
          console.log('📋 Поля для вставки в referrals:');
          console.log(insertMatch[0]);
        }
        
      } else {
        console.log('❌ Код создания записи в referrals НЕ найден');
      }
      
    } else {
      console.log('❌ Метод processReferral НЕ найден');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа кода:', error.message);
  }
  
  // 4. Проверка логики обновления referred_by
  console.log('\n4. ПРОВЕРКА ЛОГИКИ ОБНОВЛЕНИЯ REFERRED_BY');
  
  try {
    const fs = require('fs');
    const referralServiceContent = fs.readFileSync('modules/referral/service.ts', 'utf8');
    
    // Ищем обновление referred_by
    const hasUserUpdate = referralServiceContent.includes('referred_by') && 
                         referralServiceContent.includes('.update(');
    
    if (hasUserUpdate) {
      console.log('✅ Код обновления referred_by найден');
      
      // Ищем конкретную строку обновления
      const updateMatches = referralServiceContent.match(/\.update\(\s*\{[\s\S]*?referred_by[\s\S]*?\}\s*\)/g);
      
      if (updateMatches) {
        console.log('📋 Найдены обновления referred_by:');
        updateMatches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match}`);
        });
      }
      
    } else {
      console.log('❌ Код обновления referred_by НЕ найден');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа логики обновления:', error.message);
  }
  
  // 5. Проверка транзакционности операций
  console.log('\n5. ПРОВЕРКА ТРАНЗАКЦИОННОСТИ ОПЕРАЦИЙ');
  
  try {
    const fs = require('fs');
    const referralServiceContent = fs.readFileSync('modules/referral/service.ts', 'utf8');
    
    // Проверяем использование транзакций
    const hasTransaction = referralServiceContent.includes('transaction') || 
                          referralServiceContent.includes('rpc(') ||
                          referralServiceContent.includes('begin()');
    
    if (hasTransaction) {
      console.log('✅ Код использует транзакции');
    } else {
      console.log('⚠️  Код НЕ использует транзакции - возможны проблемы с целостностью');
    }
    
    // Проверяем обработку ошибок
    const errorHandlingCount = (referralServiceContent.match(/try\s*\{/g) || []).length;
    const catchCount = (referralServiceContent.match(/catch\s*\(/g) || []).length;
    
    console.log(`📋 Блоков try-catch: ${Math.min(errorHandlingCount, catchCount)}`);
    
    if (errorHandlingCount === catchCount && errorHandlingCount > 0) {
      console.log('✅ Обработка ошибок реализована');
    } else {
      console.log('⚠️  Обработка ошибок может быть неполной');
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа транзакционности:', error.message);
  }
  
  // 6. Проверка временных меток и порядка операций
  console.log('\n6. ПРОВЕРКА ВРЕМЕННЫХ МЕТОК И ПОРЯДКА ОПЕРАЦИЙ');
  
  try {
    // Получаем последние записи пользователей и referrals
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, telegram_id, created_at, referred_by')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
      
    const { data: recentReferrals } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentUsers && recentUsers.length > 0) {
      console.log('📊 Последние пользователи с рефералами:');
      recentUsers.forEach(user => {
        console.log(`  ID ${user.id}: created_at=${user.created_at}, referred_by=${user.referred_by}`);
      });
    }
    
    if (recentReferrals && recentReferrals.length > 0) {
      console.log('📊 Последние записи в referrals:');
      recentReferrals.forEach(ref => {
        console.log(`  ID ${ref.id}: user_id=${ref.user_id}, created_at=${ref.created_at}`);
      });
    }
    
    // Проверяем синхронизацию по времени
    if (recentUsers && recentReferrals && recentUsers.length > 0 && recentReferrals.length > 0) {
      const userTime = new Date(recentUsers[0].created_at);
      const referralTime = new Date(recentReferrals[0].created_at);
      const timeDiff = Math.abs(userTime - referralTime);
      
      console.log(`📊 Разница во времени между последними записями: ${timeDiff}ms`);
      
      if (timeDiff < 10000) { // менее 10 секунд
        console.log('✅ Записи создаются синхронно');
      } else {
        console.log('⚠️  Записи создаются с задержкой');
      }
    }
    
  } catch (error) {
    console.log('❌ Ошибка анализа временных меток:', error.message);
  }
  
  console.log('\n=== ЗАКЛЮЧЕНИЕ ДИАГНОСТИКИ ===');
  console.log('1. Проверена структура таблицы referrals');
  console.log('2. Проанализированы связи между users и referrals');
  console.log('3. Проверен код создания записей в referrals');
  console.log('4. Проанализирована логика обновления referred_by');
  console.log('5. Проверена транзакционность операций');
  console.log('6. Проанализированы временные метки');
  console.log('\nЭта диагностика поможет найти потенциальные проблемы с потерей рефералов.');
}

diagnoseReferralChain().catch(console.error);