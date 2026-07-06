const express = require('express');
const AnnouncementController = require('../controllers/announcementController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const announcementController = new AnnouncementController();

// GET /api/announcements - Get all announcements (public or authenticated depending on needs, but let's require auth to be safe or make it public if anyone can view)
// Let's protect POST and DELETE with auth, but maybe GET is authenticated too if the whole app is behind login.
// Since the frontend App is wrapped in PrivateRoute, we can just protect all routes.
router.use(authMiddleware);

// GET /api/announcements
router.get('/', (req, res) => {
  announcementController.getAll(req, res);
});

// POST /api/announcements
router.post('/', (req, res) => {
  announcementController.create(req, res);
});

// DELETE /api/announcements/:id
router.delete('/:id', (req, res) => {
  announcementController.delete(req, res);
});

module.exports = router;
