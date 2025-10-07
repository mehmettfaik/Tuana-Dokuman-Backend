const fs = require('fs');
const path = require('path');

class RecipientCacheService {
  constructor() {
    this.cacheFilePath = path.join(__dirname, '../temp/recipientCache.json');
    console.log('🔧 RecipientCacheService initialized - Cache path:', this.cacheFilePath);
    this.ensureCacheFileExists();
  }

  // Cache dosyasının var olduğundan emin ol
  ensureCacheFileExists() {
    if (!fs.existsSync(this.cacheFilePath)) {
      console.log('Creating new recipient cache file...');
      // Varsayılan cache yapısı
      const defaultCache = {
        recipients: [],
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(defaultCache, null, 2));
      console.log('✅ Recipient cache file created');
    }
  }

  // Cache'i oku
  readCache() {
    try {
      const cacheData = fs.readFileSync(this.cacheFilePath, 'utf8');
      return JSON.parse(cacheData);
    } catch (error) {
      console.error('Error reading recipient cache:', error);
      return { recipients: [], lastUpdated: new Date().toISOString() };
    }
  }

  // Cache'i yaz
  writeCache(data) {
    try {
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing recipient cache:', error);
      return false;
    }
  }

  // Tüm recipients'ları getir
  getAllRecipients() {
    const cache = this.readCache();
    const recipients = cache.recipients || [];
    console.log(`� Retrieved ${recipients.length} recipients from cache`);
    return recipients;
  }

  // ID'ye göre recipient getir
  getRecipientById(id) {
    const recipients = this.getAllRecipients();
    return recipients.find(recipient => recipient.id === id);
  }

  // Şirket adına göre arama (autocomplete için)
  searchRecipientsByCompanyName(searchTerm) {
    console.log(`🔍 Searching recipients with term: "${searchTerm}"`);
    const recipients = this.getAllRecipients();
    console.log(`📋 Total recipients in cache: ${recipients.length}`);
    
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('📄 Empty search term, returning all recipients');
      return recipients;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
    const filtered = recipients.filter(recipient => 
      recipient.companyName && 
      recipient.companyName.toLowerCase().includes(searchTermLower)
    );
    
    console.log(`🎯 Found ${filtered.length} matching recipients`);
    return filtered;
  }

  // Yeni recipient ekle
  addRecipient(recipientData) {
    try {
      const cache = this.readCache();
      
      // Yeni ID oluştur
      const newId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Recipient objesi oluştur
      const newRecipient = {
        id: newId,
        companyName: recipientData.companyName || '',
        address: recipientData.address || '',
        cityStateCountry: recipientData.cityStateCountry || '',
        vat: recipientData.vat || '',
        responsiblePerson: recipientData.responsiblePerson || '',
        phone: recipientData.phone || '',
        email: recipientData.email || '',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString()
      };

      cache.recipients.push(newRecipient);
      
      if (this.writeCache(cache)) {
        return { success: true, recipient: newRecipient };
      } else {
        return { success: false, error: 'Failed to save recipient' };
      }
    } catch (error) {
      console.error('Error adding recipient:', error);
      return { success: false, error: error.message };
    }
  }

  // Recipient güncelle
  updateRecipient(id, recipientData) {
    try {
      const cache = this.readCache();
      const recipientIndex = cache.recipients.findIndex(recipient => recipient.id === id);
      
      if (recipientIndex === -1) {
        return { success: false, error: 'Recipient not found' };
      }

      // Mevcut recipient'i güncelle
      const updatedRecipient = {
        ...cache.recipients[recipientIndex],
        companyName: recipientData.companyName || cache.recipients[recipientIndex].companyName,
        address: recipientData.address || cache.recipients[recipientIndex].address,
        cityStateCountry: recipientData.cityStateCountry || cache.recipients[recipientIndex].cityStateCountry,
        vat: recipientData.vat || cache.recipients[recipientIndex].vat,
        responsiblePerson: recipientData.responsiblePerson || cache.recipients[recipientIndex].responsiblePerson,
        phone: recipientData.phone || cache.recipients[recipientIndex].phone,
        email: recipientData.email || cache.recipients[recipientIndex].email,
        updatedDate: new Date().toISOString()
      };

      cache.recipients[recipientIndex] = updatedRecipient;
      
      if (this.writeCache(cache)) {
        return { success: true, recipient: updatedRecipient };
      } else {
        return { success: false, error: 'Failed to update recipient' };
      }
    } catch (error) {
      console.error('Error updating recipient:', error);
      return { success: false, error: error.message };
    }
  }

  // Recipient sil
  deleteRecipient(id) {
    try {
      const cache = this.readCache();
      const recipientIndex = cache.recipients.findIndex(recipient => recipient.id === id);
      
      if (recipientIndex === -1) {
        return { success: false, error: 'Recipient not found' };
      }

      const deletedRecipient = cache.recipients[recipientIndex];
      cache.recipients.splice(recipientIndex, 1);
      
      if (this.writeCache(cache)) {
        return { success: true, deletedRecipient };
      } else {
        return { success: false, error: 'Failed to delete recipient' };
      }
    } catch (error) {
      console.error('Error deleting recipient:', error);
      return { success: false, error: error.message };
    }
  }

  // Cache'i temizle (tüm recipients'ları sil)
  clearCache() {
    try {
      const defaultCache = {
        recipients: [],
        lastUpdated: new Date().toISOString()
      };
      
      if (this.writeCache(defaultCache)) {
        return { success: true, message: 'Cache cleared successfully' };
      } else {
        return { success: false, error: 'Failed to clear cache' };
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  // Cache istatistikleri
  getCacheStats() {
    const cache = this.readCache();
    return {
      totalRecipients: cache.recipients.length,
      lastUpdated: cache.lastUpdated,
      cacheFilePath: this.cacheFilePath
    };
  }
}

module.exports = RecipientCacheService;