import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkRewardTypeConstraint() {
  console.log('🔍 Проверяем допустимые значения для reward_type...\n');
  
  // Пробуем разные значения для reward_type
  const testValues = ['coins', 'UNI', 'TON', 'tokens', 'points', 'uni', 'ton'];
  
  for (const value of testValues) {
    const { error } = await supabase
      .from('missions')
      .insert({
        id: 999,
        title: 'TEST',
        description: 'TEST',
        mission_type: 'one_time',
        reward_type: value,
        reward_amount: 100
      });
      
    if (error) {
      console.log(`❌ "${value}" - ${error.message.includes('reward_type_check') ? 'НЕДОПУСТИМО' : 'другая ошибка'}`);
    } else {
      console.log(`✅ "${value}" - ДОПУСТИМО`);
      // Удаляем тестовую запись
      await supabase.from('missions').delete().eq('id', 999);
      break; // Нашли допустимое значение
    }
  }
}

checkRewardTypeConstraint();