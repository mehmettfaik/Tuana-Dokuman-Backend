const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');

// OCR Routes

/**
 * @route POST /api/ocr/process
 * @description Process uploaded document with OCR and extract packing list data
 * @access Public
 * @param {File} document - Document file to process (PDF, JPEG, PNG, TIFF, etc.)
 */
router.post('/process', ocrController.processDocument);

/**
 * @route GET /api/ocr/test  
 * @description Test OCR service availability and configuration
 * @access Public
 */
router.get('/test', ocrController.testOcr);

/**
 * @route GET /api/ocr/status
 * @description Get OCR service configuration status
 * @access Public
 */
router.get('/status', ocrController.getOcrStatus);

/**
 * @route POST /api/ocr/extract-text
 * @description Extract only raw text from document (for testing)
 * @access Public  
 * @param {File} document - Document file to process
 */
router.post('/extract-text', ocrController.extractTextOnly);

/**
 * @route GET /api/ocr/format-recommendations
 * @description Get format recommendations and troubleshooting info
 * @access Public
 */
router.get('/format-recommendations', ocrController.getFormatRecommendations);

/**
 * @route GET /api/ocr/test-parsing
 * @description Test parsing with sample format data
 * @access Public
 */
router.get('/test-parsing', ocrController.testParsing);

module.exports = router;