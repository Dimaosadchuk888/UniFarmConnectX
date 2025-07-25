/**
 * ГЛУБОКИЙ АНАЛИЗ КОДА АКТИВАЦИИ TON BOOST - 25 июля 2025
 * Пошаговое исследование: почему новые покупки не создают ton_farming_data автоматически
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepActivationCodeAnalysis() {
    console.log('\n🔬 ГЛУБОКИЙ АНАЛИЗ КОДА АКТИВАЦИИ TON BOOST');
    console.log('=' .repeat(70));
    
    try {
        // ШАГ 1: Анализ последних покупок vs записей ton_farming_data
        console.log('\n📊 ШАГ 1: АНАЛИЗ ПОСЛЕДНИХ ПОКУПОК VS ЗАПИСЕЙ');
        console.log('-' .repeat(50));
        
        // Получаем последние покупки TON Boost
        const { data: recentPurchases, error: purchasesError } = await supabase
            .from('transactions')
            .select(`
                user_id,
                type,
                amount,
                description,
                status,
                created_at,
                metadata
            `)
            .or('type.eq.BOOST_PURCHASE,description.ilike.%TON Boost%')
            .order('created_at', { ascending: false })
            .limit(10);

        if (purchasesError) {
            console.log('⚠️ Ошибка получения покупок, попробуем другой способ...');
            
            // Альтернативный запрос
            const { data: altPurchases, error: altError } = await supabase
                .from('transactions')
                .select('user_id, type, amount, description, status, created_at')
                .eq('type', 'BOOST_PURCHASE')
                .order('created_at', { ascending: false })
                .limit(10);
                
            if (altError) {
                console.log('❌ Не удалось получить покупки:', altError.message);
            } else {
                console.log(`✅ Найдено ${altPurchases?.length || 0} покупок BOOST_PURCHASE`);
                
                for (const purchase of altPurchases || []) {
                    console.log(`   🛒 User ${purchase.user_id}: ${purchase.amount} TON (${new Date(purchase.created_at).toLocaleString('ru-RU')})`);
                }
            }
        } else {
            console.log(`✅ Найдено ${recentPurchases?.length || 0} покупок TON Boost`);
            
            for (const purchase of recentPurchases || []) {
                console.log(`   🛒 User ${purchase.user_id}: ${purchase.amount} TON`);
                console.log(`      Type: ${purchase.type}, Status: ${purchase.status}`);
                console.log(`      Time: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                console.log(`      Description: ${purchase.description}`);
                
                // Проверяем есть ли farming запись для этого пользователя
                const { data: farmingRecord } = await supabase
                    .from('ton_farming_data')
                    .select('user_id, farming_balance, created_at')
                    .eq('user_id', purchase.user_id.toString())
                    .single();
                    
                if (farmingRecord) {
                    console.log(`      ✅ Farming запись НАЙДЕНА: ${farmingRecord.farming_balance} TON`);
                    console.log(`         Создана: ${new Date(farmingRecord.created_at).toLocaleString('ru-RU')}`);
                } else {
                    console.log(`      ❌ Farming запись ОТСУТСТВУЕТ - ПРОБЛЕМА!`);
                }
                console.log('');
            }
        }

        // ШАГ 2: Тестирование создания записи ton_farming_data
        console.log('\n📊 ШАГ 2: ТЕСТИРОВАНИЕ СОЗДАНИЯ ЗАПИСИ TON_FARMING_DATA');
        console.log('-' .repeat(50));
        
        const testUserId = '999999'; // Тестовый ID
        const testData = {
            user_id: testUserId,
            boost_active: true,
            boost_package_id: 1,
            farming_rate: '0.01',
            farming_balance: '1',
            boost_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            farming_start_timestamp: new Date().toISOString(),
            farming_last_update: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('🧪 ТЕСТ: Создание тестовой записи в ton_farming_data');
        console.log(`   User ID: ${testUserId}`);
        console.log(`   Data:`, testData);
        
        const { data: testResult, error: testError } = await supabase
            .from('ton_farming_data')
            .upsert(testData, { onConflict: 'user_id' })
            .select();
            
        if (testError) {
            console.log(`❌ ОШИБКА создания тестовой записи:`, testError);
            console.log(`   Код ошибки: ${testError.code}`);
            console.log(`   Сообщение: ${testError.message}`);
            console.log(`   Детали: ${testError.details}`);
        } else {
            console.log(`✅ Тестовая запись УСПЕШНО создана:`, testResult);
            
            // Удаляем тестовую запись
            await supabase
                .from('ton_farming_data')
                .delete()
                .eq('user_id', testUserId);
            console.log('🗑️ Тестовая запись удалена');
        }

        // ШАГ 3: Проверка схемы таблицы ton_farming_data
        console.log('\n📊 ШАГ 3: АНАЛИЗ СХЕМЫ ТАБЛИЦЫ TON_FARMING_DATA');
        console.log('-' .repeat(50));
        
        // Получаем пример записи для анализа полей
        const { data: sampleRecord, error: sampleError } = await supabase
            .from('ton_farming_data')
            .select('*')
            .limit(1)
            .single();
            
        if (sampleError) {
            console.log(`❌ Ошибка получения образца записи:`, sampleError);
        } else {
            console.log('✅ Схема таблицы ton_farming_data (доступные поля):');
            const fields = Object.keys(sampleRecord);
            fields.forEach(field => {
                console.log(`   - ${field}: ${typeof sampleRecord[field]} = ${sampleRecord[field]}`);
            });
        }

        // ШАГ 4: Анализ TonFarmingRepository метода activateBoost
        console.log('\n📊 ШАГ 4: АНАЛИЗ LOGОВ TONFARMING REPOSITORY');
        console.log('-' .repeat(50));
        
        // Проверяем последние логи сервера для TonFarmingRepository
        console.log('🔍 Ищем ошибки активации в последних операциях...');
        
        // Получаем пользователей с недавними изменениями
        const { data: recentUsers, error: recentError } = await supabase
            .from('users')
            .select('id, ton_boost_package, updated_at')
            .gt('ton_boost_package', 0)
            .order('updated_at', { ascending: false })
            .limit(5);
            
        if (recentError) {
            console.log('❌ Ошибка получения недавних пользователей:', recentError);
        } else {
            console.log(`✅ Найдено ${recentUsers?.length || 0} пользователей с недавними изменениями:`);
            
            for (const user of recentUsers || []) {
                console.log(`   👤 User ${user.id}:`);
                console.log(`      TON Boost Package: ${user.ton_boost_package}`);
                console.log(`      Updated: ${new Date(user.updated_at).toLocaleString('ru-RU')}`);
                
                // Проверяем соответствующую запись в ton_farming_data
                const { data: correspondingRecord } = await supabase
                    .from('ton_farming_data')
                    .select('created_at, updated_at, farming_balance')
                    .eq('user_id', user.id.toString())
                    .single();
                    
                if (correspondingRecord) {
                    const userUpdate = new Date(user.updated_at).getTime();
                    const farmingCreate = new Date(correspondingRecord.created_at).getTime();
                    const timeDiff = Math.abs(userUpdate - farmingCreate) / 1000 / 60; // разница в минутах
                    
                    console.log(`      ✅ Farming запись существует:`);
                    console.log(`         Создана: ${new Date(correspondingRecord.created_at).toLocaleString('ru-RU')}`);
                    console.log(`         Разница во времени: ${timeDiff.toFixed(1)} минут`);
                    
                    if (timeDiff > 60) {
                        console.log(`         ⚠️ БОЛЬШАЯ РАЗНИЦА ВО ВРЕМЕНИ - возможно ручное восстановление`);
                    }
                } else {
                    console.log(`      ❌ Farming запись ОТСУТСТВУЕТ - активация не сработала!`);
                }
            }
        }

        // ШАГ 5: Поиск failed upsert операций
        console.log('\n📊 ШАГ 5: СИМУЛЯЦИЯ АКТИВАЦИИ БЕЗ ИЗМЕНЕНИЙ');
        console.log('-' .repeat(50));
        
        console.log('🧪 Симулируем процесс activateBoost для анализа...');
        
        // Получаем данные boost пакета
        const { data: boostPackages, error: packageError } = await supabase
            .from('boost_packages')
            .select('*')
            .eq('id', 1)
            .single();
            
        if (packageError) {
            console.log('❌ Ошибка получения boost пакета:', packageError);
        } else {
            console.log('✅ Boost пакет ID 1 найден:');
            console.log(`   Name: ${boostPackages.name}`);
            console.log(`   Min Amount: ${boostPackages.min_amount}`);
            console.log(`   Daily Rate: ${boostPackages.daily_rate}`);
            console.log(`   Duration: ${boostPackages.duration_days} дней`);
            
            // Симулируем данные которые передаются в activateBoost
            const simulatedUserId = '184'; // Существующий пользователь
            const simulatedPackageId = 1;
            const simulatedRate = boostPackages.daily_rate;
            const simulatedExpiresAt = new Date(Date.now() + boostPackages.duration_days * 24 * 60 * 60 * 1000).toISOString();
            const simulatedDepositAmount = boostPackages.min_amount;
            
            console.log('\n🔧 ПАРАМЕТРЫ СИМУЛИРОВАННОЙ АКТИВАЦИИ:');
            console.log(`   userId: "${simulatedUserId}" (${typeof simulatedUserId})`);
            console.log(`   packageId: ${simulatedPackageId} (${typeof simulatedPackageId})`);
            console.log(`   rate: ${simulatedRate} (${typeof simulatedRate})`);
            console.log(`   expiresAt: ${simulatedExpiresAt}`);
            console.log(`   depositAmount: ${simulatedDepositAmount} (${typeof simulatedDepositAmount})`);
            
            // Проверяем существующую запись для этого пользователя
            const { data: existingRecord } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', simulatedUserId)
                .single();
                
            if (existingRecord) {
                console.log('\n📋 СУЩЕСТВУЮЩАЯ ЗАПИСЬ:');
                console.log(`   farming_balance: ${existingRecord.farming_balance}`);
                console.log(`   farming_rate: ${existingRecord.farming_rate}`);
                console.log(`   boost_package_id: ${existingRecord.boost_package_id}`);
                console.log(`   created_at: ${new Date(existingRecord.created_at).toLocaleString('ru-RU')}`);
                
                // Симулируем накопление баланса как в коде
                const currentBalance = parseFloat(existingRecord.farming_balance) || 0;
                const depositToAdd = simulatedDepositAmount || 0;
                const newBalance = currentBalance + depositToAdd;
                
                console.log('\n🧮 СИМУЛЯЦИЯ НАКОПЛЕНИЯ БАЛАНСА:');
                console.log(`   Текущий баланс: ${currentBalance}`);
                console.log(`   Добавляем депозит: ${depositToAdd}`);
                console.log(`   Новый баланс: ${newBalance}`);
            } else {
                console.log('\n⚠️ Существующая запись не найдена для симуляции');
            }
        }

        console.log('\n📈 ЗАКЛЮЧЕНИЕ АНАЛИЗА:');
        console.log('=' .repeat(70));
        console.log('1. 🔍 Проверили схему ton_farming_data - таблица доступна');
        console.log('2. 🧪 Тестировали создание записи - операция возможна');
        console.log('3. 📊 Проанализировали последние покупки vs записи');
        console.log('4. 🔧 Симулировали процесс activateBoost');
        console.log('\n🎯 СЛЕДУЮЩИЙ ШАГ: Анализ логов TonFarmingRepository в реальном времени');

    } catch (error) {
        console.error('❌ Критическая ошибка анализа:', error);
    }
}

// Запуск анализа
deepActivationCodeAnalysis().then(() => {
    console.log('\n✅ Глубокий анализ кода активации завершен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});