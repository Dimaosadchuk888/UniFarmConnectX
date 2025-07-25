/**
 * КРИТИЧЕСКАЯ ДИАГНОСТИКА СИНХРОНИЗАЦИИ TON BOOST - 25 июля 2025
 * Проверка пользователей с депозитами в users, но БЕЗ записей в ton_farming_data
 * ТОЛЬКО ДИАГНОСТИКА, БЕЗ ИЗМЕНЕНИЙ КОДА!
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
    ton_boost_package: number | null;
    ton_boost_package_id: number | null;
    ton_boost_rate: number | null;
    balance_ton: number;
    created_at: string;
}

interface TonFarmingRecord {
    user_id: string;
    boost_package_id: number;
    farming_balance: number;
    rate_ton_per_second: number;
    created_at: string;
}

interface BoostPurchaseRecord {
    id: number;
    user_id: number;
    amount: number;
    status: string;
    created_at: string;
}

async function criticalTonBoostSyncDiagnostic() {
    console.log('\n🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА СИНХРОНИЗАЦИИ TON BOOST');
    console.log('=' .repeat(70));
    
    try {
        // 1. ПОЛУЧАЕМ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ С TON BOOST ПАКЕТАМИ
        console.log('\n📊 ШАГ 1: ПОЛЬЗОВАТЕЛИ С TON BOOST В ТАБЛИЦЕ USERS');
        const { data: usersWithTonBoost, error: usersError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_package_id, ton_boost_rate, balance_ton, created_at')
            .not('ton_boost_package', 'is', null)
            .order('id', { ascending: true });

        if (usersError) {
            console.error('❌ Ошибка получения пользователей:', usersError);
            return;
        }

        console.log(`✅ Найдено ${usersWithTonBoost?.length || 0} пользователей с TON Boost пакетами`);

        // 2. ПОЛУЧАЕМ ВСЕ ЗАПИСИ ИЗ TON_FARMING_DATA
        console.log('\n📊 ШАГ 2: ЗАПИСИ В ТАБЛИЦЕ TON_FARMING_DATA');
        const { data: farmingRecords, error: farmingError } = await supabase
            .from('ton_farming_data')
            .select('*')
            .order('user_id', { ascending: true });

        if (farmingError) {
            console.error('❌ Ошибка получения farming данных:', farmingError);
            return;
        }

        console.log(`✅ Найдено ${farmingRecords?.length || 0} записей в ton_farming_data`);

        // 3. ПОИСК НЕСИНХРОНИЗИРОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ
        console.log('\n🔍 ШАГ 3: ПОИСК ПОЛЬЗОВАТЕЛЕЙ БЕЗ СИНХРОНИЗАЦИИ');
        
        if (!usersWithTonBoost || !farmingRecords) {
            console.log('⚠️ Нет данных для анализа');
            return;
        }

        const farmingUserIds = new Set(farmingRecords.map(r => r.user_id));
        const missingUsers = usersWithTonBoost.filter(user => 
            !farmingUserIds.has(user.id.toString())
        );

        console.log(`🚨 НАЙДЕНО ${missingUsers.length} ПОЛЬЗОВАТЕЛЕЙ С ДЕПОЗИТАМИ БЕЗ FARMING ЗАПИСЕЙ:`);
        
        if (missingUsers.length > 0) {
            console.log('\n' + '⚠️ '.repeat(35));
            console.log('КРИТИЧЕСКИЕ ПРОПУЩЕННЫЕ ПОЛЬЗОВАТЕЛИ:');
            console.log('⚠️ '.repeat(35));
            
            missingUsers.forEach((user, index) => {
                console.log(`\n${index + 1}. 🚨 USER ID ${user.id}:`);
                console.log(`   📦 TON Boost Package: ${user.ton_boost_package}`);
                console.log(`   🆔 Package ID: ${user.ton_boost_package_id}`);
                console.log(`   ⚡ Rate: ${user.ton_boost_rate} TON/сек`);
                console.log(`   💰 Balance TON: ${user.balance_ton}`);
                console.log(`   📅 Зарегистрирован: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
                console.log(`   ❌ НЕТ ЗАПИСИ В ton_farming_data - НЕ ПОЛУЧАЕТ ДОХОДЫ!`);
            });
        }

        // 4. ПРОВЕРЯЕМ ПОСЛЕДНИЕ ПОКУПКИ (расширенный поиск)
        console.log('\n📦 ШАГ 4: ПРОВЕРКА ПОСЛЕДНИХ ПОКУПОК TON BOOST');
        
        // Проверяем покупки за последние 24 часа
        const { data: recentPurchases, error: purchasesError } = await supabase
            .from('boost_purchases')
            .select('*')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });

        if (!purchasesError && recentPurchases && recentPurchases.length > 0) {
            console.log(`✅ Найдено ${recentPurchases.length} покупок за 24 часа:`);
            recentPurchases.forEach((purchase: any, index) => {
                const isMissing = missingUsers.some(u => u.id === purchase.user_id);
                console.log(`  ${index + 1}. User ${purchase.user_id}: ${purchase.amount} TON, Status: ${purchase.status}`);
                console.log(`     Время: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                if (isMissing) {
                    console.log(`     🚨 ЭТОТ ПОЛЬЗОВАТЕЛЬ В СПИСКЕ ПРОПУЩЕННЫХ!`);
                }
            });
        } else {
            console.log('ℹ️ Покупок за 24 часа не найдено');
        }

        // 5. ПРОВЕРЯЕМ ДОХОДЫ ДЛЯ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ
        if (missingUsers.length > 0) {
            console.log('\n💰 ШАГ 5: ПРОВЕРКА ДОХОДОВ ПРОПУЩЕННЫХ ПОЛЬЗОВАТЕЛЕЙ');
            
            const missingUserIds = missingUsers.map(u => u.id);
            const { data: incomes, error: incomesError } = await supabase
                .from('transactions')
                .select('user_id, amount, description, created_at')
                .eq('type', 'FARMING_REWARD')
                .eq('currency', 'TON')
                .in('user_id', missingUserIds)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });

            if (!incomesError && incomes) {
                console.log(`📊 Доходы за 24 часа для пропущенных пользователей: ${incomes.length}`);
                if (incomes.length === 0) {
                    console.log('🚨 ПОДТВЕРЖДЕНО: Пропущенные пользователи НЕ ПОЛУЧАЮТ ДОХОДЫ!');
                } else {
                    incomes.forEach(income => {
                        console.log(`  User ${income.user_id}: +${income.amount} TON, ${new Date(income.created_at).toLocaleString('ru-RU')}`);
                    });
                }
            }
        }

        // 6. ОБЩИЕ СТАТИСТИКИ
        console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
        console.log(`👥 Всего пользователей с TON Boost: ${usersWithTonBoost.length}`);
        console.log(`✅ Синхронизированы с farming: ${usersWithTonBoost.length - missingUsers.length}`);
        console.log(`🚨 ПРОПУЩЕНЫ (НЕ ПОЛУЧАЮТ ДОХОДЫ): ${missingUsers.length}`);
        console.log(`📊 Процент успешной синхронизации: ${((usersWithTonBoost.length - missingUsers.length) / usersWithTonBoost.length * 100).toFixed(1)}%`);

        if (missingUsers.length > 0) {
            console.log('\n' + '🚨'.repeat(35));
            console.log('ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ!');
            console.log('🚨'.repeat(35));
            console.log('Пользователи имеют депозиты, но не получают доходы!');
            console.log('Необходимо создать записи в ton_farming_data для этих пользователей.');
        }

    } catch (error) {
        console.error('❌ Критическая ошибка диагностики:', error);
    }

    console.log('\n' + '=' .repeat(70));
    console.log('🎯 ДИАГНОСТИКА ЗАВЕРШЕНА');
}

// Запуск диагностики
criticalTonBoostSyncDiagnostic().then(() => {
    console.log('\n✅ Диагностический скрипт выполнен успешно');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка скрипта:', error);
    process.exit(1);
});