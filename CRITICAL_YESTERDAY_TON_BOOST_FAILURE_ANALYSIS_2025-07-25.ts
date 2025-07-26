/**
 * КРИТИЧЕСКИЙ АНАЛИЗ: Почему вчерашние участники TON Boost не попали в ton_farming_data
 * ЗАДАЧА: Определить была ли проблема в кеше или системный баг
 * ДАТА: 25 июля 2025
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeYesterdayTonBoostFailure() {
    console.log('\n🔍 ДИАГНОСТИКА ВЧЕРАШНЕЙ ПРОБЛЕМЫ TON BOOST');
    console.log('Почему участники не попадали в ton_farming_data автоматически?');
    console.log('=' .repeat(70));
    
    try {
        // РАЗДЕЛ 1: Анализ вчерашних покупок TON Boost
        console.log('\n📅 РАЗДЕЛ 1: АНАЛИЗ ВЧЕРАШНИХ ПОКУПОК');
        console.log('-' .repeat(60));
        
        // Получаем все покупки за последние 2 дня
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 2);
        const today = new Date();
        
        console.log(`🔍 Период анализа: ${yesterday.toLocaleDateString('ru-RU')} - ${today.toLocaleDateString('ru-RU')}`);
        
        const { data: recentPurchases, error: purchasesError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .gte('created_at', yesterday.toISOString())
            .order('created_at', { ascending: true });
            
        if (purchasesError) {
            console.error('❌ Ошибка получения покупок:', purchasesError);
            return;
        }
        
        console.log(`\n💰 НАЙДЕНО ПОКУПОК TON BOOST: ${recentPurchases?.length || 0}`);
        
        if (!recentPurchases || recentPurchases.length === 0) {
            console.log('⚠️ За последние 2 дня покупок TON Boost не было');
            return;
        }
        
        // Группируем покупки по дням
        const purchasesByDay = new Map<string, any[]>();
        recentPurchases.forEach(purchase => {
            const day = new Date(purchase.created_at).toLocaleDateString('ru-RU');
            if (!purchasesByDay.has(day)) {
                purchasesByDay.set(day, []);
            }
            purchasesByDay.get(day)!.push(purchase);
        });
        
        console.log('\n📊 Распределение по дням:');
        for (const [day, purchases] of purchasesByDay) {
            console.log(`   ${day}: ${purchases.length} покупок`);
        }
        
        // РАЗДЕЛ 2: Анализ каждой покупки на предмет создания farming записи
        console.log('\n📅 РАЗДЕЛ 2: ДЕТАЛЬНЫЙ АНАЛИЗ КАЖДОЙ ПОКУПКИ');
        console.log('-' .repeat(60));
        
        let successfulCreations = 0;
        let failedCreations = 0;
        const failedUsers: any[] = [];
        
        for (let i = 0; i < recentPurchases.length; i++) {
            const purchase = recentPurchases[i];
            const purchaseTime = new Date(purchase.created_at);
            
            console.log(`\n🔍 АНАЛИЗ ПОКУПКИ ${i + 1}/${recentPurchases.length}:`);
            console.log(`   💰 ID: ${purchase.id}`);
            console.log(`   👤 User: ${purchase.user_id}`);
            console.log(`   📅 Время: ${purchaseTime.toLocaleString('ru-RU')}`);
            console.log(`   💸 Сумма: ${purchase.amount} ${purchase.currency}`);
            
            // Проверяем metadata
            if (purchase.metadata) {
                console.log(`   📦 Package ID: ${purchase.metadata.boost_package_id}`);
                console.log(`   📝 Package Name: ${purchase.metadata.package_name}`);
                console.log(`   ⚡ Daily Rate: ${purchase.metadata.daily_rate}`);
            }
            
            // Проверяем создалась ли farming запись
            const { data: farmingRecord, error: farmingError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', purchase.user_id.toString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            if (farmingRecord) {
                const farmingTime = new Date(farmingRecord.created_at);
                const timeDiff = Math.abs(farmingTime.getTime() - purchaseTime.getTime()) / 1000;
                
                console.log(`   ✅ FARMING ЗАПИСЬ НАЙДЕНА:`);
                console.log(`      📅 Создана: ${farmingTime.toLocaleString('ru-RU')}`);
                console.log(`      ⏱️ Задержка: ${timeDiff.toFixed(1)} секунд`);
                console.log(`      💰 Balance: ${farmingRecord.farming_balance}`);
                console.log(`      ⚡ Rate: ${farmingRecord.farming_rate}`);
                console.log(`      🔄 Active: ${farmingRecord.boost_active}`);
                
                // Проверяем была ли создана в разумные сроки (до 10 минут)
                if (timeDiff <= 600) {
                    successfulCreations++;
                    console.log(`      ✅ АВТОМАТИЧЕСКОЕ СОЗДАНИЕ СРАБОТАЛО`);
                } else {
                    console.log(`      ⚠️ БОЛЬШАЯ ЗАДЕРЖКА - возможно ручное восстановление`);
                    failedCreations++;
                    failedUsers.push({
                        userId: purchase.user_id,
                        purchaseId: purchase.id,
                        purchaseTime,
                        farmingTime,
                        timeDiff
                    });
                }
            } else {
                console.log(`   ❌ FARMING ЗАПИСЬ НЕ НАЙДЕНА!`);
                console.log(`   🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Покупка не создала депозит!`);
                failedCreations++;
                failedUsers.push({
                    userId: purchase.user_id,
                    purchaseId: purchase.id,
                    purchaseTime,
                    farmingTime: null,
                    timeDiff: null
                });
            }
            
            // Проверяем состояние users таблицы на момент покупки
            const { data: userState, error: userError } = await supabase
                .from('users')
                .select('ton_boost_package, ton_boost_rate, ton_boost_active')
                .eq('id', purchase.user_id)
                .single();
                
            if (userState) {
                console.log(`   👤 СОСТОЯНИЕ USERS:`);
                console.log(`      📦 ton_boost_package: ${userState.ton_boost_package}`);
                console.log(`      ⚡ ton_boost_rate: ${userState.ton_boost_rate}`);
                console.log(`      🔄 ton_boost_active: ${userState.ton_boost_active}`);
            }
        }
        
        // РАЗДЕЛ 3: Статистика успешности
        console.log('\n📊 РАЗДЕЛ 3: СТАТИСТИКА УСПЕШНОСТИ СОЗДАНИЯ ДЕПОЗИТОВ');
        console.log('-' .repeat(60));
        
        const totalPurchases = recentPurchases.length;
        const successRate = totalPurchases > 0 ? (successfulCreations / totalPurchases * 100).toFixed(1) : '0';
        
        console.log(`\n📈 ОБЩАЯ СТАТИСТИКА:`);
        console.log(`   💰 Всего покупок: ${totalPurchases}`);
        console.log(`   ✅ Успешных создений: ${successfulCreations}`);
        console.log(`   ❌ Неудачных создений: ${failedCreations}`);
        console.log(`   📊 Процент успешности: ${successRate}%`);
        
        if (failedUsers.length > 0) {
            console.log(`\n🚨 ПОЛЬЗОВАТЕЛИ С ПРОБЛЕМАМИ (${failedUsers.length}):`);
            failedUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. User ${user.userId}:`);
                console.log(`      💰 Purchase ID: ${user.purchaseId}`);
                console.log(`      📅 Purchase Time: ${user.purchaseTime.toLocaleString('ru-RU')}`);
                if (user.farmingTime) {
                    console.log(`      ⏱️ Delay: ${user.timeDiff.toFixed(1)} секунд`);
                    console.log(`      📝 Status: РУЧНОЕ ВОССТАНОВЛЕНИЕ`);
                } else {
                    console.log(`      📝 Status: ДЕПОЗИТ НЕ СОЗДАН`);
                }
            });
        }
        
        // РАЗДЕЛ 4: Анализ временных паттернов
        console.log('\n📊 РАЗДЕЛ 4: АНАЛИЗ ВРЕМЕННЫХ ПАТТЕРНОВ');
        console.log('-' .repeat(60));
        
        console.log('\n⏰ Временные паттерны покупок:');
        recentPurchases.forEach((purchase, index) => {
            const time = new Date(purchase.created_at);
            console.log(`   ${index + 1}. ${time.toLocaleString('ru-RU')} - User ${purchase.user_id}`);
        });
        
        // Ищем периоды высокой нагрузки
        const timeWindows = new Map<string, number>();
        recentPurchases.forEach(purchase => {
            const time = new Date(purchase.created_at);
            const hourWindow = `${time.getDate()}.${time.getMonth()}.${time.getFullYear()} ${time.getHours()}:00`;
            timeWindows.set(hourWindow, (timeWindows.get(hourWindow) || 0) + 1);
        });
        
        console.log('\n📊 Покупки по часам:');
        for (const [window, count] of timeWindows) {
            if (count > 1) {
                console.log(`   ${window}: ${count} покупок`);
            }
        }
        
        // РАЗДЕЛ 5: Анализ потенциальных причин
        console.log('\n📊 РАЗДЕЛ 5: АНАЛИЗ ПОТЕНЦИАЛЬНЫХ ПРИЧИН');
        console.log('-' .repeat(60));
        
        console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМ:');
        
        if (failedCreations === 0) {
            console.log('   ✅ ВСЕ ПОКУПКИ СОЗДАЛИ ДЕПОЗИТЫ УСПЕШНО');
            console.log('   💡 Проблема была не системная, а единичная');
        } else if (successRate === '0') {
            console.log('   ❌ НИ ОДНА ПОКУПКА НЕ СОЗДАЛА ДЕПОЗИТ');
            console.log('   🚨 КРИТИЧЕСКИЙ СИСТЕМНЫЙ БАГ');
            console.log('   💡 Возможные причины:');
            console.log('      - Ошибка в коде activateBoost()');
            console.log('      - Проблема с типами данных');
            console.log('      - Недоступность ton_farming_data таблицы');
        } else {
            console.log(`   ⚠️ ЧАСТИЧНЫЕ ПРОБЛЕМЫ: ${successRate}% успешности`);
            console.log('   💡 Возможные причины:');
            console.log('      - Проблемы с кешем приложения');
            console.log('      - Intermittent bug в activateBoost()');
            console.log('      - Проблемы с базой данных');
            console.log('      - Race conditions при высокой нагрузке');
        }
        
        // РАЗДЕЛ 6: Исторический контекст
        console.log('\n📊 РАЗДЕЛ 6: ИСТОРИЧЕСКИЙ КОНТЕКСТ');
        console.log('-' .repeat(60));
        
        // Ищем когда была применена критическая правка
        console.log('\n🔍 АНАЛИЗ ИСПРАВЛЕНИЯ ТИПОВ ДАННЫХ:');
        console.log('   📅 Критическое исправление: 25 июля 2025');
        console.log('   🔧 Проблема: user_id INTEGER vs STRING в TonFarmingRepository');
        console.log('   💡 Исправление: Изменен user_id: parseInt(userId) на user_id: userId.toString()');
        
        // Проверяем покупки до и после исправления
        const fixDate = new Date('2025-07-25T10:00:00.000Z'); // Примерное время исправления
        const beforeFix = recentPurchases.filter(p => new Date(p.created_at) < fixDate);
        const afterFix = recentPurchases.filter(p => new Date(p.created_at) >= fixDate);
        
        console.log(`\n📊 ПОКУПКИ ДО ИСПРАВЛЕНИЯ: ${beforeFix.length}`);
        console.log(`📊 ПОКУПКИ ПОСЛЕ ИСПРАВЛЕНИЯ: ${afterFix.length}`);
        
        if (beforeFix.length > 0 && afterFix.length > 0) {
            // Анализируем успешность до и после
            let beforeSuccess = 0;
            let afterSuccess = 0;
            
            for (const purchase of beforeFix) {
                const { data: farming } = await supabase
                    .from('ton_farming_data')
                    .select('created_at')
                    .eq('user_id', purchase.user_id.toString())
                    .single();
                    
                if (farming) {
                    const timeDiff = Math.abs(new Date(farming.created_at).getTime() - new Date(purchase.created_at).getTime()) / 1000;
                    if (timeDiff <= 600) beforeSuccess++;
                }
            }
            
            for (const purchase of afterFix) {
                const { data: farming } = await supabase
                    .from('ton_farming_data')
                    .select('created_at')
                    .eq('user_id', purchase.user_id.toString())
                    .single();
                    
                if (farming) {
                    const timeDiff = Math.abs(new Date(farming.created_at).getTime() - new Date(purchase.created_at).getTime()) / 1000;
                    if (timeDiff <= 600) afterSuccess++;
                }
            }
            
            const beforeRate = beforeFix.length > 0 ? (beforeSuccess / beforeFix.length * 100).toFixed(1) : '0';
            const afterRate = afterFix.length > 0 ? (afterSuccess / afterFix.length * 100).toFixed(1) : '0';
            
            console.log(`   📊 Успешность ДО исправления: ${beforeRate}% (${beforeSuccess}/${beforeFix.length})`);
            console.log(`   📊 Успешность ПОСЛЕ исправления: ${afterRate}% (${afterSuccess}/${afterFix.length})`);
            
            if (parseFloat(beforeRate) < parseFloat(afterRate)) {
                console.log('   ✅ ИСПРАВЛЕНИЕ УЛУЧШИЛО СИТУАЦИЮ');
            } else if (parseFloat(beforeRate) > parseFloat(afterRate)) {
                console.log('   ⚠️ ПРОБЛЕМА НЕ В ИСПРАВЛЕНИИ ТИПОВ');
            } else {
                console.log('   🔄 СТАБИЛЬНАЯ СИТУАЦИЯ');
            }
        }
        
        // РАЗДЕЛ 7: Финальный диагноз
        console.log('\n📊 РАЗДЕЛ 7: ФИНАЛЬНЫЙ ДИАГНОЗ');
        console.log('-' .repeat(60));
        
        console.log('\n🎯 ДИАГНОЗ ПРОБЛЕМЫ:');
        
        if (failedCreations === 0) {
            console.log('✅ ПРОБЛЕМА ОТСУТСТВУЕТ - все депозиты создаются корректно');
            console.log('💡 Возможно, проблема была устранена исправлением типов данных');
        } else if (parseFloat(successRate) < 50) {
            console.log('❌ СИСТЕМНЫЙ БАГ - большинство покупок не создают депозиты');
            console.log('🔧 Требуется срочное исправление кода активации');
        } else {
            console.log('⚠️ ЧАСТИЧНАЯ ПРОБЛЕМА - некоторые покупки не создают депозиты');
            console.log('💭 Возможные причины:');
            console.log('   - Проблемы кеша приложения');
            console.log('   - Race conditions при параллельных покупках');
            console.log('   - Intermittent ошибки базы данных');
        }
        
        console.log('\n💡 РЕКОМЕНДАЦИИ:');
        if (failedUsers.length > 0) {
            console.log('1. Восстановить отсутствующие ton_farming_data записи для пострадавших пользователей');
            console.log('2. Добавить мониторинг создания депозитов в реальном времени');
            console.log('3. Добавить retry логику в activateBoost() для обработки временных сбоев');
        } else {
            console.log('1. Система работает корректно');
            console.log('2. Продолжить мониторинг новых покупок');
            console.log('3. Исправление типов данных решило проблему');
        }

    } catch (error) {
        console.error('❌ Критическая ошибка диагностики:', error);
    }
}

// Запуск диагностики
analyzeYesterdayTonBoostFailure().then(() => {
    console.log('\n✅ Диагностика вчерашней проблемы TON Boost завершена');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});