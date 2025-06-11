/**
 * Monitor Routes
 * API маршруты для мониторинга состояния системы
 */

import { Router } from 'express';
import { MonitorController } from './controller';

const router = Router();
const monitorController = new MonitorController();

// Pool monitoring endpoints
router.get('/pool', (req, res) => monitorController.getPoolStatus(req, res));
router.get('/pool/detailed', (req, res) => monitorController.getDetailedPoolStatus(req, res));
router.post('/pool/log', (req, res) => monitorController.logPoolStatus(req, res));

export default router;