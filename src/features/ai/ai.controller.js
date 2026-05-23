const { Router } = require('express');
const Joi = require('joi');

const authenticate   = require('../../middleware/authenticate');
const { findMatches } = require('../../ai/find-matches');
const sessionsRepo   = require('../sessions/sessions.repository');
const requestsRepo   = require('../sessions/requests.repository');
const profileRepo    = require('../profiles/profile.repository');

const findMatchesSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
});

async function findMatchesHandler(req, res, next) {
  try {
    const { error, value } = findMatchesSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }

    const session = await sessionsRepo.getById(value.sessionId);
    if (!session) {
      return res.status(404).json({ status: 404, error: 'Not Found', message: 'Session introuvable.' });
    }
    if (session.creator_id !== req.user.sub) {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Seul le créateur peut utiliser cette fonctionnalité.' });
    }

    // Collect IDs already associated with this session (creator + all requests)
    const [allRequests] = await Promise.all([
      requestsRepo.getBySession(value.sessionId),
    ]);

    const excludeIds = new Set([
      session.creator_id,
      ...allRequests.map((r) => r.player_id),
    ]);

    const eligibleProfiles = await profileRepo.getEligibleForSession([...excludeIds]);

    if (!eligibleProfiles.length) {
      return res.json({ matches: [] });
    }

    const aiMatches = await findMatches({ session, eligibleProfiles });

    // Hydrate with full profile data
    const profileMap = new Map(eligibleProfiles.map((p) => [p.user_id, p]));

    const matches = aiMatches
      .map((m) => {
        const p = profileMap.get(m.user_id);
        if (!p) return null;
        const firstName = p.user_first_name || p.user_email?.split('@')[0] || 'Joueur';
        const lastName  = p.user_last_name  || '';
        return {
          userId:      p.user_id,
          firstName,
          lastName,
          photo:       p.photo_url || null,
          level:       p.level,
          style:       p.style    || null,
          score:       m.score,
          explanation: m.explanation,
        };
      })
      .filter(Boolean);

    return res.json({ matches });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.post('/find-matches', authenticate, findMatchesHandler);

module.exports = router;
