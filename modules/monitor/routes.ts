/**
 * Monitor Routes
 * API маршруты для мониторинга состояния системы
 */

import { Router } from 'express';
import { MonitorController } from './controller';

const router = Router();
const monitorController = new MonitorController();

// System monitoring endpoints
router.get('/health', (req, res) => monitorController.getSystemHealth(req, res));
router.get('/stats', (req, res) => monitorController.getSystemStats(req, res));

// Critical endpoints monitoring
router.get('/status', (req, res) => monitorController.getEndpointsStatus(req, res));

// Scheduler status endpoint
router.get('/scheduler-status', (req, res) => monitorController.getSchedulerStatus(req, res));

export const monitorRoutes = router;
export default router;