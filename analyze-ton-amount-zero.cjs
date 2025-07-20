/**
 * АНАЛИЗ ПРОБЛЕМЫ amount = 0 вместо 0.22 TON
 * Проверяем как обрабатывается сумма в транзакциях
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTonAmountZero() {
  console.log('💰 АНАЛИЗ ПРОБЛЕМЫ amount = 0 вместо 0.22 TON');
  console.log('='.repeat(45));
  
  try {
    // 1. Все TON депозиты за последние 24 часа
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: tonDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });
    
    console.log(`\n📊 TON ДЕПОЗИТЫ ЗА 24 ЧАСА (${tonDeposits?.length || 0}):`);
    console.log('='.repeat(40));
    
    let zeroAmountCount = 0;
    let nonZeroAmountCount = 0;
    
    if (tonDeposits && tonDeposits.length > 0) {
      tonDeposits.forEach((tx, i) => {
        const amount = parseFloat(tx.amount);
        const time = new Date(tx.created_at);
        const hoursAgo = Math.floor((Date.now() - time.getTime()) / 1000 / 60 / 60);
        
        console.log(`\n   ${i + 1}. ID: ${tx.id} | User: ${tx.user_id}`);
        console.log(`      Amount: ${tx.amount} TON`);
        console.log(`      Время: ${time.toLocaleString()} (${hoursAgo}ч назад)`);
        console.log(`      Статус: ${tx.status}`);
        console.log(`      Описание: ${tx.description.substring(0, 80)}...`);
        
        if (amount === 0) {
          zeroAmountCount++;
          console.log(`      🚨 AMOUNT = 0!`);
          
          // Анализируем BOC для поиска реальной суммы
          if (tx.description.includes('te6')) {
            console.log(`      🔍 BOC найден, можно попытаться извлечь реальную сумму`);
            
            // Ищем паттерны в BOC которые могут содержать сумму
            const bocMatch = tx.description.match(/te6[A-Za-z0-9+/=]+/);
            if (bocMatch) {
              console.log(`      📦 BOC: ${bocMatch[0].substring(0, 50)}...`);
            }
          }
        } else {
          nonZeroAmountCount++;
          console.log(`      ✅ Корректная сумма: ${amount} TON`);
        }
        
        if (tx.metadata) {
          console.log(`      📋 Metadata: ${JSON.stringify(tx.metadata)}`);
        }
      });
      
      console.log(`\n📈 СТАТИСТИКА СУММ:`);
      console.log(`   Amount = 0: ${zeroAmountCount} транзакций`);
      console.log(`   Amount > 0: ${nonZeroAmountCount} транзакций`);
      
      if (zeroAmountCount > 0) {
        console.log(`   🚨 ${Math.round(zeroAmountCount / tonDeposits.length * 100)}% депозитов имеют amount = 0!`);
      }
    }
    
    // 2. Специальный анализ User 227 транзакций
    console.log(`\n👤 ДЕТАЛЬНЫЙ АНАЛИЗ USER 227 ТРАНЗАКЦИЙ:`);
    console.log('='.repeat(40));
    
    const { data: user227Tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 227)
      .eq('currency', 'TON')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (user227Tx && user227Tx.length > 0) {
      user227Tx.forEach((tx, i) => {
        console.log(`\n   ${i + 1}. Транзакция ID: ${tx.id}`);
        console.log(`      Тип: ${tx.type}`);
        console.log(`      Amount: "${tx.amount}" (тип: ${typeof tx.amount})`);
        console.log(`      Parsed Float: ${parseFloat(tx.amount)}`);
        console.log(`      Описание длина: ${tx.description.length} символов`);
        
        // Подробный анализ description
        if (tx.description.includes('te6')) {
          console.log(`      📦 BOC АНАЛИЗ:`);
          
          // Пытаемся найти упоминания сумм в BOC
          const bocContent = tx.description;
          
          // Ищем числовые паттерны
          const numberMatches = bocContent.match(/\d+/g);
          if (numberMatches) {
            console.log(`      🔢 Найденные числа в BOC: ${numberMatches.slice(0, 10).join(', ')}`);
          }
          
          // Проверяем есть ли ссылки на 0.22 или 22 или 220000000 (нанотоны)
          if (bocContent.includes('22') || bocContent.includes('220')) {
            console.log(`      🎯 Найдено "22" в BOC - возможно это искомая сумма!`);
          }
          
          console.log(`      📝 BOC фрагмент: ${bocContent.substring(0, 200)}...`);
        }
        
        console.log(`      ⏰ Создана: ${tx.created_at}`);
        console.log(`      🔄 Обновлена: ${tx.updated_at}`);
      });
    }
    
    // 3. Сравнение с успешными депозитами других пользователей
    console.log(`\n✅ СРАВНЕНИЕ С УСПЕШНЫМИ ДЕПОЗИТАМИ:`);
    console.log('='.repeat(40));
    
    const { data: successfulDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .gt('amount', 0)
      .gte('created_at', oneDayAgo)
      .order('amount', { ascending: false })
      .limit(5);
    
    if (successfulDeposits && successfulDeposits.length > 0) {
      console.log('\nУспешные депозиты с amount > 0:');
      successfulDeposits.forEach((tx, i) => {
        console.log(`   ${i + 1}. User ${tx.user_id}: ${tx.amount} TON`);
        console.log(`      Описание: ${tx.description.substring(0, 100)}...`);
      });
    } else {
      console.log('\n❌ НЕТ успешных депозитов с amount > 0 за 24 часа!');
      console.log('🚨 ВСЕ TON депозиты имеют amount = 0!');
    }
    
    // 4. Проверка типов данных в базе
    console.log(`\n🗃️ АНАЛИЗ ТИПОВ ДАННЫХ В БД:`);
    console.log('='.repeat(40));
    
    if (tonDeposits && tonDeposits.length > 0) {
      const firstTx = tonDeposits[0];
      console.log('\nТипы полей первой транзакции:');
      console.log(`   amount: "${firstTx.amount}" (${typeof firstTx.amount})`);
      console.log(`   user_id: ${firstTx.user_id} (${typeof firstTx.user_id})`);
      console.log(`   id: ${firstTx.id} (${typeof firstTx.id})`);
      
      // Проверяем парсинг
      const parsedAmount = parseFloat(firstTx.amount);
      console.log(`   parseFloat(amount): ${parsedAmount}`);
      console.log(`   Number(amount): ${Number(firstTx.amount)}`);
      console.log(`   +amount: ${+firstTx.amount}`);
    }
    
    // 5. Поиск паттернов в метаданных
    console.log(`\n🔍 АНАЛИЗ МЕТАДАННЫХ TON ДЕПОЗИТОВ:`);
    console.log('='.repeat(40));
    
    const depositsWithMetadata = tonDeposits?.filter(tx => tx.metadata) || [];
    
    if (depositsWithMetadata.length > 0) {
      console.log(`\nДепозиты с метаданными: ${depositsWithMetadata.length}`);
      
      depositsWithMetadata.slice(0, 3).forEach((tx, i) => {
        console.log(`\n   ${i + 1}. ID: ${tx.id} | Amount: ${tx.amount}`);
        try {
          const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
          console.log(`      Metadata: ${JSON.stringify(metadata, null, 2)}`);
          
          // Ищем упоминания сумм в метаданных
          if (metadata.amount || metadata.value || metadata.sum) {
            console.log(`      🎯 Найдена сумма в метаданных!`);
          }
        } catch (e) {
          console.log(`      ❌ Ошибка парсинга метаданных: ${e.message}`);
        }
      });
    } else {
      console.log('\nНет депозитов с метаданными');
    }
    
    console.log('\n🎯 ВЫВОДЫ ПО АНАЛИЗУ AMOUNT = 0:');
    console.log('='.repeat(35));
    console.log('1. Проверить логику извлечения суммы из BOC транзакции');
    console.log('2. Валидировать парсинг amount в backend обработке');
    console.log('3. Проверить precision и округление при сохранении в БД');
    console.log('4. Анализировать metadata для поиска реальной суммы');
    console.log('5. Сравнить с успешными депозитами других пользователей');
    
  } catch (error) {
    console.log('❌ Критическая ошибка анализа amount:', error.message);
  }
}

analyzeTonAmountZero().catch(console.error);