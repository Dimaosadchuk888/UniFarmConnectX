#!/usr/bin/env tsx
/**
 * 🔍 СРАВНИТЕЛЬНЫЙ АНАЛИЗ: User ID 25 VS User ID 253
 * Дата: 31.07.2025
 * Цель: Подтвердить гипотезу различий между аккаунтами
 * Режим: ТОЛЬКО АНАЛИЗ, БЕЗ ИЗМЕНЕНИЙ
 */

import { createClient } from '@supabase/supabase-js';

// Используем переменные окружения для подключения
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

interface UserProfile {
  id: number;
  telegram_id: string | null;
  username: string | null;
  first_name: string | null;
  ref_code: string | null;
  parent_ref_code: string | null;
  referred_by: number | null;
  balance_uni: string | null;
  balance_ton: string | null;
  uni_farming_active: boolean;
  ton_boost_active: boolean;
  ton_boost_package: number | null;
  ton_boost_rate: number | null;
  created_at: string;
  is_admin: boolean;
  status: string | null;
}

interface ConnectionAnalysis {
  userId: number;
  profile: UserProfile | null;
  connections: {
    hasTransactions: boolean;
    transactionCount: number;
    hasFarmingData: boolean;
    hasUserSessions: boolean;
    sessionCount: number;
    hasDailyBonus: boolean;
    bonusCount: number;
    hasReferrals: boolean;
    referralCount: number;
  };
  systemIntegration: {
    webSocketCompatible: boolean;
    apiAccessible: boolean;
    balanceSystemWorking: boolean;
    tonBoostConsistent: boolean;
  };
  anomalies: string[];
  differences: string[];
}

console.log('🔍 ДЕТАЛЬНЫЙ СРАВНИТЕЛЬНЫЙ АНАЛИЗ: User 25 VS User 253');
console.log('='.repeat(80));
console.log('📋 Режим: ТОЛЬКО АНАЛИЗ, БЕЗ ИЗМЕНЕНИЙ В СИСТЕМУ');
console.log('🎯 Цель: Подтвердить гипотезу различий между аккаунтами');
console.log('');

async function analyzeUser(userId: number): Promise<ConnectionAnalysis> {
  console.log(`\n🔍 АНАЛИЗ USER ${userId}:`);
  console.log('-'.repeat(50));

  const analysis: ConnectionAnalysis = {
    userId,
    profile: null,
    connections: {
      hasTransactions: false,
      transactionCount: 0,
      hasFarmingData: false,
      hasUserSessions: false,
      sessionCount: 0,
      hasDailyBonus: false,
      bonusCount: 0,
      hasReferrals: false,
      referralCount: 0
    },
    systemIntegration: {
      webSocketCompatible: false,
      apiAccessible: false,
      balanceSystemWorking: false,
      tonBoostConsistent: false
    },
    anomalies: [],
    differences: []
  };

  try {
    // 1. Основной профиль пользователя
    console.log(`1️⃣ ОСНОВНОЙ ПРОФИЛЬ User ${userId}:`);
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.log(`❌ User ${userId} НЕ НАЙДЕН: ${userError?.message || 'Нет данных'}`);
      analysis.anomalies.push(`USER_NOT_FOUND: ${userError?.message || 'Нет данных'}`);
      return analysis;
    }

    analysis.profile = userProfile;
    console.log(`   ✅ Найден: @${userProfile.username} (${userProfile.first_name})`);
    console.log(`   📱 Telegram ID: ${userProfile.telegram_id}`);
    console.log(`   🔗 Ref Code: ${userProfile.ref_code || 'НЕТ'}`);
    console.log(`   💰 UNI Balance: ${userProfile.balance_uni || '0'}`);
    console.log(`   💎 TON Balance: ${userProfile.balance_ton || '0'}`);
    console.log(`   🚀 TON Boost: ${userProfile.ton_boost_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);
    console.log(`   📅 Создан: ${new Date(userProfile.created_at).toLocaleString('ru-RU')}`);
    console.log(`   👑 Админ: ${userProfile.is_admin ? 'ДА' : 'НЕТ'}`);

    // 2. Анализ транзакций
    console.log(`\n2️⃣ АНАЛИЗ ТРАНЗАКЦИЙ User ${userId}:`);
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, type, currency, amount, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.log(`   ❌ Ошибка транзакций: ${txError.message}`);
      analysis.anomalies.push(`TRANSACTION_ERROR: ${txError.message}`);
    } else {
      analysis.connections.transactionCount = transactions?.length || 0;
      analysis.connections.hasTransactions = (transactions?.length || 0) > 0;
      
      console.log(`   📊 Всего транзакций: ${analysis.connections.transactionCount}`);
      
      if (transactions && transactions.length > 0) {
        console.log(`   📋 Последние транзакции:`);
        transactions.slice(0, 5).forEach((tx, index) => {
          console.log(`      [${index + 1}] ${tx.created_at} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.status}`);
        });
        
        // Анализ типов транзакций
        const txTypes = transactions.reduce((acc, tx) => {
          acc[tx.type] = (acc[tx.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`   🎯 Типы операций:`, txTypes);
      } else {
        console.log(`   ⚠️  НЕТ ТРАНЗАКЦИЙ - критическая проблема!`);
        analysis.anomalies.push('NO_TRANSACTIONS');
      }
    }

    // 3. Анализ TON farming data
    console.log(`\n3️⃣ АНАЛИЗ TON FARMING DATA User ${userId}:`);
    const { data: farmingData, error: farmingError } = await supabase
      .from('ton_farming_data')
      .select('*')
      .eq('user_id', userId);

    if (farmingError) {
      console.log(`   ❌ Ошибка farming data: ${farmingError.message}`);
      analysis.anomalies.push(`FARMING_ERROR: ${farmingError.message}`);
    } else {
      analysis.connections.hasFarmingData = (farmingData?.length || 0) > 0;
      
      if (farmingData && farmingData.length > 0) {
        const farming = farmingData[0];
        console.log(`   ✅ Farming Data найден:`);
        console.log(`      Farming Balance: ${farming.farming_balance || 0}`);
        console.log(`      Farming Rate: ${farming.farming_rate || 0}`);
        console.log(`      Boost Active: ${farming.boost_active ? 'ДА' : 'НЕТ'}`);
        console.log(`      Последнее обновление: ${farming.last_update || 'Никогда'}`);
        
        // Проверка консистентности
        if (userProfile.ton_boost_active !== farming.boost_active) {
          console.log(`   ⚠️  НЕСООТВЕТСТВИЕ: users.ton_boost_active (${userProfile.ton_boost_active}) != farming.boost_active (${farming.boost_active})`);
          analysis.anomalies.push('TON_BOOST_INCONSISTENCY');
        }
      } else {
        console.log(`   ⚠️  НЕТ FARMING DATA`);
        if (userProfile.ton_boost_active) {
          console.log(`   🚨 КРИТИЧНО: TON Boost активен, но нет данных фарминга!`);
          analysis.anomalies.push('TON_BOOST_WITHOUT_DATA');
        }
      }
    }

    // 4. Анализ сессий пользователя
    console.log(`\n4️⃣ АНАЛИЗ USER SESSIONS User ${userId}:`);
    const { data: sessions, error: sessionError } = await supabase
      .from('user_sessions')
      .select('session_token, expires_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionError) {
      console.log(`   ❌ Ошибка сессий: ${sessionError.message}`);
      analysis.anomalies.push(`SESSION_ERROR: ${sessionError.message}`);
    } else {
      analysis.connections.sessionCount = sessions?.length || 0;
      analysis.connections.hasUserSessions = (sessions?.length || 0) > 0;
      
      console.log(`   📊 Активных сессий: ${analysis.connections.sessionCount}`);
      
      if (sessions && sessions.length > 0) {
        console.log(`   📋 Последние сессии:`);
        sessions.forEach((session, index) => {
          const isExpired = new Date(session.expires_at) < new Date();
          console.log(`      [${index + 1}] ${session.created_at} | Истекает: ${session.expires_at} | ${isExpired ? 'ИСТЕКЛА' : 'АКТИВНА'}`);
        });
      } else {
        console.log(`   ⚠️  НЕТ АКТИВНЫХ СЕССИЙ`);
        analysis.anomalies.push('NO_SESSIONS');
      }
    }

    // 5. Анализ daily bonus claims
    console.log(`\n5️⃣ АНАЛИЗ DAILY BONUS CLAIMS User ${userId}:`);
    const { data: bonusClaims, error: bonusError } = await supabase
      .from('daily_bonus_claims')
      .select('claimed_at, streak, bonus_amount')
      .eq('user_id', userId)
      .order('claimed_at', { ascending: false })
      .limit(5);

    if (bonusError) {
      console.log(`   ❌ Ошибка bonus claims: ${bonusError.message}`);
      analysis.anomalies.push(`BONUS_ERROR: ${bonusError.message}`);
    } else {
      analysis.connections.bonusCount = bonusClaims?.length || 0;
      analysis.connections.hasDailyBonus = (bonusClaims?.length || 0) > 0;
      
      console.log(`   📊 Всего бонусов: ${analysis.connections.bonusCount}`);
      
      if (bonusClaims && bonusClaims.length > 0) {
        console.log(`   📋 Последние бонусы:`);
        bonusClaims.forEach((bonus, index) => {
          console.log(`      [${index + 1}] ${bonus.claimed_at} | Streak: ${bonus.streak || 0} | Amount: ${bonus.bonus_amount || 0}`);
        });
      } else {
        console.log(`   ⚠️  НЕТ DAILY BONUS CLAIMS`);
      }
    }

    // 6. Анализ рефералов
    console.log(`\n6️⃣ АНАЛИЗ РЕФЕРАЛОВ User ${userId}:`);
    const { data: referrals, error: refError } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, created_at')
      .eq('referred_by', userId);

    if (refError) {
      console.log(`   ❌ Ошибка рефералов: ${refError.message}`);
      analysis.anomalies.push(`REFERRAL_ERROR: ${refError.message}`);
    } else {
      analysis.connections.referralCount = referrals?.length || 0;
      analysis.connections.hasReferrals = (referrals?.length || 0) > 0;
      
      console.log(`   📊 Приглашенных пользователей: ${analysis.connections.referralCount}`);
      
      if (referrals && referrals.length > 0) {
        console.log(`   📋 Рефералы:`);
        referrals.forEach((ref, index) => {
          console.log(`      [${index + 1}] User ${ref.id} (@${ref.username}) | UNI: ${ref.balance_uni} | TON: ${ref.balance_ton}`);
        });
      }
    }

    // 7. Проверка системной интеграции
    console.log(`\n7️⃣ АНАЛИЗ СИСТЕМНОЙ ИНТЕГРАЦИИ User ${userId}:`);
    
    // WebSocket совместимость
    analysis.systemIntegration.webSocketCompatible = !!(
      userProfile.telegram_id && 
      analysis.connections.hasTransactions &&
      userProfile.ref_code
    );
    
    // API доступность
    analysis.systemIntegration.apiAccessible = !!(
      userProfile.telegram_id && 
      userProfile.ref_code
    );
    
    // Система балансов
    analysis.systemIntegration.balanceSystemWorking = !!(
      analysis.connections.hasTransactions &&
      (parseFloat(userProfile.balance_uni || '0') > 0 || parseFloat(userProfile.balance_ton || '0') > 0)
    );
    
    // TON Boost консистентность
    analysis.systemIntegration.tonBoostConsistent = !(
      userProfile.ton_boost_active && !analysis.connections.hasFarmingData
    );

    console.log(`   🔗 WebSocket совместимость: ${analysis.systemIntegration.webSocketCompatible ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`   🌐 API доступность: ${analysis.systemIntegration.apiAccessible ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`   💰 Система балансов: ${analysis.systemIntegration.balanceSystemWorking ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
    console.log(`   🚀 TON Boost консистентность: ${analysis.systemIntegration.tonBoostConsistent ? '✅ ДА' : '❌ НЕТ'}`);

  } catch (error) {
    console.log(`❌ КРИТИЧЕСКАЯ ОШИБКА при анализе User ${userId}:`, error);
    analysis.anomalies.push(`CRITICAL_ERROR: ${error}`);
  }

  return analysis;
}

function compareUsers(user25: ConnectionAnalysis, user253: ConnectionAnalysis): void {
  console.log('\n🔄 ДЕТАЛЬНОЕ СРАВНЕНИЕ User 25 VS User 253:');
  console.log('='.repeat(80));

  // Сравнение основных профилей
  console.log('\n📊 СРАВНЕНИЕ ОСНОВНЫХ ПРОФИЛЕЙ:');
  console.log('-'.repeat(50));
  
  const profile25 = user25.profile;
  const profile253 = user253.profile;
  
  if (!profile25 || !profile253) {
    console.log('❌ НЕВОЗМОЖНО СРАВНИТЬ: Один или оба пользователя не найдены');
    return;
  }

  const fields = [
    'telegram_id', 'username', 'ref_code', 'balance_uni', 'balance_ton', 
    'uni_farming_active', 'ton_boost_active', 'ton_boost_package', 'is_admin', 'created_at'
  ];

  fields.forEach(field => {
    const value25 = profile25[field as keyof UserProfile];
    const value253 = profile253[field as keyof UserProfile];
    
    if (value25 !== value253) {
      console.log(`🔸 ${field}:`);
      console.log(`   User 25:  ${value25}`);
      console.log(`   User 253: ${value253}`);
      console.log(`   Различие: ${value25 === null ? 'NULL у 25' : value253 === null ? 'NULL у 253' : 'Разные значения'}`);
    } else {
      console.log(`✅ ${field}: ИДЕНТИЧНО (${value25})`);
    }
  });

  // Сравнение подключений
  console.log('\n🔗 СРАВНЕНИЕ СИСТЕМНЫХ ПОДКЛЮЧЕНИЙ:');
  console.log('-'.repeat(50));
  
  const connections = [
    'hasTransactions', 'transactionCount', 'hasFarmingData', 
    'hasUserSessions', 'sessionCount', 'hasDailyBonus', 
    'bonusCount', 'hasReferrals', 'referralCount'
  ];

  connections.forEach(conn => {
    const conn25 = user25.connections[conn as keyof typeof user25.connections];
    const conn253 = user253.connections[conn as keyof typeof user253.connections];
    
    if (conn25 !== conn253) {
      console.log(`🔸 ${conn}:`);
      console.log(`   User 25:  ${conn25}`);
      console.log(`   User 253: ${conn253}`);
    } else {
      console.log(`✅ ${conn}: ИДЕНТИЧНО (${conn25})`);
    }
  });

  // Сравнение системной интеграции
  console.log('\n⚙️ СРАВНЕНИЕ СИСТЕМНОЙ ИНТЕГРАЦИИ:');
  console.log('-'.repeat(50));
  
  const integrations = [
    'webSocketCompatible', 'apiAccessible', 
    'balanceSystemWorking', 'tonBoostConsistent'
  ];

  integrations.forEach(integration => {
    const int25 = user25.systemIntegration[integration as keyof typeof user25.systemIntegration];
    const int253 = user253.systemIntegration[integration as keyof typeof user253.systemIntegration];
    
    if (int25 !== int253) {
      console.log(`🔸 ${integration}:`);
      console.log(`   User 25:  ${int25 ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
      console.log(`   User 253: ${int253 ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
    } else {
      console.log(`✅ ${integration}: ИДЕНТИЧНО (${int25 ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'})`);
    }
  });

  // Анализ аномалий
  console.log('\n🚨 АНАЛИЗ АНОМАЛИЙ:');
  console.log('-'.repeat(50));
  
  console.log(`🔸 User 25 аномалии (${user25.anomalies.length}):`);
  user25.anomalies.forEach(anomaly => console.log(`   - ${anomaly}`));
  
  console.log(`🔸 User 253 аномалии (${user253.anomalies.length}):`);
  user253.anomalies.forEach(anomaly => console.log(`   - ${anomaly}`));

  // Заключение
  console.log('\n🎯 ЗАКЛЮЧЕНИЕ СРАВНЕНИЯ:');
  console.log('-'.repeat(50));
  
  const totalDifferences = fields.filter(field => 
    profile25[field as keyof UserProfile] !== profile253[field as keyof UserProfile]
  ).length;
  
  const systemDifferences = integrations.filter(integration =>
    user25.systemIntegration[integration as keyof typeof user25.systemIntegration] !== 
    user253.systemIntegration[integration as keyof typeof user253.systemIntegration]
  ).length;

  console.log(`📊 Различий в профиле: ${totalDifferences}/${fields.length}`);
  console.log(`🔗 Различий в системе: ${systemDifferences}/${integrations.length}`);
  console.log(`🚨 Аномалий User 25: ${user25.anomalies.length}`);
  console.log(`🚨 Аномалий User 253: ${user253.anomalies.length}`);
  
  if (totalDifferences === 0 && systemDifferences === 0) {
    console.log(`✅ АККАУНТЫ ИДЕНТИЧНЫ - гипотеза различий НЕ ПОДТВЕРЖДЕНА`);
  } else {
    console.log(`🔸 АККАУНТЫ РАЗЛИЧАЮТСЯ - гипотеза различий ПОДТВЕРЖДЕНА`);
  }
}

async function runComparativeAnalysis(): Promise<void> {
  try {
    console.log('🚀 НАЧАЛО СРАВНИТЕЛЬНОГО АНАЛИЗА');
    
    // Анализ User 25
    const user25Analysis = await analyzeUser(25);
    
    // Анализ User 253
    const user253Analysis = await analyzeUser(253);
    
    // Сравнение результатов
    compareUsers(user25Analysis, user253Analysis);
    
    console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН УСПЕШНО');
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
  }
}

// Запуск анализа
runComparativeAnalysis();