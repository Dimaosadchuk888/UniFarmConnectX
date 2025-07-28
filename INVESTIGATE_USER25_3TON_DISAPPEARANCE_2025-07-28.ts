#!/usr/bin/env tsx

/**
 * СРОЧНАЯ ДИАГНОСТИКА: Исчезновение 3 TON у User ID 25
 * Дата: 28.07.2025, 14:04
 * TX Hash: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAvrKdS6oJcxoz+BuKjqoPzIvO9XUVeJhy6yJbmMcRUx+lVkSy1hOBMPPYsp+hgwqopkKgqBeqss+9kbXu6HqGFFNTRi7RDwlAAAAGSgAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKlloLwAAAAAAAAAAAAAAAAAADhBvuW
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

interface TransactionRecord {
  id: number;
  user_id: string;
  type: string;
  amount: string;
  metadata: any;
  created_at: string;
  status: string;
}

interface UserBalance {
  ton_balance: number;
  uni_balance: number;
  updated_at: string;
}

class User25TONDisappearanceInvestigator {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
  
  private targetTxHash = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAvrKdS6oJcxoz+BuKjqoPzIvO9XUVeJhy6yJbmMcRUx+lVkSy1hOBMPPYsp+hgwqopkKgqBeqss+9kbXu6HqGFFNTRi7RDwlAAAAGSgAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKlloLwAAAAAAAAAAAAAAAAAADhBvuW';
  
  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
  
  private error(message: string) {
    console.error(`[${new Date().toISOString()}] ❌ ${message}`);
  }
  
  async investigateCurrentBalance() {
    this.log('🔍 Проверяем текущий баланс User ID 25...');
    
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('ton_balance, uni_balance, updated_at')
        .eq('id', '25')
        .single();
        
      if (error) {
        this.error(`Ошибка получения баланса: ${error.message}`);
        return null;
      }
      
      this.log(`💰 Текущий баланс User 25:`);
      this.log(`   TON: ${user.ton_balance}`);
      this.log(`   UNI: ${user.uni_balance}`);
      this.log(`   Обновлен: ${user.updated_at}`);
      
      return user;
    } catch (error) {
      this.error(`Исключение при получении баланса: ${error}`);
      return null;
    }
  }
  
  async findTargetTransaction() {
    this.log('🔍 Ищем транзакцию с указанным hash...');
    
    try {
      // Поиск по tx_hash в metadata
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', '25')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) {
        this.error(`Ошибка поиска транзакций: ${error.message}`);
        return null;
      }
      
      this.log(`📊 Найдено ${transactions.length} последних транзакций User 25`);
      
      const targetTx = transactions.find(tx => {
        const metadata = tx.metadata || {};
        return metadata.tx_hash === this.targetTxHash || 
               metadata.ton_tx_hash === this.targetTxHash ||
               metadata.blockchain_hash === this.targetTxHash;
      });
      
      if (targetTx) {
        this.log(`✅ НАЙДЕНА целевая транзакция:`);
        this.log(`   ID: ${targetTx.id}`);
        this.log(`   Type: ${targetTx.type}`);
        this.log(`   Amount: ${targetTx.amount}`);
        this.log(`   Status: ${targetTx.status}`);
        this.log(`   Created: ${targetTx.created_at}`);
        this.log(`   Metadata: ${JSON.stringify(targetTx.metadata, null, 2)}`);
        return targetTx;
      } else {
        this.log(`⚠️ Транзакция с hash ${this.targetTxHash.substring(0, 20)}... НЕ НАЙДЕНА`);
        return null;
      }
    } catch (error) {
      this.error(`Исключение при поиске транзакции: ${error}`);
      return null;
    }
  }
  
  async analyzeRecentTransactions() {
    this.log('📈 Анализируем последние транзакции User 25...');
    
    try {
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', '25')
        .gte('created_at', '2025-07-28T12:00:00Z') // С 12:00 сегодня
        .order('created_at', { ascending: false });
        
      if (error) {
        this.error(`Ошибка анализа транзакций: ${error.message}`);
        return [];
      }
      
      this.log(`📊 Транзакции User 25 с 12:00 (${transactions.length} шт.):`);
      this.log('='.repeat(80));
      
      transactions.forEach((tx, index) => {
        this.log(`${index + 1}. [${tx.created_at}] ${tx.type} | ${tx.amount} | Status: ${tx.status}`);
        if (tx.metadata) {
          const metadata = tx.metadata;
          if (metadata.tx_hash || metadata.ton_tx_hash) {
            this.log(`   TX Hash: ${metadata.tx_hash || metadata.ton_tx_hash}`);
          }
          if (metadata.transaction_source) {
            this.log(`   Source: ${metadata.transaction_source}`);
          }
          if (metadata.original_type) {
            this.log(`   Original Type: ${metadata.original_type}`);
          }
        }
        this.log('');
      });
      
      return transactions;
    } catch (error) {
      this.error(`Исключение при анализе транзакций: ${error}`);
      return [];
    }
  }
  
  async checkForDuplicateTransactions() {
    this.log('🔍 Проверяем дублирование транзакций...');
    
    try {
      const { data: allTransactions, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', '25')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) {
        this.error(`Ошибка проверки дублей: ${error.message}`);
        return;
      }
      
      // Группируем по tx_hash
      const hashGroups: { [key: string]: TransactionRecord[] } = {};
      
      allTransactions.forEach(tx => {
        const metadata = tx.metadata || {};
        const hash = metadata.tx_hash || metadata.ton_tx_hash || metadata.blockchain_hash;
        
        if (hash) {
          if (!hashGroups[hash]) {
            hashGroups[hash] = [];
          }
          hashGroups[hash].push(tx);
        }
      });
      
      this.log('📊 Анализ дублирования по hash:');
      let duplicatesFound = false;
      
      Object.entries(hashGroups).forEach(([hash, txs]) => {
        if (txs.length > 1) {
          duplicatesFound = true;
          this.log(`⚠️ ДУБЛИРОВАНИЕ обнаружено для hash ${hash.substring(0, 20)}...:`);
          txs.forEach(tx => {
            this.log(`   - ID ${tx.id}: ${tx.type} | ${tx.amount} | ${tx.created_at}`);
          });
          this.log('');
        }
      });
      
      if (!duplicatesFound) {
        this.log('✅ Дублирования транзакций не обнаружено');
      }
      
    } catch (error) {
      this.error(`Исключение при проверке дублей: ${error}`);
    }
  }
  
  async checkBalanceCalculationLogic() {
    this.log('🧮 Проверяем логику расчета баланса...');
    
    try {
      const { data: allTransactions, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', '25')
        .order('created_at', { ascending: true });
        
      if (error) {
        this.error(`Ошибка получения всех транзакций: ${error.message}`);
        return;
      }
      
      let calculatedTONBalance = 0;
      let calculatedUNIBalance = 0;
      
      this.log('💰 Пересчитываем баланс по транзакциям:');
      this.log('='.repeat(60));
      
      allTransactions.forEach((tx, index) => {
        const amount = parseFloat(tx.amount);
        const isPositive = amount > 0;
        
        if (tx.type.includes('TON') || tx.type.includes('DEPOSIT') || tx.type.includes('FARMING_REWARD')) {
          calculatedTONBalance += amount;
          this.log(`${index + 1}. [${tx.type}] ${isPositive ? '+' : ''}${amount} TON (Итого TON: ${calculatedTONBalance.toFixed(6)})`);
        } else if (tx.type.includes('UNI')) {
          calculatedUNIBalance += amount;
          this.log(`${index + 1}. [${tx.type}] ${isPositive ? '+' : ''}${amount} UNI (Итого UNI: ${calculatedUNIBalance.toFixed(6)})`);
        } else {
          this.log(`${index + 1}. [${tx.type}] ${isPositive ? '+' : ''}${amount} (неопределенный тип)`);
        }
      });
      
      this.log('='.repeat(60));
      this.log(`📊 РАСЧЕТНЫЙ баланс:`);
      this.log(`   TON: ${calculatedTONBalance.toFixed(6)}`);
      this.log(`   UNI: ${calculatedUNIBalance.toFixed(6)}`);
      
      return { calculatedTONBalance, calculatedUNIBalance };
      
    } catch (error) {
      this.error(`Исключение при расчете баланса: ${error}`);
      return null;
    }
  }
  
  async runInvestigation() {
    this.log('🚨 ЗАПУСК СРОЧНОЙ ДИАГНОСТИКИ: Исчезновение 3 TON у User ID 25');
    this.log('📅 Время события: 28.07.2025, 14:04');
    this.log('🔗 TX Hash: ' + this.targetTxHash.substring(0, 30) + '...');
    this.log('='.repeat(80));
    
    // 1. Текущий баланс
    const currentBalance = await this.investigateCurrentBalance();
    
    // 2. Поиск целевой транзакции
    const targetTransaction = await this.findTargetTransaction();
    
    // 3. Анализ последних транзакций
    const recentTransactions = await this.analyzeRecentTransactions();
    
    // 4. Проверка дублирования
    await this.checkForDuplicateTransactions();
    
    // 5. Проверка логики баланса
    const calculatedBalances = await this.checkBalanceCalculationLogic();
    
    this.log('='.repeat(80));
    this.log('📋 ИТОГОВЫЙ ДИАГНОСТИЧЕСКИЙ ОТЧЕТ:');
    this.log('='.repeat(80));
    
    if (currentBalance) {
      this.log(`💰 Текущий баланс: ${currentBalance.ton_balance} TON`);
    }
    
    if (targetTransaction) {
      this.log(`✅ Транзакция найдена: ID ${targetTransaction.id}, ${targetTransaction.type}, ${targetTransaction.amount}`);
    } else {
      this.log(`❌ Транзакция с указанным hash НЕ НАЙДЕНА в базе данных`);
    }
    
    if (calculatedBalances) {
      this.log(`🧮 Расчетный баланс: ${calculatedBalances.calculatedTONBalance.toFixed(6)} TON`);
      if (currentBalance) {
        const difference = currentBalance.ton_balance - calculatedBalances.calculatedTONBalance;
        this.log(`📊 Разница: ${difference.toFixed(6)} TON`);
      }
    }
    
    this.log(`📊 Найдено транзакций с 12:00: ${recentTransactions.length}`);
    
    this.log('='.repeat(80));
    this.log('✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
  }
}

// Запуск диагностики
const investigator = new User25TONDisappearanceInvestigator();
investigator.runInvestigation()
  .then(() => {
    console.log('\n🏁 Диагностика успешно завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Ошибка диагностики:', error);
    process.exit(1);
  });