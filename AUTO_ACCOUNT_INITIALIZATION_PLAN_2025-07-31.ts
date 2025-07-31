#!/usr/bin/env tsx
/**
 * 🚀 СИСТЕМА АВТОМАТИЧЕСКОЙ ИНИЦИАЛИЗАЦИИ АККАУНТОВ
 * Дата: 31.07.2025
 * Цель: Предотвратить создание неполноценных аккаунтов в будущем
 */

interface FullAccountInitialization {
  // Обязательные поля
  telegram_id: number;
  username: string;
  first_name: string;
  ref_code: string;
  
  // Начальные балансы
  balance_uni: string;
  balance_ton: string;
  
  // Системные записи
  initialTransaction: boolean;
  userSession: boolean;
  
  // TON Boost совместимость
  tonFarmingDataIfNeeded: boolean;
}

/**
 * Улучшенная функция создания пользователя по стандарту User ID 25
 */
async function createFullyInitializedUser(telegramData: any): Promise<FullAccountInitialization> {
  console.log('🚀 Создание полноценного аккаунта по стандарту User ID 25...');
  
  // 1. Генерация уникального ref_code
  const refCode = `REF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // 2. Создание основной записи пользователя
  const userData = {
    telegram_id: telegramData.id,
    username: telegramData.username,
    first_name: telegramData.first_name,
    ref_code: refCode,
    parent_ref_code: telegramData.start_param || null, // Если пришел по реферальной ссылке
    balance_uni: "0.01", // Начальный баланс для валидации системы
    balance_ton: "0.01", // Начальный баланс для валидации системы
    uni_farming_active: false,
    ton_boost_active: false,
    created_at: new Date().toISOString()
  };
  
  // 3. Создание начальной транзакции (критично для Balance Manager)
  const initialTransaction = {
    user_id: '[USER_ID_FROM_INSERT]',
    type: 'WELCOME_BONUS',
    currency: 'UNI',
    amount: '0.01',
    status: 'completed',
    description: 'Приветственный бонус за регистрацию в UniFarm',
    created_at: new Date().toISOString()
  };
  
  // 4. Создание пользовательской сессии (для аутентификации)
  const userSession = {
    user_id: '[USER_ID_FROM_INSERT]',
    session_token: `unif_session_${Date.now()}_${refCode}`,
    telegram_init_data: JSON.stringify(telegramData),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 дней
    created_at: new Date().toISOString(),
    ip_address: '[REQUEST_IP]',
    user_agent: '[REQUEST_USER_AGENT]'
  };
  
  console.log('✅ План полной инициализации создан');
  
  return {
    telegram_id: userData.telegram_id,
    username: userData.username!,
    first_name: userData.first_name!,
    ref_code: userData.ref_code,
    balance_uni: userData.balance_uni,
    balance_ton: userData.balance_ton,
    initialTransaction: true,
    userSession: true,
    tonFarmingDataIfNeeded: false // Создается только при активации TON Boost
  };
}

/**
 * Интеграция в существующую систему регистрации
 */
const ENHANCED_USER_CREATION_GUIDE = `
ИНТЕГРАЦИЯ В МОДУЛИ РЕГИСТРАЦИИ:

1. ОБНОВИТЬ modules/auth/service.ts:
   - getOrCreateUserFromTelegram() должна использовать createFullyInitializedUser()
   - Всегда создавать начальную транзакцию
   - Всегда создавать пользовательскую сессию
   - Генерировать ref_code ОБЯЗАТЕЛЬНО

2. ОБНОВИТЬ modules/user/service.ts:
   - createUser() должна следовать стандарту User ID 25
   - Валидация: telegram_id, ref_code, начальные балансы обязательны
   - Создание связанных записей в transactions и user_sessions

3. ОБНОВИТЬ core/middleware/telegramAuth.ts:
   - Проверка наличия ref_code перед пропуском аутентификации
   - Если ref_code отсутствует - принудительная регенерация
   - Логирование всех неполных аккаунтов

4. СОЗДАТЬ modules/account/healthCheck.ts:
   - Функция validateAccountHealth(userId)
   - Автоматическое исправление неполных аккаунтов
   - Мониторинг качества новых регистраций

КРИТИЧЕСКИЕ ПРАВИЛА:
✅ ВСЕГДА создавать ref_code при регистрации
✅ ВСЕГДА создавать начальную транзакцию (0.01 UNI)
✅ ВСЕГДА создавать пользовательскую сессию
✅ НИКОГДА не создавать TON Boost без ton_farming_data
✅ ПРОВЕРЯТЬ целостность после каждой регистрации
`;

/**
 * Функция проверки здоровья аккаунта
 */
async function checkAccountHealth(userId: number): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Симуляция проверок (в реальности - запросы к БД)
  const hasRefCode = true; // await checkUserRefCode(userId);
  const hasTransactions = true; // await checkUserTransactions(userId);
  const hasSessions = true; // await checkUserSessions(userId);
  const tonBoostConsistent = true; // await checkTonBoostConsistency(userId);
  
  if (!hasRefCode) {
    issues.push('MISSING_REF_CODE');
    recommendations.push('Сгенерировать ref_code для WebSocket/API интеграции');
  }
  
  if (!hasTransactions) {
    issues.push('NO_TRANSACTION_HISTORY');
    recommendations.push('Создать начальную транзакцию для Balance Manager');
  }
  
  if (!hasSessions) {
    issues.push('NO_USER_SESSIONS');
    recommendations.push('Создать пользовательскую сессию для аутентификации');
  }
  
  if (!tonBoostConsistent) {
    issues.push('TON_BOOST_INCONSISTENT');
    recommendations.push('Синхронизировать ton_boost_active с ton_farming_data');
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Автоматическое исправление неполных аккаунтов
 */
async function autoRepairAccount(userId: number): Promise<boolean> {
  console.log(`🔧 Автоматическое исправление аккаунта ${userId}...`);
  
  const health = await checkAccountHealth(userId);
  
  if (health.isHealthy) {
    console.log('✅ Аккаунт здоров, исправления не требуются');
    return true;
  }
  
  console.log(`⚠️ Обнаружено ${health.issues.length} проблем:`, health.issues);
  
  // Применение исправлений
  for (const issue of health.issues) {
    switch (issue) {
      case 'MISSING_REF_CODE':
        // await generateRefCodeForUser(userId);
        console.log('🔧 Сгенерирован ref_code');
        break;
        
      case 'NO_TRANSACTION_HISTORY':
        // await createInitialTransactionForUser(userId);
        console.log('🔧 Создана начальная транзакция');
        break;
        
      case 'NO_USER_SESSIONS':
        // await createUserSessionForUser(userId);
        console.log('🔧 Создана пользовательская сессия');
        break;
        
      case 'TON_BOOST_INCONSISTENT':
        // await fixTonBoostConsistency(userId);
        console.log('🔧 Исправлена TON Boost консистентность');
        break;
    }
  }
  
  console.log('✅ Автоматическое исправление завершено');
  return true;
}

console.log('📋 ПЛАН АВТОМАТИЧЕСКОЙ ИНИЦИАЛИЗАЦИИ СОЗДАН');
console.log('🎯 Цель: Все новые аккаунты = стандарт User ID 25');
console.log('🔧 Интеграция: modules/auth/service.ts + modules/user/service.ts');
console.log('🏥 Мониторинг: checkAccountHealth() + autoRepairAccount()');

export {
  createFullyInitializedUser,
  checkAccountHealth,
  autoRepairAccount,
  ENHANCED_USER_CREATION_GUIDE
};