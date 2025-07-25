/**
 * ТРАССИРОВКА ПОТОКА ПОКУПКИ TON BOOST В БАЗЕ ДАННЫХ - 25 июля 2025
 * Полный анализ того, куда записываются данные о пакетах после покупки
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function traceTonBoostPurchaseFlow() {
    console.log('\n🔍 ТРАССИРОВКА ПОТОКА ПОКУПКИ TON BOOST В БД');
    console.log('=' .repeat(60));
    
    try {
        // ШАГ 1: Проверить последние покупки и их отражение в БД
        console.log('\n📊 ШАГ 1: ПОСЛЕДНИЕ ПОКУПКИ BOOST_PURCHASE');
        console.log('-' .repeat(50));
        
        const { data: purchases, error: purchasesError } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (purchasesError) {
            console.log('❌ Ошибка получения покупок:', purchasesError.message);
            return;
        }
        
        console.log(`✅ Найдено ${purchases?.length || 0} недавних покупок BOOST_PURCHASE`);
        
        if (!purchases || purchases.length === 0) {
            console.log('ℹ️ Нет недавних покупок TON Boost');
            return;
        }
        
        // Анализируем каждую покупку
        for (let i = 0; i < Math.min(3, purchases.length); i++) {
            const purchase = purchases[i];
            console.log(`\n💰 ПОКУПКА #${i + 1} (ID: ${purchase.id}):`);
            console.log(`   👤 User ID: ${purchase.user_id}`);
            console.log(`   💸 Сумма: ${purchase.amount_ton} TON`);
            console.log(`   📅 Время: ${new Date(purchase.created_at).toLocaleString('ru-RU')}`);
            console.log(`   ✅ Статус: ${purchase.status}`);
            console.log(`   📝 Описание: ${purchase.description}`);
            
            if (purchase.metadata) {
                console.log(`   🔗 Metadata:`, purchase.metadata);
            }
            
            // ШАГ 2: Проверить отражение в таблице users
            console.log(`\n   📊 ОТРАЖЕНИЕ В ТАБЛИЦЕ USERS:`);
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, ton_boost_package, ton_boost_rate, balance_ton, created_at')
                .eq('id', purchase.user_id)
                .single();
                
            if (userError) {
                console.log(`   ❌ Ошибка получения данных пользователя: ${userError.message}`);
            } else {
                console.log(`   ✅ users.ton_boost_package: ${userData.ton_boost_package}`);
                console.log(`   ✅ users.ton_boost_rate: ${userData.ton_boost_rate}`);
                console.log(`   💰 users.balance_ton: ${userData.balance_ton}`);
                console.log(`   📅 users.created_at: ${new Date(userData.created_at).toLocaleString('ru-RU')}`);
            }
            
            // ШАГ 3: Проверить создание записи в ton_farming_data
            console.log(`\n   📊 ОТРАЖЕНИЕ В ТАБЛИЦЕ TON_FARMING_DATA:`);
            const { data: farmingData, error: farmingError } = await supabase
                .from('ton_farming_data')
                .select('*')
                .eq('user_id', purchase.user_id.toString())
                .single();
                
            if (farmingError) {
                console.log(`   ❌ FARMING ЗАПИСЬ ОТСУТСТВУЕТ: ${farmingError.message}`);
                console.log(`   🚨 ПРОБЛЕМА: Покупка не создала farming запись!`);
            } else {
                console.log(`   ✅ FARMING ЗАПИСЬ НАЙДЕНА:`);
                console.log(`      ID: ${farmingData.id}`);
                console.log(`      Balance: ${farmingData.farming_balance} TON`);
                console.log(`      Rate: ${farmingData.farming_rate}`);
                console.log(`      Package ID: ${farmingData.boost_package_id}`);
                console.log(`      Активен: ${farmingData.boost_active}`);
                console.log(`      Создана: ${new Date(farmingData.created_at).toLocaleString('ru-RU')}`);
                console.log(`      Обновлена: ${new Date(farmingData.updated_at).toLocaleString('ru-RU')}`);
                
                // Проверяем временную связь между покупкой и farming записью
                const purchaseTime = new Date(purchase.created_at).getTime();
                const farmingTime = new Date(farmingData.created_at).getTime();
                const timeDiffMinutes = Math.abs(purchaseTime - farmingTime) / 1000 / 60;
                
                console.log(`      ⏱️ Задержка создания: ${timeDiffMinutes.toFixed(2)} минут`);
                
                if (timeDiffMinutes < 5) {
                    console.log(`      ✅ АВТОМАТИЧЕСКОЕ СОЗДАНИЕ - система работает корректно`);
                } else {
                    console.log(`      ⚠️ БОЛЬШАЯ ЗАДЕРЖКА - возможно ручное восстановление`);
                }
            }
        }
        
        // ШАГ 4: Проверить структуру таблиц и их связи
        console.log('\n📊 ШАГ 4: АНАЛИЗ СТРУКТУРЫ ТАБЛИЦ');
        console.log('-' .repeat(50));
        
        // Анализ таблицы transactions (BOOST_PURCHASE)
        console.log('\n🗃️ ТАБЛИЦА TRANSACTIONS (BOOST_PURCHASE):');
        const { data: transactionSample } = await supabase
            .from('transactions')
            .select('*')
            .eq('type', 'BOOST_PURCHASE')
            .limit(1)
            .single();
            
        if (transactionSample) {
            console.log('✅ Поля в таблице transactions:');
            Object.keys(transactionSample).forEach(key => {
                const value = transactionSample[key];
                const type = typeof value;
                console.log(`   - ${key}: ${type} = ${value}`);
            });
        }
        
        // Анализ таблицы users (ton_boost_package)
        console.log('\n👤 ТАБЛИЦА USERS (TON BOOST ПОЛЯ):');
        const { data: userSample } = await supabase
            .from('users')
            .select('id, ton_boost_package, ton_boost_rate, balance_ton')
            .gt('ton_boost_package', 0)
            .limit(1)
            .single();
            
        if (userSample) {
            console.log('✅ TON Boost поля в таблице users:');
            console.log(`   - id: ${userSample.id}`);
            console.log(`   - ton_boost_package: ${userSample.ton_boost_package}`);
            console.log(`   - ton_boost_rate: ${userSample.ton_boost_rate}`);
            console.log(`   - balance_ton: ${userSample.balance_ton}`);
        }
        
        // Анализ таблицы ton_farming_data
        console.log('\n🚜 ТАБЛИЦА TON_FARMING_DATA:');
        const { data: farmingSample } = await supabase
            .from('ton_farming_data')
            .select('*')
            .limit(1)
            .single();
            
        if (farmingSample) {
            console.log('✅ Поля в таблице ton_farming_data:');
            Object.keys(farmingSample).forEach(key => {
                const value = farmingSample[key];
                const type = typeof value;
                console.log(`   - ${key}: ${type} = ${value}`);
            });
        }
        
        // ШАГ 5: Проверить существование таблицы boost_purchases
        console.log('\n📊 ШАГ 5: ПРОВЕРКА ТАБЛИЦЫ BOOST_PURCHASES');
        console.log('-' .repeat(50));
        
        try {
            const { data: boostPurchases, error: boostError } = await supabase
                .from('boost_purchases')
                .select('*')
                .limit(1);
                
            if (boostError) {
                console.log('❌ ТАБЛИЦА BOOST_PURCHASES НЕ СУЩЕСТВУЕТ');
                console.log(`   Ошибка: ${boostError.message}`);
                console.log('💡 Система использует transactions таблицу вместо boost_purchases');
            } else {
                console.log('✅ ТАБЛИЦА BOOST_PURCHASES НАЙДЕНА');
                console.log(`   Записей: ${boostPurchases?.length || 0}`);
                if (boostPurchases && boostPurchases.length > 0) {
                    console.log('✅ Поля в таблице boost_purchases:');
                    Object.keys(boostPurchases[0]).forEach(key => {
                        const value = boostPurchases[0][key];
                        const type = typeof value;
                        console.log(`   - ${key}: ${type} = ${value}`);
                    });
                }
            }
        } catch (error) {
            console.log('❌ ТАБЛИЦА BOOST_PURCHASES НЕДОСТУПНА');
        }
        
        // ШАГ 6: Итоговый поток данных
        console.log('\n📈 ШАГ 6: ИТОГОВЫЙ ПОТОК ДАННЫХ ПОКУПКИ TON BOOST');
        console.log('-' .repeat(50));
        
        console.log('🔄 АРХИТЕКТУРА ПОТОКА:');
        console.log('1. 💰 ПОКУПКА → transactions таблица (type: BOOST_PURCHASE)');
        console.log('2. 👤 АКТИВАЦИЯ → users таблица (ton_boost_package, ton_boost_rate)');
        console.log('3. 🚜 ФАРМИНГ → ton_farming_data таблица (farming_balance, farming_rate)');
        console.log('4. 📊 ПЛАНИРОВЩИК → Читает ton_farming_data для доходов');
        
        console.log('\n📋 КЛЮЧЕВЫЕ ТАБЛИЦЫ:');
        console.log('✅ transactions - Хранит все покупки (BOOST_PURCHASE)');
        console.log('✅ users - Хранит активные пакеты (ton_boost_package)');
        console.log('✅ ton_farming_data - Хранит farming балансы и ставки');
        console.log('❌ boost_purchases - НЕ ИСПОЛЬЗУЕТСЯ (отсутствует или пустая)');

    } catch (error) {
        console.error('❌ Критическая ошибка трассировки:', error);
    }
}

// Запуск трассировки
traceTonBoostPurchaseFlow().then(() => {
    console.log('\n✅ Трассировка потока покупки TON Boost завершена');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Фатальная ошибка:', error);
    process.exit(1);
});