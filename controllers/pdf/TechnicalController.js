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

exports.generateTechnicalSheet = async (req, res) => {
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

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();

    // Fontkit'i register et
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
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateQualityControl = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'en';

    // Validation
    if (!formData) {
      logger.error('❌ No form data provided');
      return res.status(400).json({
        success: false,
        message: 'Form data is required',
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
    logger.error('❌ ============================================');
    logger.error('❌ Quality Control PDF generation error:', error);
    logger.error('❌ Stack:', error.stack);
    logger.error('❌ ============================================');
    res.status(500).json({
      success: false,
      message: 'Quality Control PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
