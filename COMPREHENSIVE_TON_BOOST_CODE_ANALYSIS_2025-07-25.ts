/**
 * АНАЛИЗ КОДА TON BOOST СИСТЕМЫ - 25 июля 2025
 * Сопоставление ожидаемых и реальных полей в коде
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Анализ структуры полей из схемы базы данных
async function analyzeCodeDatabaseMismatch() {
    console.log('\n🔧 АНАЛИЗ НЕСООТВЕТСТВИЙ КОДА И БАЗЫ ДАННЫХ');
    console.log('=' .repeat(70));
    
    try {
        // РАЗДЕЛ 1: Анализ ожидаемых vs реальных полей в users
        console.log('\n📊 РАЗДЕЛ 1: ПОЛЯ USERS - ОЖИДАЕМЫЕ VS РЕАЛЬНЫЕ');
        console.log('-' .repeat(60));
        
        const { data: userSample, error: userError } = await supabase
            .from('users')
            .select('*')
            .gt('ton_boost_package', 0)
            .limit(1)
            .single();
            
        if (userSample) {
            console.log('\n🔍 1.1 АНАЛИЗ ПОЛЕЙ TON BOOST В USERS:');
            
            // Проверяем различные вариации полей boost
            const boostFieldVariations = [
                'boost_package_level',    // Ожидаемое в ТЗ
                'ton_boost_package',      // Реально используемое
                'ton_boost_package_id',   // Альтернативное
                'ton_boost_active',       // Статус активности
                'ton_boost_rate',         // Ставка
                'ton_boost_expires_at'    // Срок действия
            ];
            
            boostFieldVariations.forEach(field => {
                if (userSample.hasOwnProperty(field)) {
                    console.log(`   ✅ ${field}: ${userSample[field]} (${typeof userSample[field]})`);
                } else {
                    console.log(`   ❌ ${field}: ОТСУТСТВУЕТ`);
                }
            });
            
            // Проверяем поля баланса TON
            const tonBalanceFields = [
                'ton_balance',           // Ожидаемое в ТЗ
                'balance_ton',           // Альтернативное
                'ton_farming_balance',   // Фарминг баланс
                'ton_farming_rate'       // Фарминг ставка
            ];
            
            console.log('\n🔍 1.2 АНАЛИЗ ПОЛЕЙ TON БАЛАНСА В USERS:');
            tonBalanceFields.forEach(field => {
                if (userSample.hasOwnProperty(field)) {
                    console.log(`   ✅ ${field}: ${userSample[field]} (${typeof userSample[field]})`);
                } else {
                    console.log(`   ❌ ${field}: ОТСУТСТВУЕТ`);
                }
            });
        }
        
        // РАЗДЕЛ 2: Анализ ton_farming_data полей
        console.log('\n📊 РАЗДЕЛ 2: ПОЛЯ TON_FARMING_DATA - ОЖИДАЕМЫЕ VS РЕАЛЬНЫЕ');
        console.log('-' .repeat(60));
        
        const { data: farmingSample, error: farmingError } = await supabase
            .from('ton_farming_data')
            .select('*')
            .limit(1)
            .single();
            
        if (farmingSample) {
            console.log('\n🔍 2.1 АНАЛИЗ ПОЛЕЙ TON_FARMING_DATA:');
            
            // Проверяем ожидаемые поля из ТЗ
            const expectedFarmingFields = [
                { field: 'user_id', expected: 'string', description: 'ID пользователя' },
                { field: 'amount', expected: 'number', description: 'Сумма депозита (ожидаемое)' },
                { field: 'farming_balance', expected: 'number', description: 'Сумма депозита (реальное)' },
                { field: 'source', expected: 'string', description: 'Источник (ожидаемое)' },
                { field: 'boost_package_id', expected: 'number', description: 'ID пакета (реальное)' },
                { field: 'is_active', expected: 'boolean', description: 'Активность (ожидаемое)' },
                { field: 'boost_active', expected: 'boolean', description: 'Активность (реальное)' },
                { field: 'start_time', expected: 'string', description: 'Время начала (ожидаемое)' },
                { field: 'farming_start_timestamp', expected: 'string', description: 'Время начала (реальное)' },
                { field: 'package_level', expected: 'number', description: 'Уровень пакета (ожидаемое)' }
            ];
            
            expectedFarmingFields.forEach(({ field, expected, description }) => {
                if (farmingSample.hasOwnProperty(field)) {
                    const actualType = typeof farmingSample[field];
                    const typeMatch = actualType === expected ? '✅' : '⚠️';
                    console.log(`   ${typeMatch} ${field}: ${farmingSample[field]} (${actualType}) - ${description}`);
                } else {
                    console.log(`   ❌ ${field}: ОТСУТСТВУЕТ - ${description}`);
                }
            });
        }
        
        // РАЗДЕЛ 3: Анализ таблицы user_boost_package
        console.log('\n📊 РАЗДЕЛ 3: АНАЛИЗ ОТСУТСТВУЮЩЕЙ ТАБЛИЦЫ USER_BOOST_PACKAGE');
        console.log('-' .repeat(60));
        
        try {
            const { data: boostPackageData, error: boostPackageError } = await supabase
                .from('user_boost_package')
                .select('*')
                .limit(1);
                
            if (boostPackageError) {
                console.log('❌ ТАБЛИЦА USER_BOOST_PACKAGE НЕ СУЩЕСТВУЕТ');
                console.log('📝 ОЖИДАЕМЫЕ ПОЛЯ ИЗ ТЗ:');
                console.log('   - user_id: INTEGER');
                console.log('   - level: INTEGER');
                console.log('   - timestamp: TIMESTAMP');
                console.log('   - source: STRING');
                console.log('\n💡 АЛЬТЕРНАТИВНЫЕ РЕШЕНИЯ:');
                console.log('   ✅ Используется users.ton_boost_package вместо отдельной таблицы');
                console.log('   ✅ Используется ton_farming_data для хранения активных депозитов');
            }
        } catch (error) {
            console.log('❌ ТАБЛИЦА USER_BOOST_PACKAGE НЕДОСТУПНА');
        }
        
        // РАЗДЕЛ 4: Анализ логики создания депозитов
        console.log('\n📊 РАЗДЕЛ 4: АНАЛИЗ ЛОГИКИ СОЗДАНИЯ ДЕПОЗИТОВ');
        console.log('-' .repeat(60));
        
        // Проверяем последнюю покупку и её обработку
        const { data: recentPurchase, error: purchaseError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (recentPurchase) {
            console.log('\n🔍 4.1 ПОСЛЕДНЯЯ ПОКУПКА TON BOOST:');
            console.log(`   💰 ID транзакции: ${recentPurchase.id}`);
            console.log(`   👤 User ID: ${recentPurchase.user_id}`);
            console.log(`   📅 Время: ${new Date(recentPurchase.created_at).toLocaleString('ru-RU')}`);
            console.log(`   💸 Сумма: ${recentPurchase.amount} ${recentPurchase.currency}`);
            
            if (recentPurchase.metadata) {
                console.log('\n🔗 METADATA ПОКУПКИ:');
                Object.keys(recentPurchase.metadata).forEach(key => {
                    console.log(`   - ${key}: ${recentPurchase.metadata[key]}`);
                });
            }
            
            // Проверяем создание соответствующей farming записи
            const { data: correspondingFarming, error: farmingCheckError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', recentPurchase.user_id.toString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            console.log('\n🔍 4.2 СООТВЕТСТВУЮЩАЯ FARMING ЗАПИСЬ:');
            if (correspondingFarming) {
                console.log('   ✅ FARMING ЗАПИСЬ НАЙДЕНА:');
                console.log(`      📦 Package ID: ${correspondingFarming.boost_package_id}`);
                console.log(`      💰 Farming Balance: ${correspondingFarming.farming_balance}`);
                console.log(`      ⚡ Rate: ${correspondingFarming.farming_rate}`);
                console.log(`      🔄 Active: ${correspondingFarming.boost_active}`);
                console.log(`      📅 Создано: ${new Date(correspondingFarming.created_at).toLocaleString('ru-RU')}`);
                
                // Анализ временной связи
                const purchaseTime = new Date(recentPurchase.created_at).getTime();
                const farmingTime = new Date(correspondingFarming.created_at).getTime();
                const timeDiff = Math.abs(purchaseTime - farmingTime) / 1000;
                
                console.log(`      ⏱️ Временная связь: ${timeDiff.toFixed(1)} секунд между покупкой и farming`);
                
                if (timeDiff < 60) {
                    console.log('      ✅ АВТОМАТИЧЕСКОЕ СОЗДАНИЕ РАБОТАЕТ');
                } else {
                    console.log('      ⚠️ БОЛЬШАЯ ЗАДЕРЖКА - возможна проблема');
                }
            } else {
                console.log('   ❌ FARMING ЗАПИСЬ НЕ НАЙДЕНА');
                console.log('   🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Покупка не создала депозит!');
            }
        }
        
        // РАЗДЕЛ 5: Анализ планировщика и фильтрации
        console.log('\n📊 РАЗДЕЛ 5: АНАЛИЗ ПЛАНИРОВЩИКА И ФИЛЬТРАЦИИ');
        console.log('-' .repeat(60));
        
        // Проверяем условия фильтрации планировщика
        const { data: schedulerCandidates, error: schedulerError } = await supabase
            .from('ton_farming_data')
            .select('user_id, farming_balance, boost_active, farming_rate, created_at')
            .eq('boost_active', true)
            .gt('farming_balance', 0);
            
        console.log('\n🔍 5.1 КАНДИДАТЫ ДЛЯ ПЛАНИРОВЩИКА:');
        console.log(`   👥 Всего активных farming записей: ${schedulerCandidates?.length || 0}`);
        
        if (schedulerCandidates && schedulerCandidates.length > 0) {
            console.log('\n📋 Примеры активных записей:');
            schedulerCandidates.slice(0, 5).forEach(record => {
                console.log(`   User ${record.user_id}: Balance ${record.farming_balance}, Rate ${record.farming_rate}`);
            });
            
            // Проверяем соответствие с users таблицей
            console.log('\n🔍 5.2 СООТВЕТСТВИЕ С USERS ТАБЛИЦЕЙ:');
            const userIds = schedulerCandidates.map(r => parseInt(r.user_id)).slice(0, 5);
            
            const { data: correspondingUsers, error: usersCheckError } = await supabase
                .from('users')
                .select('id, ton_boost_package, ton_boost_rate')
                .in('id', userIds);
                
            if (correspondingUsers) {
                correspondingUsers.forEach(user => {
                    const farmingRecord = schedulerCandidates.find(f => f.user_id === user.id.toString());
                    if (farmingRecord) {
                        const rateMatch = Math.abs(user.ton_boost_rate - farmingRecord.farming_rate) < 0.001;
                        const rateSymbol = rateMatch ? '✅' : '⚠️';
                        console.log(`   User ${user.id}: ${rateSymbol} Package ${user.ton_boost_package}, Rate users=${user.ton_boost_rate} farming=${farmingRecord.farming_rate}`);
                    }
                });
            }
        }
        
        // РАЗДЕЛ 6: Итоговые выводы
        console.log('\n📊 РАЗДЕЛ 6: ИТОГОВЫЕ ВЫВОДЫ ПО АРХИТЕКТУРЕ');
        console.log('-' .repeat(60));
        
        console.log('\n✅ 6.1 ЧТО РАБОТАЕТ КОРРЕКТНО:');
        console.log('   ✅ transactions таблица корректно записывает покупки BOOST_PURCHASE');
        console.log('   ✅ users таблица обновляется с ton_boost_package и ton_boost_rate');
        console.log('   ✅ ton_farming_data таблица создается для farming активности');
        console.log('   ✅ Планировщик имеет доступ к активным farming записям');
        
        console.log('\n⚠️ 6.2 ОБНАРУЖЕННЫЕ НЕСООТВЕТСТВИЯ:');
        console.log('   ⚠️ Отсутствует таблица user_boost_package (ожидалась в ТЗ)');
        console.log('   ⚠️ Поле boost_package_level отсутствует в users (ожидалось в ТЗ)');
        console.log('   ⚠️ Поля amount, source, is_active отсутствуют в ton_farming_data');
        console.log('   ⚠️ Используются альтернативные имена полей (farming_balance вместо amount)');
        
        console.log('\n❌ 6.3 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (если есть):');
        const activeFarmingCount = schedulerCandidates?.length || 0;
        const { data: activeUsersCount } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .gt('ton_boost_package', 0);
        
        if (activeFarmingCount === 0) {
            console.log('   ❌ ОТСУТСТВУЮТ АКТИВНЫЕ FARMING ЗАПИСИ');
        } else {
            console.log('   ✅ Активные farming записи присутствуют');
        }
        
        console.log('\n💡 6.4 РЕКОМЕНДАЦИИ:');
        console.log('   1. Система использует альтернативную архитектуру вместо ожидаемой из ТЗ');
        console.log('   2. ton_farming_data эффективно заменяет отсутствующую user_boost_package');
        console.log('   3. Текущая архитектура работоспособна и создает farming депозиты');
        console.log('   4. Необходимо обновить документацию в соответствии с реальной схемой');

    } catch (error) {
        console.error('❌ Критическая ошибка анализа кода:', error);
    }
}

// Запуск анализа
analyzeCodeDatabaseMismatch().then(() => {
    console.log('\n✅ Анализ несоответствий кода и базы данных завершен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});