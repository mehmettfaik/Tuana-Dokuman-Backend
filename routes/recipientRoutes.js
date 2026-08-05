const express = require('express');
const RecipientController = require('../controllers/recipientController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const recipientController = new RecipientController();

// Tüm recipient route'larını authentication ile koru
router.use(authMiddleware);

/**
 * @swagger
 * /api/recipients:
 *   get:
 *     summary: Get all recipients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of recipients
 */
router.get('/', (req, res) => {
  recipientController.getAllRecipients(req, res);
});

/**
 * @swagger
 * /api/recipients/paginated:
 *   get:
 *     summary: Get paginated recipients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items to return
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: The ID to start after
 *     responses:
 *       200:
 *         description: A paginated list of recipients
 */
router.get('/paginated', (req, res) => {
  recipientController.getPaginatedRecipients(req, res);
});

// Şirket adına göre arama (autocomplete)
// GET /api/recipients/search?q=şirket_adı
router.get('/search', (req, res) => {
  recipientController.searchRecipients(req, res);
});

// Database istatistikleri
// GET /api/recipients/stats
router.get('/stats', (req, res) => {
  recipientController.getStats(req, res);
});

// Toplu silme
// POST /api/recipients/bulk-delete
router.post('/bulk-delete', (req, res) => {
  recipientController.bulkDelete(req, res);
});

// Toplu güncelleme
// POST /api/recipients/bulk-update
router.post('/bulk-update', (req, res) => {
  recipientController.bulkUpdate(req, res);
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

module.exports = router;