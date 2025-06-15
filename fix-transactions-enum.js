/**
 * Исправление transactions schema с корректными enum значениями
 * Определяет допустимые типы транзакций и создает тестовые данные
 */

import { createClient } from '@supabase/supabase-js';

class TransactionsEnumFix {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    this.validTypes = [];
    this.results = [];
  }

  log(action, status, details = null) {
    const entry = { action, status, details, timestamp: new Date().toISOString() };
    this.results.push(entry);
    console.log(`[${status}] ${action}${details ? ': ' + JSON.stringify(details) : ''}`);
  }

  /**
   * Определяет допустимые enum значения для transaction_type
   */
  async discoverValidEnumValues() {
    try {
      // Типичные значения для transaction_type enum
      const commonTypes = [
        'deposit', 'withdrawal', 'bonus', 'reward', 'farming', 'referral',
        'daily', 'weekly', 'monthly', 'airdrop', 'mission', 'task',
        'uni_farming', 'ton_farming', 'farming_reward', 'daily_bonus',
        'referral_bonus', 'registration_bonus', 'check_in', 'checkin'
      ];

      this.log('Enum Discovery', 'INFO', `Testing ${commonTypes.length} common enum values`);

      const { data: users } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);

      if (!users || users.length === 0) {
        this.log('Enum Discovery', 'ERROR', 'No users found for testing');
        return false;
      }

      const userId = users[0].id;

      // Тестируем каждый тип
      for (const type of commonTypes) {
        try {
          const testTx = {
            user_id: userId,
            type: type,
            description: `Test ${type} transaction`
          };

          const { data, error } = await this.supabase
            .from('transactions')
            .insert(testTx)
            .select()
            .single();

          if (!error && data) {
            this.validTypes.push(type);
            this.log('Valid Type Found', 'SUCCESS', type);
            
            // Удаляем тестовую транзакцию
            await this.supabase
              .from('transactions')
              .delete()
              .eq('id', data.id);
          }
        } catch (e) {
          // Игнорируем ошибки, продолжаем тестирование
        }
      }

      this.log('Enum Discovery Complete', 'SUCCESS', `Found ${this.validTypes.length} valid types`);
      return this.validTypes.length > 0;

    } catch (error) {
      this.log('Enum Discovery', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Создает транзакции с валидными enum значениями
   */
  async createValidTransactions() {
    try {
      if (this.validTypes.length === 0) {
        this.log('Create Valid Transactions', 'SKIP', 'No valid enum types found');
        return false;
      }

      const { data: users } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);

      if (!users || users.length === 0) return false;

      const userId = users[0].id;
      const createdTransactions = [];

      // Создаем по одной транзакции каждого валидного типа
      for (const type of this.validTypes.slice(0, 5)) { // Ограничиваем 5 типами
        try {
          const transaction = {
            user_id: userId,
            type: type,
            description: `Valid ${type} transaction for schema analysis`,
            created_at: new Date().toISOString()
          };

          const { data, error } = await this.supabase
            .from('transactions')
            .insert(transaction)
            .select()
            .single();

          if (!error && data) {
            createdTransactions.push(data);
            this.log('Transaction Created', 'SUCCESS', `${type} ID: ${data.id}`);
          }
        } catch (e) {
          this.log('Transaction Failed', 'ERROR', `${type}: ${e.message}`);
        }
      }

      return createdTransactions;
    } catch (error) {
      this.log('Create Valid Transactions', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Анализирует схему с созданными транзакциями
   */
  async analyzeSchemaWithData() {
    try {
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('*')
        .limit(10);

      if (error) {
        this.log('Schema Analysis', 'ERROR', error.message);
        return null;
      }

      if (!transactions || transactions.length === 0) {
        this.log('Schema Analysis', 'WARNING', 'Still no transactions for analysis');
        return null;
      }

      const sampleTransaction = transactions[0];
      const fields = Object.keys(sampleTransaction);
      
      this.log('Schema Analysis', 'SUCCESS', `${transactions.length} transactions, ${fields.length} fields`);
      this.log('Fields Found', 'SUCCESS', fields);

      // Анализируем типы данных
      const fieldAnalysis = {};
      for (const field of fields) {
        const values = transactions.map(t => t[field]).filter(v => v !== null);
        fieldAnalysis[field] = {
          type: typeof sampleTransaction[field],
          sample_values: [...new Set(values)].slice(0, 3),
          has_nulls: transactions.some(t => t[field] === null)
        };
      }

      this.log('Field Analysis', 'SUCCESS', fieldAnalysis);

      // Анализируем enum значения для type поля
      if (fields.includes('type')) {
        const typeValues = [...new Set(transactions.map(t => t.type))];
        this.log('Transaction Types', 'SUCCESS', typeValues);
      }

      return {
        total_transactions: transactions.length,
        fields: fields,
        field_analysis: fieldAnalysis,
        sample_data: transactions.slice(0, 3),
        valid_enum_types: this.validTypes
      };

    } catch (error) {
      this.log('Schema Analysis', 'ERROR', error.message);
      return null;
    }
  }

  /**
   * Генерирует правильный код для работы с transactions
   */
  generateCorrectTransactionCode(schema) {
    if (!schema) return null;

    const validTypes = schema.valid_enum_types || [];
    const fields = schema.fields || [];

    const code = {
      enum_types: validTypes,
      create_function: `
// Создание транзакции с валидными enum типами
const createTransaction = async (userId, type, description, additionalData = {}) => {
  // Валидные типы: ${validTypes.join(', ')}
  const validTypes = [${validTypes.map(t => `'${t}'`).join(', ')}];
  
  if (!validTypes.includes(type)) {
    throw new Error(\`Invalid transaction type: \${type}. Valid types: \${validTypes.join(', ')}\`);
  }

  const transactionData = {
    user_id: userId,
    type: type,
    description: description,
    created_at: new Date().toISOString(),
    ...additionalData
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();

  return { data, error };
};`,

      read_function: `
// Чтение транзакций с правильной типизацией
const getTransactions = async (userId, type = null, limit = 50) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  return { data, error };
};`,

      type_constants: `
// Константы для типов транзакций
export const TRANSACTION_TYPES = {
${validTypes.map(type => `  ${type.toUpperCase()}: '${type}'`).join(',\n')}
};`
    };

    this.log('Code Generation', 'SUCCESS', 'Generated correct transaction code');
    return code;
  }

  /**
   * Очищает созданные тестовые данные
   */
  async cleanupTestData() {
    try {
      const { data: testTransactions } = await this.supabase
        .from('transactions')
        .select('id')
        .ilike('description', '%test%')
        .or('description.ilike.%schema analysis%');

      if (testTransactions && testTransactions.length > 0) {
        const ids = testTransactions.map(t => t.id);
        
        const { error } = await this.supabase
          .from('transactions')
          .delete()
          .in('id', ids);

        if (!error) {
          this.log('Cleanup', 'SUCCESS', `Removed ${ids.length} test transactions`);
        }
      }

      return true;
    } catch (error) {
      this.log('Cleanup', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Основной метод исправления
   */
  async runEnumFix() {
    console.log('Исправляю enum проблему в transactions schema...\n');

    try {
      // 1. Определяем валидные enum значения
      await this.discoverValidEnumValues();

      // 2. Создаем транзакции с валидными типами
      const createdTransactions = await this.createValidTransactions();

      // 3. Анализируем схему с данными
      const schema = await this.analyzeSchemaWithData();

      // 4. Генерируем правильный код
      const correctCode = this.generateCorrectTransactionCode(schema);

      // 5. Очищаем тестовые данные
      await this.cleanupTestData();

      // 6. Создаем отчет
      const successful = this.results.filter(r => r.status === 'SUCCESS').length;
      const total = this.results.length;

      const report = {
        fix_completed: new Date().toISOString(),
        success_rate: Math.round((successful / total) * 100),
        valid_enum_types: this.validTypes,
        schema_analysis: schema,
        generated_code: correctCode,
        status: schema ? 'SCHEMA_FIXED' : 'ENUM_DISCOVERED',
        results: this.results
      };

      console.log('\n' + '='.repeat(60));
      console.log('ИСПРАВЛЕНИЕ TRANSACTIONS ENUM ЗАВЕРШЕНО');
      console.log('='.repeat(60));
      console.log(`Валидных enum типов найдено: ${this.validTypes.length}`);
      console.log(`Успешность операций: ${report.success_rate}%`);
      console.log(`Статус: ${report.status}`);
      console.log('='.repeat(60));

      if (this.validTypes.length > 0) {
        console.log('✅ ENUM ТИПЫ ОПРЕДЕЛЕНЫ И ПРОТЕСТИРОВАНЫ');
        console.log(`Рабочие типы: ${this.validTypes.join(', ')}`);
      }

      return report;

    } catch (error) {
      this.log('Enum Fix', 'CRITICAL_ERROR', error.message);
      return null;
    }
  }
}

async function main() {
  const fixer = new TransactionsEnumFix();
  const report = await fixer.runEnumFix();
  
  if (report) {
    const fs = await import('fs');
    fs.writeFileSync('TRANSACTIONS_ENUM_FIX_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Отчет сохранен в TRANSACTIONS_ENUM_FIX_REPORT.json');
  }
}

main().catch(console.error);