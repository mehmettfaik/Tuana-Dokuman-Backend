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

exports.getWashingIcons = (req, res) => {
  try {
    const washingIconsService = new WashingIconsService();
    const isAvailable = washingIconsService.isWashingIconsAvailable();

    res.json({
      success: true,
      data: {
        available: isAvailable,
        file: isAvailable
          ? 'washing-icons.png or washing-icons.jpg found'
          : 'washing-icons file not found',
        location: 'backend/assets/washing-icons/',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check washing icons',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

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
          regularPath: fontAvailability.regularPath,
        },
        status:
          fontAvailability.light && fontAvailability.regular
            ? 'Helvetica Neue fonts available'
            : 'Helvetica Neue fonts not found - using fallback fonts',
        location: 'backend/assets/fonts/',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get font status error:', error);
    res.status(500).json({
      error: 'Failed to check font status',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
