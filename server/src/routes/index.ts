import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import customerRouter from './customer';
import productRouter from './product';
import inventoryRouter from './inventory';
import challanRouter from './challan';
import dashboardRouter from './dashboard';
import importRouter from './import';
import forecastRouter from './forecast';

const router = Router();

// Health check endpoint
router.use('/health', healthRouter);

// Authentication endpoints
router.use('/auth', authRouter);

// Customer CRM endpoints
router.use('/customers', customerRouter);

// Product Catalog endpoints
router.use('/products', productRouter);

// Inventory Control endpoints
router.use('/inventory', inventoryRouter);

// Sales Challan endpoints
router.use('/challans', challanRouter);

// Dashboard Aggregation endpoints
router.use('/dashboard', dashboardRouter);

// Intelligent Ingestion Import endpoints
router.use('/import', importRouter);

// Demand Forecasting endpoints
router.use('/forecast', forecastRouter);

export default router;
