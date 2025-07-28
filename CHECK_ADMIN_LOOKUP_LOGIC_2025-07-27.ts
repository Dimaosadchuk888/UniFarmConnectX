#!/usr/bin/env tsx

/**
 * 🔍 ПРОВЕРКА ЛОГИКИ ПОИСКА АДМИНОВ В AdminBotService
 * Точная диагностика почему система находит не всех админов
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function checkAdminLookupLogic() {
  console.log('🔍 ПРОВЕРКА ЛОГИКИ ПОИСКА АДМИНОВ В AdminBotService');
  console.log('=' .repeat(60));
  
  try {
    // 1. Проверяем конфигурацию authorizedAdmins
    console.log('1️⃣ Проверка конфигурации authorizedAdmins...');
    
    const fs = await import('fs');
    const adminBotConfig = fs.readFileSync('config/adminBot.ts', 'utf8');
    
    // Извлекаем список authorizedAdmins
    const authorizedMatch = adminBotConfig.match(/authorizedAdmins:\s*\[(.*?)\]/s);
    if (!authorizedMatch) {
      console.log('❌ authorizedAdmins не найден в конфигурации');
      return;
    }
    
    const adminsList = authorizedMatch[1].match(/'@[^']+'/g);
    console.log(`📝 Список авторизованных админов: ${adminsList?.join(', ')}`);
    
    const authorizedAdmins = adminsList?.map(admin => admin.replace(/'/g, '')) || [];
    console.log(`👥 Обработанный список: ${authorizedAdmins.join(', ')}`);

    // 2. Проверяем каждого админа отдельно
    console.log('\n2️⃣ Проверка каждого админа в базе данных...');
    
    for (const adminUsername of authorizedAdmins) {
      console.log(`\n🔍 Проверяем админа: ${adminUsername}`);
      
      // Логика как в AdminBotService.notifyWithdrawal()
      const cleanUsername = adminUsername.replace('@', '');
      console.log(`   📝 Очищенный username: "${cleanUsername}"`);
      
      // Запрос как в оригинальном коде
      const { data: adminUser, error } = await supabase
        .from('users')
        .select('telegram_id, username, id, is_admin')
        .eq('username', cleanUsername)
        .eq('is_admin', true)
        .single();
        
      if (error) {
        console.log(`   ❌ Ошибка поиска: ${error.message}`);
        
        // Дополнительный поиск без .single()
        const { data: allMatches } = await supabase
          .from('users')
          .select('telegram_id, username, id, is_admin')
          .eq('username', cleanUsername)
          .eq('is_admin', true);
          
        console.log(`   📊 Найдено совпадений: ${allMatches?.length || 0}`);
        
        if (allMatches && allMatches.length > 0) {
          console.log('   📋 Все совпадения:');
          allMatches.forEach((match, index) => {
            console.log(`      ${index + 1}. ID: ${match.id}, Telegram: ${match.telegram_id}, Username: @${match.username}`);
          });
          
          if (allMatches.length > 1) {
            console.log('   ⚠️  ПРОБЛЕМА: Несколько записей с одинаковым username - .single() падает!');
            console.log('   🔧 Решение: Использовать .limit(1) вместо .single()');
          }
        }
        
      } else {
        console.log(`   ✅ Админ найден: ID ${adminUser.id}, Telegram ${adminUser.telegram_id}`);
      }
      
      // Проверяем альтернативные поиски
      console.log(`   🔄 Альтернативный поиск по ilike...`);
      
      const { data: ilikeResults } = await supabase
        .from('users')
        .select('telegram_id, username, id, is_admin')
        .ilike('username', cleanUsername)
        .eq('is_admin', true);
        
      console.log(`   📊 ilike результаты: ${ilikeResults?.length || 0}`);
      
      ilikeResults?.forEach((result, index) => {
        console.log(`      ${index + 1}. @${result.username} (${result.telegram_id}) - ID: ${result.id}`);
      });
    }

    // 3. Проверяем все записи админов
    console.log('\n3️⃣ Полный список всех админов в базе данных...');
    
    const { data: allAdmins } = await supabase
      .from('users')
      .select('id, username, telegram_id, is_admin, created_at')
      .eq('is_admin', true)
      .order('created_at', { ascending: false });
      
    console.log(`👥 Всего админов: ${allAdmins?.length || 0}`);
    
    allAdmins?.forEach((admin, index) => {
      console.log(`   ${index + 1}. @${admin.username} - Telegram: ${admin.telegram_id} - ID: ${admin.id}`);
      console.log(`      Создан: ${new Date(admin.created_at).toLocaleString('ru-RU')}`);
    });

    // 4. Анализ дублирования
    console.log('\n4️⃣ Анализ дублирования username...');
    
    const usernameCounts: Record<string, number> = {};
    allAdmins?.forEach(admin => {
      usernameCounts[admin.username] = (usernameCounts[admin.username] || 0) + 1;
    });
    
    console.log('📊 Количество записей по username:');
    Object.entries(usernameCounts).forEach(([username, count]) => {
      console.log(`   @${username}: ${count} ${count > 1 ? '⚠️ ДУБЛИКАТЫ!' : '✅'}`);
    });

    // 5. Рекомендуемые исправления
    console.log('\n5️⃣ РЕКОМЕНДУЕМЫЕ ИСПРАВЛЕНИЯ...');
    
    const duplicateUsernames = Object.entries(usernameCounts).filter(([_, count]) => count > 1);
    
    if (duplicateUsernames.length > 0) {
      console.log('🔧 ПРОБЛЕМА: Дублированные username вызывают ошибку .single()');
      console.log('   Дублированные username:', duplicateUsernames.map(([name]) => `@${name}`).join(', '));
      console.log('\n   РЕШЕНИЯ:');
      console.log('   1. Заменить .single() на .limit(1).maybeSingle()');
      console.log('   2. Удалить дублированные записи админов');
      console.log('   3. Добавить unique index на username в базе данных');
    }

    // 6. Проверка с исправленной логикой
    console.log('\n6️⃣ Тест с исправленной логикой поиска...');
    
    let workingAdmins = 0;
    
    for (const adminUsername of authorizedAdmins) {
      const cleanUsername = adminUsername.replace('@', '');
      
      // Исправленный запрос
      const { data: adminUser } = await supabase
        .from('users')
        .select('telegram_id, username, id')
        .eq('username', cleanUsername)
        .eq('is_admin', true)
        .limit(1)
        .maybeSingle();
        
      if (adminUser?.telegram_id) {
        console.log(`   ✅ ${adminUsername} → Telegram ID: ${adminUser.telegram_id}`);
        workingAdmins++;
      } else {
        console.log(`   ❌ ${adminUsername} → Не найден`);
      }
    }
    
    console.log(`\n📊 ИТОГО с исправленной логикой: ${workingAdmins}/${authorizedAdmins.length} админов найдено`);
    
    if (workingAdmins === authorizedAdmins.length) {
      console.log('✅ ВСЕ АДМИНЫ БУДУТ НАЙДЕНЫ после исправления .single() → .limit(1).maybeSingle()');
    } else {
      console.log('⚠️  Останутся проблемы даже после исправления');
    }

  } catch (error) {
    console.error('💥 ОШИБКА ПРОВЕРКИ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 НАЧАЛО ПРОВЕРКИ ЛОГИКИ ПОИСКА АДМИНОВ');
    console.log(`⏰ ${new Date().toISOString()}\n`);
    
    await checkAdminLookupLogic();
    
    console.log('\n🎯 ПРОВЕРКА ЗАВЕРШЕНА');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ПРОВЕРКА ПРОВАЛЕНА:', error);
    process.exit(1);
  }
}

main();