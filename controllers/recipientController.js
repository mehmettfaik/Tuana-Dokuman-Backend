const RecipientCacheService = require('../services/recipientCacheService');

class RecipientController {
  constructor() {
    this.recipientService = new RecipientCacheService();
  }

  // Tüm recipients'ları getir
  async getAllRecipients(req, res) {
    try {
      console.log('🎯 API Call: GET /api/recipients');
      const recipients = this.recipientService.getAllRecipients();
      res.json({
        success: true,
        data: recipients,
        count: recipients.length
      });
    } catch (error) {
      console.error('❌ Error getting all recipients:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // ID'ye göre recipient getir
  async getRecipientById(req, res) {
    try {
      const { id } = req.params;
      const recipient = this.recipientService.getRecipientById(id);
      
      if (!recipient) {
        return res.status(404).json({
          success: false,
          error: 'Recipient not found'
        });
      }

      res.json({
        success: true,
        data: recipient
      });
    } catch (error) {
      console.error('Error getting recipient by id:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Şirket adına göre arama (autocomplete)
  async searchRecipients(req, res) {
    try {
      const { q } = req.query; // search query
      console.log('🔍 API Call: GET /api/recipients/search?q=' + (q || 'empty'));
      const recipients = this.recipientService.searchRecipientsByCompanyName(q);
      
      res.json({
        success: true,
        data: recipients,
        count: recipients.length,
        searchTerm: q || ''
      });
    } catch (error) {
      console.error('❌ Error searching recipients:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Yeni recipient ekle
  async addRecipient(req, res) {
    try {
      const recipientData = req.body;
      console.log('➕ API Call: POST /api/recipients - Data:', recipientData);

      // Zorunlu alanları kontrol et
      if (!recipientData.companyName || recipientData.companyName.trim() === '') {
        console.log('❌ Company name validation failed');
        return res.status(400).json({
          success: false,
          error: 'Company name is required'
        });
      }

      const result = this.recipientService.addRecipient(recipientData);
      console.log('📝 Add recipient result:', result);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.recipient,
          message: 'Recipient added successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error adding recipient:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Recipient güncelle
  async updateRecipient(req, res) {
    try {
      const { id } = req.params;
      const recipientData = req.body;

      const result = this.recipientService.updateRecipient(id, recipientData);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.recipient,
          message: 'Recipient updated successfully'
        });
      } else {
        const statusCode = result.error === 'Recipient not found' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error updating recipient:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Recipient sil
  async deleteRecipient(req, res) {
    try {
      const { id } = req.params;

      const result = this.recipientService.deleteRecipient(id);
      
      if (result.success) {
        res.json({
          success: true,
          data: result.deletedRecipient,
          message: 'Recipient deleted successfully'
        });
      } else {
        const statusCode = result.error === 'Recipient not found' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error deleting recipient:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Cache istatistikleri
  async getCacheStats(req, res) {
    try {
      const stats = this.recipientService.getCacheStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Cache'i temizle
  async clearCache(req, res) {
    try {
      const result = this.recipientService.clearCache();
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = RecipientController;