/**
 * Создание тестовой TON транзакции покупки Boost пакета
 * для диагностики отображения в истории транзакций
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wunnsvicbebssrjqedor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bm5zdmljYmVic3NyanFlZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkwMzA3NywiZXhwIjoyMDY1NDc5MDc3fQ.pjlz8qlmQLUa9BZb12pt9QZU5Fk9YvqxpSZGA84oqog';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createTestTonBoostPurchase() {
  console.log('🔍 Создание тестовой TON транзакции покупки Boost пакета...\n');
  
  try {
    // Сначала проверим структуру таблицы transactions
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'transactions' });
      
    if (schemaError) {
      console.log('Проверяем структуру таблицы transactions...');
      
      // Попробуем получить первую транзакцию для понимания структуры
      const { data: sampleTx, error: sampleError } = await supabase
        .from('transactions')
        .select('*')
        .limit(1)
        .single();
        
      if (!sampleError && sampleTx) {
        console.log('🔍 Структура таблицы transactions:', Object.keys(sampleTx));
      }
    }
    
    // Создаем транзакцию покупки TON Boost пакета с правильной структурой
    const testTransaction = {
      user_id: 48,
      type: 'FARMING_REWARD', // Используем существующий тип
      amount_ton: '56.132141', // Положительная сумма как доход от покупки
      amount_uni: '0',
      currency: 'TON',
      status: 'completed',
      description: 'TON Boost покупка Elite пакета: 56.132141 TON',
      action: 'purchase',
      source: 'wallet'
    };
    
    console.log('📝 Создаем тестовую транзакцию:', testTransaction);
    
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert(testTransaction)
      .select()
      .single();
      
    if (txError) {
      console.log('❌ Ошибка создания транзакции:', txError.message);
      return;
    }
    
    console.log('✅ Транзакция создана:', {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      created_at: transaction.created_at
    });
    
    // Также создаем запись о покупке в boost_purchases
    const purchaseRecord = {
      user_id: 48,
      package_id: 5, // Elite Boost
      amount: '56.132141',
      source: 'wallet',
      status: 'confirmed',
      tx_hash: null
    };
    
    console.log('\n📝 Создаем запись о покупке Boost пакета:', purchaseRecord);
    
    const { data: purchase, error: purchaseError } = await supabase
      .from('boost_purchases')
      .insert(purchaseRecord)
      .select()
      .single();
      
    if (purchaseError) {
      console.log('❌ Ошибка создания записи покупки:', purchaseError.message);
      return;
    }
    
    console.log('✅ Запись о покупке создана:', {
      id: purchase.id,
      package_id: purchase.package_id,
      amount: purchase.amount,
      source: purchase.source,
      status: purchase.status,
      created_at: purchase.created_at
    });
    
    console.log('\n🎯 Тестовые данные созданы для проверки отображения в UI!');
    
  } catch (error) {
    console.error('🚫 Ошибка создания тестовых данных:', error.message);
  }
}

createTestTonBoostPurchase();