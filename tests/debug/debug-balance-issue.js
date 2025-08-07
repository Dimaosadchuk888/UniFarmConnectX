/**
 * ДИАГНОСТИКА: Проблема списания баланса при депозитах
 * Цель: Проверить что происходит с балансом до и после депозита
 */

import fetch from 'node-fetch';

const API_BASE = 'https://uni-farm-connect-unifarm01010101.replit.app';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

const USER_ID = 62;

async function makeRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    const data = await response.json();
    return { response, data };
}

async function getBalance() {
    const { response, data } = await makeRequest(`${API_BASE}/api/v2/wallet/balance?user_id=${USER_ID}`);
    
    if (response.ok && data.success) {
        return {
            uniBalance: data.data.uniBalance,
            tonBalance: data.data.tonBalance,
            timestamp: new Date().toISOString()
        };
    }
    
    throw new Error(`Ошибка получения баланса: ${data.error}`);
}

async function getFarmingStatus() {
    const { response, data } = await makeRequest(`${API_BASE}/api/v2/uni-farming/status?user_id=${USER_ID}`);
    
    if (response.ok && data.success) {
        return {
            balance_uni: data.data.balance_uni,
            uni_deposit_amount: data.data.uni_deposit_amount,
            uni_farming_active: data.data.uni_farming_active,
            timestamp: new Date().toISOString()
        };
    }
    
    throw new Error(`Ошибка получения статуса фарминга: ${data.error}`);
}

async function makeDeposit(amount) {
    const { response, data } = await makeRequest(`${API_BASE}/api/v2/uni-farming/deposit`, {
        method: 'POST',
        body: JSON.stringify({
            amount: amount.toString(),
            user_id: USER_ID
        })
    });
    
    return { response, data };
}

async function getLastTransactions() {
    const { response, data } = await makeRequest(`${API_BASE}/api/v2/transactions/history?user_id=${USER_ID}&limit=5`);
    
    if (response.ok && data.success) {
        return data.data.transactions || [];
    }
    
    return [];
}

async function debugBalanceIssue() {
    console.log('🔍 ДИАГНОСТИКА: Проблема списания баланса при депозитах');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // 1. Получаем текущий баланс
        console.log('\n1️⃣ Получаем текущий баланс...');
        const balanceBefore = await getBalance();
        const farmingBefore = await getFarmingStatus();
        
        console.log('💰 Баланс ДО депозита:');
        console.log(`   Wallet API: ${balanceBefore.uniBalance} UNI`);
        console.log(`   Farming API: ${farmingBefore.balance_uni} UNI`);
        console.log(`   Депозит в фарминге: ${farmingBefore.uni_deposit_amount} UNI`);
        
        // 2. Проверяем последние транзакции
        console.log('\n2️⃣ Проверяем последние транзакции...');
        const transactionsBefore = await getLastTransactions();
        const depositsBefore = transactionsBefore.filter(tx => 
            tx.type === 'FARMING_REWARD' && parseFloat(tx.amount) < 0
        );
        
        console.log(`📜 Депозитов найдено: ${depositsBefore.length}`);
        if (depositsBefore.length > 0) {
            console.log('   Последние депозиты:');
            depositsBefore.slice(0, 3).forEach(tx => {
                console.log(`   • ${Math.abs(tx.amount)} UNI (${new Date(tx.created_at).toLocaleString()})`);
            });
        }
        
        // 3. Выполняем тестовый депозит
        console.log('\n3️⃣ Выполняем тестовый депозит 1 UNI...');
        const depositAmount = 1;
        const depositResult = await makeDeposit(depositAmount);
        
        console.log(`📤 Депозит ${depositAmount} UNI:`);
        console.log(`   Статус: ${depositResult.response.status}`);
        console.log(`   Успех: ${depositResult.data.success}`);
        console.log(`   Сообщение: ${depositResult.data.message || depositResult.data.error}`);
        
        if (!depositResult.data.success) {
            console.log('❌ Депозит не удался:', depositResult.data);
            return;
        }
        
        // 4. Ждем 2 секунды и проверяем изменения
        console.log('\n4️⃣ Ждем 2 секунды и проверяем изменения...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const balanceAfter = await getBalance();
        const farmingAfter = await getFarmingStatus();
        
        console.log('💰 Баланс ПОСЛЕ депозита:');
        console.log(`   Wallet API: ${balanceAfter.uniBalance} UNI`);
        console.log(`   Farming API: ${farmingAfter.balance_uni} UNI`);
        console.log(`   Депозит в фарминге: ${farmingAfter.uni_deposit_amount} UNI`);
        
        // 5. Вычисляем изменения
        console.log('\n5️⃣ Анализируем изменения:');
        const walletChange = balanceAfter.uniBalance - balanceBefore.uniBalance;
        const farmingChange = farmingAfter.balance_uni - farmingBefore.balance_uni;
        const depositChange = farmingAfter.uni_deposit_amount - farmingBefore.uni_deposit_amount;
        
        console.log(`📊 Изменения баланса:`);
        console.log(`   Wallet API: ${walletChange > 0 ? '+' : ''}${walletChange.toFixed(6)} UNI`);
        console.log(`   Farming API: ${farmingChange > 0 ? '+' : ''}${farmingChange.toFixed(6)} UNI`);
        console.log(`   Депозит в фарминге: ${depositChange > 0 ? '+' : ''}${depositChange.toFixed(6)} UNI`);
        
        // 6. Проверяем новые транзакции
        console.log('\n6️⃣ Проверяем новые транзакции...');
        const transactionsAfter = await getLastTransactions();
        const newTransactions = transactionsAfter.filter(tx => 
            !transactionsBefore.some(oldTx => oldTx.id === tx.id)
        );
        
        console.log(`📜 Новых транзакций: ${newTransactions.length}`);
        if (newTransactions.length > 0) {
            console.log('   Новые транзакции:');
            newTransactions.forEach(tx => {
                console.log(`   • ${tx.amount} ${tx.currency} (${tx.type}, ID: ${tx.id})`);
            });
        }
        
        // 7. Выводы
        console.log('\n7️⃣ ВЫВОДЫ:');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (Math.abs(walletChange + depositAmount) < 0.001) {
            console.log('✅ СПИСАНИЕ РАБОТАЕТ: Баланс уменьшился на сумму депозита');
        } else if (Math.abs(walletChange) < 0.001) {
            console.log('⚠️  СПИСАНИЕ НЕ РАБОТАЕТ: Баланс не изменился');
        } else {
            console.log(`🤔 НЕОЖИДАННОЕ ИЗМЕНЕНИЕ: Баланс изменился на ${walletChange.toFixed(6)} UNI`);
        }
        
        if (Math.abs(depositChange - depositAmount) < 0.001) {
            console.log('✅ ДЕПОЗИТ ЗАФИКСИРОВАН: Депозит в фарминге увеличился корректно');
        } else {
            console.log(`❌ ДЕПОЗИТ НЕ ЗАФИКСИРОВАН: Ожидали +${depositAmount}, получили +${depositChange.toFixed(6)}`);
        }
        
        if (newTransactions.length > 0) {
            console.log('✅ ТРАНЗАКЦИИ СОЗДАНЫ: Новые транзакции записаны');
        } else {
            console.log('❌ ТРАНЗАКЦИИ НЕ СОЗДАНЫ: Нет новых транзакций');
        }
        
    } catch (error) {
        console.error('❌ Ошибка диагностики:', error.message);
    }
}

// Запуск диагностики
debugBalanceIssue();