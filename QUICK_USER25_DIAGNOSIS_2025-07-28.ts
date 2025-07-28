#!/usr/bin/env tsx

/**
 * БЫСТРАЯ ДИАГНОСТИКА: Исчезновение 3 TON у User ID 25
 * 28.07.2025, 14:04 - Пользователь пополнил 3 TON, средства исчезли
 */

import express from 'express';
import cors from 'cors';

console.log('🚨 СРОЧНАЯ ДИАГНОСТИКА: Исчезновение 3 TON у User ID 25');
console.log('📅 Время события: 28.07.2025, 14:04');
console.log('🔗 TX Hash: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaK...');
console.log('='.repeat(80));

async function quickDiagnosis() {
  try {
    console.log('🔍 Проверяем статус API для User ID 25...');
    
    // Тестируем баланс через API
    const balanceResponse = await fetch('http://localhost:3000/api/v2/wallet/balance?user_id=25', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('💰 Текущий баланс User 25:', balanceData);
    } else {
      console.log('❌ Ошибка получения баланса:', balanceResponse.status);
    }
    
    // Тестируем последние транзакции
    console.log('\n📊 Проверяем последние транзакции...');
    const transactionsResponse = await fetch('http://localhost:3000/api/v2/transactions/user/25?limit=10', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      console.log('📋 Последние транзакции User 25:');
      
      if (transactionsData.success && transactionsData.data) {
        transactionsData.data.forEach((tx: any, index: number) => {
          console.log(`${index + 1}. [${tx.created_at}] ${tx.type} | ${tx.amount} | Status: ${tx.status}`);
          if (tx.metadata && tx.metadata.tx_hash) {
            console.log(`   TX Hash: ${tx.metadata.tx_hash.substring(0, 30)}...`);
          }
        });
      } else {
        console.log('⚠️ Нет данных о транзакциях');
      }
    } else {
      console.log('❌ Ошибка получения транзакций:', transactionsResponse.status);
    }
    
    // Поиск конкретной транзакции по hash
    console.log('\n🔍 Поиск транзакции с указанным hash...');
    const targetHash = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaK';
    
    const searchResponse = await fetch(`http://localhost:3000/api/v2/transactions/search?user_id=25&tx_hash=${encodeURIComponent(targetHash)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('🔍 Результат поиска по hash:', searchData);
    } else {
      console.log('❌ Ошибка поиска по hash:', searchResponse.status);
    }
    
  } catch (error) {
    console.error('💥 Ошибка диагностики:', error);
  }
}

// Проверяем состояние сервера
async function checkServerStatus() {
  try {
    const healthResponse = await fetch('http://localhost:3000/health');
    if (healthResponse.ok) {
      console.log('✅ Сервер доступен');
      return true;
    } else {
      console.log('❌ Сервер недоступен:', healthResponse.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Сервер не отвечает:', error);
    return false;
  }
}

// Основная функция
async function main() {
  const serverAvailable = await checkServerStatus();
  
  if (serverAvailable) {
    await quickDiagnosis();
  } else {
    console.log('⚠️ Невозможно выполнить диагностику - сервер недоступен');
    console.log('📋 Рекомендации:');
    console.log('1. Запустить сервер: tsx server/index.ts');
    console.log('2. Проверить переменные окружения');
    console.log('3. Убедиться что порт 3000 свободен');
  }
  
  console.log('\n='.repeat(80));
  console.log('📋 КРАТКИЕ ВЫВОДЫ:');
  console.log('- User ID 25 пополнил 3 TON в 14:04');
  console.log('- Средства отобразились, затем исчезли');
  console.log('- Покупки не совершались');
  console.log('- Требуется детальная проверка баланса и транзакций');
  console.log('='.repeat(80));
}

main().catch(console.error);