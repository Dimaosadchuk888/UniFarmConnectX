/**
 * Тест сравнения UserService.getUserById vs прямого запроса
 */

import { supabase } from './core/supabase.ts';
import { SupabaseUserRepository } from './modules/user/service.ts';

async function testUserServiceVsDirect() {
  try {
    console.log('=== СРАВНЕНИЕ UserService VS Прямой запрос ===\n');

    // Инициализируем UserService
    const userRepository = new SupabaseUserRepository();

    // 1. Прямой запрос через Supabase API
    console.log('1. Прямой запрос через Supabase API:');
    const { data: directData, error: directError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 48)
      .single();

    if (directError) {
      console.error('❌ Ошибка прямого запроса:', directError);
    } else {
      console.log(`   ✅ ID: ${directData.id}`);
      console.log(`   ✅ Balance UNI: ${directData.balance_uni} (${typeof directData.balance_uni})`);
      console.log(`   ✅ Balance TON: ${directData.balance_ton} (${typeof directData.balance_ton})`);
    }

    // 2. Через UserService.getUserById
    console.log('\n2. Через UserService.getUserById(48):');
    const serviceData = await userRepository.getUserById(48);

    if (!serviceData) {
      console.error('❌ UserService вернул null');
    } else {
      console.log(`   ✅ ID: ${serviceData.id}`);
      console.log(`   ✅ Balance UNI: ${serviceData.balance_uni} (${typeof serviceData.balance_uni})`);
      console.log(`   ✅ Balance TON: ${serviceData.balance_ton} (${typeof serviceData.balance_ton})`);
    }

    // 3. Сравнение результатов
    console.log('\n3. Сравнение результатов:');
    if (directData && serviceData) {
      if (directData.balance_uni === serviceData.balance_uni && 
          directData.balance_ton === serviceData.balance_ton) {
        console.log('   ✅ РЕЗУЛЬТАТЫ СОВПАДАЮТ');
      } else {
        console.log('   ❌ РЕЗУЛЬТАТЫ НЕ СОВПАДАЮТ!');
        console.log(`   Прямой запрос: UNI=${directData.balance_uni}, TON=${directData.balance_ton}`);
        console.log(`   UserService:   UNI=${serviceData.balance_uni}, TON=${serviceData.balance_ton}`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testUserServiceVsDirect();