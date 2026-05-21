const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const notificationsService = require('./notifications.service');

const router = Router();

// Returns all notifications (read + unread) for the notifications page
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await notificationsService.getAll(req.user.sub);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

// Lightweight endpoint for the notification bell badge
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user.sub);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await notificationsService.markAsRead(req.params.id, req.user.sub);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
