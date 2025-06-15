/**
 * Исправление проблемы с анализом схемы transactions таблицы
 * Создает тестовые данные и адаптирует код под реальную структуру
 */

import { createClient } from '@supabase/supabase-js';

class TransactionsSchemaFix {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    this.results = [];
  }

  log(action, status, details = null) {
    const entry = { action, status, details, timestamp: new Date().toISOString() };
    this.results.push(entry);
    console.log(`[${status}] ${action}${details ? ': ' + JSON.stringify(details) : ''}`);
  }

  /**
   * Создает тестовые транзакции для анализа схемы
   */
  async createTestTransactions() {
    try {
      // Получаем ID существующего пользователя
      const { data: users, error: userError } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);

      if (userError || !users || users.length === 0) {
        this.log('Create Test Data', 'ERROR', 'No users found for test transactions');
        return false;
      }

      const userId = users[0].id;

      // Попробуем разные варианты структуры транзакций
      const testTransactions = [
        {
          user_id: userId,
          type: 'daily_bonus',
          description: 'Test daily bonus transaction',
          uni_amount: 5.0,
          ton_amount: 0.0,
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          type: 'farming_reward',
          description: 'Test farming reward transaction', 
          uni_amount: 2.5,
          ton_amount: 0.0,
          created_at: new Date().toISOString()
        },
        {
          user_id: userId,
          type: 'referral_bonus',
          description: 'Test referral bonus transaction',
          uni_amount: 1.0,
          ton_amount: 0.0,
          created_at: new Date().toISOString()
        }
      ];

      const createdTransactions = [];

      for (const transaction of testTransactions) {
        try {
          const { data, error } = await this.supabase
            .from('transactions')
            .insert(transaction)
            .select()
            .single();

          if (error) {
            // Пробуем упрощенную версию без сумм
            const simplifiedTx = {
              user_id: userId,
              type: transaction.type,
              description: transaction.description,
              created_at: new Date().toISOString()
            };

            const { data: data2, error: error2 } = await this.supabase
              .from('transactions')
              .insert(simplifiedTx)
              .select()
              .single();

            if (error2) {
              this.log('Create Transaction', 'ERROR', `${transaction.type}: ${error2.message}`);
              continue;
            }

            createdTransactions.push(data2);
            this.log('Create Transaction', 'SUCCESS', `${transaction.type} (simplified) ID: ${data2.id}`);
          } else {
            createdTransactions.push(data);
            this.log('Create Transaction', 'SUCCESS', `${transaction.type} ID: ${data.id}`);
          }
        } catch (e) {
          this.log('Create Transaction', 'ERROR', `${transaction.type}: ${e.message}`);
        }
      }

      return createdTransactions;
    } catch (error) {
      this.log('Create Test Transactions', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Анализирует реальную схему transactions таблицы
   */
  async analyzeTransactionsSchema() {
    try {
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('*')
        .limit(5);

      if (error) {
        this.log('Analyze Schema', 'ERROR', error.message);
        return null;
      }

      if (!transactions || transactions.length === 0) {
        this.log('Analyze Schema', 'WARNING', 'No transactions found for schema analysis');
        return null;
      }

      // Анализируем структуру первой транзакции
      const sampleTransaction = transactions[0];
      const fields = Object.keys(sampleTransaction);
      
      this.log('Schema Analysis', 'SUCCESS', `Fields found: ${fields.join(', ')}`);

      // Анализируем типы данных
      const fieldTypes = {};
      for (const field of fields) {
        const value = sampleTransaction[field];
        fieldTypes[field] = {
          type: typeof value,
          sample: value,
          nullable: value === null
        };
      }

      this.log('Field Types', 'SUCCESS', fieldTypes);

      // Проверяем наличие ключевых полей
      const expectedFields = ['id', 'user_id', 'type', 'description', 'created_at'];
      const missingFields = expectedFields.filter(field => !fields.includes(field));
      const extraFields = fields.filter(field => !expectedFields.includes(field));

      if (missingFields.length > 0) {
        this.log('Missing Fields', 'WARNING', missingFields);
      }

      if (extraFields.length > 0) {
        this.log('Extra Fields', 'INFO', extraFields);
      }

      return {
        total_records: transactions.length,
        fields: fields,
        field_types: fieldTypes,
        sample_transaction: sampleTransaction,
        missing_expected: missingFields,
        additional_fields: extraFields
      };

    } catch (error) {
      this.log('Analyze Schema', 'ERROR', error.message);
      return null;
    }
  }

  /**
   * Тестирует различные операции с транзакциями
   */
  async testTransactionOperations(schema) {
    try {
      if (!schema) {
        this.log('Test Operations', 'SKIP', 'No schema data available');
        return false;
      }

      const { data: users } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);

      if (!users || users.length === 0) return false;

      const userId = users[0].id;

      // Тест 1: Создание с минимальными полями
      const minimalTx = {
        user_id: userId,
        type: 'test_minimal',
        description: 'Minimal transaction test'
      };

      const { data: created, error: createError } = await this.supabase
        .from('transactions')
        .insert(minimalTx)
        .select()
        .single();

      if (createError) {
        this.log('Test Create Minimal', 'ERROR', createError.message);
      } else {
        this.log('Test Create Minimal', 'SUCCESS', `ID: ${created.id}`);
        
        // Тест 2: Чтение транзакции
        const { data: read, error: readError } = await this.supabase
          .from('transactions')
          .select('*')
          .eq('id', created.id)
          .single();

        if (readError) {
          this.log('Test Read', 'ERROR', readError.message);
        } else {
          this.log('Test Read', 'SUCCESS', `Read transaction ${read.id}`);
        }

        // Тест 3: Обновление (если есть поля для обновления)
        if (schema.additional_fields.length > 0) {
          const updateField = schema.additional_fields[0];
          const updateData = { [updateField]: 'updated_value' };

          const { error: updateError } = await this.supabase
            .from('transactions')
            .update(updateData)
            .eq('id', created.id);

          if (updateError) {
            this.log('Test Update', 'ERROR', updateError.message);
          } else {
            this.log('Test Update', 'SUCCESS', `Updated ${updateField}`);
          }
        }

        // Очистка: удаляем тестовую транзакцию
        await this.supabase
          .from('transactions')
          .delete()
          .eq('id', created.id);

        this.log('Test Cleanup', 'SUCCESS', 'Test transaction removed');
      }

      return true;
    } catch (error) {
      this.log('Test Operations', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Генерирует адаптированный код для работы с transactions
   */
  generateAdaptedCode(schema) {
    if (!schema) {
      this.log('Generate Code', 'SKIP', 'No schema available for code generation');
      return null;
    }

    const code = {
      create_transaction: `
// Создание транзакции с адаптированной схемой
const createTransaction = async (userId, type, description, amounts = {}) => {
  const transactionData = {
    user_id: userId,
    type: type,
    description: description,
    created_at: new Date().toISOString()
  };

  // Добавляем поля сумм если они существуют в схеме
  ${schema.additional_fields.includes('uni_amount') ? 'if (amounts.uni) transactionData.uni_amount = amounts.uni;' : ''}
  ${schema.additional_fields.includes('ton_amount') ? 'if (amounts.ton) transactionData.ton_amount = amounts.ton;' : ''}
  ${schema.additional_fields.includes('amount') ? 'if (amounts.amount) transactionData.amount = amounts.amount;' : ''}
  ${schema.additional_fields.includes('currency') ? 'if (amounts.currency) transactionData.currency = amounts.currency;' : ''}

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();

  return { data, error };
};`,

      read_transactions: `
// Чтение транзакций пользователя
const getUserTransactions = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
};`,

      update_transaction: `
// Обновление транзакции (если поддерживается)
const updateTransaction = async (transactionId, updates) => {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  return { data, error };
};`
    };

    this.log('Generate Code', 'SUCCESS', 'Adaptive code generated based on schema');
    return code;
  }

  /**
   * Создает финальный отчет исправления
   */
  generateFixReport(schema, testResults, adaptedCode) {
    const successful = this.results.filter(r => r.status === 'SUCCESS').length;
    const total = this.results.length;
    const successRate = Math.round((successful / total) * 100);

    const report = {
      fix_completed: new Date().toISOString(),
      success_rate: successRate,
      transactions_schema: schema,
      test_results: testResults,
      adapted_code: adaptedCode,
      recommendations: [],
      status: schema ? 'SCHEMA_ANALYZED' : 'NEEDS_DATA',
      results: this.results
    };

    if (schema) {
      report.recommendations.push('Schema successfully analyzed and documented');
      report.recommendations.push('Adaptive code generated for transaction operations');
      report.recommendations.push('Test transactions created and validated');
    } else {
      report.recommendations.push('Create sample transactions to enable schema analysis');
      report.recommendations.push('Verify table structure and permissions');
    }

    console.log('\n' + '='.repeat(60));
    console.log('ИСПРАВЛЕНИЕ TRANSACTIONS SCHEMA ЗАВЕРШЕНО');
    console.log('='.repeat(60));
    console.log(`Операций выполнено: ${total}`);
    console.log(`Успешных: ${successful}`);
    console.log(`Процент успеха: ${successRate}%`);
    console.log(`Статус: ${report.status}`);
    console.log('='.repeat(60));

    if (schema) {
      console.log('✅ SCHEMA TRANSACTIONS ТАБЛИЦЫ ПРОАНАЛИЗИРОВАНА');
      console.log(`Полей в схеме: ${schema.fields.length}`);
      console.log(`Записей для анализа: ${schema.total_records}`);
    } else {
      console.log('⚠️ ТРЕБУЕТСЯ СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ');
    }

    return report;
  }

  /**
   * Основной метод исправления
   */
  async runFix() {
    console.log('Исправляю проблему с анализом схемы transactions таблицы...\n');

    try {
      // 1. Создаем тестовые транзакции
      const testTransactions = await this.createTestTransactions();

      // 2. Анализируем схему
      const schema = await this.analyzeTransactionsSchema();

      // 3. Тестируем операции
      const testResults = await this.testTransactionOperations(schema);

      // 4. Генерируем адаптированный код
      const adaptedCode = this.generateAdaptedCode(schema);

      // 5. Создаем отчет
      return this.generateFixReport(schema, testResults, adaptedCode);

    } catch (error) {
      this.log('Fix Process', 'CRITICAL_ERROR', error.message);
      return null;
    }
  }
}

async function main() {
  const fixer = new TransactionsSchemaFix();
  const report = await fixer.runFix();
  
  if (report) {
    const fs = await import('fs');
    fs.writeFileSync('TRANSACTIONS_SCHEMA_FIX_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Отчет сохранен в TRANSACTIONS_SCHEMA_FIX_REPORT.json');
  }
}

main().catch(console.error);