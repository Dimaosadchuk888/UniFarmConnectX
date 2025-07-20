/**
 * ДИАГНОСТИКА ПУТАНИЦЫ АККАУНТОВ USER #25 и #227
 * Выясняем почему депозит с User #25 оказался на User #227
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAccountConfusion() {
  console.log('🧩 ДИАГНОСТИКА ПУТАНИЦЫ АККАУНТОВ USER #25 и #227');
  console.log('='.repeat(50));
  
  try {
    // 1. ПОЛНАЯ ИНФОРМАЦИЯ ОБ АККАУНТАХ
    console.log('\n👤 ПОЛНАЯ ИНФОРМАЦИЯ ОБ АККАУНТАХ:');
    console.log('='.repeat(40));
    
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('id', [25, 227])
      .order('id');
    
    if (users) {
      users.forEach(user => {
        console.log(`\n📋 USER ${user.id}:`);
        console.log(`   Telegram ID: ${user.telegram_id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Ref Code: ${user.ref_code}`);
        console.log(`   Referred By: ${user.referred_by}`);
        console.log(`   TON Balance: ${user.balance_ton}`);
        console.log(`   UNI Balance: ${user.balance_uni}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Last Active: ${user.last_active}`);
        console.log(`   Wallet Address: ${user.wallet_address || 'не указан'}`);
        console.log(`   Device ID: ${user.device_id || 'не указан'}`);
        console.log(`   Session Token: ${user.session_token ? 'есть' : 'нет'}`);
        
        // Проверяем совпадения
        if (user.telegram_id === 425855744) {
          console.log(`   🎯 ЭТО ВАШИХ TELEGRAM ID!`);
        }
        if (user.username === 'DimaOsadchuk') {
          console.log(`   🎯 ЭТО ВАШ USERNAME!`);
        }
      });
    }
    
    // 2. АНАЛИЗ СОВПАДЕНИЙ
    console.log('\n🔍 АНАЛИЗ СОВПАДЕНИЙ МЕЖДУ АККАУНТАМИ:');
    console.log('='.repeat(40));
    
    if (users && users.length >= 2) {
      const user25 = users.find(u => u.id === 25);
      const user227 = users.find(u => u.id === 227);
      
      console.log('\n📊 СРАВНЕНИЕ ПОЛЕЙ:');
      const fieldsToCompare = [
        'telegram_id', 'username', 'wallet_address', 'device_id', 
        'ref_code', 'referred_by', 'session_token'
      ];
      
      fieldsToCompare.forEach(field => {
        const val25 = user25?.[field];
        const val227 = user227?.[field];
        const match = val25 === val227;
        const status = match ? '✅ СОВПАДАЕТ' : '❌ РАЗЛИЧАЕТСЯ';
        
        console.log(`   ${field}:`);
        console.log(`      User 25: ${val25 || 'null'}`);
        console.log(`      User 227: ${val227 || 'null'}`);
        console.log(`      ${status}`);
        
        if (match && val25) {
          console.log(`      🚨 КРИТИЧЕСКОЕ СОВПАДЕНИЕ!`);
        }
      });
    }
    
    // 3. ИСТОРИЯ СОЗДАНИЯ АККАУНТОВ
    console.log('\n⏰ ИСТОРИЯ СОЗДАНИЯ АККАУНТОВ:');
    console.log('='.repeat(40));
    
    if (users) {
      users.forEach(user => {
        const createdTime = new Date(user.created_at);
        const daysDiff = Math.floor((Date.now() - createdTime.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`\nUser ${user.id}:`);
        console.log(`   Создан: ${createdTime.toLocaleString()}`);
        console.log(`   Давность: ${daysDiff} дней назад`);
        console.log(`   Telegram ID: ${user.telegram_id}`);
      });
    }
    
    // 4. АНАЛИЗ TON ТРАНЗАКЦИЙ
    console.log('\n💎 АНАЛИЗ TON ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 2 ЧАСА:');
    console.log('='.repeat(40));
    
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    for (const userId of [25, 227]) {
      const { data: tonTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', 'TON')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });
      
      console.log(`\n👤 USER ${userId} TON ТРАНЗАКЦИИ (${tonTx?.length || 0}):`);
      
      if (tonTx && tonTx.length > 0) {
        tonTx.forEach((tx, i) => {
          const time = new Date(tx.created_at);
          const minutesAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60);
          
          console.log(`   ${i + 1}. ID: ${tx.id}`);
          console.log(`      Тип: ${tx.type}`);
          console.log(`      Сумма: ${tx.amount} TON`);
          console.log(`      Время: ${time.toLocaleString()} (${minutesAgo} мин назад)`);
          console.log(`      Описание: ${tx.description.substring(0, 100)}...`);
          console.log(`      Статус: ${tx.status}`);
          
          // Анализируем BOC транзакцию
          if (tx.description.includes('te6')) {
            console.log(`      🔍 BOC обнаружен в описании`);
            console.log(`      📊 Анализ amount: ${tx.amount} (ожидалось 0.22)`);
            
            if (parseFloat(tx.amount) === 0) {
              console.log(`      🚨 КРИТИЧНО: amount = 0, но должно быть 0.22!`);
            }
          }
          
          if (tx.metadata) {
            console.log(`      Metadata: ${JSON.stringify(tx.metadata)}`);
          }
        });
      } else {
        console.log(`   ❌ TON транзакции не найдены`);
      }
    }
    
    // 5. ПОИСК РЕФЕРАЛЬНЫХ СВЯЗЕЙ
    console.log('\n🔗 АНАЛИЗ РЕФЕРАЛЬНЫХ СВЯЗЕЙ:');
    console.log('='.repeat(40));
    
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .or(`user_id.in.(25,227),referred_user_id.in.(25,227)`);
    
    console.log(`\nРеферальные записи для User 25/227: ${referrals?.length || 0}`);
    
    if (referrals && referrals.length > 0) {
      referrals.forEach((ref, i) => {
        console.log(`   ${i + 1}. User ${ref.user_id} -> User ${ref.referred_user_id}`);
        console.log(`      Level: ${ref.level}`);
        console.log(`      Created: ${ref.created_at}`);
      });
    }
    
    // 6. ПРОВЕРКА WALLET ADDRESSES
    console.log('\n💼 АНАЛИЗ КОШЕЛЬКОВ:');
    console.log('='.repeat(40));
    
    if (users) {
      const walletsUsed = new Set();
      
      users.forEach(user => {
        console.log(`\nUser ${user.id}:`);
        console.log(`   Wallet Address: ${user.wallet_address || 'не указан'}`);
        
        if (user.wallet_address) {
          if (walletsUsed.has(user.wallet_address)) {
            console.log(`   🚨 ДУБЛИРУЮЩИЙ КОШЕЛЕК! Уже используется другим пользователем`);
          } else {
            walletsUsed.add(user.wallet_address);
          }
        }
      });
    }
    
    // 7. ПОИСК ВОЗМОЖНЫХ ПРИЧИН ПУТАНИЦЫ
    console.log('\n🧬 ВОЗМОЖНЫЕ ПРИЧИНЫ ПУТАНИЦЫ:');
    console.log('='.repeat(40));
    
    if (users && users.length >= 2) {
      const user25 = users.find(u => u.id === 25);
      const user227 = users.find(u => u.id === 227);
      
      // Проверяем различные сценарии
      if (user25?.telegram_id === user227?.telegram_id) {
        console.log('🚨 ПРИЧИНА 1: Одинаковый Telegram ID - система создала дубликат аккаунта');
      }
      
      if (user25?.username === user227?.username) {
        console.log('🚨 ПРИЧИНА 2: Одинаковый username - возможна путаница при аутентификации');
      }
      
      if (user25?.wallet_address === user227?.wallet_address && user25?.wallet_address) {
        console.log('🚨 ПРИЧИНА 3: Одинаковый wallet_address - TON Connect путает аккаунты');
      }
      
      if (user25?.ref_code === user227?.ref_code) {
        console.log('🚨 ПРИЧИНА 4: Одинаковый ref_code - конфликт в реферальной системе');
      }
      
      // Анализируем даты создания
      const date25 = new Date(user25?.created_at || 0);
      const date227 = new Date(user227?.created_at || 0);
      const timeDiff = Math.abs(date25.getTime() - date227.getTime()) / 1000 / 60; // в минутах
      
      if (timeDiff < 60) {
        console.log(`🚨 ПРИЧИНА 5: Аккаунты созданы с разницей ${Math.floor(timeDiff)} минут - возможно автоматическое дублирование`);
      }
    }
    
    console.log('\n🎯 ЗАКЛЮЧЕНИЕ:');
    console.log('='.repeat(20));
    console.log('1. Проверить совпадения полей между аккаунтами');
    console.log('2. Выяснить как система идентифицирует пользователей при TON Connect');
    console.log('3. Проанализировать почему amount = 0 вместо 0.22 TON');
    console.log('4. Определить нужно ли объединять аккаунты или разделять данные');
    
  } catch (error) {
    console.log('❌ Критическая ошибка диагностики:', error.message);
  }
}

diagnoseAccountConfusion().catch(console.error);