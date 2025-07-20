/**
 * ОТЛАДКА СОЗДАНИЯ TON ДЕПОЗИТА С amount = 0
 * Проверяем что именно происходит при создании транзакции
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTonDepositAmount() {
  console.log('🔍 ОТЛАДКА СОЗДАНИЯ TON ДЕПОЗИТА С amount = 0');
  console.log('='.repeat(45));
  
  try {
    // 1. Анализ структуры последней транзакции User 227
    const { data: latestTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 227)
      .eq('currency', 'TON')
      .eq('type', 'DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (latestTx && latestTx.length > 0) {
      const tx = latestTx[0];
      console.log('\n📊 АНАЛИЗ ПОСЛЕДНЕЙ ТРАНЗАКЦИИ USER 227:');
      console.log(`   ID: ${tx.id}`);
      console.log(`   amount: "${tx.amount}" (тип: ${typeof tx.amount})`);
      console.log(`   amount_ton: "${tx.amount_ton}" (тип: ${typeof tx.amount_ton})`);
      console.log(`   amount_uni: "${tx.amount_uni}" (тип: ${typeof tx.amount_uni})`);
      console.log(`   currency: "${tx.currency}"`);
      console.log(`   type: "${tx.type}"`);
      console.log(`   description длина: ${tx.description.length}`);
      
      // Проверяем метаданные
      if (tx.metadata) {
        console.log('\n📋 МЕТАДАННЫЕ:');
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
        console.log(`   source: ${metadata.source}`);
        console.log(`   wallet_address: ${metadata.wallet_address}`);
        console.log(`   tx_hash длина: ${metadata.tx_hash?.length || 'нет'}`);
        
        // Проверяем есть ли сумма в метаданных
        Object.keys(metadata).forEach(key => {
          if (key.includes('amount') || key.includes('value') || key.includes('sum')) {
            console.log(`   ${key}: ${metadata[key]}`);
          }
        });
      }
      
      console.log('\n🔍 КЛЮЧЕВАЯ НАХОДКА:');
      if (tx.amount_ton && parseFloat(tx.amount_ton) > 0) {
        console.log(`✅ amount_ton = ${tx.amount_ton} (корректная сумма есть!)`);
        console.log(`❌ amount = ${tx.amount} (отображается 0)`);
        console.log(`🚨 ПРОБЛЕМА: Frontend читает поле "amount", а Backend записывает "amount_ton"`);
      } else {
        console.log(`❌ amount_ton = ${tx.amount_ton} (тоже 0)`);
        console.log(`🚨 ПРОБЛЕМА: Backend записывает 0 в amount_ton`);
      }
    }
    
    // 2. Проверка схемы таблицы transactions
    console.log('\n🗃️ ПРОВЕРКА СХЕМЫ ТАБЛИЦЫ transactions:');
    
    const { data: schema, error } = await supabase.rpc('get_table_schema', { table_name: 'transactions' });
    if (!error && schema) {
      const amountFields = schema.filter(col => col.column_name.includes('amount'));
      console.log('\nПоля amount в таблице:');
      amountFields.forEach(field => {
        console.log(`   ${field.column_name}: ${field.data_type} (nullable: ${field.is_nullable})`);
      });
    } else {
      // Альтернативный способ - проверяем через выборку
      const { data: sampleTx } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);
      
      if (sampleTx && sampleTx.length > 0) {
        console.log('\nПоля в транзакции (по образцу):');
        Object.keys(sampleTx[0]).forEach(key => {
          if (key.includes('amount')) {
            console.log(`   ${key}: ${typeof sampleTx[0][key]}`);
          }
        });
      }
    }
    
    // 3. Сравнение с успешной транзакцией User 25
    const { data: user25Tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .eq('currency', 'TON')
      .gt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (user25Tx && user25Tx.length > 0) {
      const tx = user25Tx[0];
      console.log('\n✅ СРАВНЕНИЕ С УСПЕШНОЙ ТРАНЗАКЦИЕЙ USER 25:');
      console.log(`   amount: "${tx.amount}" (${typeof tx.amount})`);
      console.log(`   amount_ton: "${tx.amount_ton}" (${typeof tx.amount_ton})`);
      console.log(`   amount_uni: "${tx.amount_uni}" (${typeof tx.amount_uni})`);
      console.log(`   description: ${tx.description.substring(0, 50)}...`);
      
      if (tx.metadata) {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
        console.log(`   metadata.source: ${metadata.source}`);
        console.log(`   metadata.original_type: ${metadata.original_type}`);
      }
    }
    
    // 4. Проверка логики вычисления amount в коде
    console.log('\n🔧 АНАЛИЗ ЛОГИКИ СОЗДАНИЯ ТРАНЗАКЦИИ:');
    console.log('В modules/wallet/service.ts строка 418:');
    console.log('amount_ton: amount,  // amount приходит как параметр');
    console.log('amount_uni: 0,');
    console.log('Но поле "amount" НЕ заполняется!');
    
    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ amount = 0:');
    console.log('1. Frontend читает поле "amount", которое не заполняется Backend');
    console.log('2. amount_ton заполняется корректно, но не копируется в amount');
    console.log('3. Таблица имеет calculated поле amount или trigger');
    console.log('4. Есть несоответствие схемы между Frontend и Backend');
    
    // 5. Проверка последних вызовов API для User 227
    console.log('\n📡 ПРОВЕРКА ПАРАМЕТРОВ ВЫЗОВА API:');
    
    // Ищем в описании признаки того какие параметры передавались
    if (latestTx && latestTx.length > 0) {
      const desc = latestTx[0].description;
      
      if (desc.includes('te6')) {
        console.log('✅ BOC данные присутствуют в description');
        
        // Ищем цифры в BOC которые могут быть суммой
        const bocData = desc;
        const numberMatches = bocData.match(/\d{1,10}/g);
        if (numberMatches) {
          console.log(`🔢 Цифры в BOC: ${numberMatches.slice(0, 15).join(', ')}`);
          
          // Проверяем есть ли 22, 220000000 (0.22 TON в нанотонах)
          const possibleAmounts = numberMatches.filter(n => 
            n === '22' || 
            n === '220000000' || 
            n.includes('22') ||
            parseInt(n) > 100000000 && parseInt(n) < 1000000000
          );
          
          if (possibleAmounts.length > 0) {
            console.log(`🎯 Возможные суммы в BOC: ${possibleAmounts.join(', ')}`);
          }
        }
      }
    }
    
    console.log('\n🎯 ВЫВОДЫ:');
    console.log('1. Нужно проверить заполняется ли поле "amount" в транзакции');
    console.log('2. Возможно Frontend ожидает "amount", а Backend заполняет "amount_ton"');
    console.log('3. Проверить как извлекается сумма из BOC в параметре amount');
    console.log('4. Убедиться что parseFloat(amount) в контроллере получает корректное значение');
    
  } catch (error) {
    console.log('❌ Ошибка отладки:', error.message);
  }
}

debugTonDepositAmount().catch(console.error);