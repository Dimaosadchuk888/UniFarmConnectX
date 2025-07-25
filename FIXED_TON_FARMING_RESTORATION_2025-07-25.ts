/**
 * ИСПРАВЛЕННОЕ ВОССТАНОВЛЕНИЕ TON FARMING - 25 июля 2025
 * Создание записей с правильной структурой полей (БЕЗ daily_income)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixedTonFarmingRestoration() {
    console.log('\n🔧 ИСПРАВЛЕННОЕ ВОССТАНОВЛЕНИЕ TON FARMING');
    console.log('=' .repeat(60));
    
    try {
        // Данные пропущенных пользователей из анализа
        const missingUsers = [
            { id: 220, ton_boost_package: 1, ton_boost_rate: 0.01 },
            { id: 246, ton_boost_package: 1, ton_boost_rate: 0.01 },
            { id: 250, ton_boost_package: 1, ton_boost_rate: 0.01 }
        ];

        console.log(`🚨 Восстанавливаем ${missingUsers.length} пропущенных пользователей`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of missingUsers) {
            console.log(`\n🔄 Создаем запись для User ${user.id}:`);
            
            // Структура на основе существующих записей (User 184)
            const currentTime = new Date().toISOString();
            const expireTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // +1 год

            const recordData = {
                id: uuidv4(), // Генерируем UUID как в существующих записях
                user_id: user.id.toString(), // STRING формат для совместимости
                boost_active: true,
                boost_package_id: user.ton_boost_package, // 1
                boost_expires_at: expireTime, // +1 год как у других
                farming_balance: 1, // 1 TON как у User 184
                total_earned: 0,
                last_claim_at: currentTime,
                created_at: currentTime,
                updated_at: currentTime,
                farming_rate: user.ton_boost_rate, // 0.01 из users таблицы
                farming_start_timestamp: currentTime,
                farming_last_update: currentTime
            };

            console.log(`   📦 Package ID: ${recordData.boost_package_id}`);
            console.log(`   💰 Farming Balance: ${recordData.farming_balance} TON`);
            console.log(`   ⚡ Farming Rate: ${recordData.farming_rate} TON/сек`);
            console.log(`   📅 Expires: ${new Date(expireTime).toLocaleDateString('ru-RU')}`);

            try {
                const { data, error } = await supabase
                    .from('ton_farming_data')
                    .insert(recordData);

                if (error) {
                    console.error(`   ❌ ОШИБКА:`, error.message);
                    errorCount++;
                } else {
                    console.log(`   ✅ УСПЕШНО создана запись`);
                    successCount++;
                }
            } catch (err) {
                console.error(`   ❌ ИСКЛЮЧЕНИЕ:`, err);
                errorCount++;
            }

            // Пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // ИТОГОВАЯ СТАТИСТИКА
        console.log('\n' + '=' .repeat(60));
        console.log('📈 РЕЗУЛЬТАТЫ ВОССТАНОВЛЕНИЯ:');
        console.log('=' .repeat(60));
        console.log(`👥 Обработано пользователей: ${missingUsers.length}`);
        console.log(`✅ Успешно создано: ${successCount}`);
        console.log(`❌ Ошибок: ${errorCount}`);
        console.log(`📊 Процент успеха: ${((successCount / missingUsers.length) * 100).toFixed(1)}%`);

        // ПРОВЕРКА РЕЗУЛЬТАТА
        if (successCount > 0) {
            console.log('\n🔍 ПРОВЕРКА РЕЗУЛЬТАТА:');
            const { data: newRecords, error: checkError } = await supabase
                .from('ton_farming_data')
                .select('user_id, farming_balance, farming_rate')
                .in('user_id', missingUsers.map(u => u.id.toString()));

            if (!checkError && newRecords) {
                console.log(`📊 Найдено ${newRecords.length} новых записей:`);
                newRecords.forEach(record => {
                    console.log(`   User ${record.user_id}: ${record.farming_balance} TON, rate ${record.farming_rate}`);
                });

                if (newRecords.length === missingUsers.length) {
                    console.log('\n🎉 ВСЕ ПОЛЬЗОВАТЕЛИ УСПЕШНО ВОССТАНОВЛЕНЫ!');
                    console.log('⚡ Планировщик обнаружит их в следующем цикле (2-5 минут)');
                    console.log('💰 Они начнут получать TON доходы автоматически');
                }
            }
        }

        if (successCount === 0) {
            console.log('\n❌ НИ ОДНОЙ ЗАПИСИ НЕ СОЗДАНО - требуется проверка схемы базы данных');
        }

    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО');
    console.log('=' .repeat(60));
}

// Запуск восстановления
fixedTonFarmingRestoration().then(() => {
    console.log('\n✅ Исправленный скрипт восстановления выполнен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});