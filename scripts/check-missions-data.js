import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkMissionsData() {
  console.log('🔍 Проверка данных в таблице missions...\n');
  
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .order('id');
    
  if (error) {
    console.log('❌ Ошибка:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`✅ Найдено ${data.length} миссий:\n`);
    data.forEach(mission => {
      console.log(`ID: ${mission.id}`);
      console.log(`Название: ${mission.title}`);
      console.log(`Награда UNI: ${mission.reward_uni}`);
      console.log(`Тип: ${mission.mission_type}`);
      console.log('---');
    });
  } else {
    console.log('⚠️  Таблица missions пустая');
    console.log('\nПопробуем вставить первую миссию для теста...');
    
    const { error: insertError } = await supabase
      .from('missions')
      .insert({
        id: 1,
        title: 'Подписаться на Telegram канал',
        description: 'Подпишись на Telegram-канал Universe Games https://t.me/UniverseGamesChannel',
        mission_type: 'one_time',
        reward_amount: 500,
        reward_uni: 500,
        reward_ton: 0,
        status: 'active'
      });
      
    if (insertError) {
      console.log('\n❌ Ошибка при вставке:', insertError.message);
    } else {
      console.log('\n✅ Тестовая миссия вставлена успешно!');
    }
  }
}

checkMissionsData();