/**
 * КРИТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ ПРОПУЩЕННЫХ TON FARMING ПОЛЬЗОВАТЕЛЕЙ - 25 июля 2025
 * Создание недостающих записей в ton_farming_data для всех пользователей с TON Boost пакетами
 * ИСПРАВЛЕНИЕ КРИТИЧЕСКОЙ ПРОБЛЕМЫ СИНХРОНИЗАЦИИ
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
    ton_boost_package_id: number | null;
    ton_boost_rate: number;
    balance_ton: number;
}

interface BoostPackage {
    id: number;
    name: string;
    min_amount: number;
    rate_multiplier: number;
    bonus_uni: number;
}

async function getBoostPackageInfo(packageId: number): Promise<BoostPackage | null> {
    const { data, error } = await supabase
        .from('boost_packages')
        .select('*')
        .eq('id', packageId)
        .single();
    
    if (error) {
        console.error(`❌ Ошибка получения пакета ${packageId}:`, error);
        return null;
    }
    
    return data;
}

async function createTonFarmingRecord(user: UserWithTonBoost, packageInfo: BoostPackage) {
    // Рассчитываем farming_balance на основе пакета
    const farmingBalance = packageInfo.min_amount;
    
    // Рассчитываем rate на основе пакета (используем минимальную сумму пакета)
    const ratePerSecond = (farmingBalance / 100) / (24 * 60 * 60); // 1% в день в секундах
    
    console.log(`📝 Создаем запись для User ${user.id}:`);
    console.log(`   📦 Package: ${packageInfo.name} (ID: ${packageInfo.id})`);
    console.log(`   💰 Farming Balance: ${farmingBalance} TON`);
    console.log(`   ⚡ Rate: ${ratePerSecond} TON/сек`);
    
    const { data, error } = await supabase
        .from('ton_farming_data')
        .insert({
            user_id: user.id.toString(), // ВАЖНО: STRING формат
            boost_package_id: packageInfo.id,
            farming_balance: farmingBalance,
            daily_income: farmingBalance / 100, // 1% в день
            total_earned: 0,
            last_claim: new Date().toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (error) {
        console.error(`❌ Ошибка создания записи для User ${user.id}:`, error);
        return false;
    }
    
    console.log(`✅ Запись создана для User ${user.id}`);
    return true;
}

async function restoreMissingTonFarmingUsers() {
    console.log('\n🚨 КРИТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ ПРОПУЩЕННЫХ TON FARMING ПОЛЬЗОВАТЕЛЕЙ');
    console.log('=' .repeat(80));
    
    try {
        // 1. ПОЛУЧАЕМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST ПАКЕТАМИ
        console.log('\n📊 ШАГ 1: ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST');
        const { data: usersWithTonBoost, error: usersError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate, balance_ton')
            .not('ton_boost_package', 'is', null)
            .gt('ton_boost_package', 0) // Только с активными пакетами
            .order('id', { ascending: true });

        if (usersError) {
            console.error('❌ Ошибка получения пользователей:', usersError);
            return;
        }

        console.log(`✅ Найдено ${usersWithTonBoost?.length || 0} пользователей с активными TON Boost пакетами`);

        // 2. ПОЛУЧАЕМ СУЩЕСТВУЮЩИЕ ЗАПИСИ TON_FARMING_DATA
        console.log('\n📊 ШАГ 2: ПРОВЕРКА СУЩЕСТВУЮЩИХ ЗАПИСЕЙ');
        const { data: existingRecords, error: farmingError } = await supabase
            .from('ton_farming_data')
            .select('user_id');

        if (farmingError) {
            console.error('❌ Ошибка получения существующих записей:', farmingError);
            return;
        }

        const existingUserIds = new Set(existingRecords?.map(r => r.user_id) || []);
        console.log(`✅ Найдено ${existingRecords?.length || 0} существующих записей`);

        // 3. ОПРЕДЕЛЯЕМ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ
        const missingUsers = usersWithTonBoost?.filter(user => 
            !existingUserIds.has(user.id.toString())
        ) || [];

        console.log(`🚨 НАЙДЕНО ${missingUsers.length} ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ`);

        if (missingUsers.length === 0) {
            console.log('✅ Все пользователи уже имеют записи в ton_farming_data');
            return;
        }

        // 4. ПОЛУЧАЕМ ИНФОРМАЦИЮ О BOOST ПАКЕТАХ
        console.log('\n📦 ШАГ 3: ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ПАКЕТАХ');
        const { data: boostPackages, error: packagesError } = await supabase
            .from('boost_packages')
            .select('*')
            .order('id', { ascending: true });

        if (packagesError) {
            console.error('❌ Ошибка получения пакетов:', packagesError);
            return;
        }

        console.log(`✅ Загружено ${boostPackages?.length || 0} boost пакетов`);

        // Создаем карту пакетов для быстрого доступа
        const packagesMap = new Map();
        boostPackages?.forEach(pkg => {
            packagesMap.set(pkg.id, pkg);
        });

        // 5. ВОССТАНАВЛИВАЕМ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ
        console.log('\n🔧 ШАГ 4: МАССОВОЕ ВОССТАНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ');
        console.log('=' .repeat(60));

        let successCount = 0;
        let errorCount = 0;

        for (const user of missingUsers) {
            console.log(`\n🔄 Обрабатываем User ID ${user.id}:`);
            console.log(`   📦 TON Boost Package: ${user.ton_boost_package}`);
            console.log(`   ⚡ Rate: ${user.ton_boost_rate}`);

            // Определяем правильный пакет
            let packageInfo = packagesMap.get(user.ton_boost_package);
            
            if (!packageInfo) {
                console.log(`⚠️  Пакет ${user.ton_boost_package} не найден, используем пакет по умолчанию (ID: 1)`);
                packageInfo = packagesMap.get(1);
            }

            if (!packageInfo) {
                console.error(`❌ Не удается найти информацию о пакете для User ${user.id}`);
                errorCount++;
                continue;
            }

            // Создаем запись
            const success = await createTonFarmingRecord(user, packageInfo);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }

            // Небольшая пауза между запросами
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 6. ИТОГОВАЯ СТАТИСТИКА
        console.log('\n' + '=' .repeat(80));
        console.log('📈 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ВОССТАНОВЛЕНИЯ:');
        console.log('=' .repeat(80));
        console.log(`👥 Всего пропущенных пользователей: ${missingUsers.length}`);
        console.log(`✅ Успешно восстановлено: ${successCount}`);
        console.log(`❌ Ошибок при создании: ${errorCount}`);
        console.log(`📊 Процент успеха: ${((successCount / missingUsers.length) * 100).toFixed(1)}%`);

        if (successCount > 0) {
            console.log('\n🎉 ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!');
            console.log('✅ Восстановленные пользователи теперь будут получать TON доходы от планировщика');
            console.log('⚡ Планировщик обнаружит их в следующем цикле (каждые 2-5 минут)');
        }

        if (errorCount > 0) {
            console.log(`\n⚠️  ${errorCount} пользователей не удалось восстановить - требуется ручное вмешательство`);
        }

        // 7. ФИНАЛЬНАЯ ПРОВЕРКА
        console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА СИНХРОНИЗАЦИИ:');
        const { data: finalCheck, error: finalError } = await supabase
            .from('ton_farming_data')
            .select('user_id', { count: 'exact' });

        if (!finalError) {
            console.log(`📊 Общее количество записей в ton_farming_data после восстановления: ${finalCheck?.length || 0}`);
        }

    } catch (error) {
        console.error('❌ Критическая ошибка восстановления:', error);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('🎯 ПРОЦЕСС ВОССТАНОВЛЕНИЯ ЗАВЕРШЕН');
    console.log('=' .repeat(80));
}

// Запуск восстановления
restoreMissingTonFarmingUsers().then(() => {
    console.log('\n✅ Скрипт восстановления выполнен успешно');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка скрипта:', error);
    process.exit(1);
});