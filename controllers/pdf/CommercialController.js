const { PDFDocument } = require('pdf-lib');
const fontkit = require('fontkit');
const path = require('path');

// Job system imports
const jobManager = require('../../services/jobManager');
const PdfGeneratorService = require('../../services/pdfGeneratorService');

// Template imports
const TechnicalSheetTemplate = require('../../templates/technical-sheet/TechnicalSheetTemplate');
const ProformaInvoiceTemplate = require('../../templates/proforma/ProformaInvoiceTemplate');
const InvoiceTemplate = require('../../templates/invoice/InvoiceTemplate');
const PackingListTemplate = require('../../templates/packing-list/PackingListTemplate');
const CreditNoteTemplate = require('../../templates/credit-note/CreditNoteTemplate');
const DebitNoteTemplate = require('../../templates/debit-note/DebitNoteTemplate');
const OrderConfirmationTemplate = require('../../templates/order-confirmation/OrderConfirmationTemplate');
const SiparisTemplate = require('../../templates/siparis/SiparisTemplate');
const PriceOfferTemplate = require('../../templates/price-offer/PriceOfferTemplate');
const PriceListTemplate = require('../../templates/price-list/PriceListTemplate');
const ProductLabelTemplate = require('../../templates/product-label/ProductLabelTemplate');
const HangersShipmentTemplate = require('../../templates/hangers-shipment/HangersShipmentTemplate');
const QualityControlTemplate = require('../../templates/quality-control/QualityControlTemplate');
const CekiListesiTemplate = require('../../templates/ceki-listesi/CekiListesiTemplate');
const CekiListesiLabelTemplate = require('../../templates/ceki-listesi/CekiListesiLabelTemplate');

// Service imports
const LogoService = require('../../services/logoService');
const WashingIconsService = require('../../services/washingIconsService');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');
const ExcelExportService = require('../../services/excelExportService');

// PDF Generator Service instance
const pdfGeneratorService = new PdfGeneratorService();

const logger = require('../../utils/logger');

exports.generateCreditNote = async (req, res) => {
  try {
    const { formData, language } = req.body;

    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      turkish: 'tr',
      english: 'en',
    };

    let validatedLanguage = languageMap[language] || language || 'en';

    if (!languageService.isValidLanguage(validatedLanguage)) {
      logger.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({
        error: 'formData is required',
        timestamp: new Date().toISOString(),
      });
    }

    // INVOICE NUMBER ve CREDIT NOTE NUMBER kontrolü - zorunlu alanlar
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString(),
      });
    }

    if (!formData['CREDIT NOTE NUMBER']) {
      return res.status(400).json({
        error: 'CREDIT NOTE NUMBER is required',
        timestamp: new Date().toISOString(),
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
    logger.error('Credit Note PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Credit Note PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateDebitNote = async (req, res) => {
  try {
    const { formData, language } = req.body;

    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      turkish: 'tr',
      english: 'en',
    };

    let validatedLanguage = languageMap[language] || language || 'en';

    if (!languageService.isValidLanguage(validatedLanguage)) {
      logger.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({
        error: 'formData is required',
        timestamp: new Date().toISOString(),
      });
    }

    // INVOICE NUMBER ve DEBIT NOTE NUMBER kontrolü - zorunlu alanlar
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString(),
      });
    }

    if (!formData['DEBIT NOTE NUMBER']) {
      return res.status(400).json({
        error: 'DEBIT NOTE NUMBER is required',
        timestamp: new Date().toISOString(),
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
    await template.createDebitNote(formData, validatedLanguage); // PDF'i byte array olarak al
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
    logger.error('Debit Note PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Debit Note PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateOrderConfirmation = async (req, res) => {
  try {
    const { formData, language } = req.body;

    // Language mapping ve validation
    const languageService = new LanguageService();
    const languageMap = {
      turkish: 'tr',
      english: 'en',
    };

    let validatedLanguage = languageMap[language] || language || 'en';

    if (!languageService.isValidLanguage(validatedLanguage)) {
      logger.warn(`Invalid language: ${language}. Using English as fallback.`);
      validatedLanguage = 'en';
    }

    if (!formData) {
      return res.status(400).json({
        error: 'formData is required',
        received: req.body,
      });
    }

    // Order Confirmation için ORDER CONFIRMATION NUMBER kontrolü
    if (!formData['ORDER CONFIRMATION NUMBER']) {
      return res.status(400).json({
        error: 'ORDER CONFIRMATION NUMBER is required',
        received: formData,
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
    logger.error('Order Confirmation PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Order Confirmation PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
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
      turkish: 'tr',
      english: 'en',
    };

    let validatedLanguage = languageMap[language] || language || 'en';

    if (!languageService.isValidLanguage(validatedLanguage)) {
      logger.warn(`Invalid language: ${language}. Using English as fallback.`);
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
        received: req.body,
      });
    }

    // Sipariş için ORDER NUMBER kontrolü (frontend'den gelen field name)
    const orderNumber = actualFormData['ORDER NUMBER'] || actualFormData['SİPARİŞ NUMARASI'];
    if (!orderNumber) {
      return res.status(400).json({
        error: 'ORDER NUMBER or SİPARİŞ NUMARASI is required',
        received: actualFormData,
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
      goods: actualGoods || [],
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
    logger.error('Sipariş PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Sipariş PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generatePriceOffer = async (req, res) => {
  try {
    // Language ve form verilerini al
    const { formData: requestFormData, language: rawLanguage } = req.body;

    // Language mapping - frontend'den gelen değerleri backend formatına çevir
    let language = rawLanguage;
    const languageMap = {
      turkish: 'tr',
      english: 'en',
      tr: 'tr',
      en: 'en',
    };

    if (languageMap[rawLanguage]) {
      language = languageMap[rawLanguage];
    }

    // Dil validasyonu
    const languageService = new LanguageService();
    if (!language || !languageService.isValidLanguage(language)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing language parameter. Received: ${rawLanguage}. Use "tr", "en", "turkish", or "english"`,
      });
    }

    // Form verilerini al - nested yapıyı düzelt
    let formData = requestFormData;

    // Eğer veri nested geliyorsa düzelt
    if (formData && formData.formData) {
      formData = {
        ...formData.formData,
        priceItems: formData.priceItems || [],
      };
    }

    // PRICE OFFER NUMBER kontrolü
    const priceOfferNumber = formData['PRICE OFFER NUMBER'] || formData['priceOfferNumber'] || '';
    if (!priceOfferNumber || priceOfferNumber.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'PRICE OFFER NUMBER is required',
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
    logger.error('Price Offer PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Price Offer PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generatePriceList = async (req, res) => {
  try {
    const { formData, language } = req.body;

    if (!formData) {
      return res.status(400).json({
        error: 'formData is required',
        message: 'Please provide form data',
      });
    }

    // PRICE LIST NUMBER kontrolü
    const priceListNumber = formData['PRICE LIST NUMBER'] || formData['priceListNumber'] || '';
    if (!priceListNumber || priceListNumber.trim() === '') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'PRICE LIST NUMBER is required',
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const LogoService = require('../../services/logoService');
    const logoImage = await LogoService.loadLogo(pdfDoc);

    // Price List template'i oluştur
    const template = new PriceListTemplate(pdfDoc, logoImage, language);
    await template.initialize();

    // Price List PDF'ini oluştur
    await template.createPriceList(formData, language);

    // PDF'i byte array olarak al
    const pdfBytes = await pdfDoc.save();

    let fileName;
    if (language === 'tr') {
      fileName = `fiyat-listesi-${priceListNumber}.pdf`;
    } else {
      fileName = `price-list-${priceListNumber}.pdf`;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    logger.error('Price List PDF generation error:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: 'Price List PDF generation failed',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
