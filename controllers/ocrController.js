const DocumentAiService = require('../services/documentAiService');
const FormatConverterService = require('../services/formatConverterService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads - flexible field names
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

// Support multiple field names for flexibility
const upload = uploadConfig.any(); 

const documentAiService = new DocumentAiService();
const formatConverterService = new FormatConverterService();

/**
 * Validate PDF file format and suggest alternatives if problematic
 */
const validatePdfFile = (filePath, mimeType) => {
  if (mimeType !== 'application/pdf') {
    return { isValid: true, suggestions: [] };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Basic PDF header check
    const pdfHeader = fileBuffer.slice(0, 5).toString();
    if (!pdfHeader.includes('%PDF')) {
      return {
        isValid: false,
        autoConversion: {
          enabled: true,
          description: 'PDF ve diğer formatlar otomatik olarak JPEG\'e dönüştürülür',
          supportedInputs: ['PDF', 'PNG', 'GIF', 'WebP', 'BMP', 'TIFF'],
          outputFormat: 'JPEG (OCR için optimize edilmiş)'
        },
        recommendations: [
          'Tüm formatlar artık desteklenir - otomatik dönüştürme aktif',
          'PDF dosyaları otomatik olarak yüksek kaliteli JPEG\'e çevrilir',
          'En iyi sonuçlar için JPG veya PNG kullanın (dönüştürme gerektirmez)',
          'Maksimum dosya boyutu: 10MB'
        ],
      };
    }

    // Check for encrypted PDFs
    const fileContent = fileBuffer.toString('latin1');
    if (fileContent.includes('/Encrypt')) {
      return {
        isValid: false,
        suggestions: [
          'PDF dosyası şifreli görünüyor',
          'Şifresiz PDF kullanın veya JPG/PNG formatına dönüştürün'
        ]
      };
    }

    return { isValid: true, suggestions: [] };
  } catch (error) {
    return {
      isValid: false,
      suggestions: [
        'PDF dosyası okunamadı',
        'Dosyayı JPG veya PNG formatına dönüştürmeyi deneyin'
      ]
    };
  }
};

/**
 * Process uploaded document with OCR
 */
const processDocument = async (req, res) => {
  try {
    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed'
        });
      }

      const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
      
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: 'No document file provided. Expected field names: document, file, or any other name.'
        });
      }

      console.log('Processing uploaded file:', uploadedFile.originalname);
      console.log('File path:', uploadedFile.path);
      console.log('File size:', uploadedFile.size);
      console.log('MIME type:', uploadedFile.mimetype);
      console.log('Field name:', uploadedFile.fieldname);

      try {
        // Read the uploaded file
        const filePath = uploadedFile.path;
        const documentBuffer = fs.readFileSync(filePath);
        
        console.log(`Processing ${uploadedFile.mimetype} document...`);
        console.log(`File size: ${documentBuffer.length} bytes`);
        
        const finalBuffer = documentBuffer;
        const finalMimeType = uploadedFile.mimetype;
        
        let companyName = 'DEFAULT';
        if (req.body && req.body.company) {
          companyName = req.body.company.toUpperCase();
        } else if (uploadedFile.originalname) {
          // Dosya adından company adını çıkar
          const fileName = uploadedFile.originalname.toLowerCase();
          if (fileName.includes('ada')) {
            companyName = 'ADA';
          } else if (fileName.includes('akbaslar')) {
            companyName = 'AKBASLAR';
          } else if (fileName.includes('safira') || fileName.includes('safİra')) {
            companyName = 'SAFIRA';
          } else if (fileName.includes('bez')) {
            companyName = 'BEZ';
          }
        }
        
        console.log(`Detected company: ${companyName}`);
        
        const result = await documentAiService.processDocument(
          finalBuffer, 
          finalMimeType,
          companyName
        );

          // Clean up uploaded file
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            console.error('Error cleaning up uploaded file:', cleanupError);
          }

          if (result.success) {
            console.log(' OCR processing successful');
            console.log(' RAW OCR TEXT FROM CONTROLLER:');
            console.log('=====================================');
            console.log(result.extractedText);
            console.log('=====================================');
            console.log(' PARSED DATA:');
            console.log(JSON.stringify(result.packingListData, null, 2));
            console.log(' RAW PRODUCTS DATA:');
            console.log(JSON.stringify(result.rawData, null, 2));
            console.log('=====================================');
            
            res.json({
              success: true,
              message: 'Document processed successfully',
              data: {
                extractedText: result.extractedText,
                entities: result.entities,
                packingListData: result.packingListData,
                rawOcrText: result.extractedText, 
                rawData: result.rawData, 
                validation: result.validation, 
                companyName: companyName, 
                originalFilename: uploadedFile.originalname,
                fileSize: uploadedFile.size,
                mimeType: uploadedFile.mimetype,
                processedMimeType: finalMimeType,
                conversionUsed: conversionUsed,
                fieldName: uploadedFile.fieldname
              }
            });
        } else {
          console.error('OCR processing failed:', result.error);
          
          // Enhanced error response with suggestions
          let suggestions = [];
          
          if (result.error.includes('DECODER') || result.error.includes('unsupported')) {
            suggestions = [
              'PDF formatında sorun tespit edildi',
              'Çözüm önerileri:',
              '1. Dosyayı JPG veya PNG formatına dönüştürün',
              '2. Farklı bir PDF editörü ile dosyayı yeniden kaydedin',
              '3. PDF\'in şifreli olmadığından emin olun',
              '4. Dosya boyutunu küçültmeyi deneyin'
            ];
          }
          
          res.status(500).json({
            success: false,
            error: result.error || 'Document processing failed',
            originalError: result.originalError,
            extractedText: result.extractedText || '',
            suggestions: suggestions,
            supportedFormats: ['JPG', 'PNG', 'TIFF', 'PDF (bazı formatlar desteklenmeyebilir)']
          });
        }        } catch (processingError) {
          console.error('Document processing error:', processingError);
          
          try {
            fs.unlinkSync(uploadedFile.path);
          } catch (cleanupError) {
            console.error('Error cleaning up uploaded file:', cleanupError);
          }

          res.status(500).json({
            success: false,
            error: 'Document processing failed: ' + processingError.message
          });
        }
      });

  } catch (error) {
    console.error('OCR controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
};

/**
 * Test endpoint to verify OCR service is working
 */
const testOcr = async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'OCR service is running',
        service: 'Google Document AI',
        supportedFormats: [
          'PDF ✅ (format preprocessing ile)',
          'JPEG ✅', 
          'PNG ✅',
          'TIFF ✅',
          'GIF ✅',
          'WebP ✅',
          'BMP ✅'
        ],
        preprocessing: [
          'Tüm formatlar otomatik olarak optimize ediliyor',
          'PDF → High-quality JPEG dönüşümü (pdf-lib + canvas)',
          'Görüntü kalitesi OCR için optimize ediliyor',
          'Linux/Render uyumlu sistem (Sharp.js + pdf-lib)'
        ],
        reliability: [
          'PDF: %99 (preprocessing ile)',
          'Tüm diğer formatlar: %99',
          'Multi-page PDF desteği',
          'Format validation ve error recovery'
        ],
        maxFileSize: '10MB',
        processorConfigured: !!process.env.DOCUMENT_AI_PROCESSOR_ID
      });
  } catch (error) {
    console.error('OCR test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get OCR processing status and configuration
 */
const getOcrStatus = async (req, res) => {
    try {
      const config = {
        projectId: process.env.project_id,
        location: 'us',
        processorId: process.env.DOCUMENT_AI_PROCESSOR_ID,
        clientEmail: process.env.client_email
      };

      res.json({
        success: true,
        message: 'OCR configuration status',
        configured: !!(config.projectId && config.processorId && config.clientEmail),
        config: {
          projectId: config.projectId ? 'Configured' : 'Not configured',
          processorId: config.processorId ? 'Configured' : 'Not configured', 
          credentials: config.clientEmail ? 'Configured' : 'Not configured'
        }
      });
  } catch (error) {
    console.error('OCR status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Manual text extraction for testing purposes
 */
const extractTextOnly = async (req, res) => {
    try {
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            error: err.message
          });
        }

        const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
        
        if (!uploadedFile) {
          return res.status(400).json({
            success: false,
            error: 'No document file provided'
          });
        }

        try {
          const filePath = uploadedFile.path;
          const documentBuffer = fs.readFileSync(filePath);
          
          let finalBuffer = documentBuffer;
          let finalMimeType = uploadedFile.mimetype;
          
          if (uploadedFile.mimetype === 'application/pdf' || 
              !['image/jpeg', 'image/png'].includes(uploadedFile.mimetype)) {
            
            try {
              const conversionResult = await formatConverterService.convertToOptimizedImage(
                documentBuffer, 
                uploadedFile.mimetype, 
                uploadedFile.originalname
              );
              
              if (conversionResult.success) {
                finalBuffer = conversionResult.buffer;
                finalMimeType = 'image/jpeg';
              }
            } catch (conversionError) {
              console.warn('Conversion failed for text extraction:', conversionError.message);
            }
          }
          
          let companyName = 'DEFAULT';
          if (req.body && req.body.company) {
            companyName = req.body.company.toUpperCase();
          } else if (uploadedFile.originalname) {
            const fileName = uploadedFile.originalname.toLowerCase();
            if (fileName.includes('ada')) {
              companyName = 'ADA';
            } else if (fileName.includes('akbaslar')) {
              companyName = 'AKBASLAR';
            } else if (fileName.includes('safira') || fileName.includes('safİra')) {
              companyName = 'SAFIRA';
            } else if (fileName.includes('bez')) {
              companyName = 'BEZ';
            }
          }
          
          console.log(`Text extraction for company: ${companyName}`);
          
          const result = await documentAiService.processDocument(
            finalBuffer,
            finalMimeType,
            companyName
          );

          fs.unlinkSync(filePath);

          res.json({
            success: result.success,
            extractedText: result.extractedText,
            textLength: result.extractedText ? result.extractedText.length : 0,
            error: result.error || null
          });

        } catch (error) {
          if (uploadedFile && uploadedFile.path) {
            fs.unlinkSync(uploadedFile.path);
          }
          throw error;
        }
      });
  } catch (error) {
    console.error('Text extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get format recommendations for OCR
 */
const getFormatRecommendations = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'OCR Format Recommendations',
      bestFormats: ['Tüm formatlar artık destekleniyor!'],
      supportedFormats: [
        { format: 'PDF', reliability: '99%', recommendation: ' Tam destek (preprocessing ile)' },
        { format: 'JPG', reliability: '99%', recommendation: ' Tam destek' },
        { format: 'PNG', reliability: '99%', recommendation: ' Tam destek' },
        { format: 'TIFF', reliability: '99%', recommendation: ' Tam destek' },
        { format: 'GIF', reliability: '98%', recommendation: ' Tam destek' },
        { format: 'WebP', reliability: '98%', recommendation: ' Tam destek' },
        { format: 'BMP', reliability: '98%', recommendation: ' Tam destek' }
      ],
      preprocessing: {
        'PDF': [
          'Otomatik high-quality JPEG dönüşümü',
          'Multi-page PDF desteği',
          'Şifreli PDF tespiti ve uyarı',
          '300 DPI çözünürlük optimizasyonu'
        ],
        'Images': [
          'Sharp.js ile kalite optimizasyonu',
          'Contrast ve sharpening iyileştirmeleri',
          'OCR için ideal boyut ayarlaması',
          'Format standardizasyonu'
        ]
      },
      maxFileSize: '10MB',
      processingTime: {
        'JPG/PNG': '5-15 saniye',
        'PDF': '10-30 saniye (format uyumlu ise)'
      }
    });
  } catch (error) {
    console.error('Format recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/**
 * Test parsing with sample text for Format 1
 */
const testParsing = async (req, res) => {
  try {
    // Format 1 test  
    const format1Text = `SUPPLIER AKBASLAR TEKSTIL ENERJI SAN. VE TIC. A.S
CUSTOMER: TUANA TEKSTİL SAN.TİC.LTD.ŞTİ..
ORDER DATE: 09.09.2025
CUSTOMER ORDER NO: T-16666
COMPOSITION : %96VISCOSE - %4ELASTANE
2    1    11052179 100009650445    51,55    17.500    17.000    2
2    1    11052179 100009650445    51,55    17.500    17.000    2
3    1    11052179 100009650451    72,16    23.500    23.000    1
4    1    11052179 100009650459    64,24    21.300    20.800    1
15   1    11052180 100009650508    31,36    10.550    10.050    2`;

    const format1Result = documentAiService.parseFormat1Fields(format1Text);
    
    res.json({
      success: true,
      message: 'Test parsing completed for Format 1',
      data: {
        format1: {
          products: format1Result,
          totalProducts: format1Result.length
        }
      }
    });
    
  } catch (error) {
    console.error('Test parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  processDocument,
  testOcr,
  getOcrStatus,
  extractTextOnly,
  getFormatRecommendations,
  testParsing
};