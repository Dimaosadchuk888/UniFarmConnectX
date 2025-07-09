/**
 * Скрипт для заполнения пустых таблиц Supabase данными
 * Работает через Supabase API после создания таблиц
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения SUPABASE_URL или SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fillMissions() {
  console.log('\n📥 Заполнение таблицы missions...');

  const missions = [
    {
      id: 1,
      title: 'Первый депозит',
      description: 'Сделайте первый депозит UNI в фарминг',
      reward_uni: 10,
      reward_ton: 0,
      type: 'one_time',
      status: 'active'
    },
    {
      id: 2,
      title: 'Пригласи друга',
      description: 'Пригласите минимум 1 друга в UniFarm',
      reward_uni: 5,
      reward_ton: 0,
      type: 'one_time',
      status: 'active'
    },
    {
      id: 3,
      title: 'Активный фармер',
      description: 'Фармите 7 дней подряд без перерыва',
      reward_uni: 20,
      reward_ton: 0,
      type: 'streak',
      status: 'active'
    },
    {
      id: 4,
      title: 'TON Boost активация',
      description: 'Активируйте любой TON Boost пакет',
      reward_uni: 0,
      reward_ton: 0.1,
      type: 'one_time',
      status: 'active'
    },
    {
      id: 5,
      title: 'Социальная активность',
      description: 'Подпишитесь на наш Telegram канал',
      reward_uni: 2,
      reward_ton: 0,
      type: 'social',
      status: 'active'
    }
  ];

  try {
    // Проверяем, есть ли уже миссии
    const { data: existing, error: checkError } = await supabase
      .from('missions')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Ошибка проверки таблицы missions:', checkError.message);
      return;
    }

    if (!existing || existing.length === 0) {
      const { data, error } = await supabase
        .from('missions')
        .upsert(missions, { onConflict: 'id' });

      if (error) {
        console.error('❌ Ошибка заполнения таблицы missions:', error.message);
      } else {
        console.log('✅ Таблица missions заполнена базовыми данными');
      }
    } else {
      console.log('ℹ️  Таблица missions уже содержит данные');
    }
  } catch (err) {
    console.error('❌ Ошибка при работе с missions:', err);
  }
}

async function migrateReferrals() {
  console.log('\n📥 Миграция реферальных связей...');

  try {
    // Получаем пользователей с referred_by
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, referred_by, created_at')
      .not('referred_by', 'is', null);

    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  Нет пользователей с рефералами для миграции');
      return;
    }

    // Фильтруем и подготавливаем данные для вставки
    const referralsToInsert = users
      .filter(user => {
        // Проверяем, что referred_by это число
        return user.referred_by && 
               user.referred_by !== 'null' && 
               /^\d+$/.test(user.referred_by.toString());
      })
      .map(user => ({
        referrer_id: parseInt(user.referred_by),
        referred_id: user.id,
        level: 1,
        created_at: user.created_at
      }));

    if (referralsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('referrals')
        .upsert(referralsToInsert, { 
          onConflict: 'referrer_id,referred_id',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('❌ Ошибка вставки в referrals:', insertError.message);
      } else {
        console.log(`✅ Мигрировано ${referralsToInsert.length} реферальных связей`);
      }
    } else {
      console.log('ℹ️  Нет подходящих реферальных связей для миграции');
    }
  } catch (err) {
    console.error('❌ Ошибка при миграции рефералов:', err);
  }
}

async function verifyTablesData() {
  console.log('\n🔍 Проверка данных в таблицах...\n');

  const tables = [
    'users',
    'user_sessions',
    'transactions',
    'referrals',
    'farming_sessions',
    'boost_purchases',
    'missions',
    'user_missions',
    'airdrops',
    'daily_bonus_logs',
    'withdraw_requests'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: Ошибка доступа - ${error.message}`);
      } else {
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`${status} ${table}: ${count || 0} записей`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Таблица не существует`);
    }
  }
}

async function updateReferrerIds() {
  console.log('\n🔧 Обновление referrer_id в таблице users...');

  try {
    // Получаем пользователей с referred_by но без referrer_id
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, referred_by')
      .not('referred_by', 'is', null)
      .is('referrer_id', null);

    if (fetchError) {
      console.error('❌ Ошибка получения пользователей:', fetchError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  Все referrer_id уже обновлены');
      return;
    }

    let updated = 0;
    for (const user of users) {
      if (user.referred_by && /^\d+$/.test(user.referred_by.toString())) {
        const referrerId = parseInt(user.referred_by);
        
        // Проверяем, существует ли такой пользователь
        const { data: referrer } = await supabase
          .from('users')
          .select('id')
          .eq('id', referrerId)
          .single();

        if (referrer) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ referrer_id: referrerId })
            .eq('id', user.id);

          if (!updateError) {
            updated++;
          }
        }
      }
    }

    console.log(`✅ Обновлено ${updated} записей referrer_id`);
  } catch (err) {
    console.error('❌ Ошибка при обновлении referrer_id:', err);
  }
}

// Запуск всех операций
async function main() {
  console.log('🚀 Запуск заполнения данных Supabase для UniFarm...\n');
  
  console.log('⚠️  ВАЖНО: Убедитесь, что сначала выполнен SQL скрипт');
  console.log('   scripts/supabase-create-tables.sql в Supabase Dashboard!\n');
  
  try {
    await fillMissions();
    await migrateReferrals();
    await updateReferrerIds();
    await verifyTablesData();
    
    console.log('\n✨ Заполнение данных завершено!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Проверьте результаты в Supabase Dashboard');
    console.log('2. Запустите сервер и протестируйте функциональность');
    console.log('3. Обновите документацию о достижении 100% готовности БД');
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();