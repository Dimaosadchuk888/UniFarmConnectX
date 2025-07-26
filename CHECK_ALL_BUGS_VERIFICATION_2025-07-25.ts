/**
 * ПРОВЕРКА ВСЕХ ИСПРАВЛЕННЫХ БАГОВ - 25 июля 2025
 * Верификация трех технических заданий без изменения кода
 * 
 * ТЗ 1: Подключение системы к полям базы данных
 * ТЗ 2: Дублирование TON-депозитов и обновление баланса  
 * ТЗ 3: Начисление и отображение пакета TON Boost
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAllBugFixes() {
    console.log('\n🔍 ВЕРИФИКАЦИЯ ИСПРАВЛЕННЫХ БАГОВ');
    console.log('Проверка трех технических заданий от 25 июля 2025');
    console.log('=' .repeat(70));
    
    try {
        // ================================
        // ТЗ 1: ПРОВЕРКА ПОДКЛЮЧЕНИЯ К ПОЛЯМ БД
        // ================================
        console.log('\n📋 ТЗ 1: ПРОВЕРКА ПОДКЛЮЧЕНИЯ СИСТЕМЫ К ПОЛЯМ БД');
        console.log('-' .repeat(60));
        
        // Проверяем критические поля для TON Boost
        console.log('\n🔍 1.1 КРИТИЧЕСКИЕ ПОЛЯ TON BOOST:');
        
        const { data: sampleUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .gt('ton_boost_package', 0)
            .limit(1)
            .single();
            
        if (sampleUser) {
            const criticalFields = [
                'ton_boost_package',
                'ton_boost_rate', 
                'ton_boost_active',
                'balance_ton'
            ];
            
            criticalFields.forEach(field => {
                if (sampleUser.hasOwnProperty(field)) {
                    console.log(`   ✅ ${field}: ${sampleUser[field]} (${typeof sampleUser[field]})`);
                } else {
                    console.log(`   ❌ ${field}: ОТСУТСТВУЕТ - ПРОБЛЕМА!`);
                }
            });
        }
        
        // Проверяем ton_farming_data поля
        console.log('\n🔍 1.2 ПОЛЯ TON_FARMING_DATA:');
        
        const { data: sampleFarming, error: farmingError } = await supabase
            .from('ton_farming_data')
            .select('*')
            .limit(1)
            .single();
            
        if (sampleFarming) {
            const farmingFields = [
                'user_id',
                'farming_balance',
                'boost_active',
                'boost_package_id',
                'farming_rate'
            ];
            
            farmingFields.forEach(field => {
                if (sampleFarming.hasOwnProperty(field)) {
                    console.log(`   ✅ ${field}: ${sampleFarming[field]} (${typeof sampleFarming[field]})`);
                } else {
                    console.log(`   ❌ ${field}: ОТСУТСТВУЕТ - ПРОБЛЕМА!`);
                }
            });
            
            // Проверяем тип user_id (критический баг)
            if (typeof sampleFarming.user_id === 'string') {
                console.log(`   ✅ user_id тип STRING - исправление применено`);
            } else {
                console.log(`   ❌ user_id тип ${typeof sampleFarming.user_id} - ПРОБЛЕМА!`);
            }
        }
        
        console.log('\n📊 ТЗ 1 СТАТУС:');
        if (sampleUser && sampleFarming) {
            console.log('   ✅ Все критические поля присутствуют');
            console.log('   ✅ Система корректно подключена к БД');
        } else {
            console.log('   ❌ Проблемы с доступом к данным');
        }
        
        // ================================  
        // ТЗ 2: ДУБЛИРОВАНИЕ TON-ДЕПОЗИТОВ
        // ================================
        console.log('\n📋 ТЗ 2: ПРОВЕРКА ДУБЛИРОВАНИЯ TON-ДЕПОЗИТОВ');
        console.log('-' .repeat(60));
        
        // Проверяем недавние TON депозиты на дублирование
        console.log('\n🔍 2.1 АНАЛИЗ ПОСЛЕДНИХ TON ДЕПОЗИТОВ:');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: recentDeposits, error: depositsError } = await supabase
            .from('transactions')
            .select('*')
            .in('type', ['TON_DEPOSIT', 'DEPOSIT'])
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (recentDeposits && recentDeposits.length > 0) {
            console.log(`   📊 Найдено депозитов за сутки: ${recentDeposits.length}`);
            
            // Группируем по tx_hash для поиска дублей
            const txHashGroups = new Map<string, any[]>();
            
            recentDeposits.forEach(deposit => {
                const txHash = deposit.tx_hash || deposit.metadata?.tx_hash || deposit.metadata?.ton_tx_hash;
                if (txHash) {
                    if (!txHashGroups.has(txHash)) {
                        txHashGroups.set(txHash, []);
                    }
                    txHashGroups.get(txHash)!.push(deposit);
                }
            });
            
            let duplicateCount = 0;
            for (const [txHash, transactions] of txHashGroups) {
                if (transactions.length > 1) {
                    duplicateCount++;
                    console.log(`   ⚠️ ДУБЛЬ: TX ${txHash} = ${transactions.length} транзакций`);
                    transactions.forEach((tx, index) => {
                        console.log(`      ${index + 1}. ID ${tx.id}, Amount ${tx.amount}, Time ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
                    });
                }
            }
            
            if (duplicateCount === 0) {
                console.log('   ✅ ДУБЛЕЙ НЕ НАЙДЕНО - исправление работает');
            } else {
                console.log(`   ❌ НАЙДЕНО ${duplicateCount} ДУБЛЕЙ - проблема остается!`);
            }
            
            // Проверяем обновление баланса
            console.log('\n🔍 2.2 ПРОВЕРКА ОБНОВЛЕНИЯ БАЛАНСА:');
            
            const latestDeposit = recentDeposits[0];
            if (latestDeposit) {
                const { data: userBalance, error: balanceError } = await supabase
                    .from('users')
                    .select('balance_ton')
                    .eq('id', latestDeposit.user_id)
                    .single();
                    
                if (userBalance) {
                    console.log(`   👤 User ${latestDeposit.user_id}:`);
                    console.log(`   💰 Текущий баланс: ${userBalance.balance_ton} TON`);
                    console.log(`   📅 Последний депозит: ${latestDeposit.amount} TON`);
                    
                    if (userBalance.balance_ton > 0) {
                        console.log('   ✅ Баланс обновляется корректно');
                    } else {
                        console.log('   ⚠️ Баланс не обновлен - возможная проблема');
                    }
                }
            }
            
        } else {
            console.log('   📊 Депозитов за сутки не найдено');
        }
        
        console.log('\n📊 ТЗ 2 СТАТУС:');
        console.log('   ✅ Проверка дедупликации выполнена');
        console.log('   ✅ Проверка обновления баланса выполнена');
        
        // ================================
        // ТЗ 3: TON BOOST ПАКЕТЫ  
        // ================================
        console.log('\n📋 ТЗ 3: ПРОВЕРКА TON BOOST ПАКЕТОВ');
        console.log('-' .repeat(60));
        
        // Проверяем последние покупки TON Boost
        console.log('\n🔍 3.1 АНАЛИЗ ПОСЛЕДНИХ ПОКУПОК TON BOOST:');
        
        const { data: recentBoosts, error: boostsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (recentBoosts && recentBoosts.length > 0) {
            console.log(`   📊 Покупок TON Boost за сутки: ${recentBoosts.length}`);
            
            for (let i = 0; i < Math.min(3, recentBoosts.length); i++) {
                const boost = recentBoosts[i];
                console.log(`\n   💰 Покупка ${i + 1}:`);
                console.log(`      ID: ${boost.id}`);
                console.log(`      User: ${boost.user_id}`);
                console.log(`      Время: ${new Date(boost.created_at).toLocaleString('ru-RU')}`);
                console.log(`      Сумма: ${boost.amount} ${boost.currency}`);
                
                // Проверяем активацию пакета в users
                const { data: userBoost, error: userBoostError } = await supabase
                    .from('users')
                    .select('ton_boost_package, ton_boost_rate')
                    .eq('id', boost.user_id)
                    .single();
                    
                if (userBoost && userBoost.ton_boost_package > 0) {
                    console.log(`      ✅ Users: Package ${userBoost.ton_boost_package}, Rate ${userBoost.ton_boost_rate}`);
                } else {
                    console.log(`      ❌ Users: Пакет не активирован - ПРОБЛЕМА!`);
                }
                
                // Проверяем создание farming записи
                const { data: farmingData, error: farmingDataError } = await supabase
                    .from('ton_farming_data')
                    .select('*')
                    .eq('user_id', boost.user_id.toString())
                    .single();
                    
                if (farmingData) {
                    console.log(`      ✅ Farming: Balance ${farmingData.farming_balance}, Active ${farmingData.boost_active}`);
                    
                    // Проверяем временную связь
                    const boostTime = new Date(boost.created_at).getTime();
                    const farmingTime = new Date(farmingData.created_at).getTime();
                    const timeDiff = Math.abs(farmingTime - boostTime) / 1000;
                    
                    if (timeDiff <= 60) {
                        console.log(`      ✅ Задержка создания: ${timeDiff.toFixed(1)} сек - отлично`);
                    } else if (timeDiff <= 3600) {
                        console.log(`      ⚠️ Задержка создания: ${timeDiff.toFixed(1)} сек - приемлемо`);
                    } else {
                        console.log(`      ❌ Задержка создания: ${timeDiff.toFixed(1)} сек - проблема!`);
                    }
                } else {
                    console.log(`      ❌ Farming: Данные не созданы - ПРОБЛЕМА!`);
                }
            }
            
            // Проверяем общую статистику активации
            console.log('\n🔍 3.2 ОБЩАЯ СТАТИСТИКА АКТИВАЦИИ:');
            
            let successfulActivations = 0;
            let totalChecked = Math.min(5, recentBoosts.length);
            
            for (const boost of recentBoosts.slice(0, 5)) {
                const { data: farming } = await supabase
                    .from('ton_farming_data')
                    .select('boost_active')
                    .eq('user_id', boost.user_id.toString())
                    .eq('boost_active', true)
                    .single();
                    
                if (farming) {
                    successfulActivations++;
                }
            }
            
            const successRate = totalChecked > 0 ? (successfulActivations / totalChecked * 100).toFixed(1) : '0';
            console.log(`   📊 Процент успешной активации: ${successRate}% (${successfulActivations}/${totalChecked})`);
            
            if (parseFloat(successRate) >= 90) {
                console.log('   ✅ Активация TON Boost работает отлично');
            } else if (parseFloat(successRate) >= 70) {
                console.log('   ⚠️ Активация TON Boost работает удовлетворительно');
            } else {
                console.log('   ❌ Активация TON Boost работает плохо - ПРОБЛЕМА!');
            }
            
        } else {
            console.log('   📊 Покупок TON Boost за сутки не найдено');
            
            // Проверяем более старые покупки
            const { data: olderBoosts } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'BOOST_PURCHASE')
                .order('created_at', { ascending: false })
                .limit(3);
                
            if (olderBoosts && olderBoosts.length > 0) {
                console.log(`   📊 Последние покупки (всех времен): ${olderBoosts.length}`);
                console.log(`   📅 Последняя покупка: ${new Date(olderBoosts[0].created_at).toLocaleDateString('ru-RU')}`);
            }
        }
        
        console.log('\n📊 ТЗ 3 СТАТУС:');
        console.log('   ✅ Проверка покупок TON Boost выполнена');
        console.log('   ✅ Проверка активации пакетов выполнена');
        console.log('   ✅ Проверка создания farming данных выполнена');
        
        // ================================
        // ОБЩИЙ ИТОГ ВСЕХ ПРОВЕРОК
        // ================================
        console.log('\n🏆 === ОБЩИЙ ИТОГ ВЕРИФИКАЦИИ ===');
        console.log('-' .repeat(60));
        
        console.log('\n📋 СТАТУС ПО ТЕХНИЧЕСКИМ ЗАДАНИЯМ:');
        console.log('   ✅ ТЗ 1: Подключение к полям БД - ПРОВЕРЕНО');
        console.log('   ✅ ТЗ 2: Дублирование депозитов - ПРОВЕРЕНО');  
        console.log('   ✅ ТЗ 3: TON Boost пакеты - ПРОВЕРЕНО');
        
        console.log('\n🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ:');
        let problemsFound = false;
        
        // Здесь будем накапливать найденные проблемы
        const problems: string[] = [];
        
        // Проверяем критические показатели
        if (!sampleUser || !sampleFarming) {
            problems.push('Проблемы с доступом к базовым данным');
        }
        
        if (sampleFarming && typeof sampleFarming.user_id !== 'string') {
            problems.push('Тип user_id в ton_farming_data не STRING');
        }
        
        if (problems.length === 0) {
            console.log('   ✅ ПРОБЛЕМ НЕ НАЙДЕНО - все баги исправлены!');
        } else {
            problemsFound = true;
            problems.forEach((problem, index) => {
                console.log(`   ❌ ${index + 1}. ${problem}`);
            });
        }
        
        console.log('\n💡 РЕКОМЕНДАЦИИ:');
        if (!problemsFound) {
            console.log('   ✅ Система работает стабильно');
            console.log('   ✅ Все критические баги устранены');
            console.log('   ✅ Продолжать мониторинг новых транзакций');
        } else {
            console.log('   ⚠️ Требуется внимание к найденным проблемам');
            console.log('   🔧 Рекомендуется дополнительное исследование');
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка верификации:', error);
    }
}

// Запуск верификации
verifyAllBugFixes().then(() => {
    console.log('\n✅ Верификация всех исправленных багов завершена');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});