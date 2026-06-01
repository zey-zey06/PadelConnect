const { Router } = require('express');
const db           = require('../../db');
const authenticate = require('../../middleware/authenticate');
const requireRole  = require('../../middleware/requireRole');

const router = Router();
router.use(authenticate, requireRole('venue_admin'));

/**
 * GET /api/manager/dashboard
 * { stats: { total_venues, bookings_today, bookings_week, revenue_today, revenue_week, bookings_total },
 *   recent_bookings: [...last 5] }
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Aucun club associé à ce compte.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const [venueRow, todayRow, weekRow, revenueRow, weekRevenueRow, totalRow, recentBookings] = await Promise.all([
      db('venues').where({ organization_id: orgId }).whereNull('deleted_at').count('id as count').first(),

      db('venue_slots').join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId).where('venue_slots.date', today)
        .where('venue_slots.status', 'booked').whereNull('venue_slots.deleted_at')
        .count('venue_slots.id as count').first(),

      db('venue_slots').join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId)
        .where('venue_slots.date', '>=', today).where('venue_slots.date', '<=', weekEndStr)
        .where('venue_slots.status', 'booked').whereNull('venue_slots.deleted_at')
        .count('venue_slots.id as count').first(),

      db('venue_slots').join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId).where('venue_slots.date', today)
        .where('venue_slots.status', 'booked').whereNull('venue_slots.deleted_at')
        .sum('venue_slots.price as total').first(),

      db('venue_slots').join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId)
        .where('venue_slots.date', '>=', today).where('venue_slots.date', '<=', weekEndStr)
        .where('venue_slots.status', 'booked').whereNull('venue_slots.deleted_at')
        .sum('venue_slots.price as total').first(),

      db('bookings').join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
        .join('venues', 'venue_slots.venue_id', 'venues.id')
        .where('venues.organization_id', orgId).whereIn('bookings.status', ['confirmed', 'completed'])
        .count('bookings.id as count').first(),

      db('bookings')
        .join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
        .join('venues',   'venue_slots.venue_id',  'venues.id')
        .join('sessions', 'bookings.session_id',   'sessions.id')
        .join('users',    'sessions.creator_id',   'users.id')
        .leftJoin('player_profiles', function () {
          this.on('player_profiles.user_id', '=', 'users.id').andOnNull('player_profiles.deleted_at');
        })
        .where('venues.organization_id', orgId)
        .whereNull('bookings.deleted_at')
        .orderBy('bookings.created_at', 'desc')
        .limit(5)
        .select(
          'bookings.id', 'bookings.status', 'bookings.payment_method', 'bookings.created_at',
          'venue_slots.date as slot_date', 'venue_slots.start_time', 'venue_slots.end_time', 'venue_slots.price',
          'venues.name as venue_name',
          'users.first_name as player_first_name', 'users.last_name as player_last_name',
          'users.email as player_email',
          'player_profiles.photo_url as player_photo',
        ),
    ]);

    return res.json({
      stats: {
        total_venues:   Number(venueRow?.count       ?? 0),
        bookings_today: Number(todayRow?.count       ?? 0),
        bookings_week:  Number(weekRow?.count        ?? 0),
        revenue_today:  Number(revenueRow?.total     ?? 0),
        revenue_week:   Number(weekRevenueRow?.total ?? 0),
        bookings_total: Number(totalRow?.count       ?? 0),
      },
      recent_bookings: recentBookings,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/manager/bookings?filter=today|week|all
 * Returns bookings scoped to this manager's organisation.
 */
router.get('/bookings', async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) {
      return res.status(403).json({ status: 403, error: 'Forbidden', message: 'Aucun club associé.' });
    }

    const { filter = 'all' } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    let query = db('bookings')
      .join('venue_slots', 'bookings.venue_slot_id', 'venue_slots.id')
      .join('venues',   'venue_slots.venue_id',  'venues.id')
      .join('sessions', 'bookings.session_id',   'sessions.id')
      .join('users',    'sessions.creator_id',   'users.id')
      .leftJoin('player_profiles', function () {
        this.on('player_profiles.user_id', '=', 'users.id').andOnNull('player_profiles.deleted_at');
      })
      .where('venues.organization_id', orgId)
      .whereNull('bookings.deleted_at')
      .orderBy('venue_slots.date', 'desc')
      .orderBy('venue_slots.start_time', 'desc')
      .select(
        'bookings.id', 'bookings.status', 'bookings.payment_method', 'bookings.created_at',
        'venue_slots.date as slot_date', 'venue_slots.start_time', 'venue_slots.end_time', 'venue_slots.price',
        'venues.name as venue_name',
        'users.first_name as player_first_name', 'users.last_name as player_last_name',
        'users.email as player_email',
        'player_profiles.photo_url as player_photo',
      );

    if (filter === 'today') {
      query = query.where('venue_slots.date', today);
    } else if (filter === 'week') {
      query = query.where('venue_slots.date', '>=', today).where('venue_slots.date', '<=', weekEndStr);
    }

    const bookings = await query;
    return res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
