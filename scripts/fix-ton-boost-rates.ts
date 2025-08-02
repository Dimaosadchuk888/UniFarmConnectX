import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTonBoostRates() {
  console.log('🔧 Исправление ставок в ton_boost_purchases...\n');
  
  // Получаем все записи с неправильными ставками (больше 1)
  const { data: wrongRates, error } = await supabase
    .from('ton_boost_purchases')
    .select('*')
    .gt('rate', '1');
    
  if (error) {
    console.error('❌ Ошибка получения данных:', error);
    return;
  }
  
  console.log(`📊 Найдено записей с неправильными ставками: ${wrongRates?.length || 0}`);
  
  if (wrongRates && wrongRates.length > 0) {
    // Исправляем каждую запись
    for (const purchase of wrongRates) {
      const correctRate = purchase.rate / 100; // Преобразуем 100 в 1.0, 1.5 в 0.015 и т.д.
      const amount = parseFloat(purchase.amount);
      const correctDailyIncome = amount * correctRate;
      
      const { error: updateError } = await supabase
        .from('ton_boost_purchases')
        .update({
          rate: correctRate.toString(),
          daily_income: correctDailyIncome.toString()
        })
        .eq('id', purchase.id);
        
      if (updateError) {
        console.error(`❌ Ошибка обновления записи ${purchase.id}:`, updateError);
      } else {
        console.log(`✅ Исправлена запись ${purchase.id}: ставка ${purchase.rate}% → ${correctRate * 100}%`);
      }
    }
  }
  
  // Проверяем результат
  const { data: checkData, error: checkError } = await supabase
    .from('ton_boost_purchases')
    .select('rate')
    .gt('rate', '1');
    
  if (!checkError) {
    console.log(`\n✨ Проверка завершена. Осталось записей с неправильными ставками: ${checkData?.length || 0}`);
  }
}

// Запускаем исправление
fixTonBoostRates().catch(console.error);