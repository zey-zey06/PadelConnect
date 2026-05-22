process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } }))
);
jest.mock('multer', () => {
  const m = () => ({ single: () => (req, res, next) => next() });
  m.diskStorage = () => ({});
  return m;
});

jest.mock('../../db', () => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };
  const mockDb = jest.fn(() => qb);
  mockDb.__qb = qb;
  mockDb.raw = jest.fn().mockReturnValue({});
  return mockDb;
});

const app = require('../../app');
const db = require('../../db');
const { signToken } = require('../../auth/jwt');

const qb = db.__qb;

// ── Fixtures ─────────────────────────────────────────────────────────────────
const ORG_ID       = 'ffffffff-0000-0000-0000-000000000001';
const OTHER_ORG_ID = 'ffffffff-0000-0000-0000-000000000002';
const ADMIN_ID     = 'aaaaaaaa-0000-0000-0000-000000000001';
const NEW_ADMIN_ID = 'aaaaaaaa-0000-0000-0000-000000000002';
const PLAYER_ID    = 'bbbbbbbb-0000-0000-0000-000000000001';
const VENUE_ID     = 'vvvvvvvv-0000-0000-0000-000000000001';
const SLOT_ID      = 'ssssssss-0000-0000-0000-000000000001';
const BOOKING_ID   = 'bkbkbkbk-0000-0000-0000-000000000001';

// venue_admin who already owns ORG_ID
const ADMIN_TOKEN       = signToken({ sub: ADMIN_ID,     role: 'venue_admin', organization_id: ORG_ID });
// venue_admin with no club yet
const NEW_ADMIN_TOKEN   = signToken({ sub: NEW_ADMIN_ID, role: 'venue_admin', organization_id: null });
// venue_admin of a different club
const OTHER_ADMIN_TOKEN = signToken({ sub: 'cccccccc-0000-0000-0000-000000000001', role: 'venue_admin', organization_id: OTHER_ORG_ID });
// plain player
const PLAYER_TOKEN      = signToken({ sub: PLAYER_ID,    role: 'player',      organization_id: null });

const ORG = {
  id: ORG_ID, name: 'Padel Club Abidjan', slug: 'padel-club-abidjan',
  status: 'active', deleted_at: null,
};
const VENUE = {
  id: VENUE_ID, organization_id: ORG_ID, name: 'Court 1',
  description: null, amenities: null, deleted_at: null,
};
const SLOT = {
  id: SLOT_ID, venue_id: VENUE_ID, date: '2026-06-10',
  start_time: '10:00:00', end_time: '11:30:00',
  price: '15000.00', status: 'available', deleted_at: null,
};
const BOOKING = { id: BOOKING_ID, venue_slot_id: SLOT_ID, status: 'confirmed' };

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ── POST /api/clubs ───────────────────────────────────────────────────────────
// DB: returning() → ORG, returning() → user update
describe('POST /api/clubs', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: venue_admin creates club — 201', async () => {
    qb.returning
      .mockResolvedValueOnce([ORG])
      .mockResolvedValueOnce([{ id: NEW_ADMIN_ID, organization_id: ORG_ID }]);

    const res = await request(app)
      .post('/api/clubs')
      .set('Cookie', `token=${NEW_ADMIN_TOKEN}`)
      .send({ name: 'Padel Club Abidjan', slug: 'padel-club-abidjan' });

    expect(res.status).toBe(201);
    expect(res.body.club).toMatchObject({ name: 'Padel Club Abidjan' });
  });

  it('CU-07: player creates club — 403', async () => {
    const res = await request(app)
      .post('/api/clubs')
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ name: 'Padel Club Abidjan', slug: 'padel-club-abidjan' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('CU-07: venue_admin already has a club — 409', async () => {
    // ADMIN_TOKEN.organization_id is already set → controller-level 409
    const res = await request(app)
      .post('/api/clubs')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ name: 'Another Club', slug: 'another-club' });

    expect(res.status).toBe(409);
  });

  it('CU-07: create club missing slug — 422', async () => {
    const res = await request(app)
      .post('/api/clubs')
      .set('Cookie', `token=${NEW_ADMIN_TOKEN}`)
      .send({ name: 'Padel Club Abidjan' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-07: create club without auth — 401', async () => {
    const res = await request(app).post('/api/clubs').send({ name: 'X', slug: 'x' });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/clubs ────────────────────────────────────────────────────────────
// DB: select() → [ORG]
describe('GET /api/clubs', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: list clubs — 200', async () => {
    qb.select.mockResolvedValueOnce([ORG]);

    const res = await request(app)
      .get('/api/clubs')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.clubs)).toBe(true);
    expect(res.body.clubs).toHaveLength(1);
  });

  it('CU-07: list clubs without auth — 401', async () => {
    const res = await request(app).get('/api/clubs');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/clubs/:id ────────────────────────────────────────────────────────
// DB: first() → ORG or null
describe('GET /api/clubs/:id', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: get club by id — 200', async () => {
    qb.first.mockResolvedValueOnce(ORG);

    const res = await request(app)
      .get(`/api/clubs/${ORG_ID}`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.club.id).toBe(ORG_ID);
  });

  it('CU-07: get club not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/clubs/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(404);
  });
});

// ── POST /api/clubs/:id/venues ────────────────────────────────────────────────
// success DB: first() → ORG, returning() → VENUE
// cross-tenant DB: first() → ORG (org_id ≠ userOrgId) → 403
describe('POST /api/clubs/:id/venues', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: venue_admin adds venue to own club — 201', async () => {
    qb.first.mockResolvedValueOnce(ORG);
    qb.returning.mockResolvedValueOnce([VENUE]);

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/venues`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ name: 'Court 1' });

    expect(res.status).toBe(201);
    expect(res.body.venue).toMatchObject({ name: 'Court 1', organization_id: ORG_ID });
  });

  it('CU-07: player adds venue — 403', async () => {
    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/venues`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ name: 'Court 1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('CU-07: cross-tenant admin adds venue — 403', async () => {
    // org.id = ORG_ID, but token has organization_id = OTHER_ORG_ID
    qb.first.mockResolvedValueOnce(ORG);

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/venues`)
      .set('Cookie', `token=${OTHER_ADMIN_TOKEN}`)
      .send({ name: 'Court 1' });

    expect(res.status).toBe(403);
  });

  it('CU-07: add venue club not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/venues`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ name: 'Court 1' });

    expect(res.status).toBe(404);
  });

  it('CU-07: add venue missing name — 422', async () => {
    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/venues`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ── GET /api/clubs/:id/venues ─────────────────────────────────────────────────
// DB: first() → ORG, select() → [VENUE]
describe('GET /api/clubs/:id/venues', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: list venues for club — 200', async () => {
    qb.first.mockResolvedValueOnce(ORG);
    qb.select.mockResolvedValueOnce([VENUE]);

    const res = await request(app)
      .get(`/api/clubs/${ORG_ID}/venues`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.venues)).toBe(true);
    expect(res.body.venues[0].organization_id).toBe(ORG_ID);
  });
});

// ── POST /api/venues/:id/slots ────────────────────────────────────────────────
// success DB: first() → VENUE, returning() → SLOT
// cross-tenant DB: first() → VENUE (org_id ≠ userOrgId) → 403
describe('POST /api/venues/:id/slots', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: venue_admin adds slot — 201', async () => {
    qb.first.mockResolvedValueOnce(VENUE);
    qb.returning.mockResolvedValueOnce([SLOT]);

    const res = await request(app)
      .post(`/api/venues/${VENUE_ID}/slots`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ date: '2026-06-10', start_time: '10:00', end_time: '11:30', price: 15000 });

    expect(res.status).toBe(201);
    expect(res.body.slot).toMatchObject({ venue_id: VENUE_ID });
  });

  it('CU-07: cross-tenant admin adds slot — 403', async () => {
    qb.first.mockResolvedValueOnce(VENUE); // venue.organization_id = ORG_ID ≠ OTHER_ORG_ID

    const res = await request(app)
      .post(`/api/venues/${VENUE_ID}/slots`)
      .set('Cookie', `token=${OTHER_ADMIN_TOKEN}`)
      .send({ date: '2026-06-10', start_time: '10:00', end_time: '11:30', price: 15000 });

    expect(res.status).toBe(403);
  });

  it('CU-07: add slot invalid price — 422', async () => {
    const res = await request(app)
      .post(`/api/venues/${VENUE_ID}/slots`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ date: '2026-06-10', start_time: '10:00', end_time: '11:30', price: -100 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ── GET /api/venues/:id/slots ─────────────────────────────────────────────────
// DB: first() → VENUE, select() → [SLOT]
describe('GET /api/venues/:id/slots', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: list slots — 200', async () => {
    qb.first.mockResolvedValueOnce(VENUE);
    qb.select.mockResolvedValueOnce([SLOT]);

    const res = await request(app)
      .get(`/api/venues/${VENUE_ID}/slots`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
  });

  it('CU-07: list slots with date filter — 200', async () => {
    qb.first.mockResolvedValueOnce(VENUE);
    qb.select.mockResolvedValueOnce([SLOT]);

    const res = await request(app)
      .get(`/api/venues/${VENUE_ID}/slots?date=2026-06-10`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
  });
});

// ── PATCH /api/venues/:id/slots/:slotId ──────────────────────────────────────
// success DB: first() → VENUE, first() → SLOT, returning() → SLOT_UPDATED
// cross-tenant DB: first() → VENUE → 403
describe('PATCH /api/venues/:id/slots/:slotId', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: venue_admin updates slot — 200', async () => {
    qb.first
      .mockResolvedValueOnce(VENUE)
      .mockResolvedValueOnce(SLOT);
    qb.returning.mockResolvedValueOnce([{ ...SLOT, price: '20000.00' }]);

    const res = await request(app)
      .patch(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ price: 20000 });

    expect(res.status).toBe(200);
    expect(res.body.slot).toBeDefined();
  });

  it('CU-07: cross-tenant updates slot — 403', async () => {
    qb.first.mockResolvedValueOnce(VENUE);

    const res = await request(app)
      .patch(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${OTHER_ADMIN_TOKEN}`)
      .send({ price: 20000 });

    expect(res.status).toBe(403);
  });

  it('CU-07: update slot not found — 404', async () => {
    qb.first
      .mockResolvedValueOnce(VENUE)
      .mockResolvedValueOnce(null); // slot not found

    const res = await request(app)
      .patch(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ price: 20000 });

    expect(res.status).toBe(404);
  });

  it('CU-07: update slot empty body — 422', async () => {
    const res = await request(app)
      .patch(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ── DELETE /api/venues/:id/slots/:slotId ─────────────────────────────────────
// no booking DB:   first()→VENUE, first()→SLOT, first()→null, returning()→SLOT_DELETED
// with booking DB: first()→VENUE, first()→SLOT, first()→BOOKING,
//                  returning()→BOOKING_CANCELLED, returning()→SLOT_DELETED
// cross-tenant DB: first()→VENUE → 403
// not found DB:    first()→VENUE, first()→null → 404
describe('DELETE /api/venues/:id/slots/:slotId', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-07: delete slot (no booking) — 200, slot soft-deleted', async () => {
    qb.first
      .mockResolvedValueOnce(VENUE)
      .mockResolvedValueOnce(SLOT)
      .mockResolvedValueOnce(null); // no active booking
    qb.returning.mockResolvedValueOnce([{ ...SLOT, status: 'cancelled', deleted_at: new Date().toISOString() }]);

    const res = await request(app)
      .delete(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.slot.status).toBe('cancelled');
  });

  it('CU-07: delete slot with active booking — 200, booking cancelled + slot deleted', async () => {
    qb.first
      .mockResolvedValueOnce(VENUE)
      .mockResolvedValueOnce(SLOT)
      .mockResolvedValueOnce(BOOKING); // active booking found
    qb.returning
      .mockResolvedValueOnce([{ ...BOOKING, status: 'cancelled' }]) // cancelBooking
      .mockResolvedValueOnce([{ ...SLOT, status: 'cancelled', deleted_at: new Date().toISOString() }]); // softDeleteSlot

    const res = await request(app)
      .delete(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.slot.status).toBe('cancelled');
  });

  it('CU-07: cross-tenant deletes slot — 403', async () => {
    qb.first.mockResolvedValueOnce(VENUE);

    const res = await request(app)
      .delete(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${OTHER_ADMIN_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('CU-07: delete slot not found — 404', async () => {
    qb.first
      .mockResolvedValueOnce(VENUE)
      .mockResolvedValueOnce(null); // slot not found

    const res = await request(app)
      .delete(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`)
      .set('Cookie', `token=${ADMIN_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-07: delete slot without auth — 401', async () => {
    const res = await request(app).delete(`/api/venues/${VENUE_ID}/slots/${SLOT_ID}`);
    expect(res.status).toBe(401);
  });
});
