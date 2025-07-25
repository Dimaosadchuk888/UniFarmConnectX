/**
 * ПРОВЕРКА НОВЫХ TON BOOST ПОЛЬЗОВАТЕЛЕЙ - 25 июля 2025
 * Скрипт для проверки активности новых пользователей и корректности работы системы
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Загружаем переменные окружения
config();

// Получаем Supabase конфигурацию из переменных окружения
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface BoostPurchase {
    user_id: number;
    package_id: number;
    amount: number;
    status: string;
    created_at: string;
    updated_at: string;
}

interface TonFarmingData {
    user_id: string;
    boost_package_id: number;
    farming_balance: number;
    rate_ton_per_second: number;
    created_at: string;
}

interface UserData {
    id: number;
    ton_boost_package: number | null;
    ton_boost_package_id: number | null;
    ton_boost_rate: number | null;
    balance_ton: number;
    updated_at: string;
}

async function checkNewTonBoostUsers() {
    console.log('\n🔍 ПРОВЕРКА НОВЫХ TON BOOST ПОЛЬЗОВАТЕЛЕЙ');
    console.log('=' .repeat(60));
    
    try {
        // 1. Проверяем последние покупки TON Boost (за последние 2 часа)
        console.log('\n📦 ПОСЛЕДНИЕ ПОКУПКИ TON BOOST (за 2 часа):');
        const { data: recentPurchases, error: purchasesError } = await supabase
            .from('boost_purchases')
            .select('*')
            .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(15);

        if (purchasesError) {
            console.error('❌ Ошибка получения покупок:', purchasesError);
            return;
        }

        if (!recentPurchases || recentPurchases.length === 0) {
            console.log('ℹ️  Новых покупок за последние 2 часа не найдено');
        } else {
            console.log(`✅ Найдено ${recentPurchases.length} новых покупок:`);
            recentPurchases.forEach((purchase: any, index) => {
                console.log(`  ${index + 1}. User ${purchase.user_id}: Package ${purchase.boost_package_id || purchase.package_id}, ${purchase.amount} TON, Status: ${purchase.status}`);
                console.log(`     Создано: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                console.log(`     Полная запись:`, purchase);
            });
        }

        // 2. Проверяем записи в ton_farming_data для новых пользователей
        console.log('\n🌱 ПРОВЕРКА TON_FARMING_DATA:');
        if (recentPurchases && recentPurchases.length > 0) {
            const userIds = recentPurchases.map((p: BoostPurchase) => p.user_id.toString());
            
            const { data: farmingData, error: farmingError } = await supabase
                .from('ton_farming_data')
                .select('user_id, boost_package_id, farming_balance, rate_ton_per_second, created_at')
                .in('user_id', userIds);

            if (farmingError) {
                console.error('❌ Ошибка получения farming данных:', farmingError);
            } else {
                console.log(`✅ Найдено ${farmingData?.length || 0} записей в ton_farming_data:`);
                farmingData?.forEach((data: TonFarmingData, index) => {
                    console.log(`  ${index + 1}. User ${data.user_id}: Balance ${data.farming_balance} TON, Rate: ${data.rate_ton_per_second}/сек`);
                    console.log(`     Package ID: ${data.boost_package_id}, Created: ${new Date(data.created_at).toLocaleString('ru-RU')}`);
                });

                // Проверяем соответствие покупок и farming записей
                console.log('\n🔄 ПРОВЕРКА СООТВЕТСТВИЯ:');
                const purchaseUserIds = recentPurchases.map((p: BoostPurchase) => p.user_id.toString());
                const farmingUserIds = farmingData?.map((f: TonFarmingData) => f.user_id) || [];
                
                const missingFarmingData = purchaseUserIds.filter(userId => !farmingUserIds.includes(userId));
                if (missingFarmingData.length > 0) {
                    console.log(`⚠️  ВНИМАНИЕ: У пользователей ${missingFarmingData.join(', ')} есть покупки, но НЕТ farming данных!`);
                } else {
                    console.log('✅ Все пользователи с покупками имеют farming данные');
                }
            }
        }

        // 3. Проверяем обновления в таблице users
        console.log('\n👥 ПРОВЕРКА ТАБЛИЦЫ USERS:');
        const { data: activeUsers, error: usersError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate, balance_ton, updated_at')
            .not('ton_boost_package', 'is', null)
            .gte('updated_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
            .order('updated_at', { ascending: false })
            .limit(10);

        if (usersError) {
            console.error('❌ Ошибка получения данных пользователей:', usersError);
        } else {
            console.log(`✅ Найдено ${activeUsers?.length || 0} активных TON Boost пользователей:`);
            activeUsers?.forEach((user: UserData, index) => {
                console.log(`  ${index + 1}. User ${user.id}: Package ${user.ton_boost_package}, Rate: ${user.ton_boost_rate}, Balance: ${user.balance_ton} TON`);
                console.log(`     Package ID: ${user.ton_boost_package_id}, Updated: ${new Date(user.updated_at).toLocaleString('ru-RU')}`);
            });
        }

        // 4. Общая статистика активности
        console.log('\n📊 ОБЩАЯ СТАТИСТИКА:');
        const { data: totalActiveUsers, error: statsError } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .not('ton_boost_package', 'is', null);

        if (!statsError && totalActiveUsers) {
            console.log(`✅ Всего активных TON Boost пользователей: ${totalActiveUsers.length}`);
        }

        // 5. Проверка последних доходов от TON фарминга
        console.log('\n💰 ПОСЛЕДНИЕ TON FARMING ДОХОДЫ:');
        const { data: recentIncomes, error: incomesError } = await supabase
            .from('transactions')
            .select('user_id, amount, description, created_at')
            .eq('type', 'FARMING_REWARD')
            .eq('currency', 'TON')
            .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // за 30 минут
            .order('created_at', { ascending: false })
            .limit(10);

        if (incomesError) {
            console.error('❌ Ошибка получения доходов:', incomesError);
        } else {
            console.log(`✅ Последние TON доходы (за 30 мин): ${recentIncomes?.length || 0}`);
            recentIncomes?.forEach((income, index) => {
                console.log(`  ${index + 1}. User ${income.user_id}: +${income.amount} TON`);
                console.log(`     ${income.description}, ${new Date(income.created_at).toLocaleString('ru-RU')}`);
            });
        }

    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 ПРОВЕРКА ЗАВЕРШЕНА');
}

// Запуск проверки
checkNewTonBoostUsers().then(() => {
    console.log('\n✅ Скрипт проверки выполнен успешно');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка скрипта:', error);
    process.exit(1);
});