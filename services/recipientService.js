const { getFirestore } = require('../config/firebase');

class RecipientService {
  constructor() {
    this.collection = 'recipients';
  }

  async getAllRecipients() {
    try {
      const db = getFirestore();
      if (!db) {
        throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
      }
      const snapshot = await db.collection(this.collection).get();
      
      const recipients = [];
      snapshot.forEach(doc => {
        recipients.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by updatedDate descending (newest first)
      recipients.sort((a, b) => {
        const dateA = a.updatedDate ? new Date(a.updatedDate) : new Date(0);
        const dateB = b.updatedDate ? new Date(b.updatedDate) : new Date(0);
        return dateB - dateA;
      });

      return recipients;
    } catch (error) {
      console.error('Error getting recipients:', error);
      throw error;
    }
  }

  async getRecipientById(id) {
    try {
      const db = getFirestore();
      if (!db) {
        throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
      }
      const doc = await db.collection(this.collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting recipient by id:', error);
      throw error;
    }
  }

  async createRecipient(recipientData) {
    try {
      const db = getFirestore();
      if (!db) {
        throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
      }
      const now = new Date().toISOString();
      
      const newRecipient = {
        ...recipientData,
        createdDate: now,
        updatedDate: now
      };

      const docRef = await db.collection(this.collection).add(newRecipient);
      
      return {
        id: docRef.id,
        ...newRecipient
      };
    } catch (error) {
      console.error('Error creating recipient:', error);
      throw error;
    }
  }

  async updateRecipient(id, updateData) {
    try {
      const db = getFirestore();
      if (!db) {
        throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
      }
      const now = new Date().toISOString();
      
      // Önce document'ın var olup olmadığını kontrol et
      const docRef = db.collection(this.collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const updatedData = {
        ...updateData,
        updatedDate: now
      };

      await docRef.update(updatedData);
      
      // Return updated recipient
      return await this.getRecipientById(id);
    } catch (error) {
      console.error('Error updating recipient:', error);
      throw error;
    }
  }

  async deleteRecipient(id) {
    try {
      const db = getFirestore();
      if (!db) {
        throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
      }
      
      // Önce document'ın var olup olmadığını kontrol et
      const docRef = db.collection(this.collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return false;
      }
      
      await docRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting recipient:', error);
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
        
        filteredRecipients = recipients.filter(recipient => {
          return (
            (recipient.companyName && recipient.companyName.toLowerCase().includes(searchTerm)) ||
            (recipient.responsiblePerson && recipient.responsiblePerson.toLowerCase().includes(searchTerm)) ||
            (recipient.email && recipient.email.toLowerCase().includes(searchTerm)) ||
            (recipient.phone && recipient.phone.toLowerCase().includes(searchTerm)) ||
            (recipient.vat && recipient.vat.toLowerCase().includes(searchTerm)) ||
            (recipient.city && recipient.city.toLowerCase().includes(searchTerm)) ||
            (recipient.country && recipient.country.toLowerCase().includes(searchTerm))
          );
        });
      }

      // Ek filtreler
      if (filters.country) {
        filteredRecipients = filteredRecipients.filter(r => 
          r.country && r.country.toLowerCase() === filters.country.toLowerCase()
        );
      }

      if (filters.city) {
        filteredRecipients = filteredRecipients.filter(r => 
          r.city && r.city.toLowerCase().includes(filters.city.toLowerCase())
        );
      }

      if (filters.hasEmail !== undefined) {
        filteredRecipients = filteredRecipients.filter(r => 
          filters.hasEmail ? (r.email && r.email.trim() !== '') : (!r.email || r.email.trim() === '')
        );
      }

      if (filters.hasPhone !== undefined) {
        filteredRecipients = filteredRecipients.filter(r => 
          filters.hasPhone ? (r.phone && r.phone.trim() !== '') : (!r.phone || r.phone.trim() === '')
        );
      }

      return filteredRecipients;
    } catch (error) {
      console.error('Error searching recipients:', error);
      throw error;
    }
  }

  async bulkDelete(ids) {
    try {
      const db = getFirestore();
      const batch = db.batch();
      
      const results = [];
      
      for (const id of ids) {
        const docRef = db.collection(this.collection).doc(id);
        const doc = await docRef.get();
        
        if (doc.exists) {
          batch.delete(docRef);
          results.push({ id, success: true, data: doc.data() });
        } else {
          results.push({ id, success: false, error: 'Document not found' });
        }
      }
      
      if (results.some(r => r.success)) {
        await batch.commit();
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk delete:', error);
      throw error;
    }
  }

  async bulkUpdate(updates) {
    try {
      const db = getFirestore();
      const batch = db.batch();
      const now = new Date().toISOString();
      
      const results = [];
      
      for (const update of updates) {
        const { id, data } = update;
        const docRef = db.collection(this.collection).doc(id);
        const doc = await docRef.get();
        
        if (doc.exists) {
          const updateData = {
            ...data,
            updatedDate: now
          };
          batch.update(docRef, updateData);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Document not found' });
        }
      }
      
      if (results.some(r => r.success)) {
        await batch.commit();
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const recipients = await this.getAllRecipients();
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentlyAdded = recipients.filter(r => {
        const createdDate = r.createdDate ? new Date(r.createdDate) : new Date(0);
        return createdDate >= oneWeekAgo;
      }).length;

      const recentlyUpdated = recipients.filter(r => {
        const updatedDate = r.updatedDate ? new Date(r.updatedDate) : new Date(0);
        return updatedDate >= oneWeekAgo && updatedDate !== r.createdDate;
      }).length;

      // Ülke bazında dağılım
      const countryStats = {};
      recipients.forEach(r => {
        const country = r.country || 'Unknown';
        countryStats[country] = (countryStats[country] || 0) + 1;
      });

      // Email/telefon istatistikleri
      const withEmail = recipients.filter(r => r.email && r.email.trim() !== '').length;
      const withPhone = recipients.filter(r => r.phone && r.phone.trim() !== '').length;
      const withVAT = recipients.filter(r => r.vat && r.vat.trim() !== '').length;

      return {
        total: recipients.length,
        recentlyAdded,
        recentlyUpdated,
        withEmail,
        withPhone,
        withVAT,
        countryDistribution: countryStats,
        lastUpdate: recipients.length > 0 ? recipients[0].updatedDate : null
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = new RecipientService();