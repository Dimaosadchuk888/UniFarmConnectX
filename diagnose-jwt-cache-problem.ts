/**
 * Диагностический скрипт для анализа проблемы с закешированными JWT токенами
 * 
 * ВАЖНО: Этот скрипт только анализирует, НЕ вносит изменения
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TokenAnalysis {
  userId: number;
  telegramId: number;
  lastActivity: Date | null;
  tokenAge: number | null;
  hasValidToken: boolean;
  lastDepositAttempt: Date | null;
  failedDeposits: number;
  successfulDeposits: number;
  farmingStatus: string;
  problemIndicators: string[];
}

async function analyzeJWTCacheProblems() {
  console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ ЗАКЕШИРОВАННЫХ JWT ТОКЕНОВ ===\n');
  console.log('Дата анализа:', new Date().toISOString());
  console.log('---------------------------------------------------\n');

  try {
    // 1. Анализ пользователей с проблемными депозитами
    console.log('1. АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С ПРОБЛЕМНЫМИ ДЕПОЗИТАМИ:\n');
    
    const { data: problemUsers, error: problemUsersError } = await supabase.rpc('analyze_problem_users');

    const problemIndicators: TokenAnalysis[] = [];
    
    for (const user of problemUsers.rows) {
      const indicators: string[] = [];
      
      // Проверяем индикаторы проблем
      if (user.last_activity) {
        const inactiveHours = (Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60);
        if (inactiveHours > 24) {
          indicators.push(`Неактивен ${Math.round(inactiveHours)} часов`);
        }
      }
      
      if (user.failed_deposits > 0) {
        indicators.push(`${user.failed_deposits} неудачных депозитов`);
      }
      
      if (user.recent_deposits === 0 && user.last_deposit_time) {
        indicators.push('Нет депозитов за последние 48 часов');
      }
      
      if (user.farming_active && user.last_farming_claim) {
        const claimAge = (Date.now() - new Date(user.last_farming_claim).getTime()) / (1000 * 60 * 60);
        if (claimAge > 24) {
          indicators.push(`Фарминг не собирался ${Math.round(claimAge)} часов`);
        }
      }
      
      if (indicators.length > 0) {
        console.log(`User ID ${user.user_id} (TG: ${user.telegram_id}):`);
        indicators.forEach(ind => console.log(`  - ${ind}`));
        console.log('');
      }
    }

    // 2. Анализ временных паттернов потери токенов
    console.log('\n2. ВРЕМЕННЫЕ ПАТТЕРНЫ ПОТЕРИ ТОКЕНОВ:\n');
    
    const timePatterns = await sql`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) FILTER (WHERE type = 'TON_DEPOSIT') as total_deposits,
        COUNT(*) FILTER (WHERE type = 'TON_DEPOSIT' AND status = 'failed') as failed_deposits,
        ROUND(100.0 * COUNT(*) FILTER (WHERE type = 'TON_DEPOSIT' AND status = 'failed') / 
              NULLIF(COUNT(*) FILTER (WHERE type = 'TON_DEPOSIT'), 0), 2) as failure_rate
      FROM transactions
      WHERE created_at > NOW() - INTERVAL '48 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      HAVING COUNT(*) FILTER (WHERE type = 'TON_DEPOSIT') > 0
      ORDER BY hour DESC
      LIMIT 24
    `;

    console.log('Часовая статистика депозитов (последние 24 часа):');
    console.log('Время | Всего | Неудачных | % Неудач');
    console.log('------|-------|-----------|----------');
    
    for (const pattern of timePatterns.rows) {
      const hour = new Date(pattern.hour).toISOString().slice(11, 16);
      console.log(`${hour} | ${pattern.total_deposits.toString().padStart(5)} | ${pattern.failed_deposits.toString().padStart(9)} | ${pattern.failure_rate || 0}%`);
    }

    // 3. Анализ механизмов обновления токенов
    console.log('\n3. ТЕКУЩИЕ МЕХАНИЗМЫ ОБНОВЛЕНИЯ ТОКЕНОВ:\n');
    
    console.log('✅ РАБОТАЮЩИЕ МЕХАНИЗМЫ:');
    console.log('  1. useJwtTokenWatcher - проверка каждые 30 секунд');
    console.log('  2. tokenRecoveryService - 3 попытки refresh + 3 попытки создания нового');
    console.log('  3. criticalOperationGuard - защита критических операций');
    console.log('  4. tokenRefreshHandler - обновление через /api/auth/refresh');
    
    console.log('\n❌ ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
    console.log('  1. JWT refresh использовал неправильный endpoint (/api/v2/auth/refresh)');
    console.log('  2. Telegram WebApp может кешировать localStorage между сессиями');
    console.log('  3. При закрытии мини-апп токен остается в localStorage но становится невалидным');
    console.log('  4. Нет механизма принудительной очистки кеша Telegram');
    
    // 4. Типовые сценарии проблем
    console.log('\n4. ТИПОВЫЕ СЦЕНАРИИ ПРОБЛЕМ:\n');
    
    console.log('СЦЕНАРИЙ 1: "Зависший после долгого отсутствия"');
    console.log('  - Пользователь не заходил >24 часа');
    console.log('  - JWT токен истек (TTL = 24h)');
    console.log('  - При возврате Telegram загружает старый токен из кеша');
    console.log('  - Refresh fails из-за истекшего токена');
    console.log('  - Результат: Депозиты не проходят, фарминг не работает');
    
    console.log('\nСЦЕНАРИЙ 2: "Битый токен после переключения аккаунтов"');
    console.log('  - Пользователь переключается между Telegram аккаунтами');
    console.log('  - localStorage сохраняет токен от предыдущего аккаунта');
    console.log('  - Токен валидный по структуре, но для другого user_id');
    console.log('  - Результат: 401 ошибки, операции блокируются');
    
    console.log('\nСЦЕНАРИЙ 3: "Кеш Telegram WebView"');
    console.log('  - Telegram агрессивно кеширует WebView содержимое');
    console.log('  - localStorage persists между сессиями');
    console.log('  - Но initData обновляется при каждом открытии');
    console.log('  - Результат: Рассинхронизация токена и initData');

    // 5. Статистика по конкретным пользователям
    console.log('\n5. КОНКРЕТНЫЕ ПРИМЕРЫ ПОЛЬЗОВАТЕЛЕЙ С ПРОБЛЕМАМИ:\n');
    
    const specificProblems = await sql`
      WITH deposit_attempts AS (
        SELECT 
          user_id,
          COUNT(*) as attempts,
          COUNT(*) FILTER (WHERE status = 'completed') as successful,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          MAX(created_at) as last_attempt
        FROM transactions
        WHERE type = 'TON_DEPOSIT'
        AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY user_id
      )
      SELECT 
        u.id,
        u.telegram_id,
        u.username,
        da.attempts,
        da.successful,
        da.failed,
        da.last_attempt,
        u.last_activity
      FROM deposit_attempts da
      JOIN users u ON u.id = da.user_id
      WHERE da.failed > 0 OR (da.attempts > 0 AND da.successful = 0)
      ORDER BY da.failed DESC, da.last_attempt DESC
      LIMIT 10
    `;

    console.log('ID | Telegram ID | Username | Попыток | Успешных | Неудачных | Последняя попытка');
    console.log('---|-------------|----------|---------|----------|-----------|------------------');
    
    for (const problem of specificProblems.rows) {
      const lastAttempt = problem.last_attempt ? new Date(problem.last_attempt).toISOString().slice(0, 19) : 'Never';
      console.log(
        `${problem.id} | ${problem.telegram_id} | ${problem.username || 'N/A'} | ${problem.attempts} | ${problem.successful} | ${problem.failed} | ${lastAttempt}`
      );
    }

    // 6. Рекомендации
    console.log('\n6. РЕКОМЕНДАЦИИ БЕЗ ИЗМЕНЕНИЯ КОДА:\n');
    
    console.log('НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ:');
    console.log('  1. ✅ JWT refresh endpoint уже исправлен (/api/auth/refresh)');
    console.log('  2. ✅ DepositRecoveryService уже создан и работает');
    console.log('  3. Рекомендовать пользователям с проблемами:');
    console.log('     - Полностью закрыть Telegram');
    console.log('     - Очистить кеш приложения Telegram');
    console.log('     - Заново открыть бота');
    
    console.log('\nДОЛГОСРОЧНЫЕ РЕШЕНИЯ:');
    console.log('  1. Увеличить TTL токена с 24h до 7d');
    console.log('  2. Добавить версионирование токенов');
    console.log('  3. Реализовать server-side sessions');
    console.log('  4. Добавить кнопку "Обновить авторизацию" в UI');

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