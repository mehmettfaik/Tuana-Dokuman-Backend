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

exports.generateProductLabel = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      logger.error('No form data provided');
      return res.status(400).json({
        success: false,
        message: 'Form data is required',
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
    logger.error('Product Label PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Product Label PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.generateHangersShipment = async (req, res) => {
  try {
    const formData = req.body;
    const language = req.body.language || 'tr';

    // Validation
    if (!formData) {
      logger.error('No form data provided');
      return res.status(400).json({
        success: false,
        message: 'Form data is required',
      });
    }

    // Language validation
    const validatedLanguage = ['tr', 'en'].includes(language) ? language : 'tr';

    // PDF document oluştur
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Logo yükleme
    const LogoService = require('../../services/logoService');
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
    logger.error('Hangers Shipment PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Hangers Shipment PDF generation failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
