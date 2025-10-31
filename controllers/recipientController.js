const recipientService = require('../services/recipientService');
const { validateRecipient, sanitizeRecipient, sanitizeSearchQuery } = require('../utils/recipientValidation');

class RecipientController {
  constructor() {
    this.recipientService = recipientService;
  }

  // Tüm recipients'ları getir
  async getAllRecipients(req, res) {
    try {
      const recipients = await this.recipientService.getAllRecipients();
      res.json({
        success: true,
        data: recipients,
        count: recipients.length
      });
    } catch (error) {
      console.error('❌ Error getting all recipients:', error);
      
      // Firebase yapılandırma hatası için özel mesaj
      if (error.message.includes('Firebase is not initialized')) {
        return res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Firebase is not configured. Recipients API is temporarily unavailable.',
          details: 'Please check Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
        });
      }
      
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
      const recipient = await this.recipientService.getRecipientById(id);
      
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
      const { q, country, city, hasEmail, hasPhone } = req.query;
      
      // Query'yi temizle
      const cleanQuery = sanitizeSearchQuery(q);
      
      const filters = {};
      if (country) filters.country = country;
      if (city) filters.city = city;
      if (hasEmail !== undefined) filters.hasEmail = hasEmail === 'true';
      if (hasPhone !== undefined) filters.hasPhone = hasPhone === 'true';
      
      const recipients = await this.recipientService.searchRecipients(cleanQuery, filters);
      
      res.json({
        success: true,
        data: recipients,
        count: recipients.length,
        searchTerm: cleanQuery || '',
        filters: filters
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

      // Veri doğrulama
      const validation = validateRecipient(recipientData, false);
      if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Veri temizleme
      const cleanData = sanitizeRecipient(recipientData);

      // Aynı şirket adı var mı kontrol et
      const existingRecipients = await this.recipientService.searchRecipients(cleanData.companyName);
      console.log('🔍 Duplicate check - Searching for:', cleanData.companyName);
      console.log('🔍 Found existing recipients:', existingRecipients.length);
      
      const duplicateCheck = existingRecipients.find(r => 
        r.companyName.toLowerCase() === cleanData.companyName.toLowerCase()
      );
      
      if (duplicateCheck) {
        console.log('❌ Duplicate found:', duplicateCheck.companyName, 'ID:', duplicateCheck.id);
        return res.status(409).json({
          success: false,
          error: 'Company with this name already exists',
          existingRecipient: {
            id: duplicateCheck.id,
            companyName: duplicateCheck.companyName
          }
        });
      }
      
      console.log('✅ No duplicates found, proceeding with creation');

      const recipient = await this.recipientService.createRecipient(cleanData);
      console.log('📝 Add recipient result:', recipient);
      
      res.status(201).json({
        success: true,
        data: recipient,
        message: 'Recipient added successfully'
      });
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

      // Önce recipient'ın var olup olmadığını kontrol et
      const existingRecipient = await this.recipientService.getRecipientById(id);
      if (!existingRecipient) {
        return res.status(404).json({
          success: false,
          error: 'Recipient not found'
        });
      }

      // Veri doğrulama (güncelleme için)
      const validation = validateRecipient(recipientData, true);
      if (!validation.isValid) {
        console.log('❌ Validation failed:', validation.errors);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Veri temizleme
      const cleanData = sanitizeRecipient(recipientData);

      // Eğer şirket adı değiştiriliyorsa, aynı isimde başka şirket var mı kontrol et
      if (cleanData.companyName && cleanData.companyName !== existingRecipient.companyName) {
        console.log('🔍 Company name changed from:', existingRecipient.companyName, 'to:', cleanData.companyName);
        const existingRecipients = await this.recipientService.searchRecipients(cleanData.companyName);
        console.log('🔍 Found existing recipients with similar name:', existingRecipients.length);
        
        const duplicateCheck = existingRecipients.find(r => 
          r.companyName.toLowerCase() === cleanData.companyName.toLowerCase() && r.id !== id
        );
        
        if (duplicateCheck) {
          console.log('❌ Duplicate found during update:', duplicateCheck.companyName, 'ID:', duplicateCheck.id);
          return res.status(409).json({
            success: false,
            error: 'Another company with this name already exists',
            existingRecipient: {
              id: duplicateCheck.id,
              companyName: duplicateCheck.companyName
            }
          });
        }
        
        console.log('✅ No duplicates found during update, proceeding');
      }

      const recipient = await this.recipientService.updateRecipient(id, cleanData);
      console.log('✅ Update recipient result:', recipient);
      
      res.json({
        success: true,
        data: recipient,
        message: 'Recipient updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating recipient:', error);
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

      // Önce recipient'ın var olup olmadığını kontrol et
      const existingRecipient = await this.recipientService.getRecipientById(id);
      if (!existingRecipient) {
        return res.status(404).json({
          success: false,
          error: 'Recipient not found'
        });
      }

      const success = await this.recipientService.deleteRecipient(id);
      
      if (success) {
        console.log('✅ Recipient deleted successfully:', existingRecipient.companyName);
        res.json({
          success: true,
          message: 'Recipient deleted successfully',
          deletedRecipient: {
            id: existingRecipient.id,
            companyName: existingRecipient.companyName
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete recipient'
        });
      }
    } catch (error) {
      console.error('❌ Error deleting recipient:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Database istatistikleri
  async getStats(req, res) {
    try {
      const stats = await this.recipientService.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Toplu silme
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'IDs array is required'
        });
      }

      const results = await this.recipientService.bulkDelete(ids);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`✅ Bulk delete completed: ${successCount} success, ${failCount} failed`);

      res.json({
        success: true,
        message: `Bulk delete completed: ${successCount} deleted, ${failCount} failed`,
        results,
        summary: {
          total: ids.length,
          deleted: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error('❌ Error in bulk delete:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Toplu güncelleme
  async bulkUpdate(req, res) {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Updates array is required'
        });
      }

      // Her bir güncelleme için validation
      for (const update of updates) {
        if (!update.id || !update.data) {
          return res.status(400).json({
            success: false,
            error: 'Each update must have id and data properties'
          });
        }

        const validation = validateRecipient(update.data, true);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: `Validation failed for ID ${update.id}`,
            details: validation.errors
          });
        }

        // Veri temizleme
        update.data = sanitizeRecipient(update.data);
      }

      const results = await this.recipientService.bulkUpdate(updates);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`✅ Bulk update completed: ${successCount} success, ${failCount} failed`);

      res.json({
        success: true,
        message: `Bulk update completed: ${successCount} updated, ${failCount} failed`,
        results,
        summary: {
          total: updates.length,
          updated: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error('❌ Error in bulk update:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = RecipientController;