#!/usr/bin/env tsx

/**
 * 🔍 КРИТИЧЕСКОЕ РАССЛЕДОВАНИЕ ИСЧЕЗНОВЕНИЯ TON ДЕПОЗИТА
 * 
 * User ID: 25
 * Дата: 2025-07-27 14:38
 * TX Hash: te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAK5KDJenDlAcnKLgHfnLXIS/a56WoDyxrfmKggTiDPbAT3cMxVfhuejo1szedTXyfQNiygPN8SKWGt7Lh2D+wEFNTRi7RDHXQAAAGJAAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKg7msoAAAAAAAAAAAAAAAAAABs+iZE
 * 
 * Проблема: TON депозит зачислился, а затем исчез без следа
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

// Supabase config using existing configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Не найдены переменные окружения SUPABASE_URL или SUPABASE_KEY');
  console.log('Доступные env переменные:', Object.keys(process.env).filter(key => key.includes('SUP')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TransactionRecord {
  id: number;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface UserBalance {
  id: number;
  balance_uni: number;
  balance_ton: number;
  updated_at: string;
}

async function investigateUser25Deposit() {
  console.log('🔍 НАЧИНАЕМ РАССЛЕДОВАНИЕ ИСЧЕЗНОВЕНИЯ TON ДЕПОЗИТА USER 25');
  console.log('=' .repeat(80));
  
  const targetTxHash = 'te6cckECAgEAAKoAAeGIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKAK5KDJenDlAcnKLgHfnLXIS/a56WoDyxrfmKggTiDPbAT3cMxVfhuejo1szedTXyfQNiygPN8SKWGt7Lh2D+wEFNTRi7RDHXQAAAGJAAHAEAaEIAMtaj5JhEoDmTGdtuWKu2Ndd7Q45BQhTz1ozLYdEVqaKg7msoAAAAAAAAAAAAAAAAAABs+iZE';
  const userId = '25';
  const depositTime = '2025-07-27 14:38:00';
  
  const report: string[] = [];
  report.push('🔍 ТЕХНИЧЕСКОЕ РАССЛЕДОВАНИЕ ИСЧЕЗНОВЕНИЯ TON ДЕПОЗИТА');
  report.push('='.repeat(60));
  report.push(`User ID: ${userId}`);
  report.push(`Время депозита: ${depositTime}`);
  report.push(`TX Hash: ${targetTxHash.substring(0, 50)}...`);
  report.push('');

  try {
    // 1. ПОИСК ТРАНЗАКЦИИ ПО ХЭШУ
    console.log('1️⃣ Поиск транзакции по TX hash...');
    
    const { data: txByHash, error: hashError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or(`description.ilike.%${targetTxHash}%,metadata->>tx_hash.ilike.%${targetTxHash}%,metadata->>ton_tx_hash.ilike.%${targetTxHash}%`)
      .order('created_at', { ascending: false });

    if (hashError) {
      console.error('❌ Ошибка поиска по хэшу:', hashError);
      report.push(`❌ ОШИБКА ПОИСКА ПО ХЭШУ: ${hashError.message}`);
    } else {
      report.push(`1️⃣ ПОИСК ПО TX HASH:`);
      if (txByHash && txByHash.length > 0) {
        report.push(`✅ Найдено ${txByHash.length} транзакций с данным хэшем:`);
        txByHash.forEach((tx: TransactionRecord, index: number) => {
          report.push(`   [${index + 1}] ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount} ${tx.currency}`);
          report.push(`       Status: ${tx.status}, Created: ${tx.created_at}`);
          report.push(`       Description: ${tx.description.substring(0, 100)}...`);
          report.push('');
        });
      } else {
        report.push(`❌ ТРАНЗАКЦИИ С ДАННЫМ ХЭШЕМ НЕ НАЙДЕНЫ`);
      }
    }

    // 2. ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЯ ЗА ПЕРИОД
    console.log('2️⃣ Проверка всех транзакций за период 14:30-15:00...');
    
    const { data: allTxInPeriod, error: periodError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', '2025-07-27T14:30:00')
      .lte('created_at', '2025-07-27T15:00:00')
      .order('created_at', { ascending: true });

    if (periodError) {
      console.error('❌ Ошибка поиска по периоду:', periodError);
      report.push(`❌ ОШИБКА ПОИСКА ПО ПЕРИОДУ: ${periodError.message}`);
    } else {
      report.push(`2️⃣ ВСЕ ТРАНЗАКЦИИ ЗА ПЕРИОД 14:30-15:00:`);
      if (allTxInPeriod && allTxInPeriod.length > 0) {
        report.push(`✅ Найдено ${allTxInPeriod.length} транзакций:`);
        allTxInPeriod.forEach((tx: TransactionRecord, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | ID: ${tx.id} | ${tx.type} | ${tx.amount} ${tx.currency} | ${tx.status}`);
          if (tx.description.includes('deposit')) {
            report.push(`       ⚠️  ДЕПОЗИТ: ${tx.description.substring(0, 80)}...`);
          }
        });
      } else {
        report.push(`❌ НЕТ ТРАНЗАКЦИЙ ЗА УКАЗАННЫЙ ПЕРИОД`);
      }
      report.push('');
    }

    // 3. ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ
    console.log('3️⃣ Проверка текущего баланса пользователя...');
    
    const { data: userBalance, error: balanceError } = await supabase
      .from('users')
      .select('id, balance_uni, balance_ton, updated_at')
      .eq('id', parseInt(userId))
      .single();

    if (balanceError) {
      console.error('❌ Ошибка получения баланса:', balanceError);
      report.push(`❌ ОШИБКА ПОЛУЧЕНИЯ БАЛАНСА: ${balanceError.message}`);
    } else {
      report.push(`3️⃣ ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ:`);
      report.push(`   UNI Balance: ${userBalance.balance_uni}`);
      report.push(`   TON Balance: ${userBalance.balance_ton}`);
      report.push(`   Last Updated: ${userBalance.updated_at}`);
      report.push('');
    }

    // 4. ВСЕ TON ДЕПОЗИТЫ ЗА ПОСЛЕДНИЕ 24 ЧАСА
    console.log('4️⃣ Поиск всех TON депозитов за 24 часа...');
    
    const { data: tonDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-26T14:00:00')
      .or('type.ilike.%DEPOSIT%,description.ilike.%deposit%')
      .order('created_at', { ascending: false });

    if (depositsError) {
      console.error('❌ Ошибка поиска депозитов:', depositsError);
      report.push(`❌ ОШИБКА ПОИСКА TON ДЕПОЗИТОВ: ${depositsError.message}`);
    } else {
      report.push(`4️⃣ ВСЕ TON ДЕПОЗИТЫ ЗА 24 ЧАСА:`);
      if (tonDeposits && tonDeposits.length > 0) {
        report.push(`✅ Найдено ${tonDeposits.length} TON депозитов:`);
        tonDeposits.forEach((tx: TransactionRecord, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | ID: ${tx.id} | ${tx.type} | ${tx.amount} TON | ${tx.status}`);
          report.push(`       Description: ${tx.description.substring(0, 100)}...`);
          if (tx.metadata) {
            report.push(`       Metadata TX Hash: ${tx.metadata.tx_hash || tx.metadata.ton_tx_hash || 'НЕТ'}`);
          }
          report.push('');
        });
      } else {
        report.push(`❌ TON ДЕПОЗИТЫ НЕ НАЙДЕНЫ`);
      }
    }

    // 5. ПОИСК ОБРАТНЫХ ТРАНЗАКЦИЙ (СПИСАНИЯ)
    console.log('5️⃣ Поиск возможных списаний/отмен...');
    
    const { data: withdrawals, error: withdrawalError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-27T14:35:00')
      .lte('created_at', '2025-07-27T15:30:00')
      .lt('amount', 0)
      .order('created_at', { ascending: true });

    if (withdrawalError) {
      console.error('❌ Ошибка поиска списаний:', withdrawalError);
      report.push(`❌ ОШИБКА ПОИСКА СПИСАНИЙ: ${withdrawalError.message}`);
    } else {
      report.push(`5️⃣ ПОИСК СПИСАНИЙ TON ПОСЛЕ ДЕПОЗИТА:`);
      if (withdrawals && withdrawals.length > 0) {
        report.push(`⚠️  НАЙДЕНО ${withdrawals.length} СПИСАНИЙ:`);
        withdrawals.forEach((tx: TransactionRecord, index: number) => {
          report.push(`   [${index + 1}] ${tx.created_at} | ID: ${tx.id} | ${tx.type} | ${tx.amount} TON | ${tx.status}`);
          report.push(`       Description: ${tx.description.substring(0, 100)}...`);
          report.push(`       ⚠️  ВОЗМОЖНАЯ ПРИЧИНА ИСЧЕЗНОВЕНИЯ ДЕПОЗИТА!`);
          report.push('');
        });
      } else {
        report.push(`✅ СПИСАНИЙ НЕ НАЙДЕНО - ДЕПОЗИТ НЕ БЫЛ СПИСАН ЧЕРЕЗ ТРАНЗАКЦИИ`);
      }
    }

    // 6. ПРОВЕРКА tx_hash_unique ДЛЯ ДУБЛИКАТОВ
    console.log('6️⃣ Проверка дедупликации...');
    
    const { data: duplicateCheck, error: dupError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .not('tx_hash_unique', 'is', null)
      .gte('created_at', '2025-07-26T00:00:00')
      .order('created_at', { ascending: false });

    if (dupError) {
      console.error('❌ Ошибка проверки дубликатов:', dupError);
      report.push(`❌ ОШИБКА ПРОВЕРКИ ДУБЛИКАТОВ: ${dupError.message}`);
    } else {
      report.push(`6️⃣ ПРОВЕРКА ДЕДУПЛИКАЦИИ:`);
      if (duplicateCheck && duplicateCheck.length > 0) {
        report.push(`✅ Найдено ${duplicateCheck.length} транзакций с tx_hash_unique:`);
        
        const hashGroups: { [key: string]: TransactionRecord[] } = {};
        duplicateCheck.forEach(tx => {
          const hash = tx.tx_hash_unique;
          if (!hashGroups[hash]) hashGroups[hash] = [];
          hashGroups[hash].push(tx);
        });
        
        Object.entries(hashGroups).forEach(([hash, txs]) => {
          if (txs.length > 1) {
            report.push(`   ⚠️  ДУБЛИКАТ HASH: ${hash.substring(0, 20)}... (${txs.length} транзакций)`);
            txs.forEach(tx => {
              report.push(`      - ID: ${tx.id}, ${tx.type}, ${tx.amount} ${tx.currency}, ${tx.created_at}`);
            });
          }
        });
      } else {
        report.push(`❌ ТРАНЗАКЦИИ С tx_hash_unique НЕ НАЙДЕНЫ`);
      }
    }

    // ИТОГОВЫЙ АНАЛИЗ
    report.push('');
    report.push('🎯 АНАЛИЗ И ВЫВОДЫ:');
    report.push('=' .repeat(40));
    
    const foundDeposit = allTxInPeriod?.find(tx => 
      tx.description.includes('deposit') && tx.amount > 0 && tx.currency === 'TON'
    );
    
    const foundWithdrawal = withdrawals?.find(tx => tx.amount < 0);
    
    if (foundDeposit && !foundWithdrawal) {
      report.push('🔍 ПРЕДВАРИТЕЛЬНЫЙ ДИАГНОЗ:');
      report.push('   - Депозит найден в базе данных');
      report.push('   - Обратная транзакция (списание) НЕ найдена');
      report.push('   - Возможные причины исчезновения:');
      report.push('     1. Системная ошибка в балансе (не отражена в транзакциях)');
      report.push('     2. Rollback на уровне базы данных');
      report.push('     3. Ошибка в WebSocket/кеше отображения');
      report.push('     4. Проблема дедупликации (duplicate handling)');
    } else if (!foundDeposit) {
      report.push('❌ КРИТИЧЕСКАЯ ПРОБЛЕМА:');
      report.push('   - Депозит НЕ найден в базе данных');
      report.push('   - Транзакция могла быть удалена или не записана');
      report.push('   - Требуется проверка логов системы');
    } else if (foundWithdrawal) {
      report.push('⚠️  НАЙДЕНА ПРИЧИНА ИСЧЕЗНОВЕНИЯ:');
      report.push('   - Депозит был списан обратной транзакцией');
      report.push('   - Проверьте детали списания выше');
    }

    // Сохраняем отчет
    const reportContent = report.join('\n');
    const filename = `USER25_TON_DEPOSIT_INVESTIGATION_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.md`;
    
    fs.writeFileSync(filename, reportContent, 'utf8');
    console.log(`📄 Отчет сохранен: ${filename}`);
    
    console.log('\n' + reportContent);
    
    return {
      success: true,
      reportFile: filename,
      foundDeposit: !!foundDeposit,
      foundWithdrawal: !!foundWithdrawal,
      txCount: allTxInPeriod?.length || 0
    };
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА РАССЛЕДОВАНИЯ:', error);
    report.push(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${error}`);
    
    const errorReport = report.join('\n');
    fs.writeFileSync('USER25_INVESTIGATION_ERROR.md', errorReport, 'utf8');
    
    throw error;
  }
}

// Запуск расследования
async function main() {
  try {
    const result = await investigateUser25Deposit();
    console.log('\n✅ РАССЛЕДОВАНИЕ ЗАВЕРШЕНО');
    console.log('Результат:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ РАССЛЕДОВАНИЕ ПРОВАЛЕНО:', error);
    process.exit(1);
  }
}

// Запуск при прямом выполнении файла
main();

export { investigateUser25Deposit };