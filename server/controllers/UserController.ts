/**
 * Контроллер для API пользователей
 * 
 * Обрабатывает HTTP-запросы, связанные с пользователями,
 * и преобразует их в вызовы сервисов.
 */

import { Request, Response } from 'express';
import { userService } from '../services';
import { StorageErrors, StorageErrorType } from '../storage-interface';
import { generateUUID } from '../utils/string-utils';

/**
 * Получение пользователя по ID
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    const user = await userService.getUserById(userId);
    
    return res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка получения пользователя по ID:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}

/**
 * Получение пользователя по имени пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function getUserByUsername(req: Request, res: Response) {
  try {
    const username = req.params.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }
    
    const user = await userService.getUserByUsername(username);
    
    return res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка получения пользователя по имени:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}

/**
 * Получение пользователя по гостевому ID
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function getUserByGuestId(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId;
    
    if (!guestId) {
      return res.status(400).json({
        success: false,
        error: 'Guest ID is required'
      });
    }
    
    console.log(`[UserController] Получение пользователя по guest_id: ${guestId}`);
    const user = await userService.getUserByGuestId(guestId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка получения пользователя по guest_id:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}

/**
 * Получение пользователя по реферальному коду
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function getUserByRefCode(req: Request, res: Response) {
  try {
    const refCode = req.params.refCode;
    
    if (!refCode) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }
    
    console.log(`[UserController] Получение пользователя по ref_code: ${refCode}`);
    const user = await userService.getUserByRefCode(refCode);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка получения пользователя по ref_code:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}

/**
 * Создание нового пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function createUser(req: Request, res: Response) {
  try {
    const { username, telegramId, guestId, parentRefCode } = req.body;
    
    console.log(`[UserController] Создание пользователя:`, req.body);
    
    // Если не указан ни telegramId, ни guestId, генерируем guestId
    const finalGuestId = guestId || (!telegramId ? generateUUID() : undefined);
    
    const user = await userService.createUser({
      username,
      telegramId: telegramId ? parseInt(telegramId, 10) : undefined,
      guestId: finalGuestId,
      parentRefCode
    });
    
    return res.status(201).json({
      success: true,
      data: { 
        user,
        registered: true,
        session_id: generateUUID()
      }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка создания пользователя:', error);
    
    if (error.type === StorageErrorType.DUPLICATE) {
      return res.status(409).json({
        success: false,
        error: `User with this ${error.details?.field || 'property'} already exists`
      });
    }
    
    if (error.type === StorageErrorType.VALIDATION) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid input data'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
}

/**
 * Обновление реферального кода пользователя
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function updateRefCode(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { refCode } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    if (!refCode) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }
    
    const user = await userService.updateRefCode(userId, refCode);
    
    return res.json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка обновления реферального кода:', error);
    
    if (error.type === StorageErrorType.NOT_FOUND) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (error.type === StorageErrorType.DUPLICATE) {
      return res.status(409).json({
        success: false,
        error: 'Referral code already exists'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update referral code'
    });
  }
}

/**
 * Обработчик регистрации для аирдропа и Mini App
 * @param req Запрос Express
 * @param res Ответ Express
 */
export async function airdropRegister(req: Request, res: Response) {
  try {
    console.log('[UserController] Airdrop регистрация:', req.body);
    
    const { guest_id, parent_ref_code, airdrop_mode } = req.body;
    
    if (!guest_id) {
      return res.status(400).json({
        success: false,
        error: 'Guest ID is required'
      });
    }
    
    // Проверяем, существует ли пользователь
    const existingUser = await userService.getUserByGuestId(guest_id);
    
    if (existingUser) {
      console.log(`[UserController] Пользователь с guest_id ${guest_id} уже существует`);
      
      return res.json({
        success: true,
        data: {
          user: existingUser,
          registered: false,
          session_id: generateUUID()
        }
      });
    }
    
    // Создаем нового пользователя
    console.log(`[UserController] Создание нового пользователя для guest_id: ${guest_id}`);
    const user = await userService.createUser({
      guestId: guest_id,
      parentRefCode: parent_ref_code
    });
    
    return res.json({
      success: true,
      data: {
        user,
        registered: true,
        session_id: generateUUID()
      }
    });
  } catch (error: any) {
    console.error('[UserController] Ошибка аирдроп-регистрации:', error);
    
    if (error.type === StorageErrorType.DUPLICATE) {
      return res.status(409).json({
        success: false,
        error: `User with this ${error.details?.field || 'property'} already exists`
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
}