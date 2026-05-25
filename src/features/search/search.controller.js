const { Router } = require('express');
const Joi        = require('joi');
const db         = require('../../db');
const authenticate = require('../../middleware/authenticate');

const router = Router();

// ── Validation ────────────────────────────────────────────────────────────────
const querySchema = Joi.object({
  q: Joi.string().min(2).max(100).required(),
});

// ── GET /api/search?q= ────────────────────────────────────────────────────────
async function searchHandler(req, res, next) {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(422).json({
        status:  422,
        error:   'Validation Error',
        message: error.details[0].message,
      });
    }

    const { q } = value;
    const term  = `%${q}%`;

    const [players, clubs] = await Promise.all([
      // Players and coaches — search by first_name OR last_name
      db('users')
        .leftJoin('player_profiles', function () {
          this.on('player_profiles.user_id', '=', 'users.id')
              .andOnNull('player_profiles.deleted_at');
        })
        .whereNull('users.deleted_at')
        .whereIn('users.role', ['player', 'coach'])
        .where(function () {
          this.whereILike('users.first_name', term)
              .orWhereILike('users.last_name', term);
        })
        .orderBy('users.first_name', 'asc')
        .limit(5)
        .select(
          'users.id         as user_id',
          'users.first_name',
          'users.last_name',
          'users.email',
          'player_profiles.level',
          'player_profiles.photo_url',
        ),

      // Clubs — search by name
      db('organizations')
        .whereNull('organizations.deleted_at')
        .whereILike('organizations.name', term)
        .orderBy('organizations.name', 'asc')
        .limit(5)
        .select(
          'organizations.id',
          'organizations.name',
          'organizations.logo_url',
          db.raw(`(
            SELECT COUNT(*)::int FROM venues v
            WHERE v.organization_id = organizations.id
              AND v.deleted_at IS NULL
          ) AS venue_count`),
        ),
    ]);

    return res.json({ players, clubs });
  } catch (err) {
    next(err);
  }
}

router.get('/', authenticate, searchHandler);

module.exports = router;
