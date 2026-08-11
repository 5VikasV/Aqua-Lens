import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';
import analyzeRoutes from './routes/analyze.routes.js';
import impactRoutes from './routes/impact.routes.js';
import investigateRoutes from './routes/investigate.routes.js';
import planRoutes from './routes/plan.routes.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '2mb' }));

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api', analyzeRoutes);
app.use('/api', impactRoutes);
app.use('/api', investigateRoutes);
app.use('/api', planRoutes);

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` Aqua Lens Backend Server Running on Port ${PORT}`);
  console.log(` Health check: GET  http://localhost:${PORT}/api/health`);
  console.log(` Analyzer API: POST http://localhost:${PORT}/api/analyze`);
  console.log(`=================================================`);
});

export default app;
