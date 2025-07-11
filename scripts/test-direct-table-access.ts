import { supabase } from '../core/supabase';
import { uniFarmingRepository } from '../modules/farming/UniFarmingRepository';
import { tonFarmingRepository } from '../modules/boost/TonFarmingRepository';

async function testDirectTableAccess() {
  console.log('\n=== ТЕСТ ПРЯМОГО ДОСТУПА К ТАБЛИЦАМ ===\n');
  
  try {
    // 1. Прямой запрос к uni_farming_data
    console.log('1. Прямой запрос к uni_farming_data для user 62:');
    const { data: uniData, error: uniError } = await supabase
      .from('uni_farming_data')
      .select('*')
      .eq('user_id', '62')
      .single();
      
    if (uniError) {
      console.log('❌ Ошибка:', uniError.code, uniError.message);
    } else {
      console.log('✅ Успешно получены данные:', uniData);
    }
    
    // 2. Проверка через репозиторий
    console.log('\n2. Запрос через UniFarmingRepository:');
    const repoData = await uniFarmingRepository.getByUserId('62');
    console.log('Результат:', repoData);
    
    // 3. Проверка структуры полей
    console.log('\n3. Проверка полей из репозитория:');
    if (repoData) {
      console.log('deposit_amount:', repoData.deposit_amount);
      console.log('farming_rate:', repoData.farming_rate);
      console.log('farming_start_timestamp:', repoData.farming_start_timestamp);
      console.log('farming_last_update:', repoData.farming_last_update);
      console.log('farming_deposit:', repoData.farming_deposit);
    }
    
    // 4. Логирование для отладки
    console.log('\n4. Включаю детальное логирование в репозитории...');
    
    // Попробуем сделать запрос еще раз с логированием
    const testResult = await uniFarmingRepository.getByUserId('62');
    console.log('Финальный результат:', testResult);
    
  } catch (error) {
    console.error('Ошибка теста:', error);
  }
}

testDirectTableAccess().catch(console.error);