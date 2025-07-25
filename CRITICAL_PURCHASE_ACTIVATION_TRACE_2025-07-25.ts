/**
 * КРИТИЧЕСКАЯ ТРАССИРОВКА ПОКУПОК И АКТИВАЦИИ - 25 июля 2025
 * Поиск реальных покупок BOOST_PURCHASE и анализ цепочки активации
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function criticalPurchaseActivationTrace() {
    console.log('\n🔍 КРИТИЧЕСКАЯ ТРАССИРОВКА ПОКУПОК И АКТИВАЦИИ');
    console.log('=' .repeat(70));
    
    try {
        // ШАГ 1: Поиск РЕАЛЬНЫХ покупок BOOST_PURCHASE
        console.log('\n📊 ШАГ 1: ПОИСК РЕАЛЬНЫХ ПОКУПОК BOOST_PURCHASE');
        console.log('-' .repeat(50));
        
        const { data: boostPurchases, error: purchaseError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (purchaseError) {
            console.log('❌ Ошибка получения BOOST_PURCHASE:', purchaseError);
        } else {
            console.log(`✅ Найдено ${boostPurchases?.length || 0} покупок BOOST_PURCHASE`);
            
            if (boostPurchases && boostPurchases.length > 0) {
                console.log('\n📋 АНАЛИЗ КАЖДОЙ ПОКУПКИ:');
                
                for (const purchase of boostPurchases) {
                    console.log(`\n🛒 ПОКУПКА ${purchase.id}:`);
                    console.log(`   👤 User ID: ${purchase.user_id}`);
                    console.log(`   💰 Сумма: ${purchase.amount} ${purchase.currency}`);
                    console.log(`   📅 Время: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                    console.log(`   📝 Описание: ${purchase.description}`);
                    console.log(`   ✅ Статус: ${purchase.status}`);
                    
                    if (purchase.metadata) {
                        console.log(`   📋 Metadata:`, purchase.metadata);
                    }
                    
                    // Проверяем есть ли соответствующая запись в ton_farming_data
                    const { data: farmingRecord, error: farmingError } = await supabase
                        .from('ton_farming_data')
                        .select('*')
                        .eq('user_id', purchase.user_id.toString())
                        .single();
                        
                    if (farmingError) {
                        console.log(`   ❌ FARMING ЗАПИСЬ ОТСУТСТВУЕТ!`);
                        console.log(`      Ошибка: ${farmingError.message}`);
                        
                        // Проверяем запись в users таблице
                        const { data: userRecord, error: userError } = await supabase
                            .from('users')
                            .select('id, ton_boost_package, ton_boost_rate, balance_ton, created_at')
                            .eq('id', purchase.user_id)
                            .single();
                            
                        if (userError) {
                            console.log(`      ❌ USER ЗАПИСЬ ТОЖЕ НЕ НАЙДЕНА: ${userError.message}`);
                        } else {
                            console.log(`      ℹ️ USER ЗАПИСЬ НАЙДЕНА:`);
                            console.log(`         TON Boost Package: ${userRecord.ton_boost_package}`);
                            console.log(`         TON Boost Rate: ${userRecord.ton_boost_rate}`);
                            console.log(`         Balance TON: ${userRecord.balance_ton}`);
                            console.log(`         Created: ${new Date(userRecord.created_at).toLocaleString('ru-RU')}`);
                            
                            if (userRecord.ton_boost_package > 0) {
                                console.log(`      🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: USER имеет активный boost, но НЕТ farming записи!`);
                            } else {
                                console.log(`      ⚠️ User не имеет активного boost пакета`);
                            }
                        }
                    } else {
                        console.log(`   ✅ FARMING ЗАПИСЬ НАЙДЕНА:`);
                        console.log(`      Balance: ${farmingRecord.farming_balance} TON`);
                        console.log(`      Rate: ${farmingRecord.farming_rate}`);
                        console.log(`      Package ID: ${farmingRecord.boost_package_id}`);
                        console.log(`      Created: ${new Date(farmingRecord.created_at).toLocaleString('ru-RU')}`);
                        
                        // Сравниваем время покупки и создания farming записи
                        const purchaseTime = new Date(purchase.created_at).getTime();
                        const farmingTime = new Date(farmingRecord.created_at).getTime();
                        const timeDiffMinutes = Math.abs(purchaseTime - farmingTime) / 1000 / 60;
                        
                        console.log(`      ⏱️ Разница во времени: ${timeDiffMinutes.toFixed(2)} минут`);
                        
                        if (timeDiffMinutes > 5) {
                            console.log(`      ⚠️ БОЛЬШАЯ РАЗНИЦА - возможно ручное восстановление`);
                        } else {
                            console.log(`      ✅ Создано синхронно с покупкой`);
                        }
                    }
                }
            } else {
                console.log('❌ НЕТ ПОКУПОК BOOST_PURCHASE - СИСТЕМА НЕ СОЗДАЕТ ПОКУПКИ!');
            }
        }
        
        // ШАГ 2: Поиск покупок в других типах транзакций
        console.log('\n📊 ШАГ 2: ПОИСК ПОКУПОК В ДРУГИХ ТИПАХ ТРАНЗАКЦИЙ');
        console.log('-' .repeat(50));
        
        const { data: allTransactions, error: allError } = await supabase
            .from('transactions')
            .select('user_id, type, amount, description, status, created_at, metadata')
            .ilike('description', '%TON Boost%')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (allError) {
            console.log('❌ Ошибка получения всех транзакций:', allError);
        } else {
            console.log(`✅ Найдено ${allTransactions?.length || 0} транзакций с "TON Boost" в описании`);
            
            for (const transaction of allTransactions || []) {
                console.log(`\n📄 ТРАНЗАКЦИЯ:`);
                console.log(`   Type: ${transaction.type}`);
                console.log(`   User: ${transaction.user_id}`);
                console.log(`   Amount: ${transaction.amount}`);
                console.log(`   Description: ${transaction.description}`);
                console.log(`   Time: ${new Date(transaction.created_at).toLocaleString('ru-RU')}`);
                
                if (transaction.metadata) {
                    console.log(`   Metadata:`, transaction.metadata);
                }
            }
        }
        
        // ШАГ 3: Анализ пользователей с активными boost но свежими created_at
        console.log('\n📊 ШАГ 3: ПОЛЬЗОВАТЕЛИ С НЕДАВНИМИ АКТИВАЦИЯМИ');
        console.log('-' .repeat(50));
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: recentActiveUsers, error: recentError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_rate, balance_ton, created_at')
            .gt('ton_boost_package', 0)
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false });
            
        if (recentError) {
            console.log('❌ Ошибка получения недавних пользователей:', recentError);
        } else {
            console.log(`✅ Найдено ${recentActiveUsers?.length || 0} пользователей с активным boost за 24 часа`);
            
            for (const user of recentActiveUsers || []) {
                console.log(`\n👤 USER ${user.id}:`);
                console.log(`   TON Boost Package: ${user.ton_boost_package}`);
                console.log(`   TON Boost Rate: ${user.ton_boost_rate}`);
                console.log(`   Balance TON: ${user.balance_ton}`);
                console.log(`   Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
                
                // Проверяем farming запись
                const { data: userFarmingRecord } = await supabase
                    .from('ton_farming_data')
                    .select('farming_balance, created_at, boost_package_id')
                    .eq('user_id', user.id.toString())
                    .single();
                    
                if (userFarmingRecord) {
                    console.log(`   ✅ Farming запись ЕСТЬ:`);
                    console.log(`      Balance: ${userFarmingRecord.farming_balance} TON`);
                    console.log(`      Package: ${userFarmingRecord.boost_package_id}`);
                    console.log(`      Создана: ${new Date(userFarmingRecord.created_at).toLocaleString('ru-RU')}`);
                } else {
                    console.log(`   ❌ Farming запись ОТСУТСТВУЕТ - НОВАЯ ПРОБЛЕМА!`);
                    
                    // Ищем связанные транзакции для этого пользователя
                    const { data: userTransactions } = await supabase
                        .from('transactions')
                        .select('type, amount, description, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(5);
                        
                    if (userTransactions && userTransactions.length > 0) {
                        console.log(`   📋 Последние транзакции пользователя:`);
                        for (const tx of userTransactions) {
                            console.log(`      - ${tx.type}: ${tx.amount} (${tx.description})`);
                        }
                    } else {
                        console.log(`   ⚠️ Нет транзакций для пользователя - возможно пропущенная покупка`);
                    }
                }
            }
        }
        
        // ШАГ 4: Анализ boost_packages таблицы
        console.log('\n📊 ШАГ 4: АНАЛИЗ BOOST PACKAGES');
        console.log('-' .repeat(50));
        
        const { data: boostPackagesData, error: packagesError } = await supabase
            .from('boost_packages')
            .select('*')
            .order('id', { ascending: true });
            
        if (packagesError) {
            console.log(`❌ Таблица boost_packages НЕ ДОСТУПНА: ${packagesError.message}`);
            console.log('🚨 ЭТО МОЖЕТ БЫТЬ ПРИЧИНОЙ ПРОБЛЕМ АКТИВАЦИИ!');
        } else {
            console.log(`✅ Найдено ${boostPackagesData?.length || 0} boost пакетов`);
            for (const pkg of boostPackagesData || []) {
                console.log(`   📦 Пакет ${pkg.id}: ${pkg.name}`);
                console.log(`      Min Amount: ${pkg.min_amount} TON`);
                console.log(`      Daily Rate: ${pkg.daily_rate}`);
                console.log(`      Duration: ${pkg.duration_days} дней`);
            }
        }

        console.log('\n📈 КРИТИЧЕСКИЕ ВЫВОДЫ:');
        console.log('=' .repeat(70));
        
        if (!boostPurchases || boostPurchases.length === 0) {
            console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА #1: НЕТ ПОКУПОК BOOST_PURCHASE');
            console.log('   - Система не создает транзакции покупок');
            console.log('   - purchaseWithInternalWallet() не записывает BOOST_PURCHASE');
            console.log('   - Активация происходит без регистрации покупки');
        }
        
        if (packagesError) {
            console.log('🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА #2: ТАБЛИЦА BOOST_PACKAGES НЕ ДОСТУПНА');
            console.log('   - TonFarmingRepository не может получить данные пакета');
            console.log('   - activateBoost() прерывается на этапе получения пакета');
        }
        
        if (recentActiveUsers && recentActiveUsers.length > 0) {
            const missedCount = recentActiveUsers.filter(u => !u.farming_balance).length;
            if (missedCount > 0) {
                console.log(`🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА #3: ${missedCount} НОВЫХ ПОЛЬЗОВАТЕЛЕЙ БЕЗ FARMING ЗАПИСЕЙ`);
                console.log('   - Система активации НЕ РАБОТАЕТ для новых покупок');
                console.log('   - TonFarmingRepository.activateBoost() не создает записи');
            }
        }
        
        console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:');
        console.log('1. 🔧 Проверить доступность boost_packages таблицы');
        console.log('2. 🔧 Исправить создание BOOST_PURCHASE транзакций');
        console.log('3. 🔧 Добавить логирование в TonFarmingRepository.activateBoost()');
        console.log('4. 🔧 Протестировать покупку от начала до конца');

    } catch (error) {
        console.error('❌ Критическая ошибка трассировки:', error);
    }
}

// Запуск трассировки
criticalPurchaseActivationTrace().then(() => {
    console.log('\n✅ Критическая трассировка покупок завершена');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});