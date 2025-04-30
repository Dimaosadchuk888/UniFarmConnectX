import { pool } from '../db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';

/**
 * Сервис для транзакционной работы с базой данных
 * Обеспечивает выполнение нескольких операций в рамках одной транзакции
 */
export class DatabaseService {
  /**
   * Выполняет группу операций в одной транзакции
   * 
   * @param callback Функция с операциями базы данных
   * @returns Результат выполнения callback
   */
  static async withTransaction<T>(callback: (txDb: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    
    try {
      // Начинаем транзакцию
      await client.query('BEGIN');
      
      // Создаем инстанс drizzle с клиентом транзакции
      const txDb = drizzle(client, { schema });
      
      // Вызываем callback с контекстом транзакции
      const result = await callback(txDb);
      
      // Фиксируем транзакцию
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      await client.query('ROLLBACK');
      console.error('[DatabaseService] Ошибка транзакции:', error);
      throw error;
    } finally {
      // Освобождаем клиент
      client.release();
    }
  }
  
  /**
   * Проверяет существование пользователя по ID
   * 
   * @param userId ID пользователя
   * @returns true, если пользователь существует, иначе false
   */
  static async userExists(userId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS exists',
        [userId]
      );
      
      return result.rows[0].exists;
    } catch (error) {
      console.error('[DatabaseService] Ошибка при проверке существования пользователя:', error);
      return false;
    }
  }
  
  /**
   * Проверяет, достаточно ли у пользователя средств для операции
   * 
   * @param userId ID пользователя
   * @param amount Сумма операции
   * @param currency Валюта (UNI или TON)
   * @returns Объект с результатом проверки и балансом пользователя
   */
  static async hasEnoughFunds(userId: number, amount: number, currency: string): Promise<{ 
    hasEnough: boolean; 
    balance: number;
    formattedCurrency: string;
  }> {
    try {
      const formattedCurrency = currency.toUpperCase();
      const balanceField = formattedCurrency === 'UNI' ? 'balance_uni' : 'balance_ton';
      
      const result = await pool.query(
        `SELECT ${balanceField} FROM users WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return { hasEnough: false, balance: 0, formattedCurrency };
      }
      
      const balance = parseFloat(result.rows[0][balanceField] || '0');
      const hasEnough = balance >= amount;
      
      return { hasEnough, balance, formattedCurrency };
    } catch (error) {
      console.error('[DatabaseService] Ошибка при проверке баланса:', error);
      return { hasEnough: false, balance: 0, formattedCurrency: currency.toUpperCase() };
    }
  }
}