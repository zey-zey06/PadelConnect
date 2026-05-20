const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const calendarService = require('./calendar.service');

const router = Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const calendar = await calendarService.getMyCalendar(req.user.sub);
    res.json({ calendar });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
