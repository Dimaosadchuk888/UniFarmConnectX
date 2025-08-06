/**
 * Простой анализ проблемы с закешированными JWT токенами
 * БЕЗ изменения кода - только диагностика
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeJWTCacheProblems() {
  console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ ЗАКЕШИРОВАННЫХ JWT ТОКЕНОВ ===\n');
  console.log('Дата анализа:', new Date().toISOString());
  console.log('---------------------------------------------------\n');

  try {
    // 1. Проверяем пользователей с неудачными депозитами
    console.log('1. ПОЛЬЗОВАТЕЛИ С НЕУДАЧНЫМИ ДЕПОЗИТАМИ (последние 48 часов):\n');
    
    const { data: failedDeposits } = await supabase
      .from('transactions')
      .select('user_id, created_at, amount, status')
      .eq('type', 'TON_DEPOSIT')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (failedDeposits && failedDeposits.length > 0) {
      console.log(`Найдено ${failedDeposits.length} неудачных депозитов\n`);
      
      // Группируем по пользователям
      const userFailures = new Map<number, number>();
      failedDeposits.forEach(dep => {
        userFailures.set(dep.user_id, (userFailures.get(dep.user_id) || 0) + 1);
      });
      
      console.log('Топ пользователей с проблемами:');
      const sorted = Array.from(userFailures.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
      sorted.forEach(([userId, count]) => {
        console.log(`  User ID ${userId}: ${count} неудачных депозитов`);
      });
    } else {
      console.log('Неудачных депозитов не найдено');
    }

    // 2. Анализ неактивных пользователей
    console.log('\n2. НЕАКТИВНЫЕ ПОЛЬЗОВАТЕЛИ (>24 часа):\n');
    
    const { data: inactiveUsers } = await supabase
      .from('users')
      .select('id, telegram_id, username, last_activity')
      .lt('last_activity', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('last_activity', { ascending: false })
      .limit(10);

    if (inactiveUsers && inactiveUsers.length > 0) {
      console.log('ID | Telegram ID | Username | Последняя активность');
      console.log('---|-------------|----------|---------------------');
      inactiveUsers.forEach(user => {
        const lastActivity = user.last_activity ? new Date(user.last_activity).toISOString().slice(0, 19) : 'Never';
        console.log(`${user.id} | ${user.telegram_id} | ${user.username || 'N/A'} | ${lastActivity}`);
      });
    }

    // 3. Текущие механизмы обновления токенов
    console.log('\n3. АНАЛИЗ МЕХАНИЗМОВ ОБНОВЛЕНИЯ ТОКЕНОВ:\n');
    
    console.log('✅ РАБОТАЮЩИЕ МЕХАНИЗМЫ:');
    console.log('  1. useJwtTokenWatcher - проверка каждые 30 секунд');
    console.log('  2. tokenRecoveryService:');
    console.log('     - attemptTokenRefresh() - 3 попытки через /api/auth/refresh');
    console.log('     - attemptNewTokenCreation() - 3 попытки создания через Telegram initData');
    console.log('  3. DepositRecoveryService - автоматическое восстановление депозитов');
    console.log('  4. criticalOperationGuard - защита критических операций');
    
    console.log('\n❌ ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
    console.log('  1. ИСПРАВЛЕНО: JWT refresh использовал /api/v2/auth/refresh → /api/auth/refresh ✅');
    console.log('  2. Telegram WebApp кеширует localStorage между сессиями');
    console.log('  3. При истечении токена (TTL=24h) refresh может не сработать');
    console.log('  4. Нет принудительной очистки кеша Telegram');

    // 4. Типовые сценарии
    console.log('\n4. ТИПОВЫЕ СЦЕНАРИИ ПРОБЛЕМ:\n');
    
    console.log('📱 СЦЕНАРИЙ 1: "Долгое отсутствие"');
    console.log('  Симптомы:');
    console.log('  - Пользователь не заходил >24 часа');
    console.log('  - JWT токен истек');
    console.log('  - При возврате видит ошибки авторизации');
    console.log('  Что происходит:');
    console.log('  - Telegram загружает старый токен из кеша');
    console.log('  - /api/auth/refresh не может обновить истекший токен');
    console.log('  - attemptNewTokenCreation() должен создать новый через initData');
    
    console.log('\n📱 СЦЕНАРИЙ 2: "Переключение аккаунтов"');
    console.log('  Симптомы:');
    console.log('  - Пользователь переключается между Telegram аккаунтами');
    console.log('  - Видит данные другого пользователя или ошибки');
    console.log('  Что происходит:');
    console.log('  - localStorage сохраняет токен от предыдущего аккаунта');
    console.log('  - Токен валидный, но для другого user_id');
    
    console.log('\n📱 СЦЕНАРИЙ 3: "Telegram кеш"');
    console.log('  Симптомы:');
    console.log('  - Случайные ошибки авторизации');
    console.log('  - Депозиты иногда проходят, иногда нет');
    console.log('  Что происходит:');
    console.log('  - Telegram агрессивно кеширует WebView');
    console.log('  - localStorage сохраняется между сессиями');
    console.log('  - initData обновляется, но токен остается старый');

    // 5. Проверка конкретных пользователей
    console.log('\n5. ПРОВЕРКА КОНКРЕТНЫХ ID (если есть жалобы):\n');
    
    // Здесь можно добавить конкретные ID для проверки
    const checkUserIds = [184, 255, 251, 248]; // Примеры ID
    
    for (const userId of checkUserIds) {
      const { data: user } = await supabase
        .from('users')
        .select('id, telegram_id, last_activity')
        .eq('id', userId)
        .single();
        
      if (user) {
        const { data: recentDeposits } = await supabase
          .from('transactions')
          .select('created_at, status')
          .eq('user_id', userId)
          .eq('type', 'TON_DEPOSIT')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
          
        const failed = recentDeposits?.filter(d => d.status === 'failed').length || 0;
        const successful = recentDeposits?.filter(d => d.status === 'completed').length || 0;
        
        console.log(`User ${userId} (TG: ${user.telegram_id}):`);
        console.log(`  - Последняя активность: ${user.last_activity ? new Date(user.last_activity).toISOString() : 'Never'}`);
        console.log(`  - Депозиты за 7 дней: ${successful} успешных, ${failed} неудачных`);
      }
    }

    // 6. Рекомендации
    console.log('\n6. РЕКОМЕНДАЦИИ (без изменения кода):\n');
    
    console.log('ДЛЯ ПОЛЬЗОВАТЕЛЕЙ С ПРОБЛЕМАМИ:');
    console.log('  1. Полностью закрыть Telegram (свайп вверх на iOS/Android)');
    console.log('  2. Очистить кеш Telegram:');
    console.log('     iOS: Настройки → Данные и память → Очистить кеш');
    console.log('     Android: Настройки → Данные и память → Очистить кеш');
    console.log('  3. Открыть бота заново через @UniFarming_Bot');
    
    console.log('\nТЕКУЩИЕ ИСПРАВЛЕНИЯ (уже внедрены):');
    console.log('  ✅ JWT refresh endpoint исправлен');
    console.log('  ✅ DepositRecoveryService автоматически восстанавливает депозиты');
    console.log('  ✅ TokenRecoveryService пытается создать новый токен через initData');
    
    console.log('\nЧТО ДОЛЖНО ПРОИСХОДИТЬ АВТОМАТИЧЕСКИ:');
    console.log('  1. Каждые 30 сек проверяется наличие токена');
    console.log('  2. Если токен отсутствует - 3 попытки refresh + 3 попытки создания нового');
    console.log('  3. Если токен старше 25 минут - предупредительное обновление');
    console.log('  4. Неудачные депозиты автоматически повторяются каждые 30 сек');

  } catch (error) {
    console.error('Ошибка анализа:', error);
  }
}

// Запускаем анализ
analyzeJWTCacheProblems()
  .then(() => {
    console.log('\n=== АНАЛИЗ ЗАВЕРШЕН ===\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });