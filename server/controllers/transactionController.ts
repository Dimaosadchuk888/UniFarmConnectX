import { Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { UserService } from '../services/userService';
import { sendSuccess, sendSuccessArray, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId, isNumeric } from '../utils/validationUtils';
import { getTransactionsQuerySchema, withdrawSchema } from '../validators/schemas';
import { ZodError } from 'zod';
import { db } from '../db';
import { users, transactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Контроллер для работы с транзакциями
 */
export class TransactionController {
  /**
   * Получает историю транзакций пользователя
   */
  static async getUserTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.query.user_id;
      
      // Отладка: логируем запрос
      console.log("[DEBUG] /api/transactions - Request query:", req.query);
      
      // Явно устанавливаем правильный заголовок Content-Type
      res.setHeader('Content-Type', 'application/json');
      
      if (!userIdParam || typeof userIdParam !== 'string') {
        console.log("[DEBUG] /api/transactions - Missing or invalid user_id:", userIdParam);
        return res.status(400).json({ error: "Missing or invalid user_id parameter" });
      }
      
      const userId = parseInt(userIdParam);
      
      if (isNaN(userId)) {
        console.log("[DEBUG] /api/transactions - Invalid user_id (NaN):", userIdParam);
        return res.status(400).json({ error: "Invalid user_id parameter" });
      }
      
      console.log("[DEBUG] /api/transactions - Fetching for user_id:", userId);
      
      // Получаем все транзакции пользователя через сервис
      const userTransactions = await TransactionService.getUserTransactions(userId);
      
      console.log("[DEBUG] /api/transactions - Found transactions:", userTransactions.length);
      
      // Проверяем, что ответ не пустой
      if (!userTransactions || userTransactions.length === 0) {
        console.log("[DEBUG] /api/transactions - No transactions found for user:", userId);
        // Возвращаем пустой массив с кодом 200, а не ошибку
        return res.status(200).send("[]");
      }
      
      // Отладочные транзакции отключены
      // Этот код ранее добавлял фейковую транзакцию для проверки
      // Отключаем, так как это вызывает проблемы с фильтрацией на фронтенде
      
      // Используем явный JSON.stringify для обеспечения правильного формата ответа
      const jsonResponse = JSON.stringify(userTransactions);
      console.log("[DEBUG] /api/transactions - Response first 100 chars:", jsonResponse.substring(0, 100));
      
      return res.status(200).send(jsonResponse);
    } catch (error) {
      console.error("[DEBUG] Error fetching user transactions:", error);
      return res.status(500).json({ error: "Failed to fetch user transactions" });
    }
  }

  /**
   * Запрос на вывод средств
   */
  static async withdrawFunds(req: Request, res: Response): Promise<void> {
    try {
      // Валидация тела запроса
      const validationResult = withdrawSchema.safeParse(req.body);
      if (!validationResult.success) {
        return sendError(res, 'Invalid request data', 400, validationResult.error.format());
      }

      const { user_id, amount, currency, wallet } = validationResult.data;
      
      // Проверка существования пользователя
      const user = await UserService.getUserById(user_id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Проверка достаточности баланса
      const amountFloat = parseFloat(amount);
      const balanceField = currency === 'UNI' ? 'balance_uni' : 'balance_ton';
      const userBalance = currency === 'UNI' ? parseFloat(user.balance_uni) : parseFloat(user.balance_ton);

      if (userBalance < amountFloat) {
        return sendError(res, 'Insufficient balance', 400);
      }

      // Создаем запись о транзакции вывода средств
      const transaction = await TransactionService.createTransaction({
        user_id,
        type: 'withdraw',
        amount,
        currency,
        status: 'pending'
      });

      // Уменьшаем баланс пользователя
      await db
        .update(users)
        .set({
          [balanceField]: sql`${users[balanceField]} - ${amount}`
        })
        .where(eq(users.id, user_id));

      sendSuccess(res, {
        success: true,
        message: `Withdrawal request for ${amount} ${currency} created successfully.`,
        transaction_id: transaction.id
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      sendServerError(res, 'Failed to process withdrawal request');
    }
  }

  /**
   * Создает транзакцию (для внутреннего использования)
   */
  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const transaction = await TransactionService.createTransaction(req.body);
      sendSuccess(res, transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Invalid transaction data', 400, error.format());
      }
      sendServerError(res, error);
    }
  }
}