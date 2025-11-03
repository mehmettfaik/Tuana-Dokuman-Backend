const express = require('express');
const router = express.Router();
const { 
  handleUpload, 
  getSupportedCompanies, 
  uploadHealthCheck 
} = require('../controllers/uploadController');

/**
 * @route   POST /api/upload
 * @desc    Main upload endpoint - receives company info and file
 * @access  Public
 * @body    {
 *   company: string,     // Firma adı (ADA_DENIM, TUANA_TEKSTIL, vs.)
 *   file: File          // PDF/Image dosyası
 * }
 * @returns {
 *   success: boolean,
 *   data: {
 *     company: string,
 *     products: Array,   // Mapped products with standard field names
 *     metadata: Object   // Dosya bilgileri ve validation sonuçları
 *   }
 * }
 */
router.post('/', handleUpload);

/**
 * @route   GET /api/upload/companies
 * @desc    Get list of supported companies and their field mappings
 * @access  Public
 * @returns {
 *   success: boolean,
 *   data: Array        // Company configs with keywords and mappings
 * }
 */
router.get('/companies', getSupportedCompanies);

/**
 * @route   GET /api/upload/health
 * @desc    Health check for upload service
 * @access  Public
 * @returns {
 *   success: boolean,
 *   capabilities: Object
 * }
 */
router.get('/health', uploadHealthCheck);

module.exports = router;