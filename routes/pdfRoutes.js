const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

const JobController = require('../controllers/pdf/JobController');
const LegacyController = require('../controllers/pdf/LegacyController');
const InvoiceController = require('../controllers/pdf/InvoiceController');
const PackingListController = require('../controllers/pdf/PackingListController');
const TechnicalController = require('../controllers/pdf/TechnicalController');
const CommercialController = require('../controllers/pdf/CommercialController');
const LabelController = require('../controllers/pdf/LabelController');
const UtilityController = require('../controllers/pdf/UtilityController');

// Test endpoint (public - authentication gerektirmez)
router.get('/', (req, res) => {
  res.json({
    message: 'PDF API is working',
    endpoints: [
      {
        path: '/api/pdf/start',
        method: 'POST',
        description: 'Start PDF generation (returns jobId)',
      },
      { path: '/api/pdf/status/:id', method: 'GET', description: 'Check PDF generation status' },
      { path: '/api/pdf/download/:id', method: 'GET', description: 'Download generated PDF' },
    ],
  });
});

// ============================================================================
// NEW QUEUE-BASED ENDPOINTS - Authentication Required
// ============================================================================

// Tüm PDF generation endpoint'lerini authentication ile koru
router.use(authMiddleware);

// Start PDF generation
router.post('/start', JobController.startPdfGeneration);

// Check job status
router.get('/status/:id', JobController.checkJobStatus);

// Download PDF
router.get('/download/:id', JobController.downloadPdf);

// Debug endpoint - List all jobs
router.get('/jobs', (req, res) => {
  const jobManager = require('../services/jobManager');
  const jobs = jobManager.getAllJobs();
  res.json({
    totalJobs: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      docType: job.docType,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      downloadUrl: job.downloadUrl,
      error: job.error,
    })),
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    const jobManager = require('../services/jobManager');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      totalJobs: jobManager.getAllJobs().length,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// LEGACY ENDPOINTS (for backward compatibility)
// ============================================================================

router.post('/generate', LegacyController.generatePDF);
router.post('/generatePDF', LegacyController.generatePDF);

// Invoice Group
router.post('/generate-proforma', InvoiceController.generateProformaInvoice);
router.post('/generate-proforma-excel', InvoiceController.generateProformaExcel);
router.post('/generate-invoice', InvoiceController.generateInvoice);
router.post('/generate-invoice-excel', InvoiceController.generateInvoiceExcel);

// Packing List Group
router.post('/generate-packing-list', PackingListController.generatePackingList);
router.post('/generate-packing-list-excel', PackingListController.generatePackingListExcel);
router.post('/generate-packing-list-ocr', PackingListController.generatePackingListWithOcr);
router.post('/ceki-listesi', PackingListController.generateCekiListesi);
router.post('/ceki-listesi-labels', PackingListController.generateCekiListesiLabels);

// Technical Group
router.post('/generate-technical', TechnicalController.generateTechnicalSheet);
router.post('/quality-control', TechnicalController.generateQualityControl);

// Commercial Group
router.post('/generate-credit-note', CommercialController.generateCreditNote);
router.post('/generate-debit-note', CommercialController.generateDebitNote);
router.post('/generate-order-confirmation', CommercialController.generateOrderConfirmation);
router.post('/generate-siparis', CommercialController.generateSiparis);
router.post('/generate-price-offer', CommercialController.generatePriceOffer);
router.post('/generate-price-list', CommercialController.generatePriceList);

// Label Group
router.post('/generate-product-label', LabelController.generateProductLabel);
router.post('/hangers-shipment', LabelController.generateHangersShipment);

// Utility Group
router.get('/washing-icons', UtilityController.getWashingIcons);
router.get('/fonts', UtilityController.getFontStatus);

module.exports = router;
