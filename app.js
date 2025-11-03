// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initializeFirebase } = require('./config/firebase');

const app = express();

// Firebase'i başlat
try {
  initializeFirebase();
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  // Firebase olmadan da çalışabilir, sadece recipients API'si çalışmaz
}

// CORS middleware - EN ÜSTTE OLMALI
app.use(cors({
  origin: '*', // Geçici olarak hepsine izin ver
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Manual CORS headers - extra güvenlik için
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept');
  res.header('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
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

// Global health endpoint (for render.com and general monitoring)
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

// Debug: List upload routes specifically
console.log('📋 Upload routes debug:');
console.log('  Stack length:', uploadRoutes.stack?.length);
uploadRoutes.stack?.forEach((layer, index) => {
  console.log(`  Route ${index}:`, {
    method: layer.route?.stack?.[0]?.method,
    path: layer.route?.path,
    regexp: layer.regexp?.toString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 PDF API available at http://localhost:${PORT}/api/pdf`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});
