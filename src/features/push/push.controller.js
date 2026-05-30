const { Router }   = require('express');
const authenticate = require('../../middleware/authenticate');
const pushService  = require('./push.service');

const router = Router();

router.get('/vapid-key', (req, res) => {
  const key = pushService.getPublicKey();
  if (!key) return res.json({ enabled: false, publicKey: null });
  return res.json({ enabled: true, publicKey: key });
});

router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Subscription invalide.' });
    }
    await pushService.saveSubscription(req.user.sub, { endpoint, keys });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
