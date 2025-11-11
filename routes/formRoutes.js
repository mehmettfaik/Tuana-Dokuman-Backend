const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { authMiddleware } = require('../middleware/auth');

// Tüm form route'larını authentication ile koru
router.use(authMiddleware);

// POST /api/forms - Yeni form kaydı oluştur
router.post('/', formController.createForm);

// GET /api/forms - Tüm form kayıtlarını listele
router.get('/', formController.getAllForms);

// GET /api/forms/stats - Form istatistikleri (ÖNCE TANIMLANMALI)
router.get('/stats', formController.getFormsStats);

// GET /api/forms/:formId - Tek bir form kaydını getir
router.get('/:formId', formController.getFormById);

// DELETE /api/forms/:formId - Form kaydını sil
router.delete('/:formId', formController.deleteForm);

// POST /api/forms/bulk-delete - Toplu form silme
router.post('/bulk-delete', formController.bulkDeleteForms);

module.exports = router;
