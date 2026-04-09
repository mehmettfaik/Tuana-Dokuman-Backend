const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const FormatConverterService = require('./formatConverterService');
const { mapOcrFieldsToStandard, validateCompanyFields } = require('../utils/fieldMappings');
const ParserFactory = require('./parsers/ParserFactory');
require('dotenv').config();

class DocumentAiService {
  constructor() {
    // Document AI client initialization with credentials from environment variables
    const credentials = {
      type: process.env.DOCUMENT_AI_TYPE,
      project_id: process.env.DOCUMENT_AI_PROJECT_ID,
      private_key_id: process.env.DOCUMENT_AI_PRIVATE_KEY_ID,
      private_key: process.env.DOCUMENT_AI_PRIVATE_KEY,
      client_email: process.env.DOCUMENT_AI_CLIENT_EMAIL,
      client_id: process.env.DOCUMENT_AI_CLIENT_ID,
      auth_uri: process.env.DOCUMENT_AI_AUTH_URI,
      token_uri: process.env.DOCUMENT_AI_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.DOCUMENT_AI_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.DOCUMENT_AI_CLIENT_X509_CERT_URL,
      universe_domain: process.env.DOCUMENT_AI_UNIVERSE_DOMAIN
    };

    this.client = new DocumentProcessorServiceClient({
      credentials: credentials
    });

    // Project and processor configuration from environment variables
    this.projectId = process.env.DOCUMENT_AI_PROJECT_ID;
    this.location = process.env.DOCUMENT_AI_LOCATION;
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    
    this.formatConverter = new FormatConverterService();
    this.parserFactory = new ParserFactory();
  }

  async processDocument(documentBuffer, mimeType, companyName = 'DEFAULT') {
    try {
      if (!this.processorId) {
        throw new Error('DOCUMENT_AI_PROCESSOR_ID not found in environment variables');
      }

      console.log(`Processing document for company: ${companyName}`);
      console.log(`Document: ${mimeType}, Size: ${documentBuffer.length} bytes`);

      if (documentBuffer.length > 20 * 1024 * 1024) {
        throw new Error('File size exceeds 20MB limit for Document AI processing');
      }

      // Format preprocessing - PDF'ler için özel kontrol
      // Document AI, PDF'leri direkt işleyebilir ancak bazen taranmış PDF'lerde sorun olabilir
      console.log('Checking if format preprocessing is needed...');
      
      let finalBuffer = documentBuffer;
      let finalMimeType = mimeType;
      let conversionApplied = false;
      
      // PDF'ler için: önce direkt gönder, başarısız olursa image'e çevir
      if (mimeType === 'application/pdf') {
        console.log('� Sending PDF directly to Document AI (will convert to image if OCR fails)...');
        // İlk deneme: direkt PDF
        finalBuffer = documentBuffer;
        finalMimeType = mimeType;
      }
      // Non-standard image formats
      else if (!['image/jpeg', 'image/png', 'image/tiff', 'image/gif', 'image/bmp', 'image/webp'].includes(mimeType)) {
        console.log('Starting format preprocessing for:', mimeType);
        const preprocessResult = await this.formatConverter.convertToOptimizedImage(
          documentBuffer, 
          mimeType, 
          'OCR_optimization'
        );
        
        if (preprocessResult.success) {
          finalBuffer = preprocessResult.buffer;
          finalMimeType = 'image/jpeg';
          conversionApplied = true;
          console.log('Preprocessing complete: ' + mimeType + ' → ' + finalMimeType);
        } else {
          console.log('Preprocessing failed, using original format:', mimeType);
        }
      } else {
        console.log(`Format ${mimeType} - sending directly to Document AI`);
      }

      // Document AI processing
      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;
      const request = {
        name,
        rawDocument: {
          content: finalBuffer,
          mimeType: finalMimeType,
        },
      };

      console.log('Processing document with Document AI...');
      const [result] = await this.client.processDocument(request);
      const { document } = result;
      

      if (!document) {
        throw new Error('No document returned from Document AI');
      }

      console.log('Document processed successfully');
      
      // Extract text and parse data using new parser system
      const extractedText = document.text || '';
      const parseResult = this.parserFactory.parseDocument(extractedText);
      
      if (!parseResult.success) {
        console.error('Parser factory failed:', parseResult.error);
        // Fallback to legacy parsing if parser fails
        const rawProducts = this.parseDocumentDataLegacy(extractedText);
        const mappedProducts = mapOcrFieldsToStandard(rawProducts, companyName);
        
        return this.buildSuccessResponse(extractedText, mappedProducts, rawProducts);
      }
      
      const rawProducts = parseResult.data;
      console.log(`Parsed with ${parseResult.format} parser (${parseResult.confidence.toFixed(1)}% confidence)`);
      
      // Apply field mapping using fieldMappings.js logic
      const mappedProducts = mapOcrFieldsToStandard(rawProducts, companyName);

      // Post-process mapped products to ensure field combinations for frontend
      const finalProducts = mappedProducts.map(item => {
        const result = { ...item };

        // If the combined field already exists, leave it. Otherwise try to build it
        if (!result['ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE']) {
          // For AKBASLAR: CUSTOMER ORDER NO + COMPOSITION
          const custAkbaslar = result['ARTICLE NUMBER'] || result['CUSTOMER ORDER NO'] || '';
          const compAkbaslar = result['COMPOSITION'] || '';

          // For ADA: Müşt. Referansı + Komp
          const mustRef = result['Müşt. Referansı'] || '';
          const komp = result['Komp'] || '';

          let combined = '';
          
          // Try AKBASLAR combination first
          if (custAkbaslar && compAkbaslar) {
            combined = `${custAkbaslar} / ${compAkbaslar}`;
            // Remove the separate AKBASLAR fields to avoid duplication
            delete result['ARTICLE NUMBER'];
            delete result['COMPOSITION'];
            delete result['CUSTOMER ORDER NO'];
          }
          // Try ADA combination
          else if (mustRef && komp) {
            combined = `${mustRef} / ${komp}`;
            // Remove the separate ADA fields to avoid duplication
            delete result['Müşt. Referansı'];
            delete result['Komp'];
          }
          // Fallback to single field if only one exists
          else if (custAkbaslar || compAkbaslar) {
            combined = custAkbaslar || compAkbaslar;
            delete result['ARTICLE NUMBER'];
            delete result['COMPOSITION'];
            delete result['CUSTOMER ORDER NO'];
          }
          else if (mustRef || komp) {
            combined = mustRef || komp;
            delete result['Müşt. Referansı'];
            delete result['Komp'];
          }

          if (combined) {
            result['ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE'] = combined;
          }
        }

        return result;
      });

      return this.buildSuccessResponse(extractedText, finalProducts, rawProducts, parseResult);
    } catch (error) {
      return this.buildErrorResponse(error);
    }
  }

  /**
   * Build success response with parsed data
   */
  buildSuccessResponse(extractedText, finalProducts, rawProducts, parseResult = null) {
    // Validate company-specific fields (use raw products to judge presence of original headers)
    const validation = validateCompanyFields(rawProducts, 'DEFAULT');

    const response = {
      success: true,
      extractedText,
      packingListData: {
        goods: finalProducts
      },
      validation,
      rawData: rawProducts
    };

    // Add parser information if available
    if (parseResult) {
      response.parserInfo = {
        detectedFormat: parseResult.format,
        confidence: parseResult.confidence,
        matchedKeywords: parseResult.matchedKeywords
      };
    }

    return response;
  }

  /**
   * Build error response
   */
  buildErrorResponse(error) {
    console.error('Document AI processing error:', error);

    let userMessage = 'Dosya formatında sorun tespit edildi. Format dönüştürme işlemi başarısız.';
    
    if (error.message.includes('File size')) {
      userMessage = 'Dosya boyutu çok büyük. Maksimum 20MB desteklenir.';
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      userMessage = 'Günlük OCR kotası doldu. Lütfen yarın tekrar deneyin.';
    } else if (error.message.includes('INVALID_ARGUMENT')) {
      userMessage = 'Dosya formatı desteklenmiyor. JPG veya PNG kullanın.';
    }

    return {
      success: false,
      error: userMessage,
      originalError: error.message,
      extractedText: '',
      packingListData: { goods: [] },
      validation: { isValid: false, confidence: 0 }
    };
  }

  /**
   * Legacy parsing method - kept as fallback
   * Ana parsing fonksiyonu - OCR text'ini parse eder ve raw data çıkarır
   */
  parseDocumentDataLegacy(text) {
    console.log('Using legacy parsing as fallback...');
    
    try {
      // Format tespiti
      const detectedFormat = this.detectFormatLegacy(text);
      console.log(`Detected format (legacy): ${detectedFormat}`);
      
      switch (detectedFormat) {
        case 'AKBASLAR_FORMAT':
          return this.parseAkbaslarFormatLegacy(text);
        case 'ADA_FORMAT':
          return this.parseAdaFormatLegacy(text);
        default:
          console.log('Unknown format, using general parsing');
          return this.parseGeneralFormatLegacy(text);
      }

    } catch (error) {
      console.error('Error in legacy parsing:', error);
      return [];
    }
  }

  /**
   * Legacy format detection
   */
  detectFormatLegacy(text) {
    // Simplified legacy detection for fallback
    const akbaslarKeywords = ['CUSTOMER ORDER NO', 'COMPOSITION'];
    const adaKeywords = ['Müşt. Referansı', 'Komp'];
    
    const akbaslarCount = akbaslarKeywords.filter(k => text.toLowerCase().includes(k.toLowerCase())).length;
    const adaCount = adaKeywords.filter(k => text.toLowerCase().includes(k.toLowerCase())).length;
    
    if (akbaslarCount > adaCount) return 'AKBASLAR_FORMAT';
    if (adaCount > 0) return 'ADA_FORMAT';
    
    return 'UNKNOWN';
  }

  /**
   * Legacy AKBASLAR parsing
   */
  parseAkbaslarFormatLegacy(text) {
    const customerOrderMatch = text.match(/CUSTOMER\s*ORDER\s*NO\s*[:：]\s*([^\n\r]+)/i);
    const compositionMatch = text.match(/COMPOSITION\s*[:：]\s*([^\n\r]+)/i);
    
    return [{
      'CUSTOMER ORDER NO': customerOrderMatch ? customerOrderMatch[1].trim() : '',
      'COMPOSITION': compositionMatch ? compositionMatch[1].trim() : '',
      'Batch No': '',
      'Roll No': '',
      'Quantity Meter': '',
      'Gross Weight': '',
      'Net Weight': ''
    }];
  }

  /**
   * Legacy ADA parsing
   */
  parseAdaFormatLegacy(text) {
    return [{
      'Müşt. Referansı': '',
      'Komp': '',
      'Barkod-TopNo': '',
      'Kalite-Lot': '',
      'Metre': '',
      'Gramaj': ''
    }];
  }

  /**
   * Legacy general parsing
   */
  parseGeneralFormatLegacy(text) {
    return [{
      'Order No': '',
      'Composition': '',
      'Batch': '',
      'Roll': '',
      'Quantity': '',
      'Weight': ''
    }];
  }

  /**
   * DEPRECATED: Old parseDocumentData method - replaced by ParserFactory
   * Kept for compatibility with existing code
   */
  parseDocumentData(text) {
    console.log('WARNING: Using deprecated parseDocumentData method. Please use ParserFactory instead.');
    return this.parseDocumentDataLegacy(text);
  }

  /**
   * Get parser factory instance for external use
   */
  getParserFactory() {
    return this.parserFactory;
  }

  /**
   * Get format detection statistics for debugging
   */
  getFormatDetectionStats(text) {
    return this.parserFactory.getFormatDetectionStats(text);
  }
}

module.exports = DocumentAiService;