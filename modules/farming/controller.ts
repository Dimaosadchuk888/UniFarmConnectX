import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { FarmingService } from './service';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger';

const farmingService = new FarmingService();
const userRepository = new SupabaseUserRepository();

export class FarmingController extends BaseController {
  async getFarmingData(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен
      
      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });
      
      const farmingData = await farmingService.getFarmingDataByTelegramId(
        telegram.user.id.toString()
      );

      logger.info('[Farming] Данные фарминга для пользователя', {
        telegram_id: telegram.user.id,
        farming_data: farmingData
      });

      this.sendSuccess(res, farmingData);
    }, 'получения данных фарминга');
    } catch (error) {
      next(error);
    }
  }

  async getFarmingInfo(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const userId = req.query.user_id as string;
      
      // If no user_id provided, return default farming status
      if (!userId) {
        const defaultFarmingData = {
          isActive: false,
          depositAmount: '0',
          ratePerSecond: '0.000002778', // 0.01 UNI в час
          totalRatePerSecond: '0.000000278',
          dailyIncomeUni: '0.024',
          depositCount: 0,
          totalDepositAmount: '0',
          startDate: null,
          uni_farming_start_timestamp: null,
          rate: '0.010000',
          accumulated: '0.000000',
          last_claim: null,
          can_claim: false,
          next_claim_available: null
        };
        
        logger.info('[Farming] Возвращаем базовые данные фарминга (без user_id)');
        return this.sendSuccess(res, defaultFarmingData);
      }

      const farmingData = await farmingService.getFarmingDataByTelegramId(userId);

      logger.info('[Farming] Информация о фарминге для пользователя', {
        user_id: userId,
        farming_info: farmingData
      });

      this.sendSuccess(res, farmingData);
    }, 'получения информации о фарминге');
    } catch (error) {
      next(error);
    }
  }

  async startFarming(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;
      
      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });
      
      const { amount } = req.body;
      
      const result = await farmingService.depositUniForFarming(
        telegram.user.id.toString(),
        amount
      );

      this.sendSuccess(res, { started: result });
    }, 'запуска фарминга');
    } catch (error) {
      next(error);
    }
  }

  async claimFarming(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const result = await farmingService.claimRewards(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, result);
    }, 'сбора фарминга');
    } catch (error) {
      next(error);
    }
  }

  async depositUni(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      console.log('[FarmingController] CRITICAL DEBUG: depositUni method called');
      logger.info('[FarmingController] depositUni method called', {
        body: req.body,
        hasAuth: !!req.telegramUser
      });
      
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) {
        console.log('[FarmingController] CRITICAL DEBUG: telegram validation failed');
        return;
      }

      console.log('[FarmingController] CRITICAL DEBUG: telegram user data', {
        telegram_id: telegram.user.id,
        username: telegram.user.username
      });

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      console.log('[FarmingController] CRITICAL DEBUG: user from telegram', {
        userId: user?.id,
        telegram_id: user?.telegram_id
      });

      const { amount } = req.body;
      this.validateRequiredFields(req.body, ['amount']);

      console.log('[FarmingController] CRITICAL DEBUG: calling depositUniForFarming', {
        telegram_id: telegram.user.id,
        amount
      });

      const result = await farmingService.depositUniForFarming(
        telegram.user.id.toString(),
        amount
      );

      console.log('[FarmingController] CRITICAL DEBUG: depositUniForFarming result', result);

      this.sendSuccess(res, result);
    }, 'депозита UNI для фарминга');
    } catch (error) {
      console.error('[FarmingController] CRITICAL DEBUG: exception in depositUni', error);
      next(error);
    }
  }

  async harvestUni(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const result = await farmingService.harvestUniFarming(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, result);
    }, 'сбора урожая UNI фарминга');
    } catch (error) {
      next(error);
    }
  }

  async stopFarming(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        // Автоматическая регистрация пользователя
        const user = await userRepository.getOrCreateUserFromTelegram({
          telegram_id: telegram.user.id,
          username: telegram.user.username,
          first_name: telegram.user.first_name,
          ref_by: req.query.start_param as string
        });

        const result = await farmingService.stopFarming(
          telegram.user.id.toString()
        );

        logger.info('[Farming] Остановка фарминга для пользователя', {
          telegram_id: telegram.user.id,
          result: result
        });

        this.sendSuccess(res, result);
      }, 'остановки фарминга');
    } catch (error) {
      next(error);
    }
  }

  async getFarmingHistory(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const history = await farmingService.getFarmingHistory(
        telegram.user.id.toString()
      );

      logger.info('[Farming] История фарминга для пользователя', {
        telegram_id: telegram.user.id,
        history_count: history.length
      });

      this.sendSuccess(res, history);
    }, 'получения истории фарминга');
    } catch (error) {
      next(error);
    }
  }

  async getRates(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const rates = await farmingService.getRates();
        
        logger.info('[Farming] Получение текущих ставок фарминга', rates);
        
        this.sendSuccess(res, rates);
      }, 'получения ставок фарминга');
    } catch (error) {
      next(error);
    }
  }
}