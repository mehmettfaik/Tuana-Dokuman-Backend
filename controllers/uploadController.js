const DocumentAiService = require('../services/documentAiService');
const FormatConverterService = require('../services/formatConverterService');
const { mapOcrFieldsToStandard, validateCompanyFields } = require('../utils/fieldMappings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const uploadConfig = multer({
  dest: 'temp/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types for OCR
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/tiff',
      'application/pdf',
      'image/gif',
      'image/webp',
      'image/bmp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PDF, JPEG, PNG, TIFF, GIF, WebP, or BMP files.'), false);
    }
  }
});

// Single file upload with 'file' field name
const upload = uploadConfig.single('file');

const documentAiService = new DocumentAiService();
const formatConverterService = new FormatConverterService();

/**
 * Main Upload Endpoint - POST /api/upload
 * Frontend'den company bilgisi ve PDF dosyasını alır, OCR yapar ve mapped data döner
 */
const handleUpload = async (req, res) => {
  try {
    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed',
          code: 'UPLOAD_ERROR'
        });
      }

      // Check for uploaded file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided. Please upload a PDF or image file.',
          code: 'NO_FILE'
        });
      }

      // Check for company parameter
      const company = req.body.company;
      if (!company) {
        return res.status(400).json({
          success: false,
          error: 'Company parameter is required',
          code: 'NO_COMPANY'
        });
      }

      console.log(`Processing upload for company: ${company}`);
      console.log(`File: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

      try {
        // Read the uploaded file
        const filePath = req.file.path;
        const documentBuffer = fs.readFileSync(filePath);
        
        let finalBuffer = documentBuffer;
        let finalMimeType = req.file.mimetype;
        let conversionUsed = false;
        
        // Convert problematic formats to JPEG for better OCR compatibility
        if (req.file.mimetype === 'application/pdf' || 
            !['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
          
          console.log('🔄 Converting to optimized format for better OCR...');
          
          try {
            const conversionResult = await formatConverterService.convertToOptimizedImage(
              documentBuffer, 
              req.file.mimetype
            );
            
            if (conversionResult.success) {
              finalBuffer = conversionResult.buffer;
              finalMimeType = 'image/jpeg';
              conversionUsed = true;
              console.log('✅ Format conversion successful');
            } else {
              console.log('⚠️ Format conversion failed, using original file');
            }
          } catch (conversionError) {
            console.error('Format conversion error:', conversionError);
            // Continue with original file if conversion fails
          }
        }
        
        // Process with Document AI
        // console.log(`🤖 Processing with Document AI for company: ${company}...`);
        const ocrResult = await documentAiService.processDocument(finalBuffer, finalMimeType, company);

        // Clean up uploaded file
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }

        if (!ocrResult.success) {
          return res.status(500).json({
            success: false,
            error: 'OCR processing failed: ' + (ocrResult.error || 'Unknown error'),
            code: 'OCR_ERROR',
            details: ocrResult
          });
        }

        // Extract products from OCR result (already mapped by documentAiService)
        const mappedProducts = ocrResult.packingListData?.goods || [];
        const validation = ocrResult.validation || { isValid: false, confidence: 0 };
        
        console.log(`📦 OCR extracted and mapped ${mappedProducts.length} products`);

        if (mappedProducts.length === 0) {
          return res.status(422).json({
            success: false,
            error: 'No product data found in the document',
            code: 'NO_PRODUCTS',
            suggestions: [
              'Ensure the document contains a clear table with product information',
              'Check that the document is not corrupted or too blurry',
              'Try uploading a higher quality scan or photo'
            ],
            extractedText: ocrResult.extractedText?.substring(0, 500) || ''
          });
        }

        console.log(`✅ Company validation: ${validation.confidence * 100}% confidence`);

        // Successful response
        const response = {
          success: true,
          message: `Successfully processed document for ${company}`,
          data: {
            company: company,
            products: mappedProducts,
            metadata: {
              originalFilename: req.file.originalname,
              fileSize: req.file.size,
              mimeType: req.file.mimetype,
              processedMimeType: finalMimeType,
              conversionUsed: conversionUsed,
              productCount: mappedProducts.length,
              validation: validation
            }
          }
        };

        console.log(`✅ Upload processing completed successfully for ${company}`);
        res.json(response);

      } catch (processingError) {
        console.error('Document processing error:', processingError);
        
        // Clean up uploaded file
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }

        res.status(500).json({
          success: false,
          error: 'Document processing failed: ' + processingError.message,
          code: 'PROCESSING_ERROR'
        });
      }
    });

  } catch (error) {
    console.error('Upload controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message,
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Test endpoint to check supported companies and their mappings
 */
const getSupportedCompanies = async (req, res) => {
  try {
    const { fieldMappings } = require('../utils/fieldMappings');
    
    const companies = Object.keys(fieldMappings).map(key => ({
      name: key,
      keywords: fieldMappings[key].keywords,
      supportedFields: Object.keys(fieldMappings[key].mapping)
    }));

    res.json({
      success: true,
      message: 'Supported companies and their field mappings',
      data: companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Health check endpoint for upload service
 */
const uploadHealthCheck = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Upload service is running',
      capabilities: {
        supportedFormats: ['PDF', 'JPEG', 'PNG', 'TIFF', 'GIF', 'WebP', 'BMP'],
        maxFileSize: '10MB',
        features: [
          'Google Document AI OCR',
          'Format conversion (PDF → JPEG)',
          'Company-specific field mapping',
          'Heuristic field matching',
          'Field validation'
        ]
      },
      processorConfigured: !!process.env.DOCUMENT_AI_PROCESSOR_ID
    });
  } catch (error) {
    console.error('Upload health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  handleUpload,
  getSupportedCompanies,
  uploadHealthCheck
};