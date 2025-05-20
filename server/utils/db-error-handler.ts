/**
 * Utility for handling database errors in controllers
 * 
 * This module provides a standardized approach to handling database errors
 * for all API controllers. It classifies errors by type and suggests
 * appropriate error messages and HTTP status codes.
 */

import { Response } from 'express';
import { db, testConnection, reconnect } from '../db-connect-unified';

// Database error types
export enum DbErrorType {
  CONNECTION = 'connection',
  CONSTRAINT = 'constraint',
  TRANSACTION = 'transaction',
  QUERY = 'query',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Interface for standardized error response
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Class for handling database errors
 */
export class DbErrorHandler {
  /**
   * Determines the type of DB error based on the error message
   * @param error Error object
   * @returns Type of DB error
   */
  static detectErrorType(error: any): DbErrorType {
    const errorMessage = error?.message || error?.toString() || '';
    
    // Check error type by keywords
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
   * Creates a standardized error response
   * @param message Error message
   * @param code Error code
   * @param details Additional details (optional)
   * @returns Error response object
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
   * Handles DB errors and sends a response
   * @param error Error object
   * @param res Express response object
   * @param contextInfo Additional context information
   */
  static async handleDbError(error: any, res: Response, contextInfo: string = ''): Promise<void> {
    console.error(`[DB Error Handler] Error in context ${contextInfo}:`, error);
    
    const errorType = this.detectErrorType(error);
    let statusCode = 500;
    let errorResponse: ErrorResponse;
    
    // Determine status code and message based on error type
    switch (errorType) {
      case DbErrorType.CONNECTION:
        // For connection errors, try to reconnect
        try {
          const reconnected = await reconnect();
          if (reconnected) {
            console.log('[DB Error Handler] Database connection successfully restored');
          } else {
            console.error('[DB Error Handler] Failed to restore database connection');
          }
        } catch (reconnectError) {
          console.error('[DB Error Handler] Error when trying to reconnect:', reconnectError);
        }
        
        statusCode = 503; // Service Unavailable
        errorResponse = this.createErrorResponse(
          'Database connection issue. Please try again later.',
          'DB_CONNECTION_ERROR',
          { shouldRetry: true }
        );
        break;
        
      case DbErrorType.CONSTRAINT:
        statusCode = 400; // Bad Request
        errorResponse = this.createErrorResponse(
          'Database constraint violation. Please check your input data.',
          'DB_CONSTRAINT_ERROR',
          { originalError: error.message }
        );
        break;
        
      case DbErrorType.TRANSACTION:
        statusCode = 500; // Internal Server Error
        errorResponse = this.createErrorResponse(
          'Database transaction error. Please try again.',
          'DB_TRANSACTION_ERROR'
        );
        break;
        
      case DbErrorType.TIMEOUT:
        statusCode = 504; // Gateway Timeout
        errorResponse = this.createErrorResponse(
          'Database request took too long to complete. Please try again later.',
          'DB_TIMEOUT_ERROR',
          { shouldRetry: true }
        );
        break;
        
      case DbErrorType.QUERY:
        statusCode = 400; // Bad Request
        errorResponse = this.createErrorResponse(
          'Error in database query.',
          'DB_QUERY_ERROR'
        );
        break;
        
      default:
        statusCode = 500; // Internal Server Error
        errorResponse = this.createErrorResponse(
          'Internal server error while working with the database.',
          'DB_UNKNOWN_ERROR'
        );
    }
    
    // Send the response
    res.status(statusCode).json(errorResponse);
  }
  
  /**
   * Checks if an error is a database error
   * @param error Error object
   * @returns true if it's a DB error, otherwise false
   */
  static isDbError(error: any): boolean {
    // Check by message
    const errorMessage = error?.message || error?.toString() || '';
    
    // Keywords that may indicate a DB error
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
   * Catches and handles errors in asynchronous controllers
   * @param fn Controller function
   * @returns Wrapper function with error handling
   */
  static catchDbErrors(fn: Function) {
    return async (req: any, res: Response, next: any) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        // Check if it's a DB error
        if (this.isDbError(error)) {
          await this.handleDbError(error, res, fn.name);
        } else {
          // If it's not a DB error, pass to the next handler
          next(error);
        }
      }
    };
  }
}