const { getFirestore } = require('../config/firebase');
const logger = require('../utils/logger');

class RecipientRepository {
  constructor() {
    this.collection = 'recipients';
  }

  getDb() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
    }
    return db;
  }

  async findAll() {
    try {
      const db = this.getDb();
      const snapshot = await db.collection(this.collection).get();
      const recipients = [];
      snapshot.forEach((doc) => {
        recipients.push({ id: doc.id, ...doc.data() });
      });
      return recipients;
    } catch (error) {
      logger.error(`Repository findAll error: ${error.message}`);
      throw error;
    }
  }

  async findPaginated(limit = 50, cursorId = null) {
    try {
      const db = this.getDb();
      let query = db.collection(this.collection).orderBy('updatedDate', 'desc').limit(limit);

      if (cursorId) {
        const cursorDoc = await db.collection(this.collection).doc(cursorId).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const recipients = [];
      snapshot.forEach((doc) => {
        recipients.push({ id: doc.id, ...doc.data() });
      });

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastVisible ? lastVisible.id : null;

      return {
        data: recipients,
        nextCursor,
        hasMore: snapshot.docs.length === limit,
      };
    } catch (error) {
      logger.error(`Repository findPaginated error: ${error.message}`);
      throw error;
    }
  }

  async findById(id) {
    try {
      const db = this.getDb();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error(`Repository findById error: ${error.message}`);
      throw error;
    }
  }

  async create(data) {
    try {
      const db = this.getDb();
      const docRef = await db.collection(this.collection).add(data);
      return { id: docRef.id, ...data };
    } catch (error) {
      logger.error(`Repository create error: ${error.message}`);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const db = this.getDb();
      const docRef = db.collection(this.collection).doc(id);
      await docRef.update(data);
      return true;
    } catch (error) {
      logger.error(`Repository update error: ${error.message}`);
      throw error;
    }
  }

  async delete(id) {
    try {
      const db = this.getDb();
      const docRef = db.collection(this.collection).doc(id);
      await docRef.delete();
      return true;
    } catch (error) {
      logger.error(`Repository delete error: ${error.message}`);
      throw error;
    }
  }

  getBatch() {
    return this.getDb().batch();
  }

  getDocRef(id) {
    return this.getDb().collection(this.collection).doc(id);
  }
}

module.exports = new RecipientRepository();
