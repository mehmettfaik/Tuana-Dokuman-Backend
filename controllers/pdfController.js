const { PDFDocument } = require('pdf-lib');
const fontkit = require('fontkit');
const TechnicalSheetTemplate = require('../templates/technical-sheet/TechnicalSheetTemplate');
const ProformaInvoiceTemplate = require('../templates/proforma/ProformaInvoiceTemplate');
const InvoiceTemplate = require('../templates/invoice/InvoiceTemplate');
const PackingListTemplate = require('../templates/packing-list/PackingListTemplate');
const CreditNoteTemplate = require('../templates/credit-note/CreditNoteTemplate');
const DebitNoteTemplate = require('../templates/debit-note/DebitNoteTemplate');
const OrderConfirmationTemplate = require('../templates/order-confirmation/OrderConfirmationTemplate');
const SiparisTemplate = require('../templates/siparis/SiparisTemplate');
const PriceOfferTemplate = require('../templates/price-offer/PriceOfferTemplate');
const LogoService = require('../services/logoService');
const WashingIconsService = require('../services/washingIconsService');
const FontService = require('../services/fontService');
const LanguageService = require('../services/languageService');

exports.generatePDF = async (req, res) => {
  try {
    //console.log('PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted docType:', documentType);
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);
    //console.log('FormData notes:', {
    //   NOTE_1: formData?.NOTE_1,
    //   NOTE_2: formData?.NOTE_2,
    //   NOTE_3: formData?.NOTE_3
    // });

    if (!documentType) {
      //console.log('Error: Missing documentType');
      return res.status(400).json({ 
        error: 'docType or formType is required',
        received: req.body 
      });
    }

    // Invoice için INVOICE NUMBER kontrolü
    if (documentType === 'invoice' && (!formData || !formData['INVOICE NUMBER'])) {
      //console.log('Error: Missing INVOICE NUMBER for invoice document type');
      return res.status(400).json({ 
        error: 'INVOICE NUMBER is required for invoice document type',
        received: formData 
      });
    }

    //console.log('Document type validation passed, creating PDF...');

    // PDF oluşturma
    //console.log('Creating PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Doküman tipine göre template seçimi - dil desteği ile
    let template;
    let pdfFileName;
    
    if (documentType === 'proforma-invoice') {
      template = new ProformaInvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_PROFORMA_INVOICE';
    } else if (documentType === 'invoice') {
      template = new InvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_INVOICE';
    } else if (documentType === 'packing-list') {
      template = new PackingListTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_PACKING_LIST';
    } else if (documentType === 'credit-note') {
      template = new CreditNoteTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_CREDIT_NOTE';
    } else if (documentType === 'debit-note') {
      template = new DebitNoteTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_DEBIT_NOTE';
    } else {
      // Default: technical sheet
      template = new TechnicalSheetTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = 'TUANA_TECHNICAL_SHEET';
    }
    
    await template.initialize();
    
    // PDF üretme - dil desteği ile
    //console.log('Generating PDF with template...');
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
    } else {
      await template.createFabricTechnicalSheet(formData, validatedLanguage);
    }
    
    // PDF'i byte array olarak al
    //console.log('Saving PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla - timestamp'i kaldır ve sadece temiz filename kullan
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('PDF generated successfully, size:', pdfBytes.length, 'bytes');
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
    console.error('Get washing icons error:', error);
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
    //console.log('Proforma Invoice PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    //console.log('Creating Proforma Invoice PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Proforma Invoice template - language parametresi ile
    const template = new ProformaInvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    //console.log('Generating Proforma Invoice PDF with template...');
    await template.createProformaInvoice(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Proforma Invoice PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_PROFORMA_INVOICE_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Proforma Invoice PDF generated successfully, size:', pdfBytes.length, 'bytes');
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
    //console.log('Technical Sheet PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

    if (!formData) {
      return res.status(400).json({ 
        error: 'formData is required',
        timestamp: new Date().toISOString()
      });
    }

    // PDF oluşturma
    //console.log('Creating Technical Sheet PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Technical Sheet template - language parametresi ile
    const template = new TechnicalSheetTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    //console.log('Generating Technical Sheet PDF with template...');
    await template.createFabricTechnicalSheet(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Technical Sheet PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_TECHNICAL_SHEET_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Technical Sheet PDF generated successfully, size:', pdfBytes.length, 'bytes');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Technical Sheet PDF generation error:', error);
    console.error('Error stack:', error.stack);
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
    //console.log('Invoice PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

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
    //console.log('Creating Invoice PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Invoice template - language parametresi ile
    const template = new InvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    //console.log('Generating Invoice PDF with template...');
    await template.createInvoice(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Invoice PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_INVOICE_${formData['INVOICE NUMBER']}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Invoice PDF generated successfully, size:', pdfBytes.length, 'bytes');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    console.error('Error stack:', error.stack);
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
    //console.log('Packing List PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

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
    //console.log('Creating Packing List PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Packing List template - language parametresi ile
    const template = new PackingListTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    //console.log('Generating Packing List PDF with template...');
    await template.createPackingList(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Packing List PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_PACKING_LIST_${formData['INVOICE NUMBER']}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Packing List PDF generated successfully, size:', pdfBytes.length, 'bytes');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Packing List PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Packing List PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

// Credit Note PDF oluşturma
exports.generateCreditNote = async (req, res) => {
  try {
    //console.log('Credit Note PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

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
    //console.log('Creating Credit Note PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Credit Note template - language parametresi ile
    const template = new CreditNoteTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    
    // PDF üretme
    //console.log('Generating Credit Note PDF with template...');
    await template.createCreditNote(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Credit Note PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_CREDIT_NOTE_${formData['CREDIT NOTE NUMBER']}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Credit Note PDF generated successfully, size:', pdfBytes.length, 'bytes');
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
    //console.log('Debit Note PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

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
    //console.log('Creating Debit Note PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Debit Note template - language parametresi ile
    const template = new DebitNoteTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    
    // PDF üretme
    //console.log('Generating Debit Note PDF with template...');
    await template.createDebitNote(formData, validatedLanguage);    // PDF'i byte array olarak al
    //console.log('Saving Debit Note PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_DEBIT_NOTE_${formData['DEBIT NOTE NUMBER']}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Debit Note PDF generated successfully, size:', pdfBytes.length, 'bytes');
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
    //console.log('Order Confirmation PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    //console.log('Extracted formData:', formData);

    if (!formData) {
      //console.log('Error: Missing formData');
      return res.status(400).json({ 
        error: 'formData is required',
        received: req.body 
      });
    }

    // Order Confirmation için ORDER CONFIRMATION NUMBER kontrolü
    if (!formData['ORDER CONFIRMATION NUMBER']) {
      //console.log('Error: Missing ORDER CONFIRMATION NUMBER');
      return res.status(400).json({ 
        error: 'ORDER CONFIRMATION NUMBER is required',
        received: formData 
      });
    }

    //console.log('Order Confirmation validation passed, creating PDF...');

    // PDF oluşturma
    //console.log('Creating Order Confirmation PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
    const logoImage = await LogoService.loadLogo(pdfDoc);
    
    // Order Confirmation template (Invoice template'ini kullanacağız) - language parametresi ile
    const template = new OrderConfirmationTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();
    
    // PDF üretme
    //console.log('Generating Order Confirmation PDF with template...');
    await template.createOrderConfirmation(formData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Order Confirmation PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_ORDER_CONFIRMATION_${formData['ORDER CONFIRMATION NUMBER']}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Order Confirmation PDF generated successfully, size:', pdfBytes.length, 'bytes');
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
    //console.log('Sipariş PDF generation request received:', req.body);
    
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
    
    //console.log('Extracted language:', language, '-> validated:', validatedLanguage);
    
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
    
    //console.log('Extracted actualFormData:', actualFormData);
    //console.log('Extracted actualGoods:', actualGoods);

    if (!actualFormData) {
      //console.log('Error: Missing formData');
      return res.status(400).json({ 
        error: 'formData is required',
        received: req.body 
      });
    }

    // Sipariş için ORDER NUMBER kontrolü (frontend'den gelen field name)
    const orderNumber = actualFormData['ORDER NUMBER'] || actualFormData['SİPARİŞ NUMARASI'];
    if (!orderNumber) {
      //console.log('Error: Missing ORDER NUMBER or SİPARİŞ NUMARASI');
      return res.status(400).json({ 
        error: 'ORDER NUMBER or SİPARİŞ NUMARASI is required',
        received: actualFormData 
      });
    }

    //console.log('Sipariş validation passed, creating PDF...');

    // PDF oluşturma
    //console.log('Creating Sipariş PDF document...');
    const pdfDoc = await PDFDocument.create();
    
    // Fontkit'i register et (custom fontlar için gerekli)
    pdfDoc.registerFontkit(fontkit);
    
    // Logo yükleme
    //console.log('Loading logo...');
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
    //console.log('Generating Sipariş PDF with template...');
    await template.createSiparis(combinedData, validatedLanguage);
    
    // PDF'i byte array olarak al
    //console.log('Saving Sipariş PDF...');
    const pdfBytes = await pdfDoc.save();
    
    // Doğru headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TUANA_SIPARIS_${orderNumber}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    //console.log('Sipariş PDF generated successfully, size:', pdfBytes.length, 'bytes');
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
    //console.log('Price Offer PDF generation started');
    //console.log('Received data:', req.body);

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
    
    //console.log('Original language:', rawLanguage, 'Mapped language:', language);
    
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
    
    //console.log('Processed formData:', formData);

    //console.log('Processed formData:', formData);

    // PRICE OFFER NUMBER kontrolü
    const priceOfferNumber = formData['PRICE OFFER NUMBER'] || formData['priceOfferNumber'] || '';
    if (!priceOfferNumber || priceOfferNumber.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'PRICE OFFER NUMBER is required' 
      });
    }

    //console.log('Creating Price Offer template...');

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
    
    //console.log('Price Offer PDF generated successfully');

    // Response headers ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="price-offer-${priceOfferNumber}.pdf"`);
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
