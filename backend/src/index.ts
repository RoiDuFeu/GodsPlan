import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './config/database';
import churchRoutes from './routes/churches';
import churchSimpleRoutes from './routes/churches-simple';
import adminStatsRoutes from './routes/admin-stats';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use(`${API_PREFIX}/churches`, churchRoutes);
app.use(`${API_PREFIX}/churches-simple`, churchSimpleRoutes);
app.use(`${API_PREFIX}/admin`, adminStatsRoutes);

// Serve static frontend (production)
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA fallback: toutes les routes non-API servent index.html
app.get('*', (req: Request, res: Response) => {
  // Si c'est une route API qui n'existe pas, retourner 404 JSON
  if (req.path.startsWith(API_PREFIX)) {
    return res.status(404).json({
      error: 'Not Found',
      path: req.path,
    });
  }
  
  // Sinon, servir le frontend React (SPA)
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 God's Plan API running on http://localhost:${PORT}`);
      console.log(`📍 API prefix: ${API_PREFIX}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
