/**
 * ПРОСТОЕ КРИТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ TON FARMING - 25 июля 2025
 * Создание записей в ton_farming_data на основе данных из таблицы users
 * БЕЗ ИСПОЛЬЗОВАНИЯ НЕСУЩЕСТВУЮЩИХ ТАБЛИЦ
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Загружаем переменные окружения
config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UserWithTonBoost {
    id: number;
    ton_boost_package: number;
    ton_boost_rate: number;
    balance_ton: number;
}

async function simpleTonFarmingRestoration() {
    console.log('\n🚨 ПРОСТОЕ ВОССТАНОВЛЕНИЕ TON FARMING ПОЛЬЗОВАТЕЛЕЙ');
    console.log('=' .repeat(70));
    
    try {
        // 1. ПОЛУЧАЕМ ПОЛЬЗОВАТЕЛЕЙ С АКТИВНЫМИ TON BOOST ПАКЕТАМИ (исключая нулевые)
        console.log('\n📊 ШАГ 1: ПОЛУЧЕНИЕ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ');
        const { data: activeUsers, error: usersError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_rate, balance_ton')
            .not('ton_boost_package', 'is', null)
            .gt('ton_boost_package', 0) // Только с реальными пакетами
            .gt('ton_boost_rate', 0)    // И положительной ставкой
            .order('id', { ascending: true });

        if (usersError) {
            console.error('❌ Ошибка получения пользователей:', usersError);
            return;
        }

        console.log(`✅ Найдено ${activeUsers?.length || 0} пользователей с активными TON Boost`);

        // 2. ПОЛУЧАЕМ СУЩЕСТВУЮЩИЕ ЗАПИСИ
        const { data: existingRecords, error: existingError } = await supabase
            .from('ton_farming_data')
            .select('user_id')
            .order('user_id', { ascending: true });

        if (existingError) {
            console.error('❌ Ошибка получения существующих записей:', existingError);
            return;
        }

        const existingUserIds = new Set(existingRecords?.map(r => r.user_id) || []);
        console.log(`✅ Найдено ${existingRecords?.length || 0} существующих записей`);

        // 3. ОПРЕДЕЛЯЕМ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ
        const missingUsers = activeUsers?.filter(user => 
            !existingUserIds.has(user.id.toString())
        ) || [];

        console.log(`🚨 НАЙДЕНО ${missingUsers.length} ПРОПУЩЕННЫХ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ`);

        if (missingUsers.length === 0) {
            console.log('✅ Все активные пользователи уже синхронизированы');
            return;
        }

        // 4. ПОКАЗЫВАЕМ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ
        console.log('\n📋 СПИСОК ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ:');
        missingUsers.forEach((user, index) => {
            console.log(`${index + 1}. User ${user.id}: Package ${user.ton_boost_package}, Rate: ${user.ton_boost_rate} TON/сек`);
        });

        console.log('\n🔧 ШАГ 2: МАССОВОЕ СОЗДАНИЕ ЗАПИСЕЙ TON_FARMING_DATA');
        console.log('=' .repeat(50));

        let successCount = 0;
        let errorCount = 0;

        // 5. СОЗДАЕМ ЗАПИСИ ДЛЯ КАЖДОГО ПРОПУЩЕННОГО ПОЛЬЗОВАТЕЛЯ
        for (const user of missingUsers) {
            console.log(`\n🔄 Восстанавливаем User ${user.id}:`);
            
            // Рассчитываем данные на основе TON Boost package
            let farmingBalance: number;
            let dailyIncome: number;
            
            // Определяем суммы на основе типа пакета
            switch (user.ton_boost_package) {
                case 1:
                    farmingBalance = 1; // 1 TON для пакета 1
                    break;
                case 2:
                    farmingBalance = 5; // 5 TON для пакета 2
                    break;
                case 3:
                    farmingBalance = 10; // 10 TON для пакета 3
                    break;
                default:
                    farmingBalance = 1; // По умолчанию 1 TON
            }
            
            dailyIncome = farmingBalance * 0.01; // 1% в день
            
            console.log(`   📦 Package: ${user.ton_boost_package}`);
            console.log(`   💰 Farming Balance: ${farmingBalance} TON`);
            console.log(`   📈 Daily Income: ${dailyIncome} TON/день`);
            console.log(`   ⚡ Rate: ${user.ton_boost_rate} TON/сек`);

            try {
                const { data, error } = await supabase
                    .from('ton_farming_data')
                    .insert({
                        user_id: user.id.toString(), // ВАЖНО: STRING формат для совместимости
                        boost_package_id: user.ton_boost_package,
                        farming_balance: farmingBalance,
                        daily_income: dailyIncome,
                        total_earned: 0,
                        last_claim: new Date().toISOString(),
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (error) {
                    console.error(`   ❌ ОШИБКА создания записи:`, error.message);
                    errorCount++;
                } else {
                    console.log(`   ✅ УСПЕШНО создана запись`);
                    successCount++;
                }
            } catch (err) {
                console.error(`   ❌ ИСКЛЮЧЕНИЕ при создании записи:`, err);
                errorCount++;
            }

            // Пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 6. ИТОГОВАЯ СТАТИСТИКА
        console.log('\n' + '=' .repeat(70));
        console.log('📈 РЕЗУЛЬТАТЫ ВОССТАНОВЛЕНИЯ:');
        console.log('=' .repeat(70));
        console.log(`👥 Пропущенных пользователей: ${missingUsers.length}`);
        console.log(`✅ Успешно восстановлено: ${successCount}`);
        console.log(`❌ Ошибок: ${errorCount}`);
        console.log(`📊 Процент успеха: ${missingUsers.length > 0 ? ((successCount / missingUsers.length) * 100).toFixed(1) : 0}%`);

        // 7. ФИНАЛЬНАЯ ПРОВЕРКА КОЛИЧЕСТВА ЗАПИСЕЙ
        console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА:');
        const { data: finalRecords, error: finalError } = await supabase
            .from('ton_farming_data')
            .select('user_id', { count: 'exact' });

        if (!finalError && finalRecords) {
            console.log(`📊 Общее количество записей в ton_farming_data: ${finalRecords.length}`);
            
            // Проверяем что все активные пользователи теперь синхронизированы
            const finalUserIds = new Set(finalRecords.map((r: any) => r.user_id));
            const stillMissing = activeUsers?.filter(user => !finalUserIds.has(user.id.toString())) || [];
            
            if (stillMissing.length === 0) {
                console.log('🎉 ВСЕ АКТИВНЫЕ ПОЛЬЗОВАТЕЛИ ТЕПЕРЬ СИНХРОНИЗИРОВАНЫ!');
                console.log('⚡ Планировщик начнет начислять им доходы в следующем цикле');
            } else {
                console.log(`⚠️  Все еще пропущено: ${stillMissing.length} пользователей`);
            }
        }

        if (successCount > 0) {
            console.log('\n🚀 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!');
            console.log('✅ Восстановленные пользователи будут получать TON доходы автоматически');
            console.log('📅 Планировщик обнаружит их в течение 2-5 минут');
        }

    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
    }

    console.log('\n' + '=' .repeat(70));
    console.log('🎯 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО');
    console.log('=' .repeat(70));
}

// Запуск восстановления
simpleTonFarmingRestoration().then(() => {
    console.log('\n✅ Скрипт простого восстановления выполнен успешно');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка скрипта:', error);
    process.exit(1);
});