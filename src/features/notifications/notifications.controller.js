const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const notificationsService = require('./notifications.service');

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await notificationsService.getUnread(req.user.sub);
    res.json({ notifications });
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
