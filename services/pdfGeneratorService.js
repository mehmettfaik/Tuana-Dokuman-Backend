const { PDFDocument } = require('pdf-lib');
const fontkit = require('fontkit');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

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

// Service imports
const LogoService = require('./logoService');
const WashingIconsService = require('./washingIconsService');
const FontService = require('./fontService');
const LanguageService = require('./languageService');

class PdfGeneratorService {
  constructor() {
    // Production ortamında yazma izni olan klasör kullan
    this.outputDir = process.env.NODE_ENV === 'production' 
      ? path.join(os.tmpdir(), 'pdfs')
      : path.join(__dirname, '../temp/pdfs');
    this.ensureOutputDirectory();
  }

  async ensureOutputDirectory() {
    try {
      await fs.ensureDir(this.outputDir);
      console.log(`PDF output directory created/verified: ${this.outputDir}`);
    } catch (error) {
      console.error('Error creating PDF output directory:', error);
      // Fallback to system temp directory
      this.outputDir = path.join(os.tmpdir(), 'pdfs');
      try {
        await fs.ensureDir(this.outputDir);
        console.log(`PDF fallback output directory created: ${this.outputDir}`);
      } catch (fallbackError) {
        console.error('Error creating PDF fallback output directory:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async generatePDF(jobId, docType, formData, language = 'en') {
    try {
      console.log(`Starting PDF generation for job ${jobId}, docType: ${docType}`);


      // Language validation
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

      // Invoice için INVOICE NUMBER kontrolü
      if (docType === 'invoice' && (!formData || !formData['INVOICE NUMBER'])) {
        throw new Error('INVOICE NUMBER is required for invoice document type');
      }

      // PDF oluşturma
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      
      // Logo yükleme
      const logoImage = await LogoService.loadLogo(pdfDoc);
      
      // Template seçimi ve dosya adı belirleme
      let template;
      let pdfFileName;
      
      switch (docType) {
        case 'proforma-invoice':
          template = new ProformaInvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_PROFORMA_FATURA';
          } else {
            pdfFileName = 'TUANA_PROFORMA_INVOICE';
          }
          break;
        case 'invoice':
          template = new InvoiceTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_FATURA';
          } else {
            pdfFileName = 'TUANA_INVOICE';
          }
          break;
        case 'packing-list':
          template = new PackingListTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_PAKETLEME_LISTESI';
          } else {
            pdfFileName = 'TUANA_PACKING_LIST';
          }
          break;
        case 'credit-note':
          template = new CreditNoteTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_ALACAK_DEKONTU';
          } else {
            pdfFileName = 'TUANA_CREDIT_NOTE';
          }
          break;
        case 'debit-note':
          template = new DebitNoteTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_BORC_DEKONTU';
          } else {
            pdfFileName = 'TUANA_DEBIT_NOTE';
          }
          break;
        case 'order-confirmation':
          template = new OrderConfirmationTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_SIPARIS_ONAY';
          } else {
            pdfFileName = 'TUANA_ORDER_CONFIRMATION';
          }
          break;
        case 'siparis':
          template = new SiparisTemplate(pdfDoc, logoImage, validatedLanguage);
          pdfFileName = 'TUANA_SIPARIS';
          break;
        case 'price-offer':
          template = new PriceOfferTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_FIYAT_TEKLIFI';
          } else {
            pdfFileName = 'TUANA_PRICE_OFFER';
          }
          break;
        case 'product-label':
          // Product label için özel işlem
          template = new ProductLabelTemplate();
          const labelPdfDoc = await template.generateDocument(formData, validatedLanguage);
          const labelPdfBytes = await labelPdfDoc.save();
          
          // Dil seçimine göre dosya adı
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_URUN_ETiKETLERi';
          } else {
            pdfFileName = 'TUANA_PRODUCT_LABELS';
          }
          
          // Dosyayı kaydet
          const labelFileName = `${pdfFileName}_${jobId}.pdf`;
          const labelFilePath = path.join(this.outputDir, labelFileName);
          await fs.writeFile(labelFilePath, labelPdfBytes);
          
          console.log(`Product Label PDF generated successfully for job ${jobId}: ${labelFilePath}`);
          return labelFilePath;
        case 'hangers-shipment':

          template = new HangersShipmentTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_ASKILI_SEVKIYAT';
          } else {
            pdfFileName = 'TUANA_HANGERS_SHIPMENT';
          }
          break;
        default:

          // Default: technical sheet
          template = new TechnicalSheetTemplate(pdfDoc, logoImage, validatedLanguage);
          if (validatedLanguage === 'tr') {
            pdfFileName = 'TUANA_TEKNIK_SHEET';
          } else {
            pdfFileName = 'TUANA_TECHNICAL_SHEET';
          }
      }

      // PDF içeriğini oluştur
      // PDF içeriğini oluştur
      await template.generate(formData);
      
      // PDF'i serialize et
      const pdfBytes = await pdfDoc.save();
      
      // Dosyayı kaydet
      const fileName = `${pdfFileName}_${jobId}.pdf`;
      const filePath = path.join(this.outputDir, fileName);
      
      await fs.writeFile(filePath, pdfBytes);
      
      console.log(`PDF generated successfully for job ${jobId}: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error(`Error generating PDF for job ${jobId}:`, error);
      throw error;
    }
  }

  async getFileBuffer(filePath) {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`File deleted: ${filePath}`);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

module.exports = PdfGeneratorService;
