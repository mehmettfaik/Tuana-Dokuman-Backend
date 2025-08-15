const express = require('express');
const cors = require('cors');

const app = express();

// CORS middleware - EN ÜSTTE OLMALI
app.use(cors({
  origin: '*',
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
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
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
  //console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  //console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    //console.log('Body:', req.body);
  }
  next();
});

// Routes
const pdfRoutes = require('./routes/pdfRoutes');

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

// API routes
app.use('/api/pdf', pdfRoutes);

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
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 PDF API available at http://localhost:${PORT}/api/pdf`);
  console.log(`🌐 Server listening on all interfaces (0.0.0.0:${PORT})`);
});
