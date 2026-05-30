process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

jest.mock('multer', () => {
  const m = () => ({ single: () => (req, res, next) => next() });
  m.diskStorage = () => ({});
  m.memoryStorage = () => ({});
  return m;
});
jest.mock('../../emails/confirmation', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../emails/cancellation', () => ({
  sendBookingCancellation: jest.fn().mockResolvedValue(undefined),
}));

// CU-10: mock penaltiesRepo so it never touches the shared qb mock queue
jest.mock('../penalties/penalties.repository', () => ({
  getActiveAppBan: jest.fn().mockResolvedValue(null),
  countLateCancelsByUser: jest.fn().mockResolvedValue(0),
  getActiveClubBan: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ id: 'penalty-id' }),
}));

jest.mock('../../db', () => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    select: jest.fn(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
  };
  const mockDb = jest.fn(() => qb);
  mockDb.__qb = qb;
  mockDb.raw = jest.fn().mockReturnValue({});
  return mockDb;
});

const app = require('../../app');
const db = require('../../db');
const { signToken } = require('../../auth/jwt');
const penaltiesRepo = require('../penalties/penalties.repository');

const qb = db.__qb;

// ── Fixtures ─────────────────────────────────────────────────────────────────
// All IDs must be valid hex UUIDs (0-9, a-f only) because Joi validates them
const SESSION_ID    = '00000000-0000-0000-0000-000000000001';
const SLOT_ID       = '00000000-0000-0000-0000-000000000002';
const BOOKING_ID    = '00000000-0000-0000-0000-000000000003';
const CREATOR_ID    = '00000000-0000-0000-0000-000000000004';
const PLAYER_ID     = '00000000-0000-0000-0000-000000000005';
const COACH_USER_ID = '00000000-0000-0000-0000-000000000006';
const VENUE_ID      = '00000000-0000-0000-0000-000000000007';
const ORG_ID        = '00000000-0000-0000-0000-000000000010';

const CREATOR_TOKEN = signToken({ sub: CREATOR_ID, role: 'player', organization_id: null });
const PLAYER_TOKEN  = signToken({ sub: PLAYER_ID,  role: 'player', organization_id: null });

// Session far in the future → free cancel (> 4h away)
const SESSION_COMPLETE = {
  id: SESSION_ID, creator_id: CREATOR_ID, date: '2099-12-31', time: '10:00:00',
  status: 'complete', current_players: 2, max_players: 4,
  preferences: null, deleted_at: null,
};
// Session with status 'open' but creator present (current_players=1) → bookable
const SESSION_OPEN = {
  ...SESSION_COMPLETE, status: 'open', current_players: 1,
};
// Session with no players yet (creator not counted yet) → not bookable
const SESSION_EMPTY = {
  ...SESSION_COMPLETE, status: 'open', current_players: 0,
};
// Session in the past → late cancel (within 4h deadline)
const SESSION_PAST = {
  id: SESSION_ID, creator_id: CREATOR_ID, date: '2020-01-01', time: '10:00:00',
  status: 'complete', current_players: 2, max_players: 4,
  preferences: null, deleted_at: null,
};

const SLOT_AVAILABLE = {
  id: SLOT_ID, venue_id: VENUE_ID,
  date: '2099-12-31', start_time: '10:00:00', end_time: '11:30:00',
  price: '15000.00', status: 'available', deleted_at: null,
};
const VENUE = {
  id: VENUE_ID, organization_id: ORG_ID, name: 'Court 1', deleted_at: null,
};
const BOOKING = {
  id: BOOKING_ID, session_id: SESSION_ID, venue_slot_id: SLOT_ID,
  status: 'confirmed', cancelled_at: null, cancellation_reason: null, deleted_at: null,
};
const BOOKING_CANCELLED = {
  ...BOOKING, status: 'cancelled', cancelled_at: new Date().toISOString(),
};
const NO_SHOW_RECORD = {
  id: '00000000-0000-0000-0000-000000000008',
  user_id: CREATOR_ID, booking_id: BOOKING_ID,
  type: 'late_cancel', amount_due: '0.00', paid: false,
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.join.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ── POST /api/bookings ────────────────────────────────────────────────────────
// penaltiesRepo.getActiveAppBan is mocked → always null (no ban)
// success (no addons):      first()→SESSION_COMPLETE, first()→SLOT_AVAILABLE,
//                           returning()→BOOKING, returning()→SLOT_BOOKED
// success (open, 1 player): first()→SESSION_OPEN, first()→SLOT_AVAILABLE, ...
// with addons:              first()x2, returning()x3 (booking+slot+addon)
// non-creator:              first()→SESSION_COMPLETE (creator_id≠userId) → 403
// session has no players:   first()→SESSION_EMPTY (current_players=0) → 422
// slot not available:       first()→SESSION_COMPLETE, first()→SLOT_BOOKED → 409
// session not found:        first()→null → 404
// missing field:            validation → 422
describe('POST /api/bookings', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-09: create booking — session creator, no addons — 201', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION_COMPLETE)
      .mockResolvedValueOnce(SLOT_AVAILABLE);
    qb.returning
      .mockResolvedValueOnce([BOOKING])
      .mockResolvedValueOnce([{ ...SLOT_AVAILABLE, status: 'booked' }]);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(201);
    expect(res.body.booking.id).toBe(BOOKING_ID);
  });

  it('CU-09: create booking — with coach addon — 201', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION_COMPLETE)
      .mockResolvedValueOnce(SLOT_AVAILABLE);
    qb.returning
      .mockResolvedValueOnce([BOOKING])
      .mockResolvedValueOnce([{ ...SLOT_AVAILABLE, status: 'booked' }])
      .mockResolvedValueOnce([{
        id: 'addon0001-0000-0000-0000-000000000001',
        booking_id: BOOKING_ID, type: 'coach',
        user_id: COACH_USER_ID, price: '10000.00',
      }]);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({
        session_id: SESSION_ID,
        venue_slot_id: SLOT_ID,
        addons: [{ type: 'coach', user_id: COACH_USER_ID, price: 10000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
  });

  it('CU-09: create booking — non-creator — 403', async () => {
    // SESSION_COMPLETE.creator_id = CREATOR_ID ≠ PLAYER_ID
    qb.first.mockResolvedValueOnce(SESSION_COMPLETE);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(403);
  });

  it('CU-09: create booking — open session with 1 player (creator) — 201', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION_OPEN)    // current_players=1 → allowed
      .mockResolvedValueOnce(SLOT_AVAILABLE);
    qb.returning
      .mockResolvedValueOnce([BOOKING])
      .mockResolvedValueOnce([{ ...SLOT_AVAILABLE, status: 'booked' }]);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(201);
  });

  it('CU-09: create booking — session has no players (current_players=0) — 422', async () => {
    qb.first.mockResolvedValueOnce(SESSION_EMPTY);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(422);
  });

  it('CU-09: create booking — slot not available — 409', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION_COMPLETE)
      .mockResolvedValueOnce({ ...SLOT_AVAILABLE, status: 'booked' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(409);
  });

  it('CU-09: create booking — session not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(404);
  });

  it('CU-09: create booking — missing session_id — 422', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ venue_slot_id: SLOT_ID });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-09: create booking — without auth — 401', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });
    expect(res.status).toBe(401);
  });

  it('CU-10: banned player cannot book — 403', async () => {
    penaltiesRepo.getActiveAppBan.mockResolvedValueOnce({
      id: 'bbbbbbb0-0000-0000-0000-000000000001',
      user_id: CREATOR_ID, type: 'app_ban', paid: false,
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ session_id: SESSION_ID, venue_slot_id: SLOT_ID });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspendu/i);
  });
});

// ── GET /api/bookings/me ──────────────────────────────────────────────────────
// DB: join → select() → [BOOKING]
describe('GET /api/bookings/me', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-09: get my bookings — 200', async () => {
    qb.select.mockResolvedValueOnce([BOOKING]);

    const res = await request(app)
      .get('/api/bookings/me')
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bookings)).toBe(true);
    expect(res.body.bookings).toHaveLength(1);
  });

  it('CU-09: get my bookings — without auth — 401', async () => {
    const res = await request(app).get('/api/bookings/me');
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/bookings/:id ──────────────────────────────────────────────────
// before 4h:  first()→BOOKING, first()→SESSION_COMPLETE(2099),
//             returning()→BOOKING_CANCELLED, returning()→SLOT_AVAILABLE
// after 4h:   first()→BOOKING, first()→SESSION_PAST(2020),
//             returning()→NO_SHOW_RECORD,
//             first()→SLOT_AVAILABLE (venuesRepo.getSlotById for orgId),
//             first()→VENUE (venuesRepo.getById for orgId),
//             [penaltiesRepo calls are mocked — skip qb],
//             returning()→BOOKING_CANCELLED, returning()→SLOT_AVAILABLE
// non-creator: first()→BOOKING, first()→SESSION_COMPLETE (creator_id≠userId) → 403
// not found:   first()→null → 404
describe('DELETE /api/bookings/:id', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-09: cancel booking — before 4h, free cancel — 200', async () => {
    qb.first
      .mockResolvedValueOnce(BOOKING)
      .mockResolvedValueOnce(SESSION_COMPLETE); // 2099-12-31 → far future → free
    qb.returning
      .mockResolvedValueOnce([BOOKING_CANCELLED])
      .mockResolvedValueOnce([{ ...SLOT_AVAILABLE, status: 'available' }]);

    const res = await request(app)
      .delete(`/api/bookings/${BOOKING_ID}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
  });

  it('CU-09: cancel booking — after 4h, penalty recorded — 200', async () => {
    // DB call order:
    // first() #1 → BOOKING          (bookingsRepo.getById)
    // first() #2 → SESSION_PAST     (sessionsRepo.getById)
    // returning() #1 → NO_SHOW_RECORD (bookingsRepo.createNoShowRecord)
    // first() #3 → SLOT_AVAILABLE   (venuesRepo.getSlotById — for club-ban orgId lookup)
    // first() #4 → VENUE            (venuesRepo.getById — for club-ban orgId lookup)
    // penaltiesRepo.countLateCancelsByUser → mocked → 0 → no club ban triggered
    // returning() #2 → BOOKING_CANCELLED (bookingsRepo.cancel)
    // returning() #3 → SLOT_AVAILABLE    (venuesRepo.updateSlot)
    qb.first
      .mockResolvedValueOnce(BOOKING)
      .mockResolvedValueOnce(SESSION_PAST)
      .mockResolvedValueOnce(SLOT_AVAILABLE)
      .mockResolvedValueOnce(VENUE);
    qb.returning
      .mockResolvedValueOnce([NO_SHOW_RECORD])
      .mockResolvedValueOnce([BOOKING_CANCELLED])
      .mockResolvedValueOnce([{ ...SLOT_AVAILABLE, status: 'available' }]);

    const res = await request(app)
      .delete(`/api/bookings/${BOOKING_ID}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
  });

  it('CU-10: 3rd late cancel → club ban recorded — 200', async () => {
    // penaltiesRepo.countLateCancelsByUser returns 3 → triggers club ban check
    // penaltiesRepo.getActiveClubBan returns null → ban is created
    penaltiesRepo.countLateCancelsByUser.mockResolvedValueOnce(3);

    qb.first
      .mockResolvedValueOnce(BOOKING)        // #1: bookingsRepo.getById
      .mockResolvedValueOnce(SESSION_PAST)   // #2: sessionsRepo.getById
      .mockResolvedValueOnce(SLOT_AVAILABLE) // #3: venuesRepo.getSlotById (Promise.all)
      .mockResolvedValueOnce(null)           // #4: clubsRepo.getUserById (Promise.all, booker)
      .mockResolvedValueOnce(VENUE)          // #5: venuesRepo.getById → orgId resolved
      .mockResolvedValueOnce(null)           // #6: clubsRepo.getAdminByOrg
      .mockResolvedValueOnce(null);          // #7: db('organizations').first() for org/clubName
    qb.returning
      .mockResolvedValueOnce([NO_SHOW_RECORD])
      .mockResolvedValueOnce([BOOKING_CANCELLED])
      .mockResolvedValueOnce([{ ...SLOT_AVAILABLE, status: 'available' }]);

    const res = await request(app)
      .delete(`/api/bookings/${BOOKING_ID}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(penaltiesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'club_ban', organization_id: ORG_ID })
    );
  });

  it('CU-09: cancel booking — non-creator — 403', async () => {
    // SESSION_COMPLETE.creator_id = CREATOR_ID ≠ PLAYER_ID
    qb.first
      .mockResolvedValueOnce(BOOKING)
      .mockResolvedValueOnce(SESSION_COMPLETE);

    const res = await request(app)
      .delete(`/api/bookings/${BOOKING_ID}`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('CU-09: cancel booking — not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete(`/api/bookings/${BOOKING_ID}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-09: cancel booking — without auth — 401', async () => {
    const res = await request(app).delete(`/api/bookings/${BOOKING_ID}`);
    expect(res.status).toBe(401);
  });
});
