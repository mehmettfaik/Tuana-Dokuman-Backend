const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

// Test endpoint
router.get('/', (req, res) => {
  res.json({ 
    message: 'PDF API is working',
    endpoints: [
      { path: '/api/pdf/generate', method: 'POST', description: 'Generate PDF' },
      { path: '/api/pdf/generate-proforma', method: 'POST', description: 'Generate Proforma Invoice PDF' },
      { path: '/api/pdf/generate-invoice', method: 'POST', description: 'Generate Invoice PDF' },
      { path: '/api/pdf/generate-packing-list', method: 'POST', description: 'Generate Packing List PDF' },
      { path: '/api/pdf/generate-technical', method: 'POST', description: 'Generate Technical Sheet PDF' },
      { path: '/api/pdf/generate-credit-note', method: 'POST', description: 'Generate Credit Note PDF' },
      { path: '/api/pdf/generate-debit-note', method: 'POST', description: 'Generate Debit Note PDF' },
      { path: '/api/pdf/generate-order-confirmation', method: 'POST', description: 'Generate Order Confirmation PDF' },
      { path: '/api/pdf/generate-siparis', method: 'POST', description: 'Generate Sipariş PDF' },
      { path: '/api/pdf/washing-icons', method: 'GET', description: 'Get available washing icons' },
      { path: '/api/pdf/fonts', method: 'GET', description: 'Check font status' },
      { path: '/api/pdf/generate', method: 'GET', description: 'Test endpoint' }
    ]
  });
});

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