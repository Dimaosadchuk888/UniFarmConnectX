/**
 * ПРОВЕРКА НОВЫХ TON BOOST ПОЛЬЗОВАТЕЛЕЙ - 25 июля 2025
 * Анализ существующих записей ton_farming_data для создания аналогичных
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeExistingRecords() {
    console.log('\n🔍 АНАЛИЗ СУЩЕСТВУЮЩИХ TON_FARMING_DATA ЗАПИСЕЙ');
    console.log('=' .repeat(60));
    
    try {
        // 1. ПОЛУЧАЕМ ВСЕ СУЩЕСТВУЮЩИЕ ЗАПИСИ
        console.log('\n📊 Получение всех записей ton_farming_data...');
        const { data: existingRecords, error: recordsError } = await supabase
            .from('ton_farming_data')
            .select('*')
            .order('user_id', { ascending: true });

        if (recordsError) {
            console.error('❌ Ошибка получения записей:', recordsError);
            return;
        }

        console.log(`✅ Найдено ${existingRecords?.length || 0} существующих записей`);

        // 2. ПОКАЗЫВАЕМ СТРУКТУРУ КАЖДОЙ ЗАПИСИ
        console.log('\n📋 АНАЛИЗ СТРУКТУРЫ ЗАПИСЕЙ:');
        console.log('-'.repeat(80));
        
        existingRecords?.forEach((record, index) => {
            console.log(`\n${index + 1}. User ID: ${record.user_id}`);
            Object.keys(record).forEach(key => {
                if (key !== 'user_id') {
                    console.log(`   ${key}: ${record[key]}`);
                }
            });
            console.log('-'.repeat(40));
        });

        // 3. ПОЛУЧАЕМ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST БЕЗ ЗАПИСЕЙ
        console.log('\n🔍 ПОИСК ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ...');
        const { data: usersWithBoost, error: usersError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_rate, balance_ton')
            .not('ton_boost_package', 'is', null)
            .gt('ton_boost_package', 0)
            .order('id', { ascending: true });

        if (usersError) {
            console.error('❌ Ошибка получения пользователей:', usersError);
            return;
        }

        const existingUserIds = new Set(existingRecords?.map(r => r.user_id) || []);
        const missingUsers = usersWithBoost?.filter(user => 
            !existingUserIds.has(user.id.toString())
        ) || [];

        console.log(`\n🚨 НАЙДЕНО ${missingUsers.length} ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ:`);
        
        // 4. ПОКАЗЫВАЕМ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ С ДЕТАЛЯМИ
        missingUsers.forEach((user, index) => {
            console.log(`\n${index + 1}. 🚨 User ID ${user.id}:`);
            console.log(`   📦 TON Boost Package: ${user.ton_boost_package}`);
            console.log(`   ⚡ TON Boost Rate: ${user.ton_boost_rate}`);
            console.log(`   💰 Balance TON: ${user.balance_ton}`);
            console.log(`   ❌ НЕТ ЗАПИСИ В ton_farming_data`);
        });

        // 5. АНАЛИЗ ПАТТЕРНОВ В СУЩЕСТВУЮЩИХ ЗАПИСЯХ
        if (existingRecords && existingRecords.length > 0) {
            console.log('\n📈 АНАЛИЗ ПАТТЕРНОВ В СУЩЕСТВУЮЩИХ ЗАПИСЯХ:');
            console.log('-'.repeat(50));
            
            const sampleRecord = existingRecords[0];
            console.log('🔧 СТРУКТУРА ДЛЯ СОЗДАНИЯ НОВЫХ ЗАПИСЕЙ:');
            Object.keys(sampleRecord).forEach(key => {
                if (key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
                    console.log(`   ${key}: ${typeof sampleRecord[key]} (пример: ${sampleRecord[key]})`);
                }
            });
        }

        return { existingRecords, missingUsers };

    } catch (error) {
        console.error('❌ Критическая ошибка анализа:', error);
    }
}

// Запуск анализа
analyzeExistingRecords().then((result) => {
    if (result && result.missingUsers.length > 0) {
        console.log('\n🎯 ГОТОВ К СОЗДАНИЮ ЗАПИСЕЙ');
        console.log(`📝 Нужно создать ${result.missingUsers.length} новых записей по образцу существующих`);
    }
    console.log('\n✅ Анализ завершен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});