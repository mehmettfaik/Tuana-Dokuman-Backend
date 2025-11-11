const { admin } = require('../config/firebase');

/**
 * Authentication Middleware
 * Firebase ID Token'ı doğrular ve kullanıcı bilgilerini request'e ekler
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Authorization header'dan token'ı al
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: true,
        message: 'Authentication token gerekli',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: true,
        message: 'Token bulunamadı',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Token'ı doğrula
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Kullanıcı bilgilerini request'e ekle
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null
    };

    console.log(`✅ Authenticated user: ${req.user.email} (${req.user.uid})`);

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.code, error.message);
    
    // Token expire hatası
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: true,
        message: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }
    
    // Token geçersiz
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        error: true,
        message: 'Geçersiz token formatı',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
    
    // Diğer hatalar
    return res.status(401).json({
      success: false,
      error: true,
      message: 'Authentication başarısız',
      code: 'AUTH_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Optional Authentication Middleware
 * Token varsa doğrular ama yoksa da devam eder
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Token yok ama sorun değil, devam et
      req.user = null;
      return next();
    }

    const token = authHeader.split('Bearer ')[1];

    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name || null,
        picture: decodedToken.picture || null
      };
      console.log(`✅ Optional auth - user: ${req.user.email}`);
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // Hata olsa bile devam et
    console.warn('⚠️ Optional auth failed, continuing without user:', error.message);
    req.user = null;
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};
