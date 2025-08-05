#!/usr/bin/env tsx

/**
 * ДИАГНОСТИКА ПРОБЛЕМЫ С ДЕПОЗИТАМИ
 * Проверяем почему депозиты пользователя ID 25 не записываются в БД
 */

import { supabase } from './core/supabase';
import { logger } from './core/logger';

interface DiagnosisResult {
  step: string;
  status: 'OK' | 'ERROR' | 'WARNING';
  details: any;
  timestamp: string;
}

class DepositDiagnosisService {
  private results: DiagnosisResult[] = [];
  private userId = 25;

  async runDiagnosis(): Promise<void> {
    console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С ДЕПОЗИТАМИ');
    console.log('=' .repeat(60));
    console.log(`🎯 Фокус на пользователе ID: ${this.userId}`);
    console.log('⚠️  ВАЖНО: Никаких изменений кода не делаем!');
    console.log('=' .repeat(60));

    try {
      await this.checkUserExists();
      await this.checkRecentTransactions();
      await this.checkUserBalance();
      await this.checkSystemLogs();
      await this.checkWalletController();
      await this.checkTonApiStatus();
      await this.checkDeduplicationLogic();
      await this.generateSummary();

    } catch (error) {
      console.error('💥 Критическая ошибка диагностики:', error);
    }
  }

  private async checkUserExists(): Promise<void> {
    console.log('\n👤 Шаг 1: Проверка существования пользователя...');
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', this.userId)
        .single();

      if (error) {
        this.addResult('User Check', 'ERROR', { error: error.message });
        console.log(`  ❌ Пользователь ${this.userId} не найден:`, error.message);
        return;
      }

      this.addResult('User Check', 'OK', {
        userId: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        balanceUni: user.balance_uni,
        balanceTon: user.balance_ton,
        lastActive: user.last_active
      });

      console.log(`  ✅ Пользователь найден:`);
      console.log(`    📱 Telegram ID: ${user.telegram_id}`);
      console.log(`    👤 Username: ${user.username || 'не указан'}`);
      console.log(`    💰 UNI баланс: ${user.balance_uni}`);
      console.log(`    💎 TON баланс: ${user.balance_ton}`);
      console.log(`    🕒 Последняя активность: ${user.last_active}`);

    } catch (error) {
      this.addResult('User Check', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки пользователя:', error);
    }
  }

  private async checkRecentTransactions(): Promise<void> {
    console.log('\n💸 Шаг 2: Проверка последних транзакций...');
    
    try {
      // Проверяем все транзакции за последние 2 часа
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', this.userId)
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });

      if (error) {
        this.addResult('Recent Transactions', 'ERROR', { error: error.message });
        console.log('  ❌ Ошибка получения транзакций:', error.message);
        return;
      }

      console.log(`  📊 Найдено транзакций за последние 2 часа: ${transactions?.length || 0}`);

      if (transactions && transactions.length > 0) {
        console.log('  📋 Последние транзакции:');
        transactions.forEach((tx, index) => {
          console.log(`    ${index + 1}. ID: ${tx.id}, Тип: ${tx.type}, Сумма TON: ${tx.amount_ton || '0'}, Статус: ${tx.status}`);
          console.log(`       Время: ${tx.created_at}, Hash: ${tx.tx_hash_unique || 'нет'}`);
        });
      } else {
        console.log('  ⚠️  НЕТ ТРАНЗАКЦИЙ за последние 2 часа!');
      }

      // Проверяем все TON депозиты пользователя
      const { data: tonDeposits, error: tonError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('type', 'TON_DEPOSIT')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!tonError && tonDeposits) {
        console.log(`  💎 Всего TON депозитов: ${tonDeposits.length}`);
        if (tonDeposits.length > 0) {
          console.log('  📋 Последние TON депозиты:');
          tonDeposits.forEach((tx, index) => {
            console.log(`    ${index + 1}. Сумма: ${tx.amount_ton}, Статус: ${tx.status}, Время: ${tx.created_at}`);
          });
        }
      }

      this.addResult('Recent Transactions', 'OK', {
        recentCount: transactions?.length || 0,
        tonDepositsCount: tonDeposits?.length || 0,
        transactions: transactions?.slice(0, 3) || []
      });

    } catch (error) {
      this.addResult('Recent Transactions', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки транзакций:', error);
    }
  }

  private async checkUserBalance(): Promise<void> {
    console.log('\n💰 Шаг 3: Проверка текущего баланса...');
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('balance_uni, balance_ton, updated_at, last_active')
        .eq('id', this.userId)
        .single();

      if (error) {
        this.addResult('Balance Check', 'ERROR', { error: error.message });
        console.log('  ❌ Ошибка получения баланса:', error.message);
        return;
      }

      console.log('  💰 Текущий баланс пользователя:');
      console.log(`    UNI: ${user.balance_uni}`);
      console.log(`    TON: ${user.balance_ton}`);
      console.log(`    Обновлен: ${user.updated_at}`);
      console.log(`    Активен: ${user.last_active}`);

      // Проверяем является ли баланс корректным числом
      const uniBalance = parseFloat(user.balance_uni || '0');
      const tonBalance = parseFloat(user.balance_ton || '0');

      if (isNaN(uniBalance) || isNaN(tonBalance)) {
        console.log('  ⚠️  ОБНАРУЖЕНЫ НЕКОРРЕКТНЫЕ БАЛАНСЫ!');
        this.addResult('Balance Check', 'WARNING', {
          uniBalance: user.balance_uni,
          tonBalance: user.balance_ton,
          uniValid: !isNaN(uniBalance),
          tonValid: !isNaN(tonBalance)
        });
      } else {
        this.addResult('Balance Check', 'OK', {
          uniBalance: uniBalance,
          tonBalance: tonBalance,
          updatedAt: user.updated_at
        });
      }

    } catch (error) {
      this.addResult('Balance Check', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки баланса:', error);
    }
  }

  private async checkSystemLogs(): Promise<void> {
    console.log('\n📋 Шаг 4: Проверка системных логов...');
    
    try {
      // Проверяем наличие логов в файловой системе
      const fs = require('fs');
      const path = require('path');
      
      const logDirs = ['logs', 'server/logs', './logs'];
      let foundLogs = false;
      
      for (const logDir of logDirs) {
        try {
          if (fs.existsSync(logDir)) {
            const files = fs.readdirSync(logDir);
            console.log(`  📁 Найдена папка логов: ${logDir}`);
            console.log(`  📄 Файлы: ${files.join(', ')}`);
            foundLogs = true;
            
            // Проверяем последние записи в логах
            for (const file of files.slice(0, 3)) {
              const logPath = path.join(logDir, file);
              try {
                const content = fs.readFileSync(logPath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                console.log(`    📝 ${file}: ${lines.length} строк, последняя: ${lines[lines.length - 1]?.substring(0, 100)}...`);
              } catch (readError) {
                console.log(`    ❌ Не удалось прочитать ${file}: ${readError.message}`);
              }
            }
          }
        } catch (dirError) {
          // Игнорируем ошибки доступа к директориям
        }
      }
      
      if (!foundLogs) {
        console.log('  ⚠️  Логи не найдены в стандартных местах');
      }

      this.addResult('System Logs', foundLogs ? 'OK' : 'WARNING', { logsFound: foundLogs });

    } catch (error) {
      this.addResult('System Logs', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки логов:', error);
    }
  }

  private async checkWalletController(): Promise<void> {
    console.log('\n🔗 Шаг 5: Проверка WalletController...');
    
    try {
      // Проверяем существование и доступность WalletController
      let walletControllerExists = false;
      let controllerPath = '';
      
      const possiblePaths = [
        'modules/wallet/controller.ts',
        'server/modules/wallet/controller.ts',
        'src/modules/wallet/controller.ts'
      ];
      
      const fs = require('fs');
      
      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          walletControllerExists = true;
          controllerPath = path;
          break;
        }
      }
      
      console.log(`  📁 WalletController найден: ${walletControllerExists}`);
      if (walletControllerExists) {
        console.log(`  📄 Путь: ${controllerPath}`);
        
        // Читаем содержимое для проверки методов
        const content = fs.readFileSync(controllerPath, 'utf8');
        const hasProcessDeposit = content.includes('processDeposit') || content.includes('deposit');
        const hasTonHandling = content.includes('TON') || content.includes('ton');
        
        console.log(`  🔍 Содержит обработку депозитов: ${hasProcessDeposit}`);
        console.log(`  🔍 Содержит обработку TON: ${hasTonHandling}`);
        
        this.addResult('Wallet Controller', 'OK', {
          exists: true,
          path: controllerPath,
          hasProcessDeposit,
          hasTonHandling
        });
      } else {
        console.log('  ❌ WalletController не найден!');
        this.addResult('Wallet Controller', 'ERROR', { exists: false });
      }

    } catch (error) {
      this.addResult('Wallet Controller', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки WalletController:', error);
    }
  }

  private async checkTonApiStatus(): Promise<void> {
    console.log('\n🌐 Шаг 6: Проверка TON API...');
    
    try {
      // Проверяем переменные окружения
      const tonApiKey = process.env.TON_API_KEY;
      const tonApiUrl = process.env.TON_API_URL;
      
      console.log(`  🔑 TON_API_KEY установлен: ${!!tonApiKey}`);
      console.log(`  🌐 TON_API_URL: ${tonApiUrl || 'не установлен'}`);
      
      if (tonApiKey) {
        console.log(`  🔑 Длина ключа: ${tonApiKey.length} символов`);
      }

      // Проверяем TonAPI SDK
      let tonApiSdkExists = false;
      const fs = require('fs');
      
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        tonApiSdkExists = !!packageJson.dependencies['tonapi-sdk-js'];
        console.log(`  📦 TonAPI SDK установлен: ${tonApiSdkExists}`);
      } catch (packageError) {
        console.log('  ⚠️  Не удалось проверить package.json');
      }

      this.addResult('TON API Status', 'OK', {
        hasApiKey: !!tonApiKey,
        apiUrl: tonApiUrl,
        sdkInstalled: tonApiSdkExists
      });

    } catch (error) {
      this.addResult('TON API Status', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки TON API:', error);
    }
  }

  private async checkDeduplicationLogic(): Promise<void> {
    console.log('\n🔄 Шаг 7: Проверка логики дедупликации...');
    
    try {
      // Проверяем наличие дублированных транзакций для пользователя
      const { data: duplicates, error } = await supabase
        .from('transactions')
        .select('type, amount_ton, created_at, tx_hash_unique')
        .eq('user_id', this.userId)
        .eq('type', 'TON_DEPOSIT')
        .order('created_at', { ascending: false });

      if (error) {
        this.addResult('Deduplication Check', 'ERROR', { error: error.message });
        console.log('  ❌ Ошибка проверки дедупликации:', error.message);
        return;
      }

      const groupedByHash = new Map();
      duplicates?.forEach(tx => {
        const key = tx.tx_hash_unique || 'no_hash';
        if (!groupedByHash.has(key)) {
          groupedByHash.set(key, []);
        }
        groupedByHash.get(key).push(tx);
      });

      let duplicateCount = 0;
      console.log('  🔍 Анализ дедупликации:');
      
      for (const [hash, transactions] of groupedByHash.entries()) {
        if (transactions.length > 1) {
          console.log(`    ⚠️  Дубликат по hash ${hash}: ${transactions.length} транзакций`);
          duplicateCount += transactions.length - 1;
        }
      }

      if (duplicateCount === 0) {
        console.log('  ✅ Дубликатов не обнаружено');
      } else {
        console.log(`  ⚠️  Найдено ${duplicateCount} дубликатов`);
      }

      this.addResult('Deduplication Check', duplicateCount === 0 ? 'OK' : 'WARNING', {
        totalDeposits: duplicates?.length || 0,
        duplicateCount,
        uniqueHashes: groupedByHash.size
      });

    } catch (error) {
      this.addResult('Deduplication Check', 'ERROR', { error: error instanceof Error ? error.message : String(error) });
      console.error('  ❌ Ошибка проверки дедупликации:', error);
    }
  }

  private async generateSummary(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📋 ИТОГОВЫЙ ОТЧЕТ ДИАГНОСТИКИ');
    console.log('='.repeat(60));

    const okCount = this.results.filter(r => r.status === 'OK').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`📊 Статистика: ${okCount} ✅ | ${warningCount} ⚠️  | ${errorCount} ❌`);
    console.log();

    this.results.forEach(result => {
      const icon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} ${result.step}: ${result.status}`);
      
      if (result.status !== 'OK' && result.details.error) {
        console.log(`    💬 ${result.details.error}`);
      }
    });

    console.log('\n🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:');
    
    // Анализируем результаты и предлагаем причины
    const hasUserError = this.results.find(r => r.step === 'User Check' && r.status === 'ERROR');
    const hasRecentTransactions = this.results.find(r => r.step === 'Recent Transactions')?.details?.recentCount > 0;
    const hasWalletController = this.results.find(r => r.step === 'Wallet Controller' && r.status === 'OK');
    const hasTonApi = this.results.find(r => r.step === 'TON API Status')?.details?.hasApiKey;

    if (hasUserError) {
      console.log('  ❌ Пользователь не существует в БД');
    } else if (!hasRecentTransactions) {
      console.log('  ⚠️  Нет недавних транзакций - возможно депозит не обрабатывается');
    }

    if (!hasWalletController) {
      console.log('  ❌ WalletController недоступен или поврежден');
    }

    if (!hasTonApi) {
      console.log('  ❌ TON API не настроен или ключ отсутствует');
    }

    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('  1. Проверить работу TON блокчейн сканера');
    console.log('  2. Убедиться что депозит действительно прошел в блокчейне');
    console.log('  3. Проверить логи сервера на наличие ошибок обработки');
    console.log('  4. Проверить работу WalletController и его методов');
    
    console.log('='.repeat(60));
  }

  private addResult(step: string, status: 'OK' | 'ERROR' | 'WARNING', details: any): void {
    this.results.push({
      step,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

// Запуск диагностики
async function main() {
  const diagnosis = new DepositDiagnosisService();
  await diagnosis.runDiagnosis();
}

main().catch(console.error);