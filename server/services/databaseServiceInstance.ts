/**
 * Сервис для работы с базой данных
 * 
 * Предоставляет унифицированный интерфейс для выполнения запросов к базе данных,
 * управления подключениями и мониторинга состояния базы данных.
 */

import { db } from '../db';
import { SQL, eq, and, or, desc, sql } from 'drizzle-orm';

export interface IDatabaseService {
  /**
   * Проверка состояния подключения к базе данных
   */
  checkConnection(): Promise<{ isConnected: boolean, error?: string }>;
  
  /**
   * Получение информации о состоянии базы данных
   */
  getDatabaseStatus(): Promise<{
    connectionStatus: string;
    tablesCount?: number;
    lastOperations?: Array<{ query: string, timestamp: Date }>;
    error?: string;
  }>;
  
  /**
   * Выполнение произвольного SQL-запроса
   */
  executeRawQuery<T = any>(query: string, params?: any[]): Promise<T[]>;
  
  /**
   * Получение списка таблиц в базе данных
   */
  getTablesList(): Promise<string[]>;
  
  /**
   * Получение информации о структуре таблицы
   */
  getTableInfo(tableName: string): Promise<{
    columns: Array<{ name: string, type: string, nullable: boolean }>;
    constraints: Array<{ name: string, type: string, definition: string }>;
    indexes: Array<{ name: string, definition: string }>;
  }>;
  
  /**
   * Создание резервной копии данных таблицы
   */
  backupTable(tableName: string): Promise<{ success: boolean, backupData?: any[], error?: string }>;
  
  /**
   * Проверка целостности данных
   */
  checkDataIntegrity(options?: { tables?: string[], relations?: boolean }): Promise<{
    success: boolean;
    issues: Array<{ table: string, issue: string, severity: 'high' | 'medium' | 'low' }>;
  }>;
}

class DatabaseService implements IDatabaseService {
  // Хранит информацию о последних запросах (для отладки)
  private lastQueries: Array<{ query: string, timestamp: Date }> = [];
  private readonly MAX_QUERY_HISTORY = 20;
  
  // Добавляет запрос в историю
  private logQuery(query: string): void {
    this.lastQueries.unshift({ query, timestamp: new Date() });
    if (this.lastQueries.length > this.MAX_QUERY_HISTORY) {
      this.lastQueries.pop();
    }
  }
  
  /**
   * Проверка состояния подключения к базе данных
   */
  async checkConnection(): Promise<{ isConnected: boolean, error?: string }> {
    try {
      // Проверяем соединение, выполняя простой запрос
      await db.execute(sql`SELECT 1`);
      return { isConnected: true };
    } catch (error) {
      console.error('[DatabaseService] Ошибка проверки соединения:', error);
      return { 
        isConnected: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Получение информации о состоянии базы данных
   */
  async getDatabaseStatus(): Promise<{
    connectionStatus: string;
    tablesCount?: number;
    lastOperations?: Array<{ query: string, timestamp: Date }>;
    error?: string;
  }> {
    try {
      // Проверяем соединение
      const connectionCheck = await this.checkConnection();
      
      if (!connectionCheck.isConnected) {
        return {
          connectionStatus: 'disconnected',
          error: connectionCheck.error
        };
      }
      
      // Получаем количество таблиц
      const tablesCountResult = await this.executeRawQuery<{count: string}>(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1',
        ['public']
      );
      
      const tablesCount = parseInt(tablesCountResult[0]?.count || '0', 10);
      
      return {
        connectionStatus: 'connected',
        tablesCount,
        lastOperations: [...this.lastQueries]
      };
    } catch (error) {
      console.error('[DatabaseService] Ошибка получения статуса базы данных:', error);
      return {
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Выполнение произвольного SQL-запроса
   */
  async executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      this.logQuery(query);
      const result = await db.execute(sql.raw(query, params));
      return result.rows as T[];
    } catch (error) {
      console.error('[DatabaseService] Ошибка выполнения запроса:', error);
      throw error;
    }
  }
  
  /**
   * Получение списка таблиц в базе данных
   */
  async getTablesList(): Promise<string[]> {
    try {
      const tables = await this.executeRawQuery<{table_name: string}>(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
        ['public']
      );
      
      return tables.map(t => t.table_name);
    } catch (error) {
      console.error('[DatabaseService] Ошибка получения списка таблиц:', error);
      throw error;
    }
  }
  
  /**
   * Получение информации о структуре таблицы
   */
  async getTableInfo(tableName: string): Promise<{
    columns: Array<{ name: string, type: string, nullable: boolean }>;
    constraints: Array<{ name: string, type: string, definition: string }>;
    indexes: Array<{ name: string, definition: string }>;
  }> {
    try {
      // Получаем информацию о колонках
      const columns = await this.executeRawQuery<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
      );
      
      // Получаем информацию об ограничениях
      const constraints = await this.executeRawQuery<{
        constraint_name: string;
        constraint_type: string;
        definition: string;
      }>(
        `SELECT c.constraint_name, c.constraint_type, 
                pgc.definition as definition
         FROM information_schema.table_constraints c
         LEFT JOIN pg_constraint pgc 
           ON c.constraint_name = pgc.conname
         WHERE c.table_schema = 'public' AND c.table_name = $1`,
        [tableName]
      );
      
      // Получаем информацию об индексах
      const indexes = await this.executeRawQuery<{
        indexname: string;
        indexdef: string;
      }>(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = $1`,
        [tableName]
      );
      
      return {
        columns: columns.map(c => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES'
        })),
        constraints: constraints.map(c => ({
          name: c.constraint_name,
          type: c.constraint_type,
          definition: c.definition || ''
        })),
        indexes: indexes.map(i => ({
          name: i.indexname,
          definition: i.indexdef
        }))
      };
    } catch (error) {
      console.error(`[DatabaseService] Ошибка получения информации о таблице ${tableName}:`, error);
      throw error;
    }
  }
  
  /**
   * Создание резервной копии данных таблицы
   */
  async backupTable(tableName: string): Promise<{ success: boolean, backupData?: any[], error?: string }> {
    try {
      // Проверяем существование таблицы
      const tableExists = await this.executeRawQuery<{exists: boolean}>(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = $1
         ) as exists`,
        [tableName]
      );
      
      if (!tableExists[0]?.exists) {
        return { 
          success: false, 
          error: `Таблица ${tableName} не существует` 
        };
      }
      
      // Получаем данные таблицы
      const data = await this.executeRawQuery(
        `SELECT * FROM ${tableName}`
      );
      
      return {
        success: true,
        backupData: data
      };
    } catch (error) {
      console.error(`[DatabaseService] Ошибка создания резервной копии таблицы ${tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Проверка целостности данных
   */
  async checkDataIntegrity(options?: { tables?: string[], relations?: boolean }): Promise<{
    success: boolean;
    issues: Array<{ table: string, issue: string, severity: 'high' | 'medium' | 'low' }>;
  }> {
    const issues: Array<{ table: string, issue: string, severity: 'high' | 'medium' | 'low' }> = [];
    const checkedTables: string[] = [];
    
    try {
      // Получаем список таблиц для проверки
      let tables = options?.tables;
      if (!tables || tables.length === 0) {
        tables = await this.getTablesList();
      }
      
      // Проходим по каждой таблице и выполняем проверки
      for (const tableName of tables) {
        checkedTables.push(tableName);
        
        // Проверяем дубликаты в первичных ключах
        const tableInfo = await this.getTableInfo(tableName);
        const pkColumns = tableInfo.constraints
          .filter(c => c.type === 'PRIMARY KEY')
          .map(c => c.definition)
          .join('');
        
        const pkColumnMatch = pkColumns.match(/\(([^)]+)\)/);
        
        if (pkColumnMatch && pkColumnMatch[1]) {
          const pkColumnName = pkColumnMatch[1].trim();
          
          // Проверяем дубликаты в первичных ключах (если это не serial/id)
          if (!['id', 'serial'].includes(pkColumnName.toLowerCase())) {
            const duplicatePKCheck = await this.executeRawQuery<{count: string}>(
              `SELECT ${pkColumnName}, COUNT(*) as count
               FROM ${tableName}
               GROUP BY ${pkColumnName}
               HAVING COUNT(*) > 1`
            );
            
            if (duplicatePKCheck.length > 0) {
              issues.push({
                table: tableName,
                issue: `Найдены дублирующиеся значения в первичном ключе ${pkColumnName}`,
                severity: 'high'
              });
            }
          }
        }
        
        // Проверяем NULL значения в не-NULL столбцах
        for (const column of tableInfo.columns) {
          if (!column.nullable) {
            const nullCheck = await this.executeRawQuery<{count: string}>(
              `SELECT COUNT(*) as count
               FROM ${tableName}
               WHERE ${column.name} IS NULL`
            );
            
            if (parseInt(nullCheck[0]?.count || '0', 10) > 0) {
              issues.push({
                table: tableName,
                issue: `Найдены NULL значения в NOT NULL столбце ${column.name}`,
                severity: 'high'
              });
            }
          }
        }
        
        // Проверяем целостность внешних ключей, если требуется
        if (options?.relations) {
          const fkConstraints = tableInfo.constraints
            .filter(c => c.type === 'FOREIGN KEY');
          
          for (const fk of fkConstraints) {
            // Сложно парсить определение FK, используем простой запрос для проверки
            // Это не самый эффективный способ, но работает для большинства случаев
            const fkViolations = await this.executeRawQuery<{violations: number}>(
              `WITH orphaned_rows AS (
                 SELECT t.* FROM ${tableName} t
                 LEFT JOIN information_schema.table_constraints tc
                   ON tc.constraint_name = '${fk.name}'
                 LEFT JOIN information_schema.constraint_column_usage ccu
                   ON ccu.constraint_name = tc.constraint_name
                 LEFT JOIN information_schema.key_column_usage kcu
                   ON kcu.constraint_name = tc.constraint_name
                 WHERE tc.constraint_type = 'FOREIGN KEY'
                 AND NOT EXISTS (
                   SELECT 1 FROM information_schema.tables rt
                   JOIN information_schema.constraint_column_usage rccu
                     ON rccu.table_name = rt.table_name
                   WHERE rccu.constraint_name = tc.constraint_name
                   AND rccu.table_name != '${tableName}'
                 )
               )
               SELECT COUNT(*) as violations FROM orphaned_rows`
            );
            
            if (parseInt(fkViolations[0]?.violations?.toString() || '0', 10) > 0) {
              issues.push({
                table: tableName,
                issue: `Найдены нарушения целостности внешнего ключа ${fk.name}`,
                severity: 'high'
              });
            }
          }
        }
      }
      
      // Проверяем таблицы с нулевым количеством строк
      for (const tableName of checkedTables) {
        const rowCount = await this.executeRawQuery<{count: string}>(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        
        if (parseInt(rowCount[0]?.count || '0', 10) === 0) {
          issues.push({
            table: tableName,
            issue: 'Таблица не содержит данных',
            severity: 'low'
          });
        }
      }
      
      return {
        success: issues.filter(i => i.severity === 'high').length === 0,
        issues
      };
    } catch (error) {
      console.error('[DatabaseService] Ошибка проверки целостности данных:', error);
      issues.push({
        table: 'global',
        issue: error instanceof Error ? error.message : String(error),
        severity: 'high'
      });
      
      return {
        success: false,
        issues
      };
    }
  }
}

// Создаем единственный экземпляр сервиса
export const databaseServiceInstance = new DatabaseService();