const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const excelController = require('../controllers/excelController');

// Multer yapılandırması - Fotoğraf yükleme
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 files
  },
  fileFilter: (req, file, cb) => {
    // Kabul edilen dosya tipleri (HEIC dahil - iPhone'dan gelen fotoğraflar)
    const allowedTypes = /jpeg|jpg|png|gif|webp|tiff|bmp|heic|heif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/heic' || file.mimetype === 'image/heif';

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir! (JPEG, PNG, GIF, WEBP, TIFF, BMP, HEIC)'));
    }
  }
});

// ============================================================================
// EXCEL FROM PHOTOS ENDPOINTS
// ============================================================================

// Tüm endpoint'leri authentication ile koru
router.use(authMiddleware);

/**
 * POST /api/excel/create-from-photos
 * Fotoğraflardan Excel oluştur
 * @body {files} photos - Birden fazla fotoğraf dosyası
 * @returns {object} - Excel dosya bilgileri ve istatistikler
 */
router.post(
  '/create-from-photos',
  upload.array('photos', 20), // Maximum 20 photos
  excelController.createExcelFromPhotos
);

/**
 * GET /api/excel/download/:filename
 * Excel dosyasını indir
 * @param {string} filename - Excel dosya adı
 * @returns {file} - Excel dosyası
 */
router.get('/download/:filename', excelController.downloadExcel);

/**
 * GET /api/excel/list
 * Oluşturulan Excel dosyalarını listele
 * @returns {array} - Excel dosya listesi
 */
router.get('/list', excelController.listExcelFiles);

/**
 * DELETE /api/excel/:filename
 * Excel dosyasını sil
 * @param {string} filename - Excel dosya adı
 * @returns {object} - Silme sonucu
 */
router.delete('/:filename', excelController.deleteExcel);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Excel API is working',
    user: req.user?.email,
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/excel/create-from-photos - Create Excel from photos',
      'GET /api/excel/download/:filename - Download Excel file',
      'GET /api/excel/list - List Excel files',
      'DELETE /api/excel/:filename - Delete Excel file'
    ]
  });
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Dosya boyutu çok büyük! (Max: 10MB)'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Çok fazla dosya! (Max: 20 dosya)'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Diğer hatalar
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Dosya yükleme hatası'
    });
  }

  next();
});

module.exports = router;
