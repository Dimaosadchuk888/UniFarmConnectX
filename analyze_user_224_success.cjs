/**
 * АНАЛИЗ УСПЕШНОЙ РЕГИСТРАЦИИ USER 224
 * Изучаем единственный успешный кейс реферальной связи
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function analyzeUser224Success() {
  console.log('=== АНАЛИЗ УСПЕШНОЙ РЕГИСТРАЦИИ USER 224 ===\n');
  
  try {
    // 1. Получаем данные User 224
    console.log('🔍 1. АНАЛИЗ USER 224 (УСПЕШНЫЙ КЕЙС)');
    
    const { data: user224 } = await supabase
      .from('users')
      .select('*')
      .eq('id', 224)
      .single();
    
    if (!user224) {
      console.log('❌ User 224 не найден');
      return;
    }
    
    console.log('✅ User 224 найден:');
    console.log(`   ID: ${user224.id}`);
    console.log(`   Telegram ID: ${user224.telegram_id}`);
    console.log(`   Username: ${user224.username}`);
    console.log(`   referred_by: ${user224.referred_by}`);
    console.log(`   ref_code: ${user224.ref_code}`);
    console.log(`   created_at: ${user224.created_at}`);
    
    // 2. Проверяем связь с User 25
    console.log('\n🔍 2. ПРОВЕРКА СВЯЗИ С USER 25 (РЕФЕРЕР)');
    
    if (user224.referred_by == 25) {
      console.log('✅ User 224 корректно связан с User 25');
      
      // Получаем данные реферера
      const { data: referrer } = await supabase
        .from('users')
        .select('id, username, ref_code')
        .eq('id', 25)
        .single();
      
      if (referrer) {
        console.log('✅ Реферер найден:');
        console.log(`   ID: ${referrer.id}`);
        console.log(`   Username: ${referrer.username}`);
        console.log(`   Ref Code: ${referrer.ref_code}`);
        
        // Проверяем совпадение с кодом из сообщения
        if (referrer.ref_code === 'REF_1750079004411_nddfp2') {
          console.log('✅ Реферальный код совпадает с указанным в сообщении');
        } else {
          console.log('❌ Реферальный код НЕ совпадает');
        }
      }
    } else {
      console.log('❌ User 224 НЕ связан с User 25');
    }
    
    // 3. Проверяем запись в referrals
    console.log('\n🔍 3. ПРОВЕРКА ЗАПИСИ В REFERRALS');
    
    const { data: referralRecord } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', 224)
      .single();
    
    if (referralRecord) {
      console.log('✅ Запись в referrals найдена:');
      console.log(`   user_id: ${referralRecord.user_id}`);
      console.log(`   referred_user_id: ${referralRecord.referred_user_id}`);
      console.log(`   inviter_id: ${referralRecord.inviter_id}`);
      console.log(`   level: ${referralRecord.level}`);
      console.log(`   ref_path: ${JSON.stringify(referralRecord.ref_path)}`);
      console.log(`   created_at: ${referralRecord.created_at}`);
      
      // Проверяем корректность данных
      if (referralRecord.inviter_id == 25) {
        console.log('✅ inviter_id корректно указывает на User 25');
      } else {
        console.log('❌ inviter_id НЕ соответствует User 25');
      }
      
      if (referralRecord.user_id == referralRecord.referred_user_id) {
        console.log('✅ user_id и referred_user_id совпадают (дублирование)');
      } else {
        console.log('❌ user_id и referred_user_id НЕ совпадают');
      }
      
    } else {
      console.log('❌ Запись в referrals НЕ найдена');
    }
    
    // 4. Временной анализ
    console.log('\n🔍 4. ВРЕМЕННОЙ АНАЛИЗ');
    
    const userCreatedAt = new Date(user224.created_at);
    const referralCreatedAt = referralRecord ? new Date(referralRecord.created_at) : null;
    
    console.log(`User 224 создан: ${userCreatedAt.toISOString()}`);
    
    if (referralCreatedAt) {
      console.log(`Referral создан: ${referralCreatedAt.toISOString()}`);
      
      const timeDiff = Math.abs(referralCreatedAt.getTime() - userCreatedAt.getTime());
      console.log(`Разница во времени: ${timeDiff} мс (${(timeDiff / 1000).toFixed(2)} сек)`);
      
      if (timeDiff < 5000) {
        console.log('✅ Реферальная связь создана практически одновременно с пользователем');
      } else {
        console.log('⚠️ Реферальная связь создана с задержкой');
      }
    }
    
    // 5. Поиск других пользователей с referred_by = 25
    console.log('\n🔍 5. ПОИСК ДРУГИХ РЕФЕРАЛОВ USER 25');
    
    const { data: otherReferrals } = await supabase
      .from('users')
      .select('id, username, telegram_id, referred_by, created_at')
      .eq('referred_by', 25)
      .order('created_at');
    
    if (otherReferrals && otherReferrals.length > 0) {
      console.log(`✅ Найдено ${otherReferrals.length} рефералов User 25:`);
      
      otherReferrals.forEach((user, index) => {
        const isUser224 = user.id == 224;
        const marker = isUser224 ? '🎯' : '👤';
        
        console.log(`   ${marker} User ${user.id}: ${user.username} (${user.telegram_id}) - ${user.created_at}`);
        
        if (isUser224) {
          console.log('     👆 Это наш успешный кейс!');
        }
      });
    } else {
      console.log('❌ Других рефералов User 25 не найдено');
    }
    
    // 6. Поиск записей в referrals для User 25
    console.log('\n🔍 6. ПОИСК ЗАПИСЕЙ В REFERRALS ДЛЯ USER 25');
    
    const { data: referralsByInviter } = await supabase
      .from('referrals')
      .select('*')
      .eq('inviter_id', 25)
      .order('created_at');
    
    if (referralsByInviter && referralsByInviter.length > 0) {
      console.log(`✅ Найдено ${referralsByInviter.length} записей в referrals с inviter_id=25:`);
      
      referralsByInviter.forEach((record, index) => {
        const isUser224 = record.user_id == 224;
        const marker = isUser224 ? '🎯' : '📝';
        
        console.log(`   ${marker} User ${record.user_id} (level ${record.level}) - ${record.created_at}`);
        
        if (isUser224) {
          console.log('     👆 Это наш успешный кейс!');
        }
      });
    } else {
      console.log('❌ Записей в referrals с inviter_id=25 не найдено');
    }
    
    // 7. ФИНАЛЬНЫЙ АНАЛИЗ
    console.log('\n🎯 7. ФИНАЛЬНЫЙ АНАЛИЗ УСПЕШНОГО КЕЙСА');
    
    const hasUserRecord = !!user224;
    const hasReferredBy = user224?.referred_by == 25;
    const hasReferralRecord = !!referralRecord;
    const hasCorrectInviter = referralRecord?.inviter_id == 25;
    
    console.log('📊 Результаты проверки:');
    console.log(`   ✅ Пользователь существует: ${hasUserRecord}`);
    console.log(`   ${hasReferredBy ? '✅' : '❌'} referred_by = 25: ${hasReferredBy}`);
    console.log(`   ${hasReferralRecord ? '✅' : '❌'} Запись в referrals: ${hasReferralRecord}`);
    console.log(`   ${hasCorrectInviter ? '✅' : '❌'} inviter_id = 25: ${hasCorrectInviter}`);
    
    if (hasUserRecord && hasReferredBy && hasReferralRecord && hasCorrectInviter) {
      console.log('\n🎉 УСПЕШНЫЙ КЕЙС ПОЛНОСТЬЮ КОРРЕКТЕН!');
      console.log('✅ User 224 - это образец того, как должна работать система');
      console.log('✅ Обе таблицы (users и referrals) заполнены корректно');
      console.log('✅ Связь между User 25 и User 224 установлена правильно');
    } else {
      console.log('\n❌ Успешный кейс имеет проблемы');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка анализа:', error);
  }
}

analyzeUser224Success();