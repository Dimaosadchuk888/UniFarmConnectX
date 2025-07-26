/**
 * КОМПЛЕКСНЫЙ АНАЛИЗ АРХИТЕКТУРЫ TON BOOST - 25 июля 2025
 * Полное сопоставление полей, подключений и выявление несоответствий
 * 
 * ЭКСПЕРТНОЕ ЗАДАНИЕ: Проверка всех точек подключения системы TON Boost
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeTonBoostArchitecture() {
    console.log('\n🔧 КОМПЛЕКСНЫЙ АНАЛИЗ АРХИТЕКТУРЫ TON BOOST');
    console.log('=' .repeat(70));
    
    try {
        // ========================================
        // РАЗДЕЛ 1: АНАЛИЗ СТРУКТУРЫ ТАБЛИЦ
        // ========================================
        console.log('\n📊 РАЗДЕЛ 1: АНАЛИЗ СТРУКТУРЫ ТАБЛИЦ');
        console.log('-' .repeat(60));
        
        // 1.1 Таблица users - Boost поля
        console.log('\n👤 1.1 ТАБЛИЦА USERS - BOOST ПОЛЯ:');
        const { data: usersSchema, error: usersError } = await supabase
            .from('users')
            .select('*')
            .limit(1)
            .single();
            
        if (usersSchema) {
            const boostFields = Object.keys(usersSchema).filter(key => 
                key.includes('boost') || key.includes('ton_')
            );
            console.log('✅ Найденные Boost/TON поля в users:');
            boostFields.forEach(field => {
                console.log(`   - ${field}: ${typeof usersSchema[field]} = ${usersSchema[field]}`);
            });
            
            // Проверяем отсутствующие поля из ожидаемых
            const expectedFields = ['boost_package_level', 'ton_boost_package', 'ton_boost_rate', 'ton_balance', 'balance_ton'];
            console.log('\n🔍 Проверка ожидаемых полей:');
            expectedFields.forEach(field => {
                if (boostFields.includes(field)) {
                    console.log(`   ✅ ${field} - СУЩЕСТВУЕТ`);
                } else {
                    console.log(`   ❌ ${field} - ОТСУТСТВУЕТ`);
                }
            });
        }
        
        // 1.2 Таблица transactions - Boost записи
        console.log('\n💳 1.2 ТАБЛИЦА TRANSACTIONS - BOOST ЗАПИСИ:');
        const { data: transactionSchema, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .limit(1)
            .single();
            
        if (transactionSchema) {
            console.log('✅ Поля в transactions для BOOST_PURCHASE:');
            Object.keys(transactionSchema).forEach(field => {
                const value = transactionSchema[field];
                console.log(`   - ${field}: ${typeof value} = ${value}`);
            });
            
            // Анализ metadata
            if (transactionSchema.metadata) {
                console.log('\n🔗 Структура metadata:');
                Object.keys(transactionSchema.metadata).forEach(key => {
                    console.log(`   - metadata.${key}: ${transactionSchema.metadata[key]}`);
                });
            }
        }
        
        // 1.3 Таблица user_boost_package (если существует)
        console.log('\n📦 1.3 ТАБЛИЦА USER_BOOST_PACKAGE:');
        try {
            const { data: boostPackageData, error: boostPackageError } = await supabase
                .from('user_boost_package')
                .select('*')
                .limit(1);
                
            if (boostPackageError) {
                console.log('❌ ТАБЛИЦА USER_BOOST_PACKAGE НЕ СУЩЕСТВУЕТ');
                console.log(`   Ошибка: ${boostPackageError.message}`);
            } else {
                console.log('✅ ТАБЛИЦА USER_BOOST_PACKAGE НАЙДЕНА');
                if (boostPackageData && boostPackageData.length > 0) {
                    console.log('✅ Поля в user_boost_package:');
                    Object.keys(boostPackageData[0]).forEach(field => {
                        console.log(`   - ${field}: ${typeof boostPackageData[0][field]}`);
                    });
                } else {
                    console.log('⚠️ Таблица существует, но пустая');
                }
            }
        } catch (error) {
            console.log('❌ ТАБЛИЦА USER_BOOST_PACKAGE НЕДОСТУПНА');
        }
        
        // 1.4 Таблица ton_farming_data
        console.log('\n🚜 1.4 ТАБЛИЦА TON_FARMING_DATA:');
        const { data: farmingSchema, error: farmingError } = await supabase
            .from('ton_farming_data')
            .select('*')
            .limit(1)
            .single();
            
        if (farmingSchema) {
            console.log('✅ Поля в ton_farming_data:');
            Object.keys(farmingSchema).forEach(field => {
                const value = farmingSchema[field];
                console.log(`   - ${field}: ${typeof value} = ${value}`);
            });
            
            // Проверяем ожидаемые поля
            const expectedFarmingFields = ['user_id', 'amount', 'source', 'is_active', 'start_time', 'package_level'];
            console.log('\n🔍 Проверка ожидаемых полей:');
            expectedFarmingFields.forEach(field => {
                if (Object.keys(farmingSchema).includes(field)) {
                    console.log(`   ✅ ${field} - СУЩЕСТВУЕТ`);
                } else {
                    console.log(`   ❌ ${field} - ОТСУТСТВУЕТ`);
                }
            });
        }
        
        // ========================================
        // РАЗДЕЛ 2: АНАЛИЗ ПОТОКА ДАННЫХ
        // ========================================
        console.log('\n📊 РАЗДЕЛ 2: АНАЛИЗ ПОТОКА ДАННЫХ ПОКУПКИ');
        console.log('-' .repeat(60));
        
        // 2.1 Найти последнюю покупку и проследить поток
        const { data: latestPurchase, error: purchaseError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (latestPurchase) {
            console.log(`\n💰 ПОСЛЕДНЯЯ ПОКУПКА (ID: ${latestPurchase.id}):`);
            console.log(`   👤 User ID: ${latestPurchase.user_id}`);
            console.log(`   📅 Время: ${new Date(latestPurchase.created_at).toLocaleString('ru-RU')}`);
            console.log(`   💸 Сумма: ${latestPurchase.amount} ${latestPurchase.currency}`);
            console.log(`   📝 Описание: ${latestPurchase.description}`);
            
            const userId = latestPurchase.user_id;
            
            // 2.2 Проверить состояние пользователя
            console.log('\n👤 2.2 СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ ПОСЛЕ ПОКУПКИ:');
            const { data: userState, error: userStateError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (userState) {
                const boostRelatedFields = Object.keys(userState).filter(key => 
                    key.includes('boost') || key.includes('ton_')
                );
                boostRelatedFields.forEach(field => {
                    console.log(`   - ${field}: ${userState[field]}`);
                });
            }
            
            // 2.3 Проверить создание farming записи
            console.log('\n🚜 2.3 СОСТОЯНИЕ FARMING ДАННЫХ:');
            const { data: farmingState, error: farmingStateError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', userId.toString())
                .single();
                
            if (farmingStateError) {
                console.log('❌ FARMING ЗАПИСЬ ОТСУТСТВУЕТ!');
                console.log(`   Ошибка: ${farmingStateError.message}`);
                console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Покупка не создала farming депозит!');
            } else {
                console.log('✅ FARMING ЗАПИСЬ НАЙДЕНА:');
                Object.keys(farmingState).forEach(field => {
                    console.log(`   - ${field}: ${farmingState[field]}`);
                });
                
                // Проверяем временную связь
                const purchaseTime = new Date(latestPurchase.created_at).getTime();
                const farmingTime = new Date(farmingState.created_at).getTime();
                const timeDiff = Math.abs(purchaseTime - farmingTime) / 1000 / 60;
                console.log(`   ⏱️ Задержка создания: ${timeDiff.toFixed(2)} минут`);
            }
        }
        
        // ========================================
        // РАЗДЕЛ 3: АНАЛИЗ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ
        // ========================================
        console.log('\n📊 РАЗДЕЛ 3: АНАЛИЗ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ TON BOOST');
        console.log('-' .repeat(60));
        
        // 3.1 Пользователи с активными Boost пакетами
        const { data: activeBoostUsers, error: activeError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_rate, balance_ton, created_at')
            .gt('ton_boost_package', 0);
            
        console.log(`\n👥 3.1 ПОЛЬЗОВАТЕЛИ С АКТИВНЫМИ BOOST ПАКЕТАМИ: ${activeBoostUsers?.length || 0}`);
        
        if (activeBoostUsers && activeBoostUsers.length > 0) {
            // Проверяем первых 5 пользователей
            for (let i = 0; i < Math.min(5, activeBoostUsers.length); i++) {
                const user = activeBoostUsers[i];
                console.log(`\n   👤 User ${user.id}:`);
                console.log(`      Package: ${user.ton_boost_package}, Rate: ${user.ton_boost_rate}`);
                
                // Проверяем наличие farming записи
                const { data: userFarming } = await supabase
                    .from('ton_farming_data')
                    .select('farming_balance, boost_active, created_at')
                    .eq('user_id', user.id.toString())
                    .single();
                    
                if (userFarming) {
                    console.log(`      ✅ Farming: Balance ${userFarming.farming_balance}, Active: ${userFarming.boost_active}`);
                } else {
                    console.log(`      ❌ FARMING ЗАПИСЬ ОТСУТСТВУЕТ!`);
                }
            }
        }
        
        // 3.2 Статистика соответствия
        console.log('\n📈 3.2 СТАТИСТИКА СООТВЕТСТВИЯ:');
        const totalBoostUsers = activeBoostUsers?.length || 0;
        
        let farmingRecordsCount = 0;
        if (totalBoostUsers > 0) {
            for (const user of activeBoostUsers) {
                const { data: farmingCheck } = await supabase
                    .from('ton_farming_data')
                    .select('id')
                    .eq('user_id', user.id.toString())
                    .single();
                    
                if (farmingCheck) {
                    farmingRecordsCount++;
                }
            }
        }
        
        const matchPercentage = totalBoostUsers > 0 ? ((farmingRecordsCount / totalBoostUsers) * 100).toFixed(1) : '0';
        
        console.log(`   👥 Пользователей с активными Boost: ${totalBoostUsers}`);
        console.log(`   🚜 С farming записями: ${farmingRecordsCount}`);
        console.log(`   📊 Процент соответствия: ${matchPercentage}%`);
        
        if (farmingRecordsCount < totalBoostUsers) {
            const missingRecords = totalBoostUsers - farmingRecordsCount;
            console.log(`   🚨 ОТСУТСТВУЕТ ${missingRecords} farming записей!`);
        }
        
        // ========================================
        // РАЗДЕЛ 4: АНАЛИЗ НЕСООТВЕТСТВИЙ
        // ========================================
        console.log('\n📊 РАЗДЕЛ 4: АНАЛИЗ НЕСООТВЕТСТВИЙ И ПРОБЛЕМ');
        console.log('-' .repeat(60));
        
        console.log('\n🔍 4.1 ВЫЯВЛЕННЫЕ НЕСООТВЕТСТВИЯ:');
        
        // Проверка отсутствующих полей
        const missingFieldsInUsers = [];
        const expectedUserFields = ['boost_package_level'];
        if (usersSchema) {
            expectedUserFields.forEach(field => {
                if (!Object.keys(usersSchema).includes(field)) {
                    missingFieldsInUsers.push(field);
                }
            });
        }
        
        if (missingFieldsInUsers.length > 0) {
            console.log('❌ Отсутствующие поля в users:');
            missingFieldsInUsers.forEach(field => {
                console.log(`   - ${field}`);
            });
        } else {
            console.log('✅ Все ожидаемые поля в users присутствуют');
        }
        
        // Проверка типов данных в ton_farming_data
        if (farmingSchema) {
            console.log('\n🔍 4.2 АНАЛИЗ ТИПОВ ДАННЫХ TON_FARMING_DATA:');
            console.log(`   - user_id: ${typeof farmingSchema.user_id} (ожидается: string)`);
            console.log(`   - farming_balance: ${typeof farmingSchema.farming_balance} (ожидается: number)`);
            console.log(`   - boost_active: ${typeof farmingSchema.boost_active} (ожидается: boolean)`);
            
            if (typeof farmingSchema.user_id !== 'string') {
                console.log('⚠️ ПОТЕНЦИАЛЬНАЯ ПРОБЛЕМА: user_id не является string');
            }
        }
        
        // ========================================
        // РАЗДЕЛ 5: РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ
        // ========================================
        console.log('\n📊 РАЗДЕЛ 5: РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ');
        console.log('-' .repeat(60));
        
        console.log('\n💡 5.1 ПРИОРИТЕТНЫЕ ИСПРАВЛЕНИЯ:');
        
        if (farmingRecordsCount < totalBoostUsers) {
            console.log('🔧 1. ВОССТАНОВЛЕНИЕ ОТСУТСТВУЮЩИХ FARMING ЗАПИСЕЙ:');
            console.log('   - Создать ton_farming_data записи для пользователей с активными Boost');
            console.log('   - Использовать данные из users.ton_boost_package и users.ton_boost_rate');
        }
        
        console.log('\n🔧 2. ПРОВЕРКА ЛОГИКИ СОЗДАНИЯ ДЕПОЗИТОВ:');
        console.log('   - Убедиться, что activateBoost() вызывает создание farming записи');
        console.log('   - Проверить обработку ошибок в процессе активации');
        
        console.log('\n🔧 3. МОНИТОРИНГ ЦЕЛОСТНОСТИ ДАННЫХ:');
        console.log('   - Добавить проверки на соответствие users.ton_boost_package <-> ton_farming_data');
        console.log('   - Настроить автоматическое восстановление отсутствующих записей');

    } catch (error) {
        console.error('❌ Критическая ошибка анализа:', error);
    }
}

// Запуск анализа
analyzeTonBoostArchitecture().then(() => {
    console.log('\n✅ Комплексный анализ архитектуры TON Boost завершен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});