const { PDFDocument } = require('pdf-lib');
const fontkit = require('fontkit');
const path = require('path');

// Job system imports
const jobManager = require('../services/jobManager');
const PdfGeneratorService = require('../services/pdfGeneratorService');

// Template imports
const TechnicalSheetTemplate = require('../templates/technical-sheet/TechnicalSheetTemplate');
const ProformaInvoiceTemplate = require('../templates/proforma/ProformaInvoiceTemplate');
const InvoiceTemplate = require('../templates/invoice/InvoiceTemplate');
const PackingListTemplate = require('../templates/packing-list/PackingListTemplate');
const CreditNoteTemplate = require('../templates/credit-note/CreditNoteTemplate');
const DebitNoteTemplate = require('../templates/debit-note/DebitNoteTemplate');
const OrderConfirmationTemplate = require('../templates/order-confirmation/OrderConfirmationTemplate');
const SiparisTemplate = require('../templates/siparis/SiparisTemplate');
const PriceOfferTemplate = require('../templates/price-offer/PriceOfferTemplate');
const ProductLabelTemplate = require('../templates/product-label/ProductLabelTemplate');
const HangersShipmentTemplate = require('../templates/hangers-shipment/HangersShipmentTemplate');
const QualityControlTemplate = require('../templates/quality-control/QualityControlTemplate');
const CekiListesiTemplate = require('../templates/ceki-listesi/CekiListesiTemplate');
const CekiListesiLabelTemplate = require('../templates/ceki-listesi/CekiListesiLabelTemplate');

// Service imports
const LogoService = require('../services/logoService');
const WashingIconsService = require('../services/washingIconsService');
const FontService = require('../services/fontService');
const LanguageService = require('../services/languageService');
const ExcelExportService = require('../services/excelExportService');

// PDF Generator Service instance
const pdfGeneratorService = new PdfGeneratorService();

// ============================================================================
// NEW QUEUE-BASED API ENDPOINTS
// ============================================================================

/**
 * POST /api/pdf/start
 * PDF üretim işlemini başlatır ve job ID döndürür
 */
exports.startPdfGeneration = async (req, res) => {
  try {
    const { docType, formType, formData, language } = req.body;
    const documentType = docType || formType;

    if (!documentType) {
      return res.status(400).json({ 
        error: 'docType or formType is required',
        received: req.body 
      });
    }

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        received: req.body 
      });
    }

    // Invoice için INVOICE NUMBER kontrolü
    if (documentType === 'invoice' && !formData['INVOICE NUMBER']) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required for invoice document type',
        received: formData 
      });
    }

    // Job oluştur
    const jobId = jobManager.createJob(documentType, formData, language);

    
    // Arka planda PDF üretimi başlat
    setImmediate(async () => {
      try {
        // Job durumunu processing olarak güncelle
        jobManager.updateJobStatus(jobId, 'processing');
        
        // PDF üret
        const filePath = await pdfGeneratorService.generatePDF(jobId, documentType, formData, language);
        
        // Job'ı tamamlandı olarak işaretle
        jobManager.updateJobStatus(jobId, 'completed', filePath);
                
      } catch (error) {
        jobManager.updateJobStatus(jobId, 'failed', null, error.message);
      }
    });

    // Hemen response döndür
    res.json({
      success: true,
      jobId: jobId,
      status: 'pending',
      message: 'PDF generation started. Use /status endpoint to check progress.',
      statusUrl: `/api/pdf/status/${jobId}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error starting PDF generation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/pdf/status/:id
 * Job durumunu kontrol eder
 */
exports.checkJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = jobManager.getJob(id);
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId: id,
        timestamp: new Date().toISOString()
      });
    }

    const response = {
      jobId: id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      timestamp: new Date().toISOString()
    };

    // Eğer tamamlandıysa download URL'i ekle
    if (job.status === 'completed' && job.downloadUrl) {
      response.downloadUrl = job.downloadUrl;
      response.ready = true;
    }

    // Eğer hata varsa hata mesajını ekle
    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    res.json(response);

  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/pdf/download/:id
 * PDF dosyasını indirir
 */
exports.downloadPdf = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = jobManager.getJob(id);
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId: id,
        timestamp: new Date().toISOString()
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'PDF is not ready yet',
        status: job.status,
        jobId: id,
        timestamp: new Date().toISOString()
      });
    }

    if (!job.filePath) {
      return res.status(500).json({
        error: 'PDF file path not found',
        jobId: id,
        timestamp: new Date().toISOString()
      });
    }

    // Dosyayı oku ve gönder
    const pdfBuffer = await pdfGeneratorService.getFileBuffer(job.filePath);
    const fileName = path.basename(job.filePath);

    // PDF header'larını ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    // PDF'i gönder
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ============================================================================
// LEGACY ENDPOINTS (Backward compatibility)
// ============================================================================

exports.generatePDF = async (req, res) => {
  try {    
    // docType veya formType'ı kabul et
    const { docType, formType, formData, language } = req.body;
    const documentType = docType || formType;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!documentType) {
      return res.status(400).json({ 
        error: 'docType or formType is required',
        received: req.body 
      });
    }

    // Invoice için INVOICE NUMBER kontrolü
    if (documentType === 'invoice' && (!formData || !formData['INVOICE NUMBER'])) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required for invoice document type',
        received: formData 
      });
    }


    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Doküman tipine göre template seçimi - dil desteği ile
    let template;
    let pdfFileName;
        
    if (documentType === 'proforma-invoice') {
      template = new ProformaInvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_PROFORMA_FATURA' : 'TUANA_PROFORMA_INVOICE';
    } else if (documentType === 'invoice') {
      template = new InvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_FATURA' : 'TUANA_INVOICE';
    } else if (documentType === 'packing-list') {
      template = new PackingListTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_PAKETLEME_LISTESI' : 'TUANA_PACKING_LIST';
    } else if (documentType === 'credit-note') {
      template = new CreditNoteTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_ALACAK_DEKONTU' : 'TUANA_CREDIT_NOTE';
    } else if (documentType === 'debit-note') {
      template = new DebitNoteTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_BORC_DEKONTU' : 'TUANA_DEBIT_NOTE';
    } else if (documentType === 'order-confirmation') {
      template = new OrderConfirmationTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_SIPARIS_ONAY' : 'TUANA_ORDER_CONFIRMATION';
    } else if (documentType === 'siparis') {
      template = new SiparisTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_SIPARIS';
    } else if (documentType === 'price-offer') {
      template = new PriceOfferTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_FIYAT_TEKLIFI' : 'TUANA_PRICE_OFFER';
    } else if (documentType === 'hangers-shipment') {
      template = new HangersShipmentTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_ASKILI_SEVKIYAT' : 'TUANA_HANGERS_SHIPMENT';
    } else if (documentType === 'quality-control') {
      template = new QualityControlTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_KALITE_KONTROL' : 'TUANA_QUALITY_CONTROL';
    } else if (documentType === 'ceki-listesi') {
      template = new CekiListesiTemplate(pdfDoc, logoImage, validatedLanguage);
      // Firma adını al ve dosya adı için uygun hale getir
      const firmaAdi = formData.musteriAdi || formData.formData?.musteriAdi || formData['MÜŞTERİ'] || 'FIRMA';
      const safeFirmaAdi = firmaAdi.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '').replace(/\s+/g, '_').toUpperCase();
      pdfFileName = `${safeFirmaAdi}_CEKI_LISTESI`;
    } else {
      // Default: technical sheet
      template = new TechnicalSheetTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_TEKNIK_SHEET' : 'TUANA_TECHNICAL_SHEET';
    }
    
    await template.initialize();
    
    // PDF üretme - dil desteği ile
    if (documentType === 'proforma-invoice') {
      await template.createProformaInvoice(formData, validatedLanguage);
    } else if (documentType === 'invoice') {
      await template.createInvoice(formData, validatedLanguage);
    } else if (documentType === 'packing-list') {
      await template.createPackingList(formData, validatedLanguage);
    } else if (documentType === 'credit-note') {
      await template.createCreditNote(formData, validatedLanguage);
    } else if (documentType === 'debit-note') {
      await template.createDebitNote(formData, validatedLanguage);
    } else if (documentType === 'order-confirmation') {
      await template.createOrderConfirmation(formData, validatedLanguage);
    } else if (documentType === 'siparis') {
      await template.createSiparis(formData, validatedLanguage);
    } else if (documentType === 'price-offer') {
      await template.createPriceOffer(formData, validatedLanguage);
    } else if (documentType === 'hangers-shipment') {
      await template.generate(formData, validatedLanguage);
    } else if (documentType === 'quality-control') {
      await template.generate(formData, validatedLanguage);
    } else if (documentType === 'ceki-listesi') {
      await template.generate(formData, validatedLanguage);
    } else {
      await template.createFabricTechnicalSheet(formData, validatedLanguage);
    }
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla - timestamp'i kaldır ve sadece temiz filename kullan
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Washing icons durumunu kontrol et
exports.getWashingIcons = (req, res) => {
  try {
    const washingIconsService = new WashingIconsService();
    const isAvailable = washingIconsService.isWashingIconsAvailable();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        file: isAvailable ? 'washing-icons.png or washing-icons.jpg found' : 'washing-icons file not found',
        location: 'backend/assets/washing-icons/'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check washing icons',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Font durumunu kontrol et
exports.getFontStatus = (req, res) => {
  try {
    const fontService = new FontService();
    const fontAvailability = fontService.checkFontAvailability();
    
    res.json({
      success: true,
      data: {
        helveticaNeue: {
          light: fontAvailability.light,
          regular: fontAvailability.regular,
          lightPath: fontAvailability.lightPath,
          regularPath: fontAvailability.regularPath
        },
        status: (fontAvailability.light && fontAvailability.regular) ? 
               'Helvetica Neue fonts available' : 
               'Helvetica Neue fonts not found - using fallback fonts',
        location: 'backend/assets/fonts/'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get font status error:', error);
    res.status(500).json({
      error: 'Failed to check font status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Proforma Invoice PDF oluşturma
exports.generateProformaInvoice = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Proforma Invoice template - language parametresi ile
    const template = new ProformaInvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.createProformaInvoice(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_PROFORMA_FATURA_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_PROFORMA_INVOICE_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Proforma Invoice PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Proforma Invoice PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Technical Sheet PDF oluşturma
exports.generateTechnicalSheet = async (req, res) => {
  try {    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Technical Sheet template - language parametresi ile
    const template = new TechnicalSheetTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.createFabricTechnicalSheet(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_TEKNIK_SHEET_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_TECHNICAL_SHEET_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    res.status(500).json({ 
      error: 'Technical Sheet PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Invoice PDF oluşturma
exports.generateInvoice = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
    

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER kontrolü - zorunlu alan
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Invoice template - language parametresi ile
    const template = new InvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.createInvoice(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_FATURA_${formData['INVOICE NUMBER']}_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_INVOICE_${formData['INVOICE NUMBER']}_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {

    res.status(500).json({ 
      error: 'Invoice PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Packing List PDF oluşturma
exports.generatePackingList = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
    
    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER kontrolü - zorunlu alan
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Packing List template - language parametresi ile
    const template = new PackingListTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.createPackingList(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_PAKETLEME_LISTESI_${formData['INVOICE NUMBER']}_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_PACKING_LIST_${formData['INVOICE NUMBER']}_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Packing List PDF generation error:', error);
    res.status(500).json({
      error: 'Packing List PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Invoice Excel oluşturma
exports.generateInvoiceExcel = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
    
    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER kontrolü - zorunlu alan
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    // Excel Export Service
    const excelExportService = new ExcelExportService();
    
    // Excel üretme
    const excelBuffer = await excelExportService.generateInvoiceExcel(formData, validatedLanguage);
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_FATURA_${formData['INVOICE NUMBER']}_${Date.now()}.xlsx`;
    } else {
      fileName = `TUANA_INVOICE_${formData['INVOICE NUMBER']}_${Date.now()}.xlsx`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(excelBuffer);

  } catch (error) {
    console.error('Invoice Excel generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Invoice Excel generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Proforma Invoice Excel oluşturma
exports.generateProformaExcel = async (req, res) => {
  try {
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
    
    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER opsiyonel - yoksa otomatik oluştur
    const proformaNumber = formData['INVOICE NUMBER'] || `PI-${Date.now()}`;

    // Excel Export Service
    const excelExportService = new ExcelExportService();
    
    // Excel üretme
    const excelBuffer = await excelExportService.generateProformaExcel(formData, validatedLanguage);
    
    // Dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_PROFORMA_FATURA_${proformaNumber}_${Date.now()}.xlsx`;
    } else {
      fileName = `TUANA_PROFORMA_INVOICE_${proformaNumber}_${Date.now()}.xlsx`;
    }

    // Headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(excelBuffer);

  } catch (error) {
    console.error('Proforma Excel generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Proforma Excel generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Packing List Excel oluşturma
exports.generatePackingListExcel = async (req, res) => {
  try {
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
    
    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER opsiyonel - yoksa otomatik oluştur
    const packingListNumber = formData['INVOICE NUMBER'] || `PL-${Date.now()}`;

    // Excel Export Service
    const excelExportService = new ExcelExportService();
    
    // Excel üretme
    const excelBuffer = await excelExportService.generatePackingListExcel(formData, validatedLanguage);
    
    // Dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_PAKETLEME_LISTESI_${packingListNumber}_${Date.now()}.xlsx`;
    } else {
      fileName = `TUANA_PACKING_LIST_${packingListNumber}_${Date.now()}.xlsx`;
    }

    // Headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(excelBuffer);

  } catch (error) {
    console.error('Packing List Excel generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Packing List Excel generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Credit Note PDF oluşturma
exports.generateCreditNote = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
    
    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER ve CREDIT NOTE NUMBER kontrolü - zorunlu alanlar
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!formData['CREDIT NOTE NUMBER']) {
      return res.status(400).json({ 
        error: 'CREDIT NOTE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Credit Note template - language parametresi ile
    const template = new CreditNoteTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    
    // PDF üretme
    await template.createCreditNote(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_ALACAK_DEKONTU_${formData['CREDIT NOTE NUMBER']}_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_CREDIT_NOTE_${formData['CREDIT NOTE NUMBER']}_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Credit Note PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Credit Note PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Debit Note PDF oluşturma
exports.generateDebitNote = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // INVOICE NUMBER ve DEBIT NOTE NUMBER kontrolü - zorunlu alanlar
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!formData['DEBIT NOTE NUMBER']) {
      return res.status(400).json({ 
        error: 'DEBIT NOTE NUMBER is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Debit Note template - language parametresi ile
    const template = new DebitNoteTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    
    // PDF üretme
    await template.createDebitNote(formData, validatedLanguage);    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_BORC_DEKONTU_${formData['DEBIT NOTE NUMBER']}_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_DEBIT_NOTE_${formData['DEBIT NOTE NUMBER']}_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Debit Note PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Debit Note PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateOrderConfirmation = async (req, res) => {
  try {
    
    const { formData, language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        received: req.body 
      });
    }

    // Order Confirmation için ORDER CONFIRMATION NUMBER kontrolü
    if (!formData['ORDER CONFIRMATION NUMBER']) {
      return res.status(400).json({ 
        error: 'ORDER CONFIRMATION NUMBER is required',
        received: formData 
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Order Confirmation template (Invoice template'ini kullanacağız) - language parametresi ile
    const template = new OrderConfirmationTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.createOrderConfirmation(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_SIPARIS_ONAY_${formData['ORDER CONFIRMATION NUMBER']}_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_ORDER_CONFIRMATION_${formData['ORDER CONFIRMATION NUMBER']}_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Order Confirmation PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Order Confirmation PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateSiparis = async (req, res) => {
  try {
    
    // Language parametresini al
    const { language } = req.body;
    
    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      'turkish': 'tr',
      'english': 'en'
    };
    
    let validatedLanguage = languageMap[language] || language || 'en';
    
    if (!languageService.isValidLanguage(validatedLanguage)) {
      console.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }
        
    // Handle nested formData structure
    let actualFormData, actualGoods;
    
    if (req.body.formData && req.body.formData.formData) {
      // Nested structure: { formData: { formData: {...}, goods: [...] } }
      actualFormData = req.body.formData.formData;
      actualGoods = req.body.formData.goods;
    } else if (req.body.formData && req.body.goods) {
      // Direct structure: { formData: {...}, goods: [...] }
      actualFormData = req.body.formData;
      actualGoods = req.body.goods;
    } else {
      // Fallback to old structure
      actualFormData = req.body.formData || req.body;
      actualGoods = req.body.goods || [];
    }
    
    if (!actualFormData) {
      return res.status(400).json({ 
        error: 'formData is required',
        received: req.body 
      });
    }

    // Sipariş için ORDER NUMBER kontrolü (frontend'den gelen field name)
    const orderNumber = actualFormData['ORDER NUMBER'] || actualFormData['SİPARİŞ NUMARASI'];
    if (!orderNumber) {
      return res.status(400).json({ 
        error: 'ORDER NUMBER or SİPARİŞ NUMARASI is required',
        received: actualFormData 
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Sipariş template (Invoice template'ini kullanacağız) - language parametresi ile
    const template = new SiparisTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // Goods verisini formData'ya ekle
    const combinedData = {
      ...actualFormData,
      goods: actualGoods || []
    };
    
    // PDF üretme
    await template.createSiparis(combinedData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();
    
    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_SIPARIS_${orderNumber}_${Date.now()}.pdf`;
    } else {
      fileName = `TUANA_ORDER_${orderNumber}_${Date.now()}.pdf`;
    }

    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Sipariş PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Sipariş PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

const generatePriceOffer = async (req, res) => {
  try {
    // Language ve form verilerini al
    const { formData: requestFormData, language: rawLanguage } = req.body;
    
    // Language mapping - frontend'den gelen değerleri backend formatına çevir
    let language = rawLanguage;
    const languageMap = {
      'turkish': 'tr',
      'english': 'en',
      'tr': 'tr',
      'en': 'en'
    };
    
    if (languageMap[rawLanguage]) {
      language = languageMap[rawLanguage];
    }
        
    // Dil validasyonu
    const languageService = new LanguageService();
    if (!language || !languageService.isValidLanguage(language)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid or missing language parameter. Received: ${rawLanguage}. Use "tr", "en", "turkish", or "english"` 
      });
    }

    // Form verilerini al - nested yapıyı düzelt
    let formData = requestFormData;
    
    // Eğer veri nested geliyorsa düzelt
    if (formData && formData.formData) {
      formData = {
        ...formData.formData,
        priceItems: formData.priceItems || []
      };
    }
    

    // PRICE OFFER NUMBER kontrolü
    const priceOfferNumber = formData['PRICE OFFER NUMBER'] || formData['priceOfferNumber'] || '';
    if (!priceOfferNumber || priceOfferNumber.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'PRICE OFFER NUMBER is required' 
      });
    }

    // PDF dokümanı oluştur
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükle
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Price Offer template'i oluştur
    const template = new PriceOfferTemplate(pdfDoc, logoImage, language);
    
    // Font'ları yükle
    await template.initialize();
    
    // Price Offer PDF'ini oluştur - language parametresi ile
    await template.createPriceOffer(formData, language);
    
    // PDF'i byte array'e çevir
    const pdfBytes = await pdfDoc.save();

    // Dil seçimine göre dosya adı
    let fileName;
    if (language === 'tr') {
      fileName = `fiyat-teklifi-${priceOfferNumber}.pdf`;
    } else {
      fileName = `price-offer-${priceOfferNumber}.pdf`;
    }

    // Response headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // PDF'i gönder
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Price Offer PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Price Offer PDF generation failed', 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generatePriceOffer = generatePriceOffer;

// ============================================================================
// PRODUCT LABEL PDF GENERATION
// ============================================================================

/**
 * Ürün etiketleri PDF'i oluştur
 */
const generateProductLabel = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      console.error('No form data provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Form data is required' 
      });
    }

    // ProductLabelTemplate kullanarak PDF oluştur
    const template = new ProductLabelTemplate();
    const pdfDoc = await template.generateDocument(formData, language);
    
    // PDF'i byte array'e çevir
    const pdfBytes = await pdfDoc.save();

    // Dil seçimine göre dosya adı
    let fileName;
    if (language === 'tr') {
      fileName = `urun-etiketleri-${Date.now()}.pdf`;
    } else {
      fileName = `product-labels-${Date.now()}.pdf`;
    }

    // Response headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // PDF'i gönder
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Product Label PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Product Label PDF generation failed', 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateProductLabel = generateProductLabel;

// Generate Hangers Shipment
const generateHangersShipment = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      console.error('No form data provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Form data is required' 
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'tr';

    // PDF document oluştur
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const LogoService = require('../services/logoService');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Hangers Shipment template
    const template = new HangersShipmentTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.createHangersShipment(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();

    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `askili-sevkiyat-${Date.now()}.pdf`;
    } else {
      fileName = `hangers-shipment-${Date.now()}.pdf`;
    }

    // Response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // PDF'i gönder
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Hangers Shipment PDF generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Hangers Shipment PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateHangersShipment = generateHangersShipment;

/**
 * Generate Packing List with OCR-extracted data
 */
const generatePackingListWithOcr = async (req, res) => {
  try {    
    // OCR'dan gelen veriler req.body'de olacak
    const ocrData = req.body.ocrData || {};
    const formData = req.body.formData || {};
    const language = req.body.language || 'en';

    // OCR verilerini form verilerine merge et
    const mergedData = {
      ...formData,
      ...ocrData
    };

    // PDF oluştur
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Logo servisi
    const logoService = new LogoService();
    const logoImage = await logoService.loadLogo(pdfDoc);

    // Template oluştur
    const template = new PackingListTemplate(pdfDoc, logoImage, language);
    await template.initialize();

    // PDF generate et
    await template.generate(mergedData);

    // PDF bytes al
    const pdfBytes = await pdfDoc.save();

    // Response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="packing-list-ocr.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);

    // PDF'i gönder
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Packing List OCR PDF generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Packing List OCR PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generatePackingListWithOcr = generatePackingListWithOcr;

/**
 * POST /api/pdf/quality-control
 * Quality Control Report PDF'i oluştur
 */
const generateQualityControl = async (req, res) => {
  try { 
    const formData = req.body;
    const language = req.body.language || 'en';

    // Validation
    if (!formData) {
      console.error('❌ No form data provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Form data is required' 
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'en';

    // Quality Control template (BasePdfTemplate kullanıyor, PDFKit tabanlı)
    const template = new QualityControlTemplate();
    
    // PDF üretme
    const pdfBuffer = await template.generate(formData, validatedLanguage);

    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `kalite-kontrol-${Date.now()}.pdf`;
    } else {
      fileName = `quality-control-${Date.now()}.pdf`;
    }
    

    // Response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // PDF'i gönder
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ ============================================');
    console.error('❌ Quality Control PDF generation error:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ============================================');
    res.status(500).json({ 
      success: false, 
      message: 'Quality Control PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateQualityControl = generateQualityControl;

/**
 * POST /api/pdf/ceki-listesi
 * Çeki Listesi PDF'i oluştur
 */
const generateCekiListesi = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      console.error('❌ No form data provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Form data is required' 
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'tr';

    // PDF document oluştur
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    const logoService = new LogoService();
    const logoImage = await logoService.loadLogo(pdfDoc);
    
    // Çeki Listesi template
    const template = new CekiListesiTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    await template.generate(formData);
    
    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();

    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `ceki-listesi-${Date.now()}.pdf`;
    } else {
      fileName = `weight-list-${Date.now()}.pdf`;
    }

    // Response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // PDF'i gönder
    res.send(Buffer.from(pdfBytes));


  } catch (error) {
    console.error('❌ ============================================');
    console.error('❌ Çeki Listesi PDF generation error:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ============================================');
    res.status(500).json({ 
      success: false, 
      message: 'Çeki Listesi PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateCekiListesi = generateCekiListesi;

/**
 * POST /api/pdf/ceki-listesi-labels
 * Çeki Listesi Etiketleri PDF'i oluştur
 */
const generateCekiListesiLabels = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      console.error('❌ No form data provided for labels');
      return res.status(400).json({ 
        success: false, 
        message: 'Form data is required' 
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'tr';

    // Çeki Listesi Label template'i kullanarak PDF oluştur
    const template = new CekiListesiLabelTemplate();
    const pdfDoc = await template.generateDocument(formData, validatedLanguage);
    
    // PDF'i byte array'e çevir
    const pdfBytes = await pdfDoc.save();

    // Dil seçimine göre dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `ceki-listesi-etiketleri-${Date.now()}.pdf`;
    } else {
      fileName = `weight-list-labels-${Date.now()}.pdf`;
    }

    // Response headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // PDF'i gönder
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('❌ ============================================');
    console.error('❌ Çeki Listesi Labels PDF generation error:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ============================================');
    res.status(500).json({ 
      success: false, 
      message: 'Çeki Listesi Labels PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

exports.generateCekiListesiLabels = generateCekiListesiLabels;
