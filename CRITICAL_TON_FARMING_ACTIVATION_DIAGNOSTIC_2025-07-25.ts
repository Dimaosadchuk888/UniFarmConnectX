/**
 * КРИТИЧЕСКАЯ ДИАГНОСТИКА TON FARMING АКТИВАЦИИ - 25 июля 2025
 * Отслеживание полного пути: покупка → активация → создание ton_farming_data
 * Диагностика БЕЗ изменения кода - только анализ и логирование
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnosticTonFarmingActivation() {
    console.log('\n🔍 КРИТИЧЕСКАЯ ДИАГНОСТИКА TON FARMING АКТИВАЦИИ');
    console.log('=' .repeat(70));
    
    try {
        // ШАГ 1: Анализ актуальных данных пользователя с TON Boost
        console.log('\n📊 ШАГ 1: АНАЛИЗ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST');
        console.log('-' .repeat(50));
        
        const { data: activeUsers, error: usersError } = await supabase
            .from('users')
            .select(`
                id, 
                ton_boost_package, 
                ton_boost_rate, 
                ton_boost_package_id,
                ton_farming_balance,
                ton_farming_rate,
                ton_farming_start_timestamp,
                ton_farming_last_update,
                balance_ton,
                created_at
            `)
            .gt('ton_boost_package', 0) // Только активные TON Boost пользователи
            .order('id', { ascending: true });

        if (usersError) {
            console.error('❌ Ошибка получения пользователей:', usersError);
            return;
        }

        console.log(`✅ Найдено ${activeUsers?.length || 0} пользователей с активными TON Boost пакетами`);

        // ШАГ 2: Проверка соответствующих записей в ton_farming_data
        console.log('\n📊 ШАГ 2: ПРОВЕРКА ЗАПИСЕЙ В TON_FARMING_DATA');
        console.log('-' .repeat(50));
        
        const { data: farmingRecords, error: farmingError } = await supabase
            .from('ton_farming_data')
            .select(`
                user_id,
                boost_package_id,
                farming_balance,
                farming_rate,
                boost_active,
                farming_start_timestamp,
                created_at,
                updated_at
            `)
            .order('user_id', { ascending: true });

        if (farmingError) {
            console.error('❌ Ошибка получения farming данных:', farmingError);
            return;
        }

        console.log(`✅ Найдено ${farmingRecords?.length || 0} записей в ton_farming_data`);

        // ШАГ 3: Сопоставление данных и поиск расхождений
        console.log('\n🔍 ШАГ 3: СОПОСТАВЛЕНИЕ И ПОИСК ПРОБЛЕМ');
        console.log('-' .repeat(50));

        if (!activeUsers || activeUsers.length === 0) {
            console.log('⚠️ Нет активных TON Boost пользователей для анализа');
            return;
        }

        const farmingMap = new Map();
        farmingRecords?.forEach(record => {
            farmingMap.set(record.user_id, record);
        });

        let syncedUsers = 0;
        let missedUsers = 0;
        let problemCases: any[] = [];

        for (const user of activeUsers) {
            const farmingRecord = farmingMap.get(user.id.toString());
            const hasRecord = !!farmingRecord;
            
            console.log(`\n👤 USER ID ${user.id}:`);
            console.log(`   📦 TON Boost Package: ${user.ton_boost_package}`);
            console.log(`   ⚡ TON Boost Rate: ${user.ton_boost_rate}`);
            console.log(`   💰 Balance TON: ${user.balance_ton}`);
            console.log(`   📅 Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
            
            if (hasRecord) {
                console.log(`   ✅ СИНХРОНИЗИРОВАН с ton_farming_data:`);
                console.log(`      - Farming Balance: ${farmingRecord.farming_balance}`);
                console.log(`      - Farming Rate: ${farmingRecord.farming_rate}`);
                console.log(`      - Package ID: ${farmingRecord.boost_package_id}`);
                console.log(`      - Активен: ${farmingRecord.boost_active}`);
                console.log(`      - Создан: ${new Date(farmingRecord.created_at).toLocaleString('ru-RU')}`);
                syncedUsers++;
            } else {
                console.log(`   ❌ НЕТ ЗАПИСИ В ton_farming_data - СИСТЕМНАЯ ПРОБЛЕМА!`);
                missedUsers++;
                
                problemCases.push({
                    userId: user.id,
                    tonBoostPackage: user.ton_boost_package,
                    tonBoostRate: user.ton_boost_rate,
                    balanceTon: user.balance_ton,
                    createdAt: user.created_at,
                    issue: 'missing_farming_data_record'
                });
            }
        }

        // ШАГ 4: Анализ последних покупок TON Boost
        console.log('\n📊 ШАГ 4: АНАЛИЗ ПОСЛЕДНИХ ПОКУПОК TON BOOST (24 ЧАСА)');
        console.log('-' .repeat(50));
        
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
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
            .gte('created_at', yesterday)
            .or('type.eq.BOOST_PURCHASE,metadata->original_type.eq.TON_BOOST_PURCHASE')
            .order('created_at', { ascending: false });

        if (purchasesError) {
            console.log('⚠️ Ошибка получения покупок:', purchasesError.message);
        } else {
            console.log(`✅ Найдено ${recentPurchases?.length || 0} покупок TON Boost за 24 часа`);
            
            if (recentPurchases && recentPurchases.length > 0) {
                console.log('\n📋 ДЕТАЛИ ПОСЛЕДНИХ ПОКУПОК:');
                for (const purchase of recentPurchases.slice(0, 5)) { // Показываем только последние 5
                    console.log(`   🛒 User ${purchase.user_id}:`);
                    console.log(`      - Сумма: ${purchase.amount} TON`);
                    console.log(`      - Статус: ${purchase.status}`);
                    console.log(`      - Время: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                    console.log(`      - Описание: ${purchase.description}`);
                    
                    // Проверяем есть ли farming запись для этого пользователя
                    const hasFarmingRecord = farmingMap.has(purchase.user_id.toString());
                    console.log(`      - Farming запись: ${hasFarmingRecord ? '✅ ЕСТЬ' : '❌ ОТСУТСТВУЕТ'}`);
                }
            }
        }

        // ШАГ 5: Диагностика структуры таблицы ton_farming_data
        console.log('\n📊 ШАГ 5: ДИАГНОСТИКА СТРУКТУРЫ ТАБЛИЦЫ TON_FARMING_DATA');
        console.log('-' .repeat(50));

        try {
            // Проверяем доступность таблицы простым запросом
            const { data: testRecord, error: structureError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .limit(1);

            if (structureError) {
                console.log(`❌ ПРОБЛЕМА С ТАБЛИЦЕЙ: ${structureError.message}`);
                console.log(`   Код ошибки: ${structureError.code}`);
                
                if (structureError.code === '42P01') {
                    console.log('   🚨 ТАБЛИЦА ton_farming_data НЕ СУЩЕСТВУЕТ!');
                    console.log('   🔄 Система работает в fallback режиме через users таблицу');
                }
            } else {
                console.log('✅ Таблица ton_farming_data доступна');
                console.log(`   Тестовая запись получена: ${testRecord ? 'ДА' : 'НЕТ'}`);
            }
        } catch (error) {
            console.log(`❌ Критическая ошибка доступа к таблице: ${error}`);
        }

        // ШАГ 6: Итоговый анализ и рекомендации
        console.log('\n📈 ШАГ 6: ИТОГОВЫЙ АНАЛИЗ');
        console.log('=' .repeat(70));
        
        console.log(`👥 Всего активных TON Boost пользователей: ${activeUsers.length}`);
        console.log(`✅ Синхронизированы с ton_farming_data: ${syncedUsers}`);
        console.log(`❌ Пропущены (НЕ ПОЛУЧАЮТ ДОХОДЫ): ${missedUsers}`);
        console.log(`📊 Процент успешной синхронизации: ${((syncedUsers / activeUsers.length) * 100).toFixed(1)}%`);

        if (missedUsers > 0) {
            console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ:');
            console.log(`🔥 ${missedUsers} пользователей с активными TON Boost НЕ получают доходы!`);
            console.log('🔧 ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ СИСТЕМЫ АКТИВАЦИИ');
            
            console.log('\n📋 СПИСОК ПРОБЛЕМНЫХ ПОЛЬЗОВАТЕЛЕЙ:');
            problemCases.forEach((case_, index) => {
                console.log(`${index + 1}. User ${case_.userId}: Package ${case_.tonBoostPackage}, Rate ${case_.tonBoostRate}`);
            });
            
            console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
            console.log('1. ❌ TonFarmingRepository.activateBoost() не создает записи');
            console.log('2. ❌ Ошибки в upsert операциях с ton_farming_data');
            console.log('3. ❌ Fallback режим не синхронизируется с ton_farming_data');
            console.log('4. ❌ Прерывание активации на этапе создания записи');
        } else {
            console.log('\n🎉 ВСЕ ПОЛЬЗОВАТЕЛИ СИНХРОНИЗИРОВАНЫ!');
            console.log('✅ Система активации TON Boost работает корректно');
        }

        return {
            totalUsers: activeUsers.length,
            syncedUsers,
            missedUsers,
            syncRate: ((syncedUsers / activeUsers.length) * 100).toFixed(1),
            problemCases
        };

    } catch (error) {
        console.error('❌ Критическая ошибка диагностики:', error);
        return null;
    }
}

// Запуск диагностики
diagnosticTonFarmingActivation().then((result) => {
    if (result) {
        console.log('\n' + '=' .repeat(70));
        console.log('🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
        console.log('=' .repeat(70));
        
        if (result.missedUsers > 0) {
            console.log('🚨 СИСТЕМА ТРЕБУЕТ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ!');
            console.log('📞 Необходима диагностика TonFarmingRepository.activateBoost()');
        } else {
            console.log('✅ Система активации TON Boost функционирует правильно');
        }
    }
    
    console.log('\n✅ Диагностический скрипт активации выполнен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка диагностики:', error);
    process.exit(1);
});