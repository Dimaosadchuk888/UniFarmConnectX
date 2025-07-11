import { supabase } from './core/supabaseClient';
import fetch from 'node-fetch';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzc0X1JFUExJVCIsImlhdCI6MTc1MjE1NzI4OCwiZXhwIjoxNzUyNzYyMDg4fQ.7Yz7CnlnmxEf1vafKe44B88ZHobMKOfJqPajvYzqVOI';

async function checkTransactionsAfterFix() {
  console.log('=== Проверка транзакций после исправления конфликта ===\n');
  
  // 1. Проверяем пользователей
  const { data: users } = await supabase
    .from('users')
    .select('id, telegram_id, username')
    .in('id', [74, 75]);
    
  console.log('Пользователи после исправления:');
  users?.forEach(user => {
    console.log(`ID: ${user.id}, Telegram ID: ${user.telegram_id}, Username: ${user.username}`);
  });
  
  console.log('\n');
  
  // 2. Проверяем транзакции user 74 в БД
  const { data: tx74 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Транзакции user_id=74 в БД:');
  if (tx74 && tx74.length > 0) {
    tx74.forEach(tx => {
      console.log(`ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}`);
    });
  } else {
    console.log('Нет транзакций');
  }
  
  console.log('\n');
  
  // 3. Проверяем транзакции user 75 в БД
  const { data: tx75 } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 75)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Транзакции user_id=75 в БД:');
  if (tx75 && tx75.length > 0) {
    tx75.forEach(tx => {
      console.log(`ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Currency: ${tx.currency}`);
    });
  } else {
    console.log('Нет транзакций');
  }
  
  console.log('\n');
  
  // 4. Проверяем API ответ
  try {
    console.log('Проверяем API /api/v2/transactions:');
    const response = await fetch('http://localhost:3000/api/v2/transactions?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API возвращает транзакции:');
      if (data.success && data.data?.transactions) {
        data.data.transactions.forEach(tx => {
          console.log(`- User ID: ${tx.user_id}, ID: ${tx.id}, Type: ${tx.type}`);
        });
      } else {
        console.log('Нет транзакций в ответе');
      }
    } else {
      console.log('Ошибка API:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('API недоступен:', error.message);
  }
  
  process.exit(0);
}

checkTransactionsAfterFix().catch(console.error);