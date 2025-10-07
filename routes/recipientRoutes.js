const express = require('express');
const RecipientController = require('../controllers/recipientController');

const router = express.Router();
const recipientController = new RecipientController();

// Tüm recipients'ları getir
// GET /api/recipients
router.get('/', (req, res) => {
  recipientController.getAllRecipients(req, res);
});

// Şirket adına göre arama (autocomplete)
// GET /api/recipients/search?q=şirket_adı
router.get('/search', (req, res) => {
  recipientController.searchRecipients(req, res);
});

// Cache istatistikleri
// GET /api/recipients/stats
router.get('/stats', (req, res) => {
  recipientController.getCacheStats(req, res);
});

// ID'ye göre recipient getir
// GET /api/recipients/:id
router.get('/:id', (req, res) => {
  recipientController.getRecipientById(req, res);
});

// Yeni recipient ekle
// POST /api/recipients
router.post('/', (req, res) => {
  recipientController.addRecipient(req, res);
});

// Recipient güncelle
// PUT /api/recipients/:id
router.put('/:id', (req, res) => {
  recipientController.updateRecipient(req, res);
});

// Recipient sil
// DELETE /api/recipients/:id
router.delete('/:id', (req, res) => {
  recipientController.deleteRecipient(req, res);
});

// Cache'i temizle (tüm recipients'ları sil)
// DELETE /api/recipients/cache/clear
router.delete('/cache/clear', (req, res) => {
  recipientController.clearCache(req, res);
});

module.exports = router;