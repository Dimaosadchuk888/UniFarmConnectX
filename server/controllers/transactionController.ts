import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';

/**
 * Контроллер для работы с транзакциями
 */
export class TransactionController {
  // Тестовый массив транзакций для демонстрации
  static testTransactions = [
    {
      id: 1,
      user_id: 1,
      type: 'deposit',
      currency: 'UNI',
      amount: '100',
      status: 'confirmed',
      created_at: new Date(Date.now() - 3600000 * 24 * 5)
    },
    {
      id: 2,
      user_id: 1,
      type: 'reward',
      currency: 'UNI',
      amount: '50',
      status: 'confirmed',
      created_at: new Date(Date.now() - 3600000 * 24 * 3)
    },
    {
      id: 3,
      user_id: 1,
      type: 'withdraw',
      currency: 'TON',
      amount: '1.5',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 24 * 1)
    }
  ];

  /**
   * Получает историю транзакций пользователя
   * Поддерживает поиск по user_id или wallet_address
   */
  static async getUserTransactions(req: Request, res: Response): Promise<void> {
    try {
      // Валидация параметров запроса
      const querySchema = z.object({
        user_id: z.string().optional(),
        wallet_address: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
      });

      const validation = querySchema.safeParse(req.query);
      if (!validation.success) {
        console.error("[TransactionController] Ошибка валидации запроса:", validation.error);
        res.status(400).json({
          success: false,
          message: "Некорректные параметры запроса",
          errors: validation.error.format()
        });
        return;
      }

      const { user_id, wallet_address, limit = '50', offset = '0' } = validation.data;
      
      console.log(`[TransactionController] Запрос транзакций: user_id=${user_id}, wallet_address=${wallet_address}, limit=${limit}, offset=${offset}`);
      
      // Более подробное логирование для аудита
      if (wallet_address) {
        console.log(`[TransactionController AUDIT] Получен запрос с wallet_address: ${wallet_address}`);
      }
      
      let userId: number | undefined;
      
      // Если указан wallet_address, находим пользователя по адресу кошелька
      if (wallet_address) {
        const user = await storage.getUserByWalletAddress(wallet_address);
        if (user) {
          userId = user.id;
          console.log(`[TransactionController] Найден пользователь ${userId} по адресу кошелька ${wallet_address}`);
        } else {
          console.log(`[TransactionController] Пользователь не найден по адресу кошелька ${wallet_address}`);
          
          // Для аудита - вывод сообщения о возвращении пустого массива
          console.log(`[TransactionController AUDIT] Пользователь не найден по адресу кошелька, возвращаем пустой массив транзакций`);
          const emptyResponse = {
            success: true,
            data: {
              total: 0,
              transactions: []
            }
          };
          console.log(`[TransactionController AUDIT] Возвращаемый ответ:`, JSON.stringify(emptyResponse));
          
          // Если пользователь не найден по адресу кошелька, возвращаем пустой список
          res.status(200).json(emptyResponse);
          return;
        }
      } else if (user_id) {
        // Если указан user_id, используем его
        userId = parseInt(user_id);
      } else {
        // Если не указаны ни user_id, ни wallet_address, возвращаем ошибку
        res.status(400).json({
          success: false,
          message: "Необходимо указать user_id или wallet_address"
        });
        return;
      }
      
      // Фильтруем транзакции по user_id
      const filteredTransactions = this.testTransactions.filter(tx => tx.user_id === userId);
      
      console.log(`[TransactionController] Найдено ${filteredTransactions.length} транзакций для пользователя ${userId}`);
      
      // Применяем пагинацию
      const offsetInt = parseInt(offset);
      const limitInt = parseInt(limit);
      const paginatedTransactions = filteredTransactions
        .slice(offsetInt, offsetInt + limitInt);
      
      res.status(200).json({
        success: true,
        data: {
          total: filteredTransactions.length,
          transactions: paginatedTransactions
        }
      });

    } catch (error) {
      console.error("[TransactionController] Ошибка при получении транзакций:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при обработке запроса"
      });
    }
  }

  /**
   * Запрос на вывод средств
   */
  static async withdrawFunds(req: Request, res: Response): Promise<void> {
    try {
      // В реальной реализации здесь должен быть код для обработки запроса на вывод средств
      res.status(200).json({
        success: true,
        message: "Запрос на вывод средств принят",
        data: {
          transaction_id: Math.floor(Math.random() * 1000) + 1
        }
      });
    } catch (error) {
      console.error("[TransactionController] Ошибка при запросе на вывод средств:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при обработке запроса на вывод средств"
      });
    }
  }

  /**
   * Создает транзакцию (для внутреннего использования)
   */
  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      // В реальной реализации здесь должен быть код для создания транзакции
      res.status(200).json({
        success: true,
        message: "Транзакция создана",
        data: {
          transaction_id: Math.floor(Math.random() * 1000) + 1
        }
      });
    } catch (error) {
      console.error("[TransactionController] Ошибка при создании транзакции:", error);
      res.status(500).json({
        success: false,
        message: "Произошла ошибка при создании транзакции"
      });
    }
  }
}