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

exports.generateInvoice = async (req, res) => {
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

    // INVOICE NUMBER kontrolü - zorunlu alan
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateInvoiceExcel = async (req, res) => {
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

    // INVOICE NUMBER kontrolü - zorunlu alan
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString(),
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
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(excelBuffer);
  } catch (error) {
    logger.error('Invoice Excel generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Invoice Excel generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateProformaInvoice = async (req, res) => {
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
    logger.error('Proforma Invoice PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Proforma Invoice PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateProformaExcel = async (req, res) => {
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
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(excelBuffer);
  } catch (error) {
    logger.error('Proforma Excel generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Proforma Excel generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
