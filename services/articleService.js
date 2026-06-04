const { getFirestore } = require('../config/firebase');

class ArticleService {
  constructor() {
    // In-memory cache for extracted articles
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 dakika cache süresi
  }

  invalidateCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  isCacheValid() {
    if (!this.cache || !this.cacheTimestamp) return false;
    return (Date.now() - this.cacheTimestamp) < this.cacheTTL;
  }

  /**
   * Mevcut forms collection'dan tüm unique article verilerini çeker
   * packingItems ve goods dizilerinden article+weight çiftlerini extract eder
   */
  async getAllArticles(forceRefresh = false) {
    try {
      if (!forceRefresh && this.isCacheValid()) {
        return this.cache;
      }

      const db = getFirestore();
      if (!db) {
        throw new Error('Firebase is not initialized.');
      }

      const snapshot = await db.collection('forms').get();
      const articlesMap = new Map(); // articleNumber -> { articleNumber, fabricWeightWidth }

      snapshot.forEach(doc => {
        const data = doc.data() || {};

        // 1. packingItems dizisinden article verilerini çek (packing-list formları)
        const packingItems = data.formData?.packingItems || data.packingItems || [];
        if (Array.isArray(packingItems)) {
          packingItems.forEach(item => {
            const articleNumber = (item['ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE'] || '').trim();
            const fabricWeight = (item['FABRIC WEIGHT / WIDHT'] || '').trim();

            if (articleNumber && articleNumber !== '                /                      / ') {
              // Deduplicate by article number (normalized)
              const key = articleNumber.toUpperCase();
              if (!articlesMap.has(key)) {
                articlesMap.set(key, {
                  articleNumber,
                  fabricWeightWidth: fabricWeight,
                  source: 'packing-list'
                });
              }
            }
          });
        }

        // 2. goods dizisinden article verilerini çek (invoice/proforma formları)
        const goods = data.goods || data.formData?.goods || [];
        if (Array.isArray(goods)) {
          goods.forEach(item => {
            const articleNumber = (item['ARTICLE NUMBER'] || '').trim();
            const weightWidth = (item['WEIGHT / WIDHT'] || '').trim();

            if (articleNumber) {
              const key = articleNumber.toUpperCase();
              if (!articlesMap.has(key)) {
                articlesMap.set(key, {
                  articleNumber,
                  fabricWeightWidth: weightWidth,
                  source: 'invoice'
                });
              }
            }
          });
        }
      });

      // Map'i array'e çevir ve sırala
      const articles = Array.from(articlesMap.values())
        .sort((a, b) => a.articleNumber.localeCompare(b.articleNumber));

      // Cache'e kaydet
      this.cache = articles;
      this.cacheTimestamp = Date.now();
      console.log(`Articles extracted from forms: ${articles.length} unique articles`);

      return articles;
    } catch (error) {
      console.error('Error extracting articles from forms:', error);
      throw error;
    }
  }

  /**
   * Article numarasına göre arama yapar
   */
  async searchArticles(query) {
    try {
      const articles = await this.getAllArticles();

      if (!query || query.trim() === '') {
        return articles;
      }

      const searchTerm = query.toLowerCase().trim();

      return articles.filter(article =>
        (article.articleNumber && article.articleNumber.toLowerCase().includes(searchTerm)) ||
        (article.fabricWeightWidth && article.fabricWeightWidth.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching articles:', error);
      throw error;
    }
  }
}

module.exports = new ArticleService();
