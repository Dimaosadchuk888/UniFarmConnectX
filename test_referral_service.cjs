// Тест модуля referral/service напрямую без изменений кода
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Создаем клиент Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Простой логгер
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.log(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.log(`[ERROR] ${msg}`, data || '')
};

// Копия логики из modules/referral/service.ts
class TestReferralService {
  async processReferral(refCode, newUserId) {
    logger.info('[TestReferralService] processReferral вызван', { refCode, newUserId });
    
    try {
      // Находим пользователя по реферальному коду
      logger.info('[TestReferralService] Поиск пользователя по реферальному коду', { refCode });
      
      const { data: inviterData, error: inviterError } = await supabase
        .from('users')
        .select('id, telegram_id, username, ref_code')
        .eq('ref_code', refCode)
        .single();
      
      if (inviterError) {
        logger.error('[TestReferralService] Ошибка поиска инвайтера', { error: inviterError.message, refCode });
        return { success: false, error: `Инвайтер не найден: ${inviterError.message}` };
      }
      
      if (!inviterData) {
        logger.warn('[TestReferralService] Инвайтер не найден', { refCode });
        return { success: false, error: 'Инвайтер не найден' };
      }
      
      logger.info('[TestReferralService] Инвайтер найден', { inviterId: inviterData.id, inviterUsername: inviterData.username });
      
      // Обновляем referred_by для нового пользователя
      logger.info('[TestReferralService] Обновление referred_by для нового пользователя', { newUserId, inviterId: inviterData.id });
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ referred_by: inviterData.id })
        .eq('id', newUserId);
      
      if (updateError) {
        logger.error('[TestReferralService] Ошибка обновления referred_by', { error: updateError.message, newUserId });
        return { success: false, error: `Ошибка обновления referred_by: ${updateError.message}` };
      }
      
      logger.info('[TestReferralService] referred_by успешно обновлен', { newUserId, inviterId: inviterData.id });
      
      // Создаем запись в таблице referrals
      logger.info('[TestReferralService] Создание записи в referrals', { newUserId, inviterId: inviterData.id });
      
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          user_id: parseInt(newUserId),
          referred_user_id: parseInt(newUserId), // Дублируем для совместимости
          inviter_id: inviterData.id,
          level: 1,
          created_at: new Date().toISOString()
        });
      
      if (referralError) {
        logger.error('[TestReferralService] Ошибка создания записи в referrals', { error: referralError.message, newUserId });
        return { success: false, error: `Ошибка создания записи referrals: ${referralError.message}` };
      }
      
      logger.info('[TestReferralService] Запись в referrals успешно создана', { newUserId, inviterId: inviterData.id });
      
      return { 
        success: true, 
        message: 'Реферальная связь успешно создана',
        inviterId: inviterData.id,
        newUserId: parseInt(newUserId)
      };
      
    } catch (error) {
      logger.error('[TestReferralService] Неожиданная ошибка в processReferral', { error: error.message, refCode, newUserId });
      return { success: false, error: `Неожиданная ошибка: ${error.message}` };
    }
  }
}

async function testReferralService() {
  console.log('=== ТЕСТ REFERRAL SERVICE ===');
  
  // Создаем временного тестового пользователя
  const testTelegramId = Math.floor(Math.random() * 1000000000);
  const testUsername = `test_${Date.now()}`;
  
  console.log('1. Создаем временного тестового пользователя...');
  
  const { data: testUser, error: createError } = await supabase
    .from('users')
    .insert({
      telegram_id: testTelegramId,
      username: testUsername,
      first_name: 'Test',
      ref_code: `TEST_${Date.now()}`,
      referred_by: null, // Изначально null
      balance_uni: '0',
      balance_ton: '0'
    })
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Ошибка создания тестового пользователя:', createError);
    return;
  }
  
  console.log('✅ Тестовый пользователь создан:', testUser.id);
  
  // Тестируем processReferral
  console.log('\n2. Тестируем processReferral...');
  
  const referralService = new TestReferralService();
  const result = await referralService.processReferral('REF_1752755835358_yjrusv', testUser.id.toString());
  
  console.log('Результат processReferral:', result);
  
  if (result.success) {
    console.log('✅ processReferral сработал успешно');
    
    // Проверяем что referred_by обновился
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, referred_by')
      .eq('id', testUser.id)
      .single();
    
    console.log('Обновленный пользователь:', updatedUser);
    
    if (updatedUser.referred_by === 184) {
      console.log('✅ referred_by правильно обновлен на 184');
    } else {
      console.log('❌ referred_by НЕ обновлен:', updatedUser.referred_by);
    }
    
    // Проверяем запись в referrals
    const { data: referralRecord } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', testUser.id)
      .single();
    
    console.log('Запись в referrals:', referralRecord);
    
    if (referralRecord) {
      console.log('✅ Запись в referrals создана успешно');
    } else {
      console.log('❌ Запись в referrals НЕ создана');
    }
    
  } else {
    console.log('❌ processReferral завершился с ошибкой:', result.error);
  }
  
  // Очищаем тестовые данные
  console.log('\n3. Очищаем тестовые данные...');
  
  await supabase.from('referrals').delete().eq('user_id', testUser.id);
  await supabase.from('users').delete().eq('id', testUser.id);
  
  console.log('✅ Тестовые данные очищены');
  
  console.log('\n=== ЗАКЛЮЧЕНИЕ ===');
  console.log('Если processReferral работает в тесте, но не работает в production,');
  console.log('проблема может быть в:');
  console.log('1. Логике вызова processReferral в auth/service.ts');
  console.log('2. Асинхронности выполнения');
  console.log('3. Ошибках в импорте модулей');
  console.log('4. Конфликте версий кода');
  
  process.exit(0);
}

testReferralService().catch(console.error);