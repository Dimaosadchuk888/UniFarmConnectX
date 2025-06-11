import express, { Request, Response } from 'express';
import authRoutes from '../modules/auth/routes';
import monitorRoutes from '../modules/monitor/routes';

const router = express.Router();

// Authentication routes
router.use('/auth', authRoutes);

// Monitoring routes
router.use('/monitor', monitorRoutes);

export default router;