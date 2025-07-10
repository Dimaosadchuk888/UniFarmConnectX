/**
 * {{MODULE_NAME}} Routes
 * API route definitions for {{MODULE_NAME}} module
 */

import { Router } from 'express';
import { {{MODULE_NAME_LOWER}}Controller } from './controller';
import { requireAuth } from '@/core/middleware/requireAuth';
import { validateRequest } from '@/core/middleware/validateRequest';
import { rateLimiter } from '@/core/middleware/rateLimiter';
import { 
  create{{MODULE_NAME}}Schema,
  update{{MODULE_NAME}}Schema,
  {{MODULE_NAME_LOWER}}QuerySchema 
} from './validation';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Apply rate limiting (adjust limits based on module needs)
const standardLimit = rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }); // 100 requests per 15 minutes
const strictLimit = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }); // 10 requests per 15 minutes

/**
 * @route   GET /api/v2/{{MODULE_NAME_LOWER}}/stats
 * @desc    Get {{MODULE_NAME_LOWER}} statistics
 * @access  Private
 */
router.get(
  '/stats',
  standardLimit,
  {{MODULE_NAME_LOWER}}Controller.get{{MODULE_NAME}}Stats.bind({{MODULE_NAME_LOWER}}Controller)
);

/**
 * @route   GET /api/v2/{{MODULE_NAME_LOWER}}
 * @desc    Get all {{MODULE_NAME_LOWER}}s for user
 * @access  Private
 * @query   limit, offset, sortBy, sortOrder
 */
router.get(
  '/',
  standardLimit,
  validateRequest({{MODULE_NAME_LOWER}}QuerySchema, 'query'),
  {{MODULE_NAME_LOWER}}Controller.getAll{{MODULE_NAME}}s.bind({{MODULE_NAME_LOWER}}Controller)
);

/**
 * @route   GET /api/v2/{{MODULE_NAME_LOWER}}/:id
 * @desc    Get {{MODULE_NAME_LOWER}} by ID
 * @access  Private
 */
router.get(
  '/:id',
  standardLimit,
  {{MODULE_NAME_LOWER}}Controller.get{{MODULE_NAME}}ById.bind({{MODULE_NAME_LOWER}}Controller)
);

/**
 * @route   POST /api/v2/{{MODULE_NAME_LOWER}}
 * @desc    Create new {{MODULE_NAME_LOWER}}
 * @access  Private
 */
router.post(
  '/',
  strictLimit,
  validateRequest(create{{MODULE_NAME}}Schema),
  {{MODULE_NAME_LOWER}}Controller.create{{MODULE_NAME}}.bind({{MODULE_NAME_LOWER}}Controller)
);

/**
 * @route   PUT /api/v2/{{MODULE_NAME_LOWER}}/:id
 * @desc    Update {{MODULE_NAME_LOWER}}
 * @access  Private
 */
router.put(
  '/:id',
  strictLimit,
  validateRequest(update{{MODULE_NAME}}Schema),
  {{MODULE_NAME_LOWER}}Controller.update{{MODULE_NAME}}.bind({{MODULE_NAME_LOWER}}Controller)
);

/**
 * @route   DELETE /api/v2/{{MODULE_NAME_LOWER}}/:id
 * @desc    Delete {{MODULE_NAME_LOWER}}
 * @access  Private
 */
router.delete(
  '/:id',
  strictLimit,
  {{MODULE_NAME_LOWER}}Controller.delete{{MODULE_NAME}}.bind({{MODULE_NAME_LOWER}}Controller)
);

// TODO: Add module-specific routes here
// Examples:

/*
// Process {{MODULE_NAME_LOWER}}
router.post(
  '/:id/process',
  strictLimit,
  {{MODULE_NAME_LOWER}}Controller.process{{MODULE_NAME}}.bind({{MODULE_NAME_LOWER}}Controller)
);

// Activate {{MODULE_NAME_LOWER}}
router.post(
  '/:id/activate',
  strictLimit,
  {{MODULE_NAME_LOWER}}Controller.activate{{MODULE_NAME}}.bind({{MODULE_NAME_LOWER}}Controller)
);

// Get {{MODULE_NAME_LOWER}} history
router.get(
  '/:id/history',
  standardLimit,
  {{MODULE_NAME_LOWER}}Controller.get{{MODULE_NAME}}History.bind({{MODULE_NAME_LOWER}}Controller)
);

// Bulk operations
router.post(
  '/bulk/create',
  strictLimit,
  validateRequest(bulkCreate{{MODULE_NAME}}Schema),
  {{MODULE_NAME_LOWER}}Controller.bulkCreate{{MODULE_NAME}}.bind({{MODULE_NAME_LOWER}}Controller)
);
*/

// Health check endpoint (no auth required)
router.get(
  '/health',
  (req, res) => res.json({ status: 'ok', module: '{{MODULE_NAME_LOWER}}' })
);

export { router as {{MODULE_NAME_LOWER}}Routes };

// Alternative export for consistency
export default router;