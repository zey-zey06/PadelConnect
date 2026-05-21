const { Router } = require('express');
const db           = require('../../db');
const authenticate = require('../../middleware/authenticate');
const requireRole  = require('../../middleware/requireRole');

const router = Router();
router.use(authenticate, requireRole('venue_admin'));

/**
 * GET /api/manager/dashboard
 * Returns real counts scoped to the authenticated manager's organisation.
 * { stats: { total_venues, bookings_today, bookings_week, revenue_today } }
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(403).json({
        status: 403,
        error: 'Forbidden',
        message: 'Aucun club associé à ce compte.',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const [venueRow, todayRow, weekRow, revenueRow] = await Promise.all([
      // Total active venues for this org
      db('venues')
        .where({ organization_id: orgId })
        .whereNull('deleted_at')
        .count('id as count')
        .first(),

      // Booked slots today
      db('venue_slots')
        .join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId)
        .where('venue_slots.date', today)
        .where('venue_slots.status', 'booked')
        .whereNull('venue_slots.deleted_at')
        .count('venue_slots.id as count')
        .first(),

      // Booked slots this week (today → today+7)
      db('venue_slots')
        .join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId)
        .where('venue_slots.date', '>=', today)
        .where('venue_slots.date', '<=', weekEndStr)
        .where('venue_slots.status', 'booked')
        .whereNull('venue_slots.deleted_at')
        .count('venue_slots.id as count')
        .first(),

      // Revenue today = sum of prices of booked slots today
      db('venue_slots')
        .join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId)
        .where('venue_slots.date', today)
        .where('venue_slots.status', 'booked')
        .whereNull('venue_slots.deleted_at')
        .sum('venue_slots.price as total')
        .first(),
    ]);

    return res.json({
      stats: {
        total_venues:   Number(venueRow?.count   ?? 0),
        bookings_today: Number(todayRow?.count    ?? 0),
        bookings_week:  Number(weekRow?.count     ?? 0),
        revenue_today:  Number(revenueRow?.total  ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
