/**
 * Утиліта для обробки помилок бази даних в контролерах
 * 
 * Цей модуль забезпечує стандартизований підхід до обробки помилок бази даних
 * для всіх контролерів API. Він класифікує помилки за типом та пропонує
 * відповідні повідомлення про помилки та коди HTTP статусу.
 */

import { Response } from 'express';
import { db, testConnection, reconnect } from '../db-connect-unified';

// Типи помилок бази даних
export enum DbErrorType {
  CONNECTION = 'connection',
  CONSTRAINT = 'constraint',
  TRANSACTION = 'transaction',
  QUERY = 'query',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Інтерфейс для стандартизованої відповіді з помилкою
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Клас для обробки помилок бази даних
 */
export class DbErrorHandler {
  /**
   * Визначає тип помилки БД на основі повідомлення про помилку
   * @param error Об'єкт помилки
   * @returns Тип помилки БД
   */
  static detectErrorType(error: any): DbErrorType {
    const errorMessage = error?.message || error?.toString() || '';
    
    // Перевіряємо тип помилки за ключовими словами
    if (
      errorMessage.includes('connection') || 
      errorMessage.includes('connect') || 
      errorMessage.includes('socket') ||
      errorMessage.includes('endpoint is disabled') ||
      errorMessage.includes('socket closed') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      return DbErrorType.CONNECTION;
    }
    
    if (
      errorMessage.includes('constraint') || 
      errorMessage.includes('unique') || 
      errorMessage.includes('foreign key')
    ) {
      return DbErrorType.CONSTRAINT;
    }
    
    if (
      errorMessage.includes('transaction') || 
      errorMessage.includes('commit') || 
      errorMessage.includes('rollback')
    ) {
      return DbErrorType.TRANSACTION;
    }
    
    if (
      errorMessage.includes('timeout') || 
      errorMessage.includes('timed out')
    ) {
      return DbErrorType.TIMEOUT;
    }
    
    if (
      errorMessage.includes('query') || 
      errorMessage.includes('sql') || 
      errorMessage.includes('syntax') ||
      errorMessage.includes('column')
    ) {
      return DbErrorType.QUERY;
    }
    
    return DbErrorType.UNKNOWN;
  }
  
  /**
   * Формує стандартизовану відповідь з помилкою
   * @param message Повідомлення про помилку
   * @param code Код помилки
   * @param details Додаткові деталі (опціонально)
   * @returns Об'єкт відповіді з помилкою
   */
  static createErrorResponse(message: string, code: string, details?: any): ErrorResponse {
    return {
      success: false,
      error: {
        message,
        code,
        details
      }
    };
  }
  
  /**
   * Обробляє помилки БД та відправляє відповідь
   * @param error Об'єкт помилки
   * @param res Об'єкт відповіді Express
   * @param contextInfo Додаткова інформація про контекст помилки
   */
  static async handleDbError(error: any, res: Response, contextInfo: string = ''): Promise<void> {
    console.error(`[DB Error Handler] Помилка в контексті ${contextInfo}:`, error);
    
    const errorType = this.detectErrorType(error);
    let statusCode = 500;
    let errorResponse: ErrorResponse;
    
    // Визначаємо статус код та повідомлення на основі типу помилки
    switch (errorType) {
      case DbErrorType.CONNECTION:
        // При помилці з'єднання, спробуємо переконектитись
        try {
          const reconnected = await reconnect();
          if (reconnected) {
            console.log('[DB Error Handler] З\'єднання з БД успішно відновлено');
          } else {
            console.error('[DB Error Handler] Не вдалося відновити з\'єднання з БД');
          }
        } catch (reconnectError) {
          console.error('[DB Error Handler] Помилка при спробі переконектитись:', reconnectError);
        }
        
        statusCode = 503; // Service Unavailable
        errorResponse = this.createErrorResponse(
          'Проблема з\'єднання з базою даних. Спробуйте пізніше.',
          'DB_CONNECTION_ERROR',
          { shouldRetry: true }
        );
        break;
        
      case DbErrorType.CONSTRAINT:
        statusCode = 400; // Bad Request
        errorResponse = this.createErrorResponse(
          'Порушення обмежень бази даних. Перевірте введені дані.',
          'DB_CONSTRAINT_ERROR',
          { originalError: error.message }
        );
        break;
        
      case DbErrorType.TRANSACTION:
        statusCode = 500; // Internal Server Error
        errorResponse = this.createErrorResponse(
          'Помилка транзакції бази даних. Спробуйте ще раз.',
          'DB_TRANSACTION_ERROR'
        );
        break;
        
      case DbErrorType.TIMEOUT:
        statusCode = 504; // Gateway Timeout
        errorResponse = this.createErrorResponse(
          'Запит до бази даних зайняв занадто багато часу. Спробуйте пізніше.',
          'DB_TIMEOUT_ERROR',
          { shouldRetry: true }
        );
        break;
        
      case DbErrorType.QUERY:
        statusCode = 400; // Bad Request
        errorResponse = this.createErrorResponse(
          'Помилка в запиті до бази даних.',
          'DB_QUERY_ERROR'
        );
        break;
        
      default:
        statusCode = 500; // Internal Server Error
        errorResponse = this.createErrorResponse(
          'Внутрішня помилка сервера при роботі з базою даних.',
          'DB_UNKNOWN_ERROR'
        );
    }
    
    // Відправляємо відповідь
    res.status(statusCode).json(errorResponse);
  }
  
  /**
   * Перевіряє, чи є помилка помилкою бази даних
   * @param error Об'єкт помилки
   * @returns true, якщо це помилка БД, інакше false
   */
  static isDbError(error: any): boolean {
    // Перевіряємо за повідомленням
    const errorMessage = error?.message || error?.toString() || '';
    
    // Ключові слова, які можуть вказувати на помилку БД
    const dbErrorKeywords = [
      'database', 'db', 'sql', 'query', 'transaction', 
      'connection', 'constraint', 'postgres', 'pg', 
      'timeout', 'deadlock', 'pool', 'relation',
      'column', 'table', 'foreign key', 'primary key'
    ];
    
    return dbErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  /**
   * Перехоплює та обробляє помилки в асинхронних контролерах
   * @param fn Функція контролера
   * @returns Функція-обгортка з обробкою помилок
   */
  static catchDbErrors(fn: Function) {
    return async (req: any, res: Response, next: any) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        // Перевіряємо, чи це помилка БД
        if (this.isDbError(error)) {
          await this.handleDbError(error, res, fn.name);
        } else {
          // Якщо це не помилка БД, передаємо наступному обробнику
          next(error);
        }
      }
    };
  }
}