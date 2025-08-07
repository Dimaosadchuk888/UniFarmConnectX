import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkMissions() {
  console.log('🔍 Проверка существующих миссий в БД...\n');
  
  const { data, error, count } = await supabase
    .from('missions')
    .select('*', { count: 'exact' });
    
  if (error) {
    console.log('❌ Ошибка при получении миссий:', error.message);
    return;
  }
  
  console.log(`✅ Найдено миссий: ${count || 0}\n`);
  
  if (data && data.length > 0) {
    console.log('📋 Список миссий:');
    data.forEach((mission, index) => {
      console.log(`\n${index + 1}. ${mission.title}`);
      console.log(`   ID: ${mission.id}`);
      console.log(`   Описание: ${mission.description}`);
      console.log(`   Награда UNI: ${mission.reward_uni || 0}`);
      console.log(`   Награда TON: ${mission.reward_ton || 0}`);
      console.log(`   Тип: ${mission.type}`);
      console.log(`   Статус: ${mission.status}`);
    });
  } else {
    console.log('⚠️  Таблица missions пустая');
  }
}

checkMissions();