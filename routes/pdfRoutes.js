const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

// Test endpoint
router.get('/', (req, res) => {
  res.json({ 
    message: 'PDF API is working',
    endpoints: [
      // New Queue-based endpoints
      { path: '/api/pdf/start', method: 'POST', description: 'Start PDF generation (returns jobId)' },
      { path: '/api/pdf/status/:id', method: 'GET', description: 'Check PDF generation status' },
      { path: '/api/pdf/download/:id', method: 'GET', description: 'Download generated PDF' },
      
      // Legacy endpoints (for backward compatibility)
      { path: '/api/pdf/generate', method: 'POST', description: 'Generate PDF (legacy)' },
      { path: '/api/pdf/generate-proforma', method: 'POST', description: 'Generate Proforma Invoice PDF (legacy)' },
      { path: '/api/pdf/generate-invoice', method: 'POST', description: 'Generate Invoice PDF (legacy)' },
      { path: '/api/pdf/generate-packing-list', method: 'POST', description: 'Generate Packing List PDF (legacy)' },
      { path: '/api/pdf/generate-technical', method: 'POST', description: 'Generate Technical Sheet PDF (legacy)' },
      { path: '/api/pdf/generate-credit-note', method: 'POST', description: 'Generate Credit Note PDF (legacy)' },
      { path: '/api/pdf/generate-debit-note', method: 'POST', description: 'Generate Debit Note PDF (legacy)' },
      { path: '/api/pdf/generate-order-confirmation', method: 'POST', description: 'Generate Order Confirmation PDF (legacy)' },
      { path: '/api/pdf/generate-siparis', method: 'POST', description: 'Generate Sipariş PDF (legacy)' },
      
      // Utility endpoints
      { path: '/api/pdf/washing-icons', method: 'GET', description: 'Get available washing icons' },
      { path: '/api/pdf/fonts', method: 'GET', description: 'Check font status' }
    ]
  });
});

// ============================================================================
// NEW QUEUE-BASED ENDPOINTS
// ============================================================================

// Start PDF generation
router.post('/start', pdfController.startPdfGeneration);

// Check job status
router.get('/status/:id', pdfController.checkJobStatus);

// Download PDF
router.get('/download/:id', pdfController.downloadPdf);

// Debug endpoint - List all jobs
router.get('/jobs', (req, res) => {
  const jobManager = require('../services/jobManager');
  const jobs = jobManager.getAllJobs();
  res.json({
    totalJobs: jobs.length,
    jobs: jobs.map(job => ({
      id: job.id,
      status: job.status,
      docType: job.docType,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      downloadUrl: job.downloadUrl,
      error: job.error
    }))
  });
});

// ============================================================================
// LEGACY ENDPOINTS (for backward compatibility)
// ============================================================================

// PDF generate endpoints
// router.get('/generate', (req, res) => {
//   res.json({ 
//     message: 'PDF Generate endpoint is working',
//     usage: 'Send a POST request with docType and formData',
//   });
// });

router.post('/generate', pdfController.generatePDF);

// Proforma Invoice specific endpoint
router.post('/generate-proforma', pdfController.generateProformaInvoice);

// Invoice specific endpoint
router.post('/generate-invoice', pdfController.generateInvoice);

// Packing List specific endpoint
router.post('/generate-packing-list', pdfController.generatePackingList);

// Technical Sheet specific endpoint  
router.post('/generate-technical', pdfController.generateTechnicalSheet);

// Credit Note specific endpoint
router.post('/generate-credit-note', pdfController.generateCreditNote);

// Debit Note specific endpoint
router.post('/generate-debit-note', pdfController.generateDebitNote);

// Order Confirmation specific endpoint
router.post('/generate-order-confirmation', pdfController.generateOrderConfirmation);

// Sipariş PDF oluşturma
router.post('/generate-siparis', pdfController.generateSiparis);

// Price Offer PDF oluşturma
router.post('/generate-price-offer', pdfController.generatePriceOffer);

// Washing icons endpoint
router.get('/washing-icons', pdfController.getWashingIcons);

// Font status endpoint
router.get('/fonts', pdfController.getFontStatus);

module.exports = router;