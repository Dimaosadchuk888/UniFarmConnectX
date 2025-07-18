/**
 * Диагностика проблемы с типами ID в UNI farming
 */

import { supabase } from '../core/supabase';

async function diagnoseUniFarmingTypes() {
  console.log('\n' + '='.repeat(80));
  console.log('ДИАГНОСТИКА ТИПОВ ID В UNI FARMING');
  console.log('='.repeat(80) + '\n');
  
  try {
    // 1. Получаем всех активных UNI фармеров
    const { data: allFarmers, error } = await supabase
      .from('users')
      .select('id, username, telegram_id, uni_farming_active, uni_deposit_amount, uni_farming_last_update')
      .eq('uni_farming_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Ошибка получения данных:', error);
      return;
    }
    
    console.log(`Всего активных UNI фармеров: ${allFarmers?.length || 0}\n`);
    
    // Разделяем по типам ID
    const uuidFarmers: any[] = [];
    const numericFarmers: any[] = [];
    
    allFarmers?.forEach(farmer => {
      // Проверяем тип ID
      if (typeof farmer.id === 'string' && farmer.id.includes('-')) {
        // UUID формат
        uuidFarmers.push(farmer);
      } else if (typeof farmer.id === 'number' || !isNaN(Number(farmer.id))) {
        // Числовой ID
        numericFarmers.push(farmer);
      }
    });
    
    console.log(`UUID фармеры: ${uuidFarmers.length}`);
    console.log(`Числовые ID фармеры: ${numericFarmers.length}\n`);
    
    // Показываем числовых фармеров
    console.log('ЧИСЛОВЫЕ ID ФАРМЕРЫ (ваши рефералы должны быть здесь):');
    numericFarmers.forEach(f => {
      const lastUpdateMinutes = f.uni_farming_last_update 
        ? Math.floor((Date.now() - new Date(f.uni_farming_last_update).getTime()) / (1000 * 60))
        : 'никогда';
      
      console.log(`  - ID ${f.id} (${f.username || 'без имени'}): ${f.uni_deposit_amount || 0} UNI, обновлен ${lastUpdateMinutes} мин назад`);
    });
    
    if (numericFarmers.length === 0) {
      console.log('  ❌ Нет фармеров с числовыми ID!');
    }
    
    // Проверяем конкретно рефералов
    console.log('\n' + '-'.repeat(80));
    console.log('ПРОВЕРКА РЕФЕРАЛОВ 186-190:');
    
    const referralIds = [186, 187, 188, 189, 190];
    for (const id of referralIds) {
      const farmer = numericFarmers.find(f => f.id === id);
      if (farmer) {
        console.log(`✅ User ${id} найден в активных фармерах`);
      } else {
        // Проверяем в общей таблице
        const { data: user } = await supabase
          .from('users')
          .select('id, uni_farming_active, uni_deposit_amount')
          .eq('id', id)
          .single();
        
        if (user) {
          console.log(`❌ User ${id}: active=${user.uni_farming_active}, deposit=${user.uni_deposit_amount} - НЕ НАЙДЕН в активных!`);
        } else {
          console.log(`❌ User ${id}: НЕ СУЩЕСТВУЕТ`);
        }
      }
    }
    
    // Анализ проблемы
    console.log('\n' + '-'.repeat(80));
    console.log('АНАЛИЗ ПРОБЛЕМЫ:');
    
    if (uuidFarmers.length > 0 && numericFarmers.length === 0) {
      console.log('\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА!');
      console.log('Все активные фармеры имеют UUID идентификаторы.');
      console.log('Планировщик не может обработать UUID, ожидая числовые ID.');
      console.log('\nПРИЧИНА: Фармеры с числовыми ID (186-190) не попадают в выборку.');
      console.log('Возможно, у них uni_farming_active = false или проблема с запросом.');
    } else if (numericFarmers.length > 0) {
      const hasReferrals = referralIds.some(id => numericFarmers.find(f => f.id === id));
      if (!hasReferrals) {
        console.log('\n⚠️  ПРОБЛЕМА: Рефералы 186-190 не найдены среди активных фармеров!');
        console.log('Хотя другие пользователи с числовыми ID есть в списке.');
      } else {
        console.log('\n✅ Рефералы найдены среди активных фармеров.');
        console.log('Проблема может быть в обработке или других условиях.');
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
  
  process.exit(0);
}

diagnoseUniFarmingTypes();