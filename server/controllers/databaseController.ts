/**
 * Контроллер для работы с базой данных
 * 
 * Предоставляет API-эндпоинты для выполнения общих операций с базой данных:
 * - Проверка состояния подключения
 * - Получение списка таблиц
 * - Получение информации о структуре таблицы
 * - Выполнение проверок целостности данных
 */

import { Request, Response } from 'express';
import { databaseService } from '../services';

/**
 * Проверяет состояние подключения к базе данных
 */
export async function checkConnection(req: Request, res: Response) {
  try {
    const status = await databaseService.checkConnection();
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при проверке подключения:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Получает статус базы данных
 */
export async function getDatabaseStatus(req: Request, res: Response) {
  try {
    const status = await databaseService.getDatabaseStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при получении статуса:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Получает список таблиц в базе данных
 */
export async function getTablesList(req: Request, res: Response) {
  try {
    const tables = await databaseService.getTablesList();
    return res.json({
      success: true,
      data: {
        tables,
        count: tables.length
      }
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при получении списка таблиц:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Получает информацию о структуре таблицы
 */
export async function getTableInfo(req: Request, res: Response) {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: 'Не указано имя таблицы'
      });
    }
    
    const tableInfo = await databaseService.getTableInfo(tableName);
    return res.json({
      success: true,
      data: tableInfo
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при получении информации о таблице:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Создает резервную копию таблицы
 */
export async function backupTable(req: Request, res: Response) {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: 'Не указано имя таблицы'
      });
    }
    
    const backupResult = await databaseService.backupTable(tableName);
    return res.json({
      success: backupResult.success,
      data: {
        tableName,
        success: backupResult.success,
        recordsCount: backupResult.backupData?.length || 0
      },
      error: backupResult.error
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при создании резервной копии таблицы:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Проверяет целостность данных в базе
 */
export async function checkDataIntegrity(req: Request, res: Response) {
  try {
    const { tables, relations } = req.query;
    
    const options = {
      tables: tables ? (Array.isArray(tables) ? tables : [tables]) as string[] : undefined,
      relations: relations === 'true'
    };
    
    const result = await databaseService.checkDataIntegrity(options);
    return res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при проверке целостности данных:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Выполняет произвольный SQL-запрос (только для разработки и отладки)
 * В production этот эндпоинт должен быть отключен или защищен
 */
export async function executeQuery(req: Request, res: Response) {
  try {
    // Проверка на режим разработки
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Этот эндпоинт доступен только в режиме разработки'
      });
    }
    
    const { query, params } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Не указан SQL-запрос'
      });
    }
    
    const result = await databaseService.executeRawQuery(query, params);
    return res.json({
      success: true,
      data: {
        query,
        result,
        rowCount: result.length
      }
    });
  } catch (error) {
    console.error('[DatabaseController] Ошибка при выполнении SQL-запроса:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}