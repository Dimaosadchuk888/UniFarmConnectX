/**
 * ПРОВЕРКА НОВЫХ ПОЛЬЗОВАТЕЛЕЙ TON BOOST - 25 июля 2025
 * Мониторинг создания записей ton_farming_data для новых пользователей
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNewTonBoostUsers() {
    console.log('\n🔍 ПРОВЕРКА НОВЫХ ПОЛЬЗОВАТЕЛЕЙ TON BOOST');
    console.log('=' .repeat(60));
    
    try {
        const today = new Date().toISOString().split('T')[0]; // Сегодняшняя дата
        
        // ШАГ 1: Найти всех пользователей созданных сегодня с TON Boost
        console.log('\n📊 ШАГ 1: ПОЛЬЗОВАТЕЛИ СОЗДАННЫЕ СЕГОДНЯ С TON BOOST');
        console.log('-' .repeat(50));
        
        const { data: todayUsers, error: usersError } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_rate, balance_ton, created_at')
            .gte('created_at', today)
            .gt('ton_boost_package', 0)
            .order('created_at', { ascending: false });
            
        if (usersError) {
            console.log('❌ Ошибка получения пользователей:', usersError.message);
            return;
        }
        
        console.log(`✅ Найдено ${todayUsers?.length || 0} пользователей созданных сегодня с TON Boost`);
        
        if (!todayUsers || todayUsers.length === 0) {
            console.log('ℹ️ Нет новых пользователей с TON Boost сегодня');
            return;
        }
        
        // ШАГ 2: Проверить каждого пользователя
        console.log('\n📋 ШАГ 2: ДЕТАЛЬНАЯ ПРОВЕРКА КАЖДОГО ПОЛЬЗОВАТЕЛЯ');
        console.log('-' .repeat(50));
        
        let successCount = 0;
        let failedCount = 0;
        
        for (const user of todayUsers) {
            console.log(`\n👤 USER ${user.id}:`);
            console.log(`   📅 Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
            console.log(`   📦 TON Boost Package: ${user.ton_boost_package}`);
            console.log(`   ⚡ TON Boost Rate: ${user.ton_boost_rate}`);
            console.log(`   💰 Balance TON: ${user.balance_ton}`);
            
            // Проверяем соответствующую запись в ton_farming_data
            const { data: farmingRecord, error: farmingError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', user.id.toString())
                .single();
                
            if (farmingError) {
                console.log(`   ❌ FARMING ЗАПИСЬ ОТСУТСТВУЕТ!`);
                console.log(`      Ошибка: ${farmingError.message}`);
                failedCount++;
                
                // Ищем связанные покупки
                const { data: purchases } = await supabase
                    .from('transactions')
                    .select('type, amount, description, created_at, status')
                    .eq('user_id', user.id)
                    .eq('type', 'BOOST_PURCHASE')
                    .order('created_at', { ascending: false })
                    .limit(3);
                    
                if (purchases && purchases.length > 0) {
                    console.log(`   📋 Найдены покупки BOOST_PURCHASE:`);
                    for (const purchase of purchases) {
                        console.log(`      - ${purchase.amount} TON (${purchase.status}) - ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                    }
                } else {
                    console.log(`   ⚠️ Покупки BOOST_PURCHASE не найдены`);
                }
            } else {
                console.log(`   ✅ FARMING ЗАПИСЬ НАЙДЕНА:`);
                console.log(`      Balance: ${farmingRecord.farming_balance} TON`);
                console.log(`      Rate: ${farmingRecord.farming_rate}`);
                console.log(`      Package ID: ${farmingRecord.boost_package_id}`);
                console.log(`      Активен: ${farmingRecord.boost_active}`);
                console.log(`      Создана: ${new Date(farmingRecord.created_at).toLocaleString('ru-RU')}`);
                
                // Проверяем время между созданием пользователя и farming записи
                const userTime = new Date(user.created_at).getTime();
                const farmingTime = new Date(farmingRecord.created_at).getTime();
                const timeDiffMinutes = Math.abs(userTime - farmingTime) / 1000 / 60;
                
                console.log(`      ⏱️ Разница во времени: ${timeDiffMinutes.toFixed(2)} минут`);
                
                if (timeDiffMinutes > 30) {
                    console.log(`      ⚠️ БОЛЬШАЯ РАЗНИЦА - возможно ручное восстановление`);
                } else {
                    console.log(`      ✅ Создано синхронно с пользователем`);
                }
                
                successCount++;
            }
        }
        
        // ШАГ 3: Итоговая статистика
        console.log('\n📈 ШАГ 3: ИТОГОВАЯ СТАТИСТИКА');
        console.log('-' .repeat(50));
        
        const totalUsers = todayUsers.length;
        const successRate = totalUsers > 0 ? ((successCount / totalUsers) * 100).toFixed(1) : '0';
        
        console.log(`👥 Всего новых пользователей с TON Boost: ${totalUsers}`);
        console.log(`✅ С корректными farming записями: ${successCount}`);
        console.log(`❌ БЕЗ farming записей: ${failedCount}`);
        console.log(`📊 Процент успешности: ${successRate}%`);
        
        if (failedCount > 0) {
            console.log('\n🚨 ОБНАРУЖЕНЫ ПРОБЛЕМЫ:');
            console.log(`💥 ${failedCount} новых пользователей НЕ ПОЛУЧАЮТ доходы TON Boost!`);
            console.log('🔧 Система активации НЕ РАБОТАЕТ автоматически для новых покупок');
            console.log('📞 ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ кода активации');
        } else {
            console.log('\n🎉 ВСЕ НОВЫЕ ПОЛЬЗОВАТЕЛИ СИНХРОНИЗИРОВАНЫ!');
            console.log('✅ Система активации TON Boost работает корректно');
        }
        
        // ШАГ 4: Проверка последних покупок за час
        console.log('\n📊 ШАГ 4: ПОКУПКИ ЗА ПОСЛЕДНИЙ ЧАС');
        console.log('-' .repeat(50));
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: recentPurchases } = await supabase
            .from('transactions')
            .select('user_id, amount, created_at, status, metadata')
            .eq('type', 'BOOST_PURCHASE')
            .gte('created_at', oneHourAgo)
            .order('created_at', { ascending: false });
            
        console.log(`✅ Найдено ${recentPurchases?.length || 0} покупок BOOST_PURCHASE за последний час`);
        
        if (recentPurchases && recentPurchases.length > 0) {
            for (const purchase of recentPurchases) {
                console.log(`\n🛒 ПОКУПКА User ${purchase.user_id}:`);
                console.log(`   💰 Сумма: ${purchase.amount} TON`);
                console.log(`   📅 Время: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
                console.log(`   ✅ Статус: ${purchase.status}`);
                
                // Проверяем активацию для этой покупки
                const { data: activationRecord } = await supabase
                    .from('ton_farming_data')
                    .select('farming_balance, created_at')
                    .eq('user_id', purchase.user_id.toString())
                    .single();
                    
                if (activationRecord) {
                    const purchaseTime = new Date(purchase.created_at).getTime();
                    const activationTime = new Date(activationRecord.created_at).getTime();
                    const activationDelay = Math.abs(purchaseTime - activationTime) / 1000 / 60;
                    
                    console.log(`   ✅ Активация: Balance ${activationRecord.farming_balance} TON`);
                    console.log(`   ⏱️ Задержка активации: ${activationDelay.toFixed(2)} минут`);
                } else {
                    console.log(`   ❌ АКТИВАЦИЯ НЕ НАЙДЕНА - ПРОБЛЕМА!`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Критическая ошибка проверки:', error);
    }
}

// Запуск проверки
checkNewTonBoostUsers().then(() => {
    console.log('\n✅ Проверка новых пользователей TON Boost завершена');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});