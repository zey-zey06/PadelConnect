const { Router } = require('express');
const Joi        = require('joi');
const db         = require('../../db');
const authenticate = require('../../middleware/authenticate');

const ratingSchema = Joi.object({
  organisation: Joi.number().integer().min(1).max(5).required(),
  niveau:       Joi.number().integer().min(1).max(5).required(),
  ambiance:     Joi.number().integer().min(1).max(5).required(),
  comment:      Joi.string().max(500).optional().allow(null, ''),
});

const router = Router({ mergeParams: true });

// POST /api/sessions/:id/ratings
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { error, value } = ratingSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }

    const sessionId = req.params.id;
    const raterId   = req.user.sub;

    const session = await db('sessions').where({ id: sessionId }).whereNull('deleted_at').first();
    if (!session) return res.status(404).json({ status: 404, error: 'Not Found', message: 'Session introuvable.' });

    // Only participants (creator or accepted) can rate
    const isCreator     = session.creator_id === raterId;
    const isParticipant = await db('session_requests')
      .where({ session_id: sessionId, player_id: raterId, status: 'accepted' })
      .whereNull('deleted_at')
      .first();

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Seuls les participants peuvent évaluer la session.' });
    }

    const [rating] = await db('session_ratings')
      .insert({ session_id: sessionId, rater_id: raterId, ...value })
      .onConflict(['session_id', 'rater_id'])
      .merge()
      .returning('*');

    return res.json({ rating });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/ratings — public summary
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const rows = await db('session_ratings').where({ session_id: sessionId });
    if (!rows.length) return res.json({ count: 0, organisation: null, niveau: null, ambiance: null, average: null });

    const avg = (key) => rows.reduce((s, r) => s + Number(r[key]), 0) / rows.length;
    return res.json({
      count:        rows.length,
      organisation: +avg('organisation').toFixed(1),
      niveau:       +avg('niveau').toFixed(1),
      ambiance:     +avg('ambiance').toFixed(1),
      average:      +((avg('organisation') + avg('niveau') + avg('ambiance')) / 3).toFixed(1),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
