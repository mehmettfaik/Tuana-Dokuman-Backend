const recipientRepository = require('../repositories/recipientRepository');
const logger = require('../utils/logger');

class RecipientService {
  constructor() {
    this.repository = recipientRepository;
    // In-memory cache to reduce Firebase reads
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 dakika cache süresi
  }

  // Cache'i temizle
  invalidateCache() {
    this.cache = null;
    this.cacheTimestamp = null;
    logger.info('Recipients cache invalidated');
  }

  // Cache geçerli mi kontrol et
  isCacheValid() {
    if (!this.cache || !this.cacheTimestamp) return false;
    return Date.now() - this.cacheTimestamp < this.cacheTTL;
  }

  async getAllRecipients(forceRefresh = false) {
    try {
      // Cache varsa ve geçerliyse, cache'den dön
      if (!forceRefresh && this.isCacheValid()) {
        logger.info('Returning recipients from cache');
        return this.cache;
      }

      const recipients = await this.repository.findAll();

      // Sort by updatedDate descending (newest first)
      recipients.sort((a, b) => {
        const dateA = a.updatedDate ? new Date(a.updatedDate) : new Date(0);
        const dateB = b.updatedDate ? new Date(b.updatedDate) : new Date(0);
        return dateB - dateA;
      });

      // Cache'e kaydet
      this.cache = recipients;
      this.cacheTimestamp = Date.now();
      logger.info(`Recipients cached: ${recipients.length} items`);

      return recipients;
    } catch (error) {
      logger.error(`Error getting recipients: ${error.message}`);
      throw error;
    }
  }

  async getPaginatedRecipients(limit = 50, cursorId = null) {
    try {
      return await this.repository.findPaginated(limit, cursorId);
    } catch (error) {
      logger.error(`Error getting paginated recipients: ${error.message}`);
      throw error;
    }
  }

  async getRecipientById(id) {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error getting recipient by id: ${error.message}`);
      throw error;
    }
  }

  async createRecipient(recipientData) {
    try {
      const now = new Date().toISOString();
      const newRecipient = {
        ...recipientData,
        createdDate: now,
        updatedDate: now,
      };

      const result = await this.repository.create(newRecipient);

      // Cache'i invalidate et
      this.invalidateCache();

      return result;
    } catch (error) {
      logger.error(`Error creating recipient: ${error.message}`);
      throw error;
    }
  }

  async updateRecipient(id, updateData) {
    try {
      const now = new Date().toISOString();

      const exists = await this.repository.findById(id);
      if (!exists) {
        return null;
      }

      const updatedData = {
        ...updateData,
        updatedDate: now,
      };

      await this.repository.update(id, updatedData);

      // Cache'i invalidate et
      this.invalidateCache();

      return await this.repository.findById(id);
    } catch (error) {
      logger.error(`Error updating recipient: ${error.message}`);
      throw error;
    }
  }

  async deleteRecipient(id) {
    try {
      const exists = await this.repository.findById(id);
      if (!exists) {
        return false;
      }

      await this.repository.delete(id);

      // Cache'i invalidate et
      this.invalidateCache();

      return true;
    } catch (error) {
      logger.error(`Error deleting recipient: ${error.message}`);
      throw error;
    }
  }

  async searchRecipients(query, filters = {}) {
    try {
      const recipients = await this.getAllRecipients();
      let filteredRecipients = recipients;

      // Metin bazlı arama
      if (query && query.trim() !== '') {
        const searchTerm = query.toLowerCase().trim();

        filteredRecipients = recipients.filter((recipient) => {
          return (
            (recipient.companyName && recipient.companyName.toLowerCase().includes(searchTerm)) ||
            (recipient.contactPerson &&
              recipient.contactPerson.toLowerCase().includes(searchTerm)) ||
            (recipient.email && recipient.email.toLowerCase().includes(searchTerm)) ||
            (recipient.phone && recipient.phone.toLowerCase().includes(searchTerm)) ||
            (recipient.vat && recipient.vat.toLowerCase().includes(searchTerm)) ||
            (recipient.cityStateCountry &&
              recipient.cityStateCountry.toLowerCase().includes(searchTerm)) ||
            (recipient.address && recipient.address.toLowerCase().includes(searchTerm))
          );
        });
      }

      // Ek filtreler
      if (filters.country) {
        filteredRecipients = filteredRecipients.filter(
          (r) => r.country && r.country.toLowerCase() === filters.country.toLowerCase()
        );
      }

      if (filters.city) {
        filteredRecipients = filteredRecipients.filter(
          (r) => r.city && r.city.toLowerCase().includes(filters.city.toLowerCase())
        );
      }

      if (filters.hasEmail !== undefined) {
        filteredRecipients = filteredRecipients.filter((r) =>
          filters.hasEmail ? r.email && r.email.trim() !== '' : !r.email || r.email.trim() === ''
        );
      }

      if (filters.hasPhone !== undefined) {
        filteredRecipients = filteredRecipients.filter((r) =>
          filters.hasPhone ? r.phone && r.phone.trim() !== '' : !r.phone || r.phone.trim() === ''
        );
      }

      return filteredRecipients;
    } catch (error) {
      logger.error(`Error searching recipients: ${error.message}`);
      throw error;
    }
  }

  async bulkDelete(ids) {
    try {
      const batch = this.repository.getBatch();
      const results = [];

      for (const id of ids) {
        const docRef = this.repository.getDocRef(id);
        const doc = await docRef.get();

        if (doc.exists) {
          batch.delete(docRef);
          results.push({ id, success: true, data: doc.data() });
        } else {
          results.push({ id, success: false, error: 'Document not found' });
        }
      }

      if (results.some((r) => r.success)) {
        await batch.commit();
        this.invalidateCache();
      }

      return results;
    } catch (error) {
      logger.error(`Error in bulk delete: ${error.message}`);
      throw error;
    }
  }

  async bulkUpdate(updates) {
    try {
      const batch = this.repository.getBatch();
      const now = new Date().toISOString();
      const results = [];

      for (const update of updates) {
        const { id, data } = update;
        const docRef = this.repository.getDocRef(id);
        const doc = await docRef.get();

        if (doc.exists) {
          const updateData = {
            ...data,
            updatedDate: now,
          };
          batch.update(docRef, updateData);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Document not found' });
        }
      }

      if (results.some((r) => r.success)) {
        await batch.commit();
        this.invalidateCache();
      }

      return results;
    } catch (error) {
      logger.error(`Error in bulk update: ${error.message}`);
      throw error;
    }
  }

  async getStats() {
    try {
      const recipients = await this.getAllRecipients();
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentlyAdded = recipients.filter((r) => {
        const createdDate = r.createdDate ? new Date(r.createdDate) : new Date(0);
        return createdDate >= oneWeekAgo;
      }).length;

      const recentlyUpdated = recipients.filter((r) => {
        const updatedDate = r.updatedDate ? new Date(r.updatedDate) : new Date(0);
        return updatedDate >= oneWeekAgo && updatedDate !== r.createdDate;
      }).length;

      const countryStats = {};
      recipients.forEach((r) => {
        const country = r.country || 'Unknown';
        countryStats[country] = (countryStats[country] || 0) + 1;
      });

      const withEmail = recipients.filter((r) => r.email && r.email.trim() !== '').length;
      const withPhone = recipients.filter((r) => r.phone && r.phone.trim() !== '').length;
      const withVAT = recipients.filter((r) => r.vat && r.vat.trim() !== '').length;

      return {
        total: recipients.length,
        recentlyAdded,
        recentlyUpdated,
        withEmail,
        withPhone,
        withVAT,
        countryDistribution: countryStats,
        lastUpdate: recipients.length > 0 ? recipients[0].updatedDate : null,
      };
    } catch (error) {
      logger.error(`Error getting stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new RecipientService();
