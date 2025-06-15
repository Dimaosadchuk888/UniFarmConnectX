/**
 * Тестирование Supabase подключения после очистки переменных окружения
 */

import { createClient } from '@supabase/supabase-js';

async function testSupabaseConnection() {
  console.log('[INFO] Тестирую Supabase подключение после очистки...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('[ERROR] Отсутствуют переменные SUPABASE_URL или SUPABASE_KEY');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Простой тест чтения
    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, username')
      .limit(1);

    if (error) {
      console.log('[ERROR] Ошибка подключения к Supabase:', error.message);
      return false;
    }

    console.log('[SUCCESS] Supabase подключение работает');
    console.log(`[SUCCESS] Тестовый запрос выполнен, получено записей: ${data?.length || 0}`);
    
    // Проверяем отсутствие старых переменных
    const oldVars = ['DATABASE_URL', 'PGHOST', 'PGUSER', 'PGPASSWORD'];
    const foundOld = oldVars.filter(v => process.env[v]);
    
    if (foundOld.length > 0) {
      console.log(`[WARNING] Еще найдены старые переменные: ${foundOld.join(', ')}`);
    } else {
      console.log('[SUCCESS] Старые PostgreSQL переменные полностью удалены');
    }

    return true;
  } catch (error) {
    console.log('[ERROR] Ошибка тестирования:', error.message);
    return false;
  }
}

testSupabaseConnection().then(success => {
  if (success) {
    console.log('\n[FINAL] ✅ СИСТЕМА ГОТОВА К РАБОТЕ ТОЛЬКО С SUPABASE');
  } else {
    console.log('\n[FINAL] ❌ ТРЕБУЕТСЯ НАСТРОЙКА SUPABASE');
  }
});