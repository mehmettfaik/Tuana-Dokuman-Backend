// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { initializeFirebase } = require('./config/firebase');

// Override global console methods to use Winston logger
const util = require('util');
const safeFormat = (...args) => {
  try {
    return util.format.apply(null, args);
  } catch (e) {
    return '[Unformattable Log Object]';
  }
};
console.log = function() { logger.info(safeFormat(...arguments)); };
console.error = function() { logger.error(safeFormat(...arguments)); };
console.warn = function() { logger.warn(safeFormat(...arguments)); };

const app = express();

// Firebase'i başlat
try {
  initializeFirebase();
} catch (error) {
  logger.error('Firebase initialization failed: ' + error.message);
  // Firebase olmadan da çalışabilir, sadece recipients API'si çalışmaz
}

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'https://tuana-dokuman.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests from this IP, please try again after 15 minutes', code: 'RATE_LIMIT_EXCEEDED' } }
});

// Apply rate limiter to all routes except health check
app.use((req, res, next) => {
  if (req.path === '/api/health') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  if (req.url.includes('/recipients')) {
    if (req.body && Object.keys(req.body).length > 0) {
    }
  }
  next();
});

// Routes
const pdfRoutes = require('./routes/pdfRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const formRoutes = require('./routes/formRoutes');
const excelRoutes = require('./routes/excelRoutes');
const articleRoutes = require('./routes/articleRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

// API Documentation (Swagger)
const { swaggerUi, specs } = require('./utils/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Test endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'PDF API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Auth test endpoint (public)
app.get('/api/auth/test', (req, res) => {
  res.json({ 
    message: 'Auth API is available',
    timestamp: new Date().toISOString(),
    info: 'Use POST to protected endpoints with Authorization: Bearer <token> header'
  });
});

// Protected auth test endpoint
const { authMiddleware } = require('./middleware/auth');
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});

// Firebase test endpoint
app.get('/api/firebase/test', async (req, res) => {
  try {
    const { getFirestore } = require('./config/firebase');
    const db = getFirestore();
    
    // Test Firestore connection
    const testDoc = await db.collection('test').doc('connection').set({
      message: 'Firebase connection successful',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      message: 'Firebase Firestore connection is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Firebase connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Recipients test endpoint
app.get('/api/recipients/test', (req, res) => {
  res.json({ 
    message: 'Recipients API is working',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: [
      'CRUD Operations',
      'Advanced Search with Filters',
      'Bulk Operations',
      'Data Validation',
      'Duplicate Prevention',
      'Statistics & Analytics'
    ],
    routes: [
      'GET /api/recipients - List all recipients',
      'GET /api/recipients/search?q=term&country=TR&city=Istanbul&hasEmail=true - Advanced search',
      'GET /api/recipients/stats - Get statistics',
      'GET /api/recipients/:id - Get specific recipient',
      'POST /api/recipients - Create new recipient',
      'PUT /api/recipients/:id - Update recipient',
      'DELETE /api/recipients/:id - Delete recipient',
      'POST /api/recipients/bulk-delete - Bulk delete recipients',
      'POST /api/recipients/bulk-update - Bulk update recipients'
    ]
  });
});

// Forms test endpoint
app.get('/api/forms/test', (req, res) => {
  res.json({ 
    message: 'Forms API is working',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      'Create Forms',
      'List All Forms',
      'Get Form by ID',
      'Delete Forms',
      'Bulk Delete',
      'Statistics'
    ],
    routes: [
      'POST /api/forms - Create new form',
      'GET /api/forms - List all forms',
      'GET /api/forms/:formId - Get specific form',
      'DELETE /api/forms/:formId - Delete form',
      'POST /api/forms/bulk-delete - Bulk delete forms',
      'GET /api/forms/stats - Get statistics'
    ]
  });
});

app.get('/api/health', (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/pdf', pdfRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/announcements', announcementRoutes);


uploadRoutes.stack?.forEach((layer, index) => {
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: { message: 'CORS Error: Origin not allowed', code: 'CORS_ERROR' }
    });
  }
  
  logger.error('Server error: ' + err.message, { stack: err.stack });
  res.status(500).json({ 
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`PDF API available at http://localhost:${PORT}/api/pdf`);
  });

  // Handle server errors
  server.on('error', (error) => {
    logger.error('Server error: ' + error.message);
  });
}

module.exports = app;
