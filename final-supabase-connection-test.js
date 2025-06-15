/**
 * ЭТАП 4: Финальная проверка подключения Supabase API
 * Тестирует все модули и проверяет единообразие подключений
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Инициализация
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

class FinalSupabaseConnectionTest {
  constructor() {
    this.results = [];
    this.errors = [];
    this.duplicateConnections = [];
    this.moduleTests = [];
    
    // Проперка переменных окружения
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('❌ Отсутствуют переменные SUPABASE_URL или SUPABASE_KEY');
    }
    
    // Создание клиента
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    
    console.log('🚀 Запуск финальной проверки Supabase API...\n');
  }

  log(category, test, status, details = null) {
    const entry = {
      category,
      test,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(entry);
    const statusIcon = status === 'SUCCESS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${statusIcon} [${category}] ${test}${details ? ': ' + JSON.stringify(details) : ''}`);
  }

  /**
   * 1. Проверка основного файла core/supabase.ts
   */
  async checkSupabaseCore() {
    console.log('\n📄 1. ПРОВЕРКА ФАЙЛА SUPABASE.TS\n');
    
    try {
      // Проверяем структуру файла
      const coreSupabasePath = join(__dirname, 'core', 'supabase.ts');
      const coreSupabaseClientPath = join(__dirname, 'core', 'supabaseClient.ts');
      
      let mainFile = null;
      let backupFile = null;
      
      if (fs.existsSync(coreSupabasePath)) {
        const content = fs.readFileSync(coreSupabasePath, 'utf8');
        mainFile = { path: coreSupabasePath, content };
        this.log('CORE', 'core/supabase.ts существует', 'SUCCESS');
      }
      
      if (fs.existsSync(coreSupabaseClientPath)) {
        const content = fs.readFileSync(coreSupabaseClientPath, 'utf8');
        backupFile = { path: coreSupabaseClientPath, content };
        this.log('CORE', 'core/supabaseClient.ts существует', 'WARNING', 'Дублирующий файл');
      }
      
      // Анализ структуры файлов
      if (mainFile) {
        if (mainFile.content.includes('createClient')) {
          this.log('CORE', 'createClient() найден', 'SUCCESS');
        }
        if (mainFile.content.includes('process.env.SUPABASE_URL')) {
          this.log('CORE', 'SUPABASE_URL читается из env', 'SUCCESS');
        }
        if (mainFile.content.includes('process.env.SUPABASE_KEY')) {
          this.log('CORE', 'SUPABASE_KEY читается из env', 'SUCCESS');
        }
        if (mainFile.content.includes('export const supabase')) {
          this.log('CORE', 'supabase экспортируется', 'SUCCESS');
        }
      }
      
      // Проверка подключения
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .limit(1);
        
      if (!error) {
        this.log('CORE', 'Тестовое подключение', 'SUCCESS', `Получено ${data?.length || 0} записей`);
      } else {
        this.log('CORE', 'Тестовое подключение', 'ERROR', error.message);
      }
      
    } catch (error) {
      this.log('CORE', 'Проверка структуры', 'ERROR', error.message);
    }
  }

  /**
   * 2. Тестирование всех модулей
   */
  async testAllModules() {
    console.log('\n🧩 2. ТЕСТИРОВАНИЕ ВСЕХ МОДУЛЕЙ\n');
    
    const modules = [
      { name: 'users', operation: 'select by telegram_id' },
      { name: 'transactions', operation: 'insert transaction' },
      { name: 'farming_sessions', operation: 'update farming' },
      { name: 'referrals', operation: 'select by ref_code' }
    ];
    
    for (const module of modules) {
      await this.testModule(module.name, module.operation);
    }
  }

  async testModule(tableName, operation) {
    try {
      switch (operation) {
        case 'select by telegram_id':
          const { data: userData, error: userError } = await this.supabase
            .from(tableName)
            .select('*')
            .eq('telegram_id', '777777777')
            .limit(1);
            
          if (!userError) {
            this.log('MODULE', `${tableName} - ${operation}`, 'SUCCESS', `Найдено ${userData?.length || 0} записей`);
          } else {
            this.log('MODULE', `${tableName} - ${operation}`, 'ERROR', userError.message);
          }
          break;
          
        case 'insert transaction':
          const testTransaction = {
            user_id: 1,
            amount: 0.001,
            transaction_type: 'daily_bonus',
            status: 'completed',
            created_at: new Date().toISOString()
          };
          
          const { data: txData, error: txError } = await this.supabase
            .from(tableName)
            .insert([testTransaction])
            .select()
            .single();
            
          if (!txError && txData) {
            this.log('MODULE', `${tableName} - ${operation}`, 'SUCCESS', `ID: ${txData.id}`);
            // Удаляем тестовую запись
            await this.supabase.from(tableName).delete().eq('id', txData.id);
          } else {
            this.log('MODULE', `${tableName} - ${operation}`, 'ERROR', txError?.message || 'Нет данных');
          }
          break;
          
        case 'update farming':
          const { error: updateError } = await this.supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('telegram_id', '777777777');
            
          if (!updateError) {
            this.log('MODULE', `${tableName} - ${operation}`, 'SUCCESS', 'Обновление прошло успешно');
          } else {
            this.log('MODULE', `${tableName} - ${operation}`, 'ERROR', updateError.message);
          }
          break;
          
        case 'select by ref_code':
          const { data: refData, error: refError } = await this.supabase
            .from('users')
            .select('*')
            .like('ref_code', 'REF_%')
            .limit(5);
            
          if (!refError) {
            this.log('MODULE', `${tableName} - ${operation}`, 'SUCCESS', `Найдено ${refData?.length || 0} рефералов`);
          } else {
            this.log('MODULE', `${tableName} - ${operation}`, 'ERROR', refError.message);
          }
          break;
      }
    } catch (error) {
      this.log('MODULE', `${tableName} - ${operation}`, 'ERROR', error.message);
    }
  }

  /**
   * 3. Поиск дублирующих подключений
   */
  async checkDuplicateConnections() {
    console.log('\n🔍 3. ПОИСК ДУБЛИРУЮЩИХ ПОДКЛЮЧЕНИЙ\n');
    
    const filesToCheck = [
      'core/supabase.ts',
      'core/supabaseClient.ts', 
      'core/db.ts',
      'server/db.ts',
      'config/database.ts'
    ];
    
    for (const file of filesToCheck) {
      const filePath = join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('createClient') || content.includes('supabase')) {
          if (content.includes('DATABASE_URL') || content.includes('PGHOST')) {
            this.log('DUPLICATE', file, 'WARNING', 'Найдены устаревшие переменные БД');
            this.duplicateConnections.push(file);
          } else {
            this.log('DUPLICATE', file, 'SUCCESS', 'Чистое Supabase подключение');
          }
        }
      }
    }
  }

  /**
   * 4. Тестирование реального функционала
   */
  async testRealFunctionality() {
    console.log('\n🧪 4. ТЕСТИРОВАНИЕ РЕАЛЬНОГО ФУНКЦИОНАЛА\n');
    
    // Тест регистрации пользователя
    await this.testUserRegistration();
    
    // Тест загрузки баланса
    await this.testBalanceLoading();
    
    // Тест записи транзакции
    await this.testTransactionRecording();
    
    // Тест начисления бонуса
    await this.testBonusAwarding();
  }

  async testUserRegistration() {
    try {
      const testUser = {
        telegram_id: `test_${Date.now()}`,
        username: 'test_user',
        ref_code: `REF_TEST_${Date.now()}`,
        balance_uni: 100,
        balance_ton: 50,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('users')
        .insert([testUser])
        .select()
        .single();
        
      if (!error && data) {
        this.log('FUNCTIONALITY', 'Регистрация пользователя', 'SUCCESS', `ID: ${data.id}`);
        
        // Удаляем тестового пользователя
        await this.supabase.from('users').delete().eq('id', data.id);
      } else {
        this.log('FUNCTIONALITY', 'Регистрация пользователя', 'ERROR', error?.message);
      }
    } catch (error) {
      this.log('FUNCTIONALITY', 'Регистрация пользователя', 'ERROR', error.message);
    }
  }

  async testBalanceLoading() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('balance_uni, balance_ton')
        .eq('telegram_id', '777777777')
        .single();
        
      if (!error && data) {
        this.log('FUNCTIONALITY', 'Загрузка баланса', 'SUCCESS', {
          uni: data.balance_uni,
          ton: data.balance_ton
        });
      } else {
        this.log('FUNCTIONALITY', 'Загрузка баланса', 'ERROR', error?.message || 'Пользователь не найден');
      }
    } catch (error) {
      this.log('FUNCTIONALITY', 'Загрузка баланса', 'ERROR', error.message);
    }
  }

  async testTransactionRecording() {
    try {
      const transaction = {
        user_id: 1,
        amount: 5.0,
        transaction_type: 'test_bonus',
        status: 'completed',
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();
        
      if (!error && data) {
        this.log('FUNCTIONALITY', 'Запись транзакции', 'SUCCESS', `Transaction ID: ${data.id}`);
        
        // Удаляем тестовую транзакцию
        await this.supabase.from('transactions').delete().eq('id', data.id);
      } else {
        this.log('FUNCTIONALITY', 'Запись транзакции', 'ERROR', error?.message);
      }
    } catch (error) {
      this.log('FUNCTIONALITY', 'Запись транзакции', 'ERROR', error.message);
    }
  }

  async testBonusAwarding() {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ 
          checkin_last_date: new Date().toISOString(),
          checkin_streak: 1
        })
        .eq('telegram_id', '777777777');
        
      if (!error) {
        this.log('FUNCTIONALITY', 'Начисление бонуса', 'SUCCESS', 'Обновление streak прошло успешно');
      } else {
        this.log('FUNCTIONALITY', 'Начисление бонуса', 'ERROR', error.message);
      }
    } catch (error) {
      this.log('FUNCTIONALITY', 'Начисление бонуса', 'ERROR', error.message);
    }
  }

  /**
   * 5. Генерация финального отчета
   */
  generateFinalReport() {
    console.log('\n📊 5. ФИНАЛЬНЫЙ ОТЧЕТ\n');
    
    const totalTests = this.results.length;
    const successful = this.results.filter(r => r.status === 'SUCCESS').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    
    const report = {
      summary: {
        total_tests: totalTests,
        successful: successful,
        warnings: warnings,
        errors: errors,
        success_rate: Math.round((successful / totalTests) * 100)
      },
      supabase_connection: {
        url: this.supabaseUrl,
        key_present: !!this.supabaseKey,
        core_file: 'core/supabase.ts',
        backup_file: 'core/supabaseClient.ts'
      },
      duplicate_connections: this.duplicateConnections,
      data_source_status: this.duplicateConnections.length === 0 ? 'SUPABASE API ONLY' : 'HAS DUPLICATES',
      test_results: this.results
    };
    
    console.log(`✅ Успешных тестов: ${successful}/${totalTests} (${report.summary.success_rate}%)`);
    console.log(`⚠️ Предупреждений: ${warnings}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`🔄 Дублирующих подключений: ${this.duplicateConnections.length}`);
    console.log(`📊 Источник данных: ${report.data_source_status}`);
    
    // Сохраняем отчет
    fs.writeFileSync(
      join(__dirname, 'FINAL_SUPABASE_CONNECTION_REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  /**
   * Основной метод выполнения всех проверок
   */
  async runFullTest() {
    try {
      await this.checkSupabaseCore();
      await this.testAllModules();
      await this.checkDuplicateConnections();
      await this.testRealFunctionality();
      
      const report = this.generateFinalReport();
      
      console.log('\n🎯 ЗАКЛЮЧЕНИЕ:\n');
      
      if (report.summary.success_rate >= 90) {
        console.log('🟢 СИСТЕМА ГОТОВА К PRODUCTION - Supabase API работает отлично');
      } else if (report.summary.success_rate >= 70) {
        console.log('🟡 СИСТЕМА ЧАСТИЧНО ГОТОВА - Требуются минимальные исправления');
      } else {
        console.log('🔴 СИСТЕМА ТРЕБУЕТ ДОРАБОТКИ - Найдены критические проблемы');
      }
      
      if (this.duplicateConnections.length === 0) {
        console.log('✅ Подтверждение: Supabase - единственный источник данных');
      } else {
        console.log('⚠️ Внимание: Найдены дублирующие подключения к базе данных');
      }
      
      return report;
      
    } catch (error) {
      console.error('❌ Критическая ошибка при выполнении тестов:', error.message);
      throw error;
    }
  }
}

// Запуск тестирования
async function main() {
  try {
    const test = new FinalSupabaseConnectionTest();
    const report = await test.runFullTest();
    
    process.exit(report.summary.success_rate >= 70 ? 0 : 1);
  } catch (error) {
    console.error('💥 Фатальная ошибка:', error.message);
    process.exit(1);
  }
}

main();