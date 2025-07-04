/**
 * Отладка метода createBoostPurchase
 */

import { createClient } from '@supabase/supabase-js';

async function debugBoostPurchase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ОТЛАДКА createBoostPurchase ===');
  
  // Симулируем вызов createBoostPurchase
  const userId = '48';
  const boostId = '2';
  const source = 'wallet';
  const txHash = null;
  const status = 'confirmed';
  
  console.log('\n1. ПАРАМЕТРЫ ВЫЗОВА:');
  console.log('   userId:', userId, '(type:', typeof userId, ')');
  console.log('   boostId:', boostId, '(type:', typeof boostId, ')');
  console.log('   source:', source);
  console.log('   status:', status);
  
  // Проверим getBoostPackageById
  console.log('\n2. ТЕСТ getBoostPackageById:');
  const packagesResponse = await fetch('http://localhost:3000/api/v2/boost/packages');
  const packagesData = await packagesResponse.json();
  
  if (packagesData.success) {
    const boostPackage = packagesData.data.packages.find(p => p.id == boostId);
    console.log('   Найден пакет:', boostPackage ? 'ДА' : 'НЕТ');
    if (boostPackage) {
      console.log('   Пакет:', {
        id: boostPackage.id,
        name: boostPackage.name,
        min_amount: boostPackage.min_amount,
        daily_rate: boostPackage.daily_rate
      });
    }
    
    // 3. Тест вставки в boost_purchases
    console.log('\n3. ТЕСТ ВСТАВКИ В boost_purchases:');
    const insertData = {
      user_id: parseInt(userId),
      package_id: parseInt(boostId),
      amount: boostPackage.min_amount.toString(),
      rate: boostPackage.daily_rate.toString(),
      status: status,
      payment_method: source,
      transaction_hash: txHash,
      created_at: new Date().toISOString()
    };
    
    console.log('   Данные для вставки:', insertData);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('boost_purchases')
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      console.log('   ❌ Ошибка вставки:', insertError.message);
      console.log('   Детали ошибки:', insertError);
      
      // Fallback test
      console.log('\n4. ТЕСТ FALLBACK ОБНОВЛЕНИЯ:');
      const { data: fallbackResult, error: fallbackError } = await supabase
        .from('users')
        .update({ 
          ton_boost_package: parseInt(boostId),
          ton_boost_rate: boostPackage.daily_rate
        })
        .eq('id', userId)
        .select('id, ton_boost_package, ton_boost_rate');
      
      if (fallbackError) {
        console.log('   ❌ Ошибка fallback:', fallbackError.message);
      } else {
        console.log('   ✅ Fallback успешен:', fallbackResult);
      }
      
    } else {
      console.log('   ✅ Вставка успешна:', insertResult);
      
      // Тест основного обновления users
      console.log('\n4. ТЕСТ ОСНОВНОГО ОБНОВЛЕНИЯ users:');
      const { data: userUpdate, error: userError } = await supabase
        .from('users')
        .update({ 
          ton_boost_package: parseInt(boostId),
          ton_boost_rate: boostPackage.daily_rate
        })
        .eq('id', userId)
        .select('id, ton_boost_package, ton_boost_rate');
      
      if (userError) {
        console.log('   ❌ Ошибка обновления users:', userError.message);
      } else {
        console.log('   ✅ Обновление users успешно:', userUpdate);
      }
      
      // Очистим тестовую запись
      await supabase.from('boost_purchases').delete().eq('id', insertResult.id);
      console.log('   Тестовая запись удалена');
    }
    
    // Восстановим пользователя
    await supabase
      .from('users')
      .update({ ton_boost_package: 0, ton_boost_rate: 0 })
      .eq('id', userId);
    console.log('   Пользователь восстановлен');
    
  } else {
    console.log('   ❌ Не удалось получить пакеты');
  }
  
  console.log('\n=== ОТЛАДКА ЗАВЕРШЕНА ===');
}

debugBoostPurchase().catch(console.error);