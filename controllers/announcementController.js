const { getFirestore } = require('../config/firebase');

class AnnouncementController {
  constructor() {
    this.collectionName = 'announcements';
  }

  // GET /api/announcements
  async getAll(req, res) {
    try {
      const db = getFirestore();
      const snapshot = await db
        .collection(this.collectionName)
        .orderBy('date', 'desc')
        .get();

      const announcements = [];
      snapshot.forEach((doc) => {
        announcements.push({ id: doc.id, ...doc.data() });
      });

      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements', message: error.message });
    }
  }

  // POST /api/announcements
  async create(req, res) {
    try {
      const { content, date } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const db = getFirestore();
      const announcementData = {
        content: content.trim(),
        date: date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        createdBy: req.user?.email || 'unknown'
      };

      const docRef = await db.collection(this.collectionName).add(announcementData);

      res.status(201).json({
        id: docRef.id,
        ...announcementData
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement', message: error.message });
    }
  }

  // DELETE /api/announcements/:id
  async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Announcement ID is required' });
      }

      const db = getFirestore();
      const docRef = db.collection(this.collectionName).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      await docRef.delete();

      res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({ error: 'Failed to delete announcement', message: error.message });
    }
  }
}

module.exports = AnnouncementController;
