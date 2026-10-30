const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config(); // Fallback to current working directory .env

const express = require('express');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const actionRoutes = require('./routes/actionRoutes');
const projectRoutes = require('./routes/projectRoutes');
const snagRoutes = require('./routes/snagRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { authenticate } = require('./middleware/auth');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log('--------------------------------------------------');
  console.log('SiteVoice AEC — Backend Service');
  console.log('--------------------------------------------------');

  // Verify critical environment configuration
  if (!process.env.MONGODB_URI) {
    console.error('[Error] MONGODB_URI is required but not defined in environment. Please configure your MongoDB Atlas connection string in the Settings menu or .env file.');
  } else {
    const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log(`[Database] MONGODB_URI configured: ${maskedUri}`);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Warning] GEMINI_API_KEY is not defined in environment. Voice interpretation will report configuration error.');
  }

  const { getModelChain } = require('./config/gemini');
  const modelChain = getModelChain();
  console.log(`[AI Model] Primary Gemini model: ${modelChain[0]} (Fallbacks: ${modelChain.slice(1).join(', ')})`);

  // Connect to MongoDB Atlas via Mongoose
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
      const { ensureDemoData } = require('./services/projectService');
      const activeProject = await ensureDemoData();
      console.log(`[Project] Active demo project available: "${activeProject.name}" (${activeProject.code || 'SKY-204'}) [ID: ${activeProject._id}]`);
    } catch (dbErr) {
      console.error(`[Startup Error] Failed to connect to MongoDB Atlas (${dbErr.message}). Database operations will return 503.`);
    }
  } else {
    console.warn('[Database] connectDB() skipped: MONGODB_URI is not defined.');
  }

  // Middleware
  app.use(express.json());
  app.use(authenticate);

  // Health check
  app.get('/api/health', (req, res) => {
    const { mongoose } = require('./config/db');
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = dbStates[mongoose.connection.readyState] || 'unknown';
    res.json({
      status: 'ok',
      service: 'SiteVoice AEC API',
      database: dbState,
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/actions', actionRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/snags', snagRoutes);
  app.use('/api/tasks', taskRoutes);

  // Users / Contractors directory endpoint for form selection
  app.get('/api/users', async (req, res, next) => {
    try {
      const User = require('./models/User');
      const users = await User.find({}).select('name role email phone').sort({ name: 1 }).lean();
      res.json({ success: true, count: users.length, data: users });
    } catch (err) {
      next(err);
    }
  });

  // Centralized API endpoint directory
  app.get(['/api', '/api/endpoints'], (req, res) => {
    res.json({
      service: 'SiteVoice AEC Backend API',
      status: 'running',
      endpoints: [
        '/api/health',
        '/api/projects',
        '/api/projects/:id/summary',
        '/api/snags',
        '/api/tasks',
        '/api/voice/interpret',
        '/api/actions/execute',
      ],
    });
  });

  // Guard against unmatched /api/* calls falling through to the frontend HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Frontend Serving (React / Vite)
  const distPath = path.join(__dirname, '..', 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && fs.existsSync(distPath)) {
    console.log('[Frontend] Serving production bundle from dist/');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In development mode (or if dist is absent), mount Vite middleware for live HMR/bundling
    console.log('[Frontend] Integrating Vite middleware for React application');
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error('[Frontend] Failed to mount Vite middleware:', viteErr);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  // Centralized error handling
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] SiteVoice AEC running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]', err);
  process.exit(1);
});
