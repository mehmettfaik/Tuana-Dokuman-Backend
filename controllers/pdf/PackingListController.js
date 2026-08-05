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

exports.generatePackingList = async (req, res) => {
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

    // INVOICE NUMBER kontrolü
    if (!formData['INVOICE NUMBER']) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required',
        timestamp: new Date().toISOString(),
      });
    }

    // PDF oluşturma
    const pdfDoc = await PDFDocument.create();

    // Fontkit'i register et
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
    logger.error('Packing List PDF generation error:', error);
    res.status(500).json({
      error: 'Packing List PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generatePackingListExcel = async (req, res) => {
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
    const packingListNumber = formData['INVOICE NUMBER'] || `PL-${Date.now()}`;

    // Excel Export Service
    const excelExportService = new ExcelExportService();

    // Excel üretme
    const excelBuffer = await excelExportService.generatePackingListExcel(
      formData,
      validatedLanguage
    );

    // Dosya adı
    let fileName;
    if (validatedLanguage === 'tr') {
      fileName = `TUANA_PAKETLEME_LISTESI_${packingListNumber}_${Date.now()}.xlsx`;
    } else {
      fileName = `TUANA_PACKING_LIST_${packingListNumber}_${Date.now()}.xlsx`;
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
    logger.error('Packing List Excel generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Packing List Excel generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generatePackingListWithOcr = async (req, res) => {
  try {
    // OCR'dan gelen veriler req.body'de olacak
    const ocrData = req.body.ocrData || {};
    const formData = req.body.formData || {};
    const language = req.body.language || 'en';

    // OCR verilerini form verilerine merge et
    const mergedData = {
      ...formData,
      ...ocrData,
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
    logger.error('Packing List OCR PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Packing List OCR PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateCekiListesi = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      logger.error('❌ No form data provided');
      return res.status(400).json({
        success: false,
        message: 'Form data is required',
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'tr';

    // showBrutKg ve showNetKg parametrelerini al
    const showBrutKg = formData.showBrutKg !== undefined ? formData.showBrutKg : false;
    const showNetKg = formData.showNetKg !== undefined ? formData.showNetKg : false;

    // PDF document oluştur
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Logo yükleme
    const logoService = new LogoService();
    const logoImage = await logoService.loadLogo(pdfDoc);

    // Çeki Listesi template
    const template = new CekiListesiTemplate(pdfDoc, logoImage, validatedLanguage);
    await template.initialize();

    // PDF üretme (showBrutKg ve showNetKg parametreleri formData'da zaten var)
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
    logger.error('❌ ============================================');
    logger.error('❌ Çeki Listesi PDF generation error:', error);
    logger.error('❌ Stack:', error.stack);
    logger.error('❌ ============================================');
    res.status(500).json({
      success: false,
      message: 'Çeki Listesi PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateCekiListesiLabels = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      logger.error('❌ No form data provided for labels');
      return res.status(400).json({
        success: false,
        message: 'Form data is required',
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'tr';

    // showBrutKg ve showNetKg parametrelerini al
    const showBrutKg = formData.showBrutKg !== undefined ? formData.showBrutKg : false;
    const showNetKg = formData.showNetKg !== undefined ? formData.showNetKg : false;

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
    logger.error('❌ ============================================');
    logger.error('❌ Çeki Listesi Labels PDF generation error:', error);
    logger.error('❌ Stack:', error.stack);
    logger.error('❌ ============================================');
    res.status(500).json({
      success: false,
      message: 'Çeki Listesi Labels PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
