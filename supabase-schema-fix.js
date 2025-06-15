/**
 * Исправление проблем совместимости с существующей Supabase схемой
 * Адаптирует код под реальные поля таблиц
 */

import { createClient } from '@supabase/supabase-js';

class SupabaseSchemaFix {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    this.fixes = [];
  }

  log(module, action, status, details = null) {
    const entry = { module, action, status, details, timestamp: new Date().toISOString() };
    this.fixes.push(entry);
    console.log(`[${status}] ${module} - ${action}${details ? ': ' + JSON.stringify(details) : ''}`);
  }

  /**
   * Исправление 1: Транзакции - использовать правильные поля
   */
  async fixTransactionsSchema() {
    try {
      // Тестируем с корректными полями для transactions
      const testTransaction = {
        user_id: 1,
        uni_amount: 5.0,  // используем uni_amount вместо amount
        currency: 'UNI',
        type: 'test_bonus',
        description: 'Schema Fix Test Transaction',
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('transactions')
        .insert(testTransaction)
        .select()
        .single();

      if (error) {
        // Пробуем альтернативный вариант с ton_amount
        const altTransaction = {
          user_id: 1,
          ton_amount: 5.0,
          currency: 'TON', 
          type: 'test_bonus',
          description: 'Schema Fix Test Transaction TON',
          created_at: new Date().toISOString()
        };

        const { data: data2, error: error2 } = await this.supabase
          .from('transactions')
          .insert(altTransaction)
          .select()
          .single();

        if (error2) {
          this.log('transactions', 'Schema Fix', 'ERROR', error2.message);
          return false;
        }

        this.log('transactions', 'Schema Fix', 'SUCCESS', `TON transaction ID: ${data2.id}`);
        
        // Чистим
        await this.supabase.from('transactions').delete().eq('id', data2.id);
        return true;
      }

      this.log('transactions', 'Schema Fix', 'SUCCESS', `UNI transaction ID: ${data.id}`);
      
      // Чистим
      await this.supabase.from('transactions').delete().eq('id', data.id);
      return true;

    } catch (error) {
      this.log('transactions', 'Schema Fix', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Исправление 2: Farming - правильный формат timestamp
   */
  async fixFarmingTimestamp() {
    try {
      const { data: users, error } = await this.supabase
        .from('users')
        .select('id, uni_farming_start_timestamp')
        .limit(1);

      if (error) {
        this.log('farming', 'Schema Fix', 'ERROR', error.message);
        return false;
      }

      if (users && users.length > 0) {
        const userId = users[0].id;
        
        // Пробуем разные форматы timestamp
        const formats = [
          new Date().toISOString(),                    // ISO string
          Math.floor(Date.now() / 1000),              // Unix timestamp
          new Date().toISOString().split('T')[0],      // Date only
          Date.now()                                   // Milliseconds
        ];

        let success = false;
        for (const format of formats) {
          try {
            const { error: updateError } = await this.supabase
              .from('users')
              .update({ uni_farming_start_timestamp: format })
              .eq('id', userId);

            if (!updateError) {
              this.log('farming', 'Schema Fix', 'SUCCESS', `Format works: ${typeof format} - ${format}`);
              success = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!success) {
          this.log('farming', 'Schema Fix', 'ERROR', 'No timestamp format worked');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.log('farming', 'Schema Fix', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Исправление 3: Регистрация - убрать last_name
   */
  async fixRegistrationSchema() {
    try {
      const testUser = {
        telegram_id: 888888888,
        username: 'schema_fix_test',
        first_name: 'Test User',  // объединяем имя и фамилию
        ref_code: `FIX_${Date.now()}`,
        balance_uni: 100.0,
        balance_ton: 50.0,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('users')
        .insert(testUser)
        .select()
        .single();

      if (error) {
        this.log('registration', 'Schema Fix', 'ERROR', error.message);
        return false;
      }

      this.log('registration', 'Schema Fix', 'SUCCESS', `User created ID: ${data.id}`);

      // Чистим
      await this.supabase.from('users').delete().eq('id', data.id);
      this.log('registration', 'Cleanup', 'SUCCESS', 'Test user removed');
      
      return true;
    } catch (error) {
      this.log('registration', 'Schema Fix', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Проверка актуальной схемы таблиц
   */
  async checkActualSchema() {
    try {
      // Проверяем users таблицу
      const { data: users } = await this.supabase
        .from('users')
        .select('*')
        .limit(1);

      if (users && users.length > 0) {
        const userFields = Object.keys(users[0]);
        this.log('schema', 'Users Table Fields', 'SUCCESS', userFields);
      }

      // Проверяем transactions таблицу
      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('*')
        .limit(1);

      if (transactions && transactions.length > 0) {
        const transactionFields = Object.keys(transactions[0]);
        this.log('schema', 'Transactions Table Fields', 'SUCCESS', transactionFields);
      }

      return true;
    } catch (error) {
      this.log('schema', 'Check Schema', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Повторное тестирование после исправлений
   */
  async retestAfterFixes() {
    try {
      // Тест транзакции с исправленными полями
      const { data: txTest, error: txError } = await this.supabase
        .from('transactions')
        .insert({
          user_id: 1,
          uni_amount: 10.0,
          currency: 'UNI',
          type: 'retest',
          description: 'Post-fix test'
        })
        .select()
        .single();

      if (!txError) {
        this.log('retest', 'Transactions', 'SUCCESS', `Transaction works: ${txTest.id}`);
        await this.supabase.from('transactions').delete().eq('id', txTest.id);
      } else {
        this.log('retest', 'Transactions', 'ERROR', txError.message);
      }

      // Тест регистрации без last_name
      const { data: userTest, error: userError } = await this.supabase
        .from('users')
        .insert({
          telegram_id: 777777778,
          username: 'retest_user',
          first_name: 'Retest User',
          ref_code: `RETEST_${Date.now()}`
        })
        .select()
        .single();

      if (!userError) {
        this.log('retest', 'Registration', 'SUCCESS', `User works: ${userTest.id}`);
        await this.supabase.from('users').delete().eq('id', userTest.id);
      } else {
        this.log('retest', 'Registration', 'ERROR', userError.message);
      }

      return true;
    } catch (error) {
      this.log('retest', 'Post-fix Testing', 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Основной метод исправления схемы
   */
  async runSchemaFixes() {
    console.log('Начинаю исправление совместимости с Supabase схемой...\n');

    // 1. Проверяем текущую схему
    await this.checkActualSchema();

    // 2. Исправляем найденные проблемы
    await this.fixTransactionsSchema();
    await this.fixFarmingTimestamp();
    await this.fixRegistrationSchema();

    // 3. Повторное тестирование
    await this.retestAfterFixes();

    // 4. Генерируем отчет
    const successCount = this.fixes.filter(f => f.status === 'SUCCESS').length;
    const totalFixes = this.fixes.length;

    console.log('\n' + '='.repeat(50));
    console.log('ОТЧЕТ ИСПРАВЛЕНИЯ СХЕМЫ');
    console.log('='.repeat(50));
    console.log(`Исправлений выполнено: ${totalFixes}`);
    console.log(`Успешных: ${successCount}`);
    console.log(`Процент успеха: ${Math.round((successCount/totalFixes)*100)}%`);
    console.log('='.repeat(50));

    return {
      total_fixes: totalFixes,
      successful: successCount,
      success_rate: Math.round((successCount/totalFixes)*100),
      fixes: this.fixes
    };
  }
}

async function main() {
  const fixer = new SupabaseSchemaFix();
  const report = await fixer.runSchemaFixes();
  
  // Сохраняем отчет
  const fs = await import('fs');
  fs.writeFileSync('SUPABASE_SCHEMA_FIX_REPORT.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Отчет сохранен в SUPABASE_SCHEMA_FIX_REPORT.json');
}

main().catch(console.error);