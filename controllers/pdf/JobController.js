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

exports.startPdfGeneration = async (req, res) => {
  try {
    const { docType, formType, formData, language } = req.body;
    const documentType = docType || formType;

    if (!documentType) {
      return res.status(400).json({
        error: 'docType or formType is required',
        received: req.body,
      });
    }

    if (!formData) {
      return res.status(400).json({
        error: 'formData is required',
        received: req.body,
      });
    }

    // Invoice için INVOICE NUMBER kontrolü
    if (documentType === 'invoice' && !formData['INVOICE NUMBER']) {
      return res.status(400).json({
        error: 'INVOICE NUMBER is required for invoice document type',
        received: formData,
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
        const filePath = await pdfGeneratorService.generatePDF(
          jobId,
          documentType,
          formData,
          language
        );

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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error starting PDF generation:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.checkJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const job = jobManager.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId: id,
        timestamp: new Date().toISOString(),
      });
    }

    const response = {
      jobId: id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      timestamp: new Date().toISOString(),
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
    logger.error('Error checking job status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

exports.downloadPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const job = jobManager.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId: id,
        timestamp: new Date().toISOString(),
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'PDF is not ready yet',
        status: job.status,
        jobId: id,
        timestamp: new Date().toISOString(),
      });
    }

    if (!job.filePath) {
      return res.status(500).json({
        error: 'PDF file path not found',
        jobId: id,
        timestamp: new Date().toISOString(),
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
    logger.error('Error downloading PDF:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};
