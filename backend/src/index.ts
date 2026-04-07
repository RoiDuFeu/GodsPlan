import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './config/database';
import churchRoutes from './routes/churches';
import churchSimpleRoutes from './routes/churches-simple';
import adminStatsRoutes from './routes/admin-stats';
import adminScrapersRoutes from './routes/admin-scrapers';
import liturgyRoutes from './routes/liturgy';
import { liturgySyncJob } from './jobs/liturgySync';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
}));
app.use(cors({
  origin: [
    'http://localhost:3022',  // React frontend
    'http://localhost:5174',  // Svelte admin
  ],
}));
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
app.use(`${API_PREFIX}/admin/scrapers`, adminScrapersRoutes);
app.use(`${API_PREFIX}/liturgy`, liturgyRoutes);

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
    
    // Start liturgy sync job
    liturgySyncJob.scheduleDailySync();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 God's Plan API running on http://localhost:${PORT}`);
      console.log(`📍 API prefix: ${API_PREFIX}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Kill the other process or use a different port.`);
        process.exit(1);
      }
      throw err;
    });

    const shutdown = () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      // Force exit after 3s if connections hang
      setTimeout(() => {
        console.log('Forcing exit');
        process.exit(0);
      }, 3000).unref();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGHUP', shutdown);

    // Windows: handle parent process kill (e.g. ts-node-dev, tsx watch)
    process.on('message', (msg) => {
      if (msg === 'shutdown') shutdown();
    });

    // Ensure cleanup on uncaught exceptions
    process.on('beforeExit', () => {
      server.close();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
