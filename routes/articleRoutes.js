const express = require('express');
const ArticleController = require('../controllers/articleController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const articleController = new ArticleController();

// Tüm article route'larını authentication ile koru
router.use(authMiddleware);

// Article arama (autocomplete)
// GET /api/articles/search?q=query
router.get('/search', (req, res) => {
  articleController.searchArticles(req, res);
});

// Tüm article'ları getir
// GET /api/articles
router.get('/', (req, res) => {
  articleController.getAllArticles(req, res);
});

module.exports = router;
