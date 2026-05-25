const { Router }   = require('express');
const authenticate = require('../../middleware/authenticate');
const service      = require('./friendships.service');

const router = Router();
router.use(authenticate);

// GET /api/friends — my accepted friends list
router.get('/', async (req, res, next) => {
  try {
    const friends = await service.getFriends(req.user.sub);
    res.json({ friends });
  } catch (err) { next(err); }
});

// GET /api/friends/user/:userId — public friends list of any user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const friends = await service.getFriends(req.params.userId);
    res.json({ friends });
  } catch (err) { next(err); }
});

// GET /api/friends/requests — pending requests sent to me
router.get('/requests', async (req, res, next) => {
  try {
    const requests = await service.getPendingRequests(req.user.sub);
    res.json({ requests });
  } catch (err) { next(err); }
});

// GET /api/friends/status/:userId — friendship status with a specific user
router.get('/status/:userId', async (req, res, next) => {
  try {
    const result = await service.getStatus(req.user.sub, req.params.userId);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/friends/request/:userId — send a friend request
router.post('/request/:userId', async (req, res, next) => {
  try {
    const friendship = await service.sendRequest(req.user.sub, req.params.userId);
    res.status(201).json({ friendship, ok: true });
  } catch (err) { next(err); }
});

// POST /api/friends/accept/:userId — accept a request from :userId
router.post('/accept/:userId', async (req, res, next) => {
  try {
    const friendship = await service.acceptRequest(req.user.sub, req.params.userId);
    res.json({ friendship, ok: true });
  } catch (err) { next(err); }
});

// POST /api/friends/refuse/:userId — refuse a request from :userId
router.post('/refuse/:userId', async (req, res, next) => {
  try {
    const friendship = await service.refuseRequest(req.user.sub, req.params.userId);
    res.json({ friendship, ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/friends/:userId — unfriend
router.delete('/:userId', async (req, res, next) => {
  try {
    await service.unfriend(req.user.sub, req.params.userId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
