const articleService = require('../services/articleService');

class ArticleController {
  constructor() {
    this.articleService = articleService;
  }

  // Article arama (autocomplete)
  // GET /api/articles/search?q=query
  async searchArticles(req, res) {
    try {
      const { q } = req.query;
      const articles = await this.articleService.searchArticles(q || '');

      res.json({
        success: true,
        data: articles,
        count: articles.length,
        searchTerm: q || ''
      });
    } catch (error) {
      console.error('Error searching articles:', error);

      if (error.message.includes('Firebase is not initialized')) {
        return res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Firebase is not configured. Articles API is temporarily unavailable.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Tüm article'ları getir
  // GET /api/articles
  async getAllArticles(req, res) {
    try {
      const { forceRefresh } = req.query;
      const articles = await this.articleService.getAllArticles(forceRefresh === 'true');

      res.json({
        success: true,
        data: articles,
        count: articles.length
      });
    } catch (error) {
      console.error('Error getting all articles:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = ArticleController;
