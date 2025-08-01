// ПРОВЕРКА ЗАГАДКИ: ПОЧЕМУ НЕ РАСТЕТ КОЛИЧЕСТВО ПОЛЬЗОВАТЕЛЕЙ
// Дата: 01 августа 2025

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface UserCountAnalysis {
  totalUsers: number;
  maxUserId: number;
  minUserId: number;
  usersAfterJuly25: number;
  usersAfterJuly30: number;
  usersToday: number;
  recentUsers: any[];
}

async function analyzeUserCount(): Promise<UserCountAnalysis> {
  try {
    console.log('🔍 АНАЛИЗ КОЛИЧЕСТВА ПОЛЬЗОВАТЕЛЕЙ В БАЗЕ ДАННЫХ');
    console.log('='.repeat(60));

    // 1. Общая статистика пользователей
    const { data: stats, error: statsError } = await supabase
      .from('users')
      .select('id, created_at', { count: 'exact' });

    if (statsError) {
      throw new Error(`Ошибка получения статистики: ${statsError.message}`);
    }

    if (!stats) {
      throw new Error('Нет данных о пользователях');
    }

    const totalUsers = stats.length;
    const userIds = stats.map(u => u.id).sort((a, b) => a - b);
    const maxUserId = Math.max(...userIds);
    const minUserId = Math.min(...userIds);

    // 2. Фильтрация по датам
    const july25 = '2025-07-25T00:00:00Z';
    const july30 = '2025-07-30T00:00:00Z';
    const today = '2025-08-01T00:00:00Z';

    const usersAfterJuly25 = stats.filter(u => u.created_at >= july25).length;
    const usersAfterJuly30 = stats.filter(u => u.created_at >= july30).length;
    const usersToday = stats.filter(u => u.created_at >= today).length;

    // 3. Последние 10 пользователей
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('id, telegram_id, username, first_name, created_at, balance_uni, balance_ton')
      .order('id', { ascending: false })
      .limit(10);

    if (recentError) {
      console.warn('Не удалось получить последних пользователей:', recentError.message);
    }

    const analysis: UserCountAnalysis = {
      totalUsers,
      maxUserId,
      minUserId,
      usersAfterJuly25,
      usersAfterJuly30,
      usersToday,
      recentUsers: recentUsers || []
    };

    return analysis;

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА при анализе пользователей:', error);
    throw error;
  }
}

async function checkRegistrationPath(): Promise<void> {
  console.log('\n🔍 ПРОВЕРКА ПУТИ РЕГИСТРАЦИИ');
  console.log('='.repeat(40));

  try {
    // Проверяем есть ли пользователи с ID > 303
    const { data: highIdUsers, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, created_at')
      .gt('id', 303)
      .order('id', { ascending: true })
      .limit(5);

    if (error) {
      console.error('❌ Ошибка проверки пользователей с высокими ID:', error.message);
      return;
    }

    if (!highIdUsers || highIdUsers.length === 0) {
      console.log('🚨 НАЙДЕНА ПРОБЛЕМА: НЕТ ПОЛЬЗОВАТЕЛЕЙ С ID > 303!');
      console.log('   Это означает что новые регистрации НЕ РАБОТАЮТ или НЕ СОХРАНЯЮТСЯ');
    } else {
      console.log('✅ Найдены пользователи с ID > 303:');
      highIdUsers.forEach(user => {
        console.log(`   ID: ${user.id}, Telegram: ${user.telegram_id}, Username: ${user.username}, Создан: ${user.created_at}`);
      });
    }

    // Проверяем есть ли дублирование telegram_id
    const { data: duplicateTelegram, error: dupError } = await supabase
      .from('users')
      .select('telegram_id')
      .not('telegram_id', 'is', null)
      .order('telegram_id');

    if (!dupError && duplicateTelegram) {
      const telegramIds = duplicateTelegram.map(u => u.telegram_id);
      const uniqueTelegramIds = [...new Set(telegramIds)];
      
      if (telegramIds.length !== uniqueTelegramIds.length) {
        console.log('🚨 НАЙДЕНЫ ДУБЛИКАТЫ TELEGRAM_ID!');
        console.log(`   Всего telegram_id: ${telegramIds.length}`);
        console.log(`   Уникальных telegram_id: ${uniqueTelegramIds.length}`);
        console.log(`   Дубликатов: ${telegramIds.length - uniqueTelegramIds.length}`);
      } else {
        console.log('✅ Дубликатов telegram_id не найдено');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка проверки пути регистрации:', error);
  }
}

async function main(): Promise<void> {
  try {
    console.log('🔍 РАССЛЕДОВАНИЕ: ПОЧЕМУ НЕ РАСТЕТ КОЛИЧЕСТВО ПОЛЬЗОВАТЕЛЕЙ');
    console.log('=' .repeat(80));
    console.log('Дата анализа:', new Date().toISOString());
    console.log('');

    const analysis = await analyzeUserCount();

    console.log('📊 РЕЗУЛЬТАТЫ АНАЛИЗА:');
    console.log(`   Общее количество пользователей: ${analysis.totalUsers}`);
    console.log(`   Минимальный ID: ${analysis.minUserId}`);
    console.log(`   Максимальный ID: ${analysis.maxUserId}`);
    console.log(`   Пользователей после 25 июля: ${analysis.usersAfterJuly25}`);
    console.log(`   Пользователей после 30 июля: ${analysis.usersAfterJuly30}`);
    console.log(`   Пользователей сегодня (01 августа): ${analysis.usersToday}`);
    console.log('');

    if (analysis.recentUsers.length > 0) {
      console.log('👥 ПОСЛЕДНИЕ ПОЛЬЗОВАТЕЛИ:');
      analysis.recentUsers.forEach(user => {
        console.log(`   ID: ${user.id}, Telegram: ${user.telegram_id}, Username: ${user.username || 'N/A'}, Создан: ${user.created_at}`);
      });
    }

    await checkRegistrationPath();

    // Выводы
    console.log('\n🎯 ВЫВОДЫ:');
    if (analysis.maxUserId === 303) {
      console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Максимальный ID = 303');
      console.log('   Это подтверждает что новые пользователи НЕ создаются');
      console.log('   Несмотря на работающий код регистрации');
    }

    if (analysis.usersAfterJuly25 === 0) {
      console.log('🚨 НЕТ НОВЫХ РЕГИСТРАЦИЙ с 25 июля');
    }

    if (analysis.usersToday === 0) {
      console.log('🚨 НЕТ РЕГИСТРАЦИЙ СЕГОДНЯ');
    }

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА:', error);
  }
}

// Запуск анализа
main().catch(console.error);