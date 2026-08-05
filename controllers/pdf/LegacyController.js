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

exports.generatePDF = async (req, res) => {
  try {
    // docType veya formType'ı kabul et
    const { docType, formType, formData, language } = req.body;
    const documentType = docType || formType;

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

    if (!documentType) {
      return res.status(400).json({
        error: 'docType or formType is required',
        received: req.body,
      });
    }

    // Invoice için INVOICE NUMBER kontrolü
    if (documentType === 'invoice' && (!formData || !formData['INVOICE NUMBER'])) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required for invoice document type',
        received: formData,
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
    } else if (documentType === 'price-list') {
      template = new PriceListTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_FIYAT_LISTESI' : 'TUANA_PRICE_LIST';
    } else if (documentType === 'hangers-shipment') {
      template = new HangersShipmentTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_ASKILI_SEVKIYAT' : 'TUANA_HANGERS_SHIPMENT';
    } else if (documentType === 'quality-control') {
      template = new QualityControlTemplate(pdfDoc, logoImage, validatedLanguage);
      pdfFileName = validatedLanguage === 'tr' ? 'TUANA_KALITE_KONTROL' : 'TUANA_QUALITY_CONTROL';
    } else if (documentType === 'ceki-listesi') {
      template = new CekiListesiTemplate(pdfDoc, logoImage, validatedLanguage);
      // Firma adını al ve dosya adı için uygun hale getir
      const firmaAdi =
        formData.musteriAdi || formData.formData?.musteriAdi || formData['MÜŞTERİ'] || 'FIRMA';
      const safeFirmaAdi = firmaAdi
        .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '')
        .replace(/\s+/g, '_')
        .toUpperCase();
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
    } else if (documentType === 'price-list') {
      await template.createPriceList(formData, validatedLanguage);
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
    logger.error('PDF generation error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'PDF generation failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
