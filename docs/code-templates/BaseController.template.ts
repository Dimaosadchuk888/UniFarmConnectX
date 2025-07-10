/**
 * {{MODULE_NAME}} Controller
 * Handles HTTP requests and responses for {{MODULE_NAME}} module
 */

import { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { {{MODULE_NAME}}Service } from './{{MODULE_NAME}}Service';
import { logger } from '@/core/logger';
import { validateRequest } from '@/core/middleware/validateRequest';
import { 
  Create{{MODULE_NAME}}Request,
  Update{{MODULE_NAME}}Request,
  {{MODULE_NAME}}Response 
} from './types';

export class {{MODULE_NAME}}Controller extends BaseController {
  private {{MODULE_NAME_LOWER}}Service: {{MODULE_NAME}}Service;

  constructor() {
    super();
    this.{{MODULE_NAME_LOWER}}Service = new {{MODULE_NAME}}Service();
  }

  /**
   * Get {{MODULE_NAME_LOWER}} by ID
   * GET /api/v2/{{MODULE_NAME_LOWER}}/:id
   */
  async get{{MODULE_NAME}}ById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {{MODULE_NAME_LOWER}}Id = req.params.id;

      if (!userId) {
        this.unauthorized(res, 'User not authenticated');
        return;
      }

      logger.info(`[{{MODULE_NAME}}Controller] Getting {{MODULE_NAME_LOWER}} ${{{MODULE_NAME_LOWER}}Id} for user ${userId}`);

      const result = await this.{{MODULE_NAME_LOWER}}Service.get{{MODULE_NAME}}ById({{MODULE_NAME_LOWER}}Id, userId);

      if (!result) {
        this.notFound(res, '{{MODULE_NAME}} not found');
        return;
      }

      this.success(res, result);
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Controller] Error in get{{MODULE_NAME}}ById:', error);
      this.error(res, 'Failed to get {{MODULE_NAME_LOWER}}');
    }
  }

  /**
   * Get all {{MODULE_NAME_LOWER}}s for user
   * GET /api/v2/{{MODULE_NAME_LOWER}}s
   */
  async getAll{{MODULE_NAME}}s(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 10, offset = 0 } = req.query;

      if (!userId) {
        this.unauthorized(res, 'User not authenticated');
        return;
      }

      logger.info(`[{{MODULE_NAME}}Controller] Getting all {{MODULE_NAME_LOWER}}s for user ${userId}`);

      const result = await this.{{MODULE_NAME_LOWER}}Service.getAll{{MODULE_NAME}}s(
        userId,
        Number(limit),
        Number(offset)
      );

      this.success(res, result);
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Controller] Error in getAll{{MODULE_NAME}}s:', error);
      this.error(res, 'Failed to get {{MODULE_NAME_LOWER}}s');
    }
  }

  /**
   * Create new {{MODULE_NAME_LOWER}}
   * POST /api/v2/{{MODULE_NAME_LOWER}}
   */
  async create{{MODULE_NAME}}(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const data: Create{{MODULE_NAME}}Request = req.body;

      if (!userId) {
        this.unauthorized(res, 'User not authenticated');
        return;
      }

      logger.info(`[{{MODULE_NAME}}Controller] Creating {{MODULE_NAME_LOWER}} for user ${userId}`, data);

      // TODO: Add validation logic here
      const validation = await this.{{MODULE_NAME_LOWER}}Service.validate{{MODULE_NAME}}Data(data);
      if (!validation.valid) {
        this.badRequest(res, validation.error || 'Invalid {{MODULE_NAME_LOWER}} data');
        return;
      }

      const result = await this.{{MODULE_NAME_LOWER}}Service.create{{MODULE_NAME}}(userId, data);

      this.created(res, result);
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Controller] Error in create{{MODULE_NAME}}:', error);
      this.error(res, 'Failed to create {{MODULE_NAME_LOWER}}');
    }
  }

  /**
   * Update {{MODULE_NAME_LOWER}}
   * PUT /api/v2/{{MODULE_NAME_LOWER}}/:id
   */
  async update{{MODULE_NAME}}(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {{MODULE_NAME_LOWER}}Id = req.params.id;
      const data: Update{{MODULE_NAME}}Request = req.body;

      if (!userId) {
        this.unauthorized(res, 'User not authenticated');
        return;
      }

      logger.info(`[{{MODULE_NAME}}Controller] Updating {{MODULE_NAME_LOWER}} ${{{MODULE_NAME_LOWER}}Id} for user ${userId}`, data);

      const result = await this.{{MODULE_NAME_LOWER}}Service.update{{MODULE_NAME}}(
        {{MODULE_NAME_LOWER}}Id,
        userId,
        data
      );

      if (!result) {
        this.notFound(res, '{{MODULE_NAME}} not found');
        return;
      }

      this.success(res, result);
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Controller] Error in update{{MODULE_NAME}}:', error);
      this.error(res, 'Failed to update {{MODULE_NAME_LOWER}}');
    }
  }

  /**
   * Delete {{MODULE_NAME_LOWER}}
   * DELETE /api/v2/{{MODULE_NAME_LOWER}}/:id
   */
  async delete{{MODULE_NAME}}(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {{MODULE_NAME_LOWER}}Id = req.params.id;

      if (!userId) {
        this.unauthorized(res, 'User not authenticated');
        return;
      }

      logger.info(`[{{MODULE_NAME}}Controller] Deleting {{MODULE_NAME_LOWER}} ${{{MODULE_NAME_LOWER}}Id} for user ${userId}`);

      const result = await this.{{MODULE_NAME_LOWER}}Service.delete{{MODULE_NAME}}(
        {{MODULE_NAME_LOWER}}Id,
        userId
      );

      if (!result) {
        this.notFound(res, '{{MODULE_NAME}} not found');
        return;
      }

      this.success(res, { deleted: true });
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Controller] Error in delete{{MODULE_NAME}}:', error);
      this.error(res, 'Failed to delete {{MODULE_NAME_LOWER}}');
    }
  }

  /**
   * Get {{MODULE_NAME_LOWER}} statistics
   * GET /api/v2/{{MODULE_NAME_LOWER}}/stats
   */
  async get{{MODULE_NAME}}Stats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        this.unauthorized(res, 'User not authenticated');
        return;
      }

      logger.info(`[{{MODULE_NAME}}Controller] Getting {{MODULE_NAME_LOWER}} stats for user ${userId}`);

      const stats = await this.{{MODULE_NAME_LOWER}}Service.get{{MODULE_NAME}}Stats(userId);

      this.success(res, stats);
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Controller] Error in get{{MODULE_NAME}}Stats:', error);
      this.error(res, 'Failed to get {{MODULE_NAME_LOWER}} statistics');
    }
  }
}

// Export singleton instance
export const {{MODULE_NAME_LOWER}}Controller = new {{MODULE_NAME}}Controller();