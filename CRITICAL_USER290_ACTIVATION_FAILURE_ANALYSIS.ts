/**
 * АНАЛИЗ КОНКРЕТНЫХ ПОЛЬЗОВАТЕЛЕЙ: 290, 278, 191, 184
 * Почему их ton_farming_data записи не создались автоматически?
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Пользователи, которых восстанавливали вручную
const AFFECTED_USERS = [290, 278, 191, 184];

async function analyzeSpecificUserActivationFailures() {
    console.log('\n🔍 АНАЛИЗ КОНКРЕТНЫХ ПОСТРАДАВШИХ ПОЛЬЗОВАТЕЛЕЙ');
    console.log('Пользователи: 290, 278, 191, 184');
    console.log('=' .repeat(70));
    
    try {
        for (const userId of AFFECTED_USERS) {
            console.log(`\n👤 === АНАЛИЗ USER ${userId} ===`);
            
            // 1. Ищем все покупки TON Boost этого пользователя
            const { data: userPurchases, error: purchasesError } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'BOOST_PURCHASE')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });
                
            if (purchasesError) {
                console.error(`❌ Ошибка получения покупок User ${userId}:`, purchasesError);
                continue;
            }
            
            console.log(`💰 ПОКУПКИ TON BOOST: ${userPurchases?.length || 0}`);
            
            if (!userPurchases || userPurchases.length === 0) {
                console.log('⚠️ Покупок TON Boost не найдено');
                continue;
            }
            
            // Анализируем каждую покупку
            userPurchases.forEach((purchase, index) => {
                const purchaseTime = new Date(purchase.created_at);
                console.log(`\n   💰 Покупка ${index + 1}:`);
                console.log(`      ID: ${purchase.id}`);
                console.log(`      Время: ${purchaseTime.toLocaleString('ru-RU')}`);
                console.log(`      Сумма: ${purchase.amount} ${purchase.currency}`);
                if (purchase.metadata) {
                    console.log(`      Package: ${purchase.metadata.package_name} (ID: ${purchase.metadata.boost_package_id})`);
                    console.log(`      Rate: ${purchase.metadata.daily_rate}`);
                }
            });
            
            // 2. Проверяем текущее состояние users таблицы
            const { data: userState, error: userError } = await supabase
                .from('users')
                .select('ton_boost_package, ton_boost_rate, ton_boost_active, created_at')
                .eq('id', userId)
                .single();
                
            if (userState) {
                console.log(`\n   👤 ТЕКУЩЕЕ СОСТОЯНИЕ USERS:`);
                console.log(`      ton_boost_package: ${userState.ton_boost_package}`);
                console.log(`      ton_boost_rate: ${userState.ton_boost_rate}`);
                console.log(`      ton_boost_active: ${userState.ton_boost_active}`);
                console.log(`      Регистрация: ${new Date(userState.created_at).toLocaleDateString('ru-RU')}`);
            }
            
            // 3. Проверяем все ton_farming_data записи
            const { data: farmingRecords, error: farmingError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', userId.toString())
                .order('created_at', { ascending: true });
                
            console.log(`\n   🚜 TON_FARMING_DATA ЗАПИСИ: ${farmingRecords?.length || 0}`);
            
            if (farmingRecords && farmingRecords.length > 0) {
                farmingRecords.forEach((record, index) => {
                    const recordTime = new Date(record.created_at);
                    console.log(`\n      📝 Запись ${index + 1}:`);
                    console.log(`         ID: ${record.id}`);
                    console.log(`         Создана: ${recordTime.toLocaleString('ru-RU')}`);
                    console.log(`         Balance: ${record.farming_balance}`);
                    console.log(`         Rate: ${record.farming_rate}`);
                    console.log(`         Active: ${record.boost_active}`);
                    console.log(`         Package ID: ${record.boost_package_id}`);
                    
                    // Ищем ближайшую покупку по времени
                    if (userPurchases) {
                        let closestPurchase = null;
                        let minTimeDiff = Infinity;
                        
                        userPurchases.forEach(purchase => {
                            const timeDiff = Math.abs(recordTime.getTime() - new Date(purchase.created_at).getTime()) / 1000;
                            if (timeDiff < minTimeDiff) {
                                minTimeDiff = timeDiff;
                                closestPurchase = purchase;
                            }
                        });
                        
                        if (closestPurchase) {
                            console.log(`         🔗 Ближайшая покупка: ID ${closestPurchase.id}`);
                            console.log(`         ⏱️ Временная разница: ${minTimeDiff.toFixed(1)} секунд`);
                            
                            if (minTimeDiff <= 600) {
                                console.log(`         ✅ АВТОМАТИЧЕСКОЕ СОЗДАНИЕ`);
                            } else if (minTimeDiff <= 3600) {
                                console.log(`         ⚠️ ВОЗМОЖНО РУЧНОЕ ВОССТАНОВЛЕНИЕ`);
                            } else {
                                console.log(`         🔄 СТАРАЯ ЗАПИСЬ ИЛИ РУЧНОЕ СОЗДАНИЕ`);
                            }
                        }
                    }
                });
                
                // Проверяем была ли запись создана недавно (последние 2 дня)
                const recentRecords = farmingRecords.filter(record => {
                    const recordTime = new Date(record.created_at);
                    const twoDaysAgo = new Date();
                    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                    return recordTime >= twoDaysAgo;
                });
                
                console.log(`\n   📅 НЕДАВНИЕ ЗАПИСИ (последние 2 дня): ${recentRecords.length}`);
                
                if (recentRecords.length > 0) {
                    console.log(`   🔧 СТАТУС: Пользователь был восстановлен системой`);
                } else {
                    console.log(`   ⚠️ СТАТУС: Старые записи, возможно требует внимания`);
                }
            } else {
                console.log(`   ❌ TON_FARMING_DATA ЗАПИСИ ОТСУТСТВУЮТ!`);
                console.log(`   🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Несмотря на покупки, депозиты не созданы`);
            }
            
            // 4. Анализ временных паттернов
            if (userPurchases && userPurchases.length > 0) {
                console.log(`\n   ⏰ ВРЕМЕННОЙ АНАЛИЗ:`);
                
                const firstPurchase = userPurchases[0];
                const lastPurchase = userPurchases[userPurchases.length - 1];
                const firstTime = new Date(firstPurchase.created_at);
                const lastTime = new Date(lastPurchase.created_at);
                
                console.log(`      📅 Первая покупка: ${firstTime.toLocaleString('ru-RU')}`);
                console.log(`      📅 Последняя покупка: ${lastTime.toLocaleString('ru-RU')}`);
                
                if (userPurchases.length > 1) {
                    const timeSpan = (lastTime.getTime() - firstTime.getTime()) / 1000 / 60; // минуты
                    console.log(`      ⏱️ Период покупок: ${timeSpan.toFixed(1)} минут`);
                    
                    if (timeSpan < 60) {
                        console.log(`      🚨 ВЫСОКАЯ ЧАСТОТА ПОКУПОК - возможные race conditions`);
                    }
                }
                
                // Проверяем покупки в критический период (25 июля до исправления)
                const criticalPeriodStart = new Date('2025-07-25T00:00:00.000Z');
                const criticalPeriodEnd = new Date('2025-07-25T12:00:00.000Z');
                
                const criticalPurchases = userPurchases.filter(purchase => {
                    const purchaseTime = new Date(purchase.created_at);
                    return purchaseTime >= criticalPeriodStart && purchaseTime <= criticalPeriodEnd;
                });
                
                if (criticalPurchases.length > 0) {
                    console.log(`      🎯 ПОКУПКИ В КРИТИЧЕСКИЙ ПЕРИОД: ${criticalPurchases.length}`);
                    console.log(`      💡 Период до исправления типов данных`);
                } else {
                    console.log(`      ✅ Покупки вне критического периода`);
                }
            }
        }
        
        // РАЗДЕЛ: Общий анализ паттернов
        console.log(`\n📊 === ОБЩИЙ АНАЛИЗ ПАТТЕРНОВ ===`);
        console.log('-' .repeat(60));
        
        // Сравниваем всех пострадавших пользователей
        console.log('\n🔍 СРАВНИТЕЛЬНЫЙ АНАЛИЗ:');
        
        let totalPurchases = 0;
        let totalFarmingRecords = 0;
        let usersWithRecentRecords = 0;
        
        for (const userId of AFFECTED_USERS) {
            const { data: purchases } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'BOOST_PURCHASE')
                .eq('user_id', userId);
                
            const { data: farmingRecords } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', userId.toString());
                
            const purchaseCount = purchases?.length || 0;
            const farmingCount = farmingRecords?.length || 0;
            
            totalPurchases += purchaseCount;
            totalFarmingRecords += farmingCount;
            
            if (farmingRecords && farmingRecords.length > 0) {
                const hasRecentRecord = farmingRecords.some(record => {
                    const recordTime = new Date(record.created_at);
                    const twoDaysAgo = new Date();
                    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                    return recordTime >= twoDaysAgo;
                });
                
                if (hasRecentRecord) {
                    usersWithRecentRecords++;
                }
            }
            
            console.log(`   User ${userId}: ${purchaseCount} покупок → ${farmingCount} farming записей`);
        }
        
        console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
        console.log(`   👥 Пострадавших пользователей: ${AFFECTED_USERS.length}`);
        console.log(`   💰 Общее количество покупок: ${totalPurchases}`);
        console.log(`   🚜 Общее количество farming записей: ${totalFarmingRecords}`);
        console.log(`   🔧 Пользователей с недавними записями: ${usersWithRecentRecords}`);
        console.log(`   📊 Процент восстановления: ${((usersWithRecentRecords / AFFECTED_USERS.length) * 100).toFixed(1)}%`);
        
        // ДИАГНОЗ
        console.log(`\n🎯 ДИАГНОЗ ПРОБЛЕМЫ:`);
        
        if (usersWithRecentRecords === AFFECTED_USERS.length) {
            console.log('✅ ВСЕ ПОСТРАДАВШИЕ ПОЛЬЗОВАТЕЛИ ВОССТАНОВЛЕНЫ');
            console.log('💡 Система автоматического восстановления сработала');
        } else if (usersWithRecentRecords === 0) {
            console.log('❌ НИ ОДИН ПОЛЬЗОВАТЕЛЬ НЕ ВОССТАНОВЛЕН АВТОМАТИЧЕСКИ');
            console.log('🚨 ТРЕБУЕТСЯ РУЧНОЕ ВОССТАНОВЛЕНИЕ');
        } else {
            console.log('⚠️ ЧАСТИЧНОЕ ВОССТАНОВЛЕНИЕ');
            console.log(`🔧 ${AFFECTED_USERS.length - usersWithRecentRecords} пользователей требуют внимания`);
        }
        
        console.log(`\n💡 ПРИЧИНА ПРОБЛЕМЫ:`);
        console.log('🔧 Исправление типов данных в TonFarmingRepository.ts:');
        console.log('   ❌ ДО: user_id: parseInt(userId) - INTEGER');
        console.log('   ✅ ПОСЛЕ: user_id: userId.toString() - STRING');
        console.log('💾 База данных ожидала STRING, но получала INTEGER');
        console.log('📝 Результат: INSERT операции завершались неудачно');

    } catch (error) {
        console.error('❌ Критическая ошибка анализа:', error);
    }
}

// Запуск анализа
analyzeSpecificUserActivationFailures().then(() => {
    console.log('\n✅ Анализ конкретных пострадавших пользователей завершен');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});