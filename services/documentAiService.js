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

      // Format preprocessing
      console.log('Starting format preprocessing...');
      const preprocessResult = await this.formatConverter.convertToOptimizedImage(documentBuffer, mimeType, 'OCR_optimization');
      
      let finalBuffer = documentBuffer;
      let finalMimeType = mimeType;
      
      if (preprocessResult.success) {
        finalBuffer = preprocessResult.buffer;
        finalMimeType = 'image/jpeg';
        console.log('Preprocessing complete: ' + mimeType + ' → ' + finalMimeType);
      }

      // Document AI processing with enhanced OCR settings
      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;
      const request = {
        name,
        rawDocument: {
          content: finalBuffer,
          mimeType: finalMimeType,
        },
        // Enhanced OCR processing hints for better accuracy
        processOptions: {
          ocrConfig: {
            enableImageQualityScores: true,
            enableSymbol: true,
            computeStyleInfo: true,
            // Enhanced language hints
            languageHints: ['en', 'tr'], // English and Turkish
          }
        }
      };

      console.log('Processing document with Document AI...');
      const [result] = await this.client.processDocument(request);
      const { document } = result;
      

      if (!document) {
        throw new Error('No document returned from Document AI');
      }

      console.log('Document processed successfully');
      
      // Extract text and preprocess for better parsing
      let extractedText = document.text || '';
      console.log('🔄 Preprocessing OCR text for better parsing...');
      extractedText = this.preprocessOcrText(extractedText);
      
      console.log('📝 Preprocessed OCR text length:', extractedText.length);
      
      // Enhanced debug logging for production troubleshooting
      console.log('🔍 OCR Text Sample (first 500 chars):');
      console.log(extractedText.substring(0, 500));
      console.log('🔍 OCR Text Sample (last 500 chars):');  
      console.log(extractedText.substring(Math.max(0, extractedText.length - 500)));
      
      const parseResult = this.parserFactory.parseDocument(extractedText);
      
      if (!parseResult.success) {
        console.error('❌ Parser factory failed:', parseResult.error);
        console.log('🔄 Attempting enhanced legacy parsing fallback...');
        
        // Enhanced fallback: try multiple legacy approaches
        let rawProducts = [];
        
        // Try legacy parsing first
        try {
          rawProducts = this.parseDocumentDataLegacy(extractedText);
          console.log(`📋 Legacy parser found ${rawProducts.length} products`);
        } catch (legacyError) {
          console.error('Legacy parser also failed:', legacyError);
        }
        
        // If still no products, try extracting basic text patterns
        if (rawProducts.length === 0) {
          console.log('🔄 Trying basic text pattern extraction...');
          rawProducts = this.extractBasicPatterns(extractedText);
          console.log(`📋 Pattern extraction found ${rawProducts.length} potential products`);
        }
        
        const mappedProducts = mapOcrFieldsToStandard(rawProducts, companyName);
        return this.buildSuccessResponse(extractedText, mappedProducts, rawProducts);
      }
      
      const rawProducts = parseResult.data;
      console.log(`📋 Parsed with ${parseResult.format} parser (${parseResult.confidence.toFixed(1)}% confidence)`);
      
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
    console.log('📋 Using legacy parsing as fallback...');
    
    try {
      // Format tespiti
      const detectedFormat = this.detectFormatLegacy(text);
      console.log(`🔍 Detected format (legacy): ${detectedFormat}`);
      
      switch (detectedFormat) {
        case 'AKBASLAR_FORMAT':
          return this.parseAkbaslarFormatLegacy(text);
        case 'ADA_FORMAT':
          return this.parseAdaFormatLegacy(text);
        default:
          console.log('⚠️ Unknown format, using general parsing');
          return this.parseGeneralFormatLegacy(text);
      }

    } catch (error) {
      console.error('Error in legacy parsing:', error);
      return [];
    }
  }

  /**
   * Extract basic patterns when all parsers fail
   * Last resort method to find any tabular data
   */
  extractBasicPatterns(text) {
    console.log('🔍 Attempting basic pattern extraction...');
    const products = [];
    
    if (!text) return products;
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Look for lines that might be product rows (contain numbers, letters, and separators)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip obvious header lines
      if (line.toLowerCase().includes('customer') || 
          line.toLowerCase().includes('composition') ||
          line.toLowerCase().includes('total') ||
          line.toLowerCase().includes('page')) {
        continue;
      }
      
      // Look for lines with mixed content that might be product data
      const hasNumbers = /\d/.test(line);
      const hasLetters = /[a-zA-Z]/.test(line);
      const hasSeparators = /[\s\-_\|,;:]/.test(line);
      
      if (hasNumbers && hasLetters && hasSeparators && line.length > 10) {
        console.log(`📋 Found potential product line: ${line.substring(0, 50)}...`);
        
        // Create a basic product with the raw line as the main field
        products.push({
          'Order No': '',
          'Composition': '',
          'Batch': '',
          'Roll': '',
          'Quantity': '',
          'Raw Line': line  // Keep original line for reference
        });
      }
    }
    
    console.log(`📋 Basic pattern extraction found ${products.length} potential products`);
    return products;
  }

  /**
   * Preprocess OCR text for better parsing accuracy
   * Fixes common OCR issues that can prevent product detection
   */
  preprocessOcrText(text) {
    if (!text) return '';
    
    let processed = text;
    
    // Fix common OCR character mistakes
    processed = processed
      .replace(/[İI]/g, 'I')  // Normalize Turkish I characters
      .replace(/[şŞ]/g, 's')  // Normalize Turkish characters
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[öÖ]/g, 'o')
      // Fix common OCR number/letter confusion
      .replace(/0/g, 'O')     // Sometimes 0 is mistaken for O
      .replace(/1/g, 'I')     // Sometimes 1 is mistaken for I
      // Normalize spacing around common keywords
      .replace(/\s*:\s*/g, ': ')
      .replace(/\s*-\s*/g, ' - ')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Add line breaks before common section headers for better parsing
    const sectionHeaders = [
      'CUSTOMER ORDER NO',
      'COMPOSITION',
      'Müşt. Referansı', 
      'Komp',
      'Tip',
      'TopAdı',
      'Top Metre',
      'Dispo No'
    ];
    
    sectionHeaders.forEach(header => {
      const regex = new RegExp(`(?<!^|\n)\\s*(${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      processed = processed.replace(regex, '\n$1');
    });
    
    console.log('📋 OCR text preprocessing completed');
    return processed;
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
    console.log('⚠️ WARNING: Using deprecated parseDocumentData method. Please use ParserFactory instead.');
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