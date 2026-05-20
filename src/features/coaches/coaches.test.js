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
    join: jest.fn().mockReturnThis(),
    select: jest.fn(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };
  const mockDb = jest.fn(() => qb);
  mockDb.__qb = qb;
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
const COACH_ID     = 'cccccccc-0000-0000-0000-000000000001';
const PLAYER_ID    = 'pppppppp-0000-0000-0000-000000000001';
const COACH_PROFILE_ID = 'cpcp0000-0000-0000-0000-000000000001';

const ADMIN_TOKEN       = signToken({ sub: ADMIN_ID,  role: 'venue_admin', organization_id: ORG_ID });
const OTHER_ADMIN_TOKEN = signToken({ sub: 'xxxxxxxx-0000-0000-0000-000000000001', role: 'venue_admin', organization_id: OTHER_ORG_ID });
const COACH_TOKEN       = signToken({ sub: COACH_ID,  role: 'coach',       organization_id: null });
const PLAYER_TOKEN      = signToken({ sub: PLAYER_ID, role: 'player',      organization_id: null });

const ORG = {
  id: ORG_ID, name: 'Padel Club Abidjan', slug: 'padel-club-abidjan',
  status: 'active', deleted_at: null,
};
const COACH_PROFILE = {
  id: COACH_PROFILE_ID,
  user_id: COACH_ID,
  organization_id: null,
  specialty: 'Défense',
  rate: '10000.00',
  bio: 'Coach expérimenté',
  is_independent: true,
  availability: [],
  deleted_at: null,
};
const COACH_USER = { id: COACH_ID, role: 'coach', email: 'coach@test.com', organization_id: null };

const SESSION_PAST = {
  id: 'dddddddd-0000-0000-0000-000000000001',
  creator_id: ADMIN_ID,
  date: '2020-01-01',
  time: '10:00:00',
  status: 'complete',
  current_players: 2,
  max_players: 4,
  preferences: null,
  deleted_at: null,
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

// ── GET /api/coaches ──────────────────────────────────────────────────────────
// DB: select() → [COACH_PROFILE]
describe('GET /api/coaches', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-08: list available coaches — 200', async () => {
    qb.select.mockResolvedValueOnce([COACH_PROFILE]);

    const res = await request(app)
      .get(`/api/coaches?date=2026-06-10&time=10:00&clubId=${ORG_ID}`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.coaches)).toBe(true);
    expect(res.body.coaches).toHaveLength(1);
  });

  it('CU-08: list coaches without auth — 401', async () => {
    const res = await request(app).get('/api/coaches');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/coaches/:id ──────────────────────────────────────────────────────
// DB: first() → COACH_PROFILE or null
describe('GET /api/coaches/:id', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-08: get coach by id — 200', async () => {
    qb.first.mockResolvedValueOnce(COACH_PROFILE);

    const res = await request(app)
      .get(`/api/coaches/${COACH_PROFILE_ID}`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.coach.id).toBe(COACH_PROFILE_ID);
  });

  it('CU-08: get coach not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/coaches/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-08: get coach without auth — 401', async () => {
    const res = await request(app).get(`/api/coaches/${COACH_PROFILE_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── PUT /api/coaches/:id/availability ─────────────────────────────────────────
// success DB: first() → COACH_PROFILE, returning() → UPDATED_PROFILE
// 403 DB:     first() → COACH_PROFILE (user_id ≠ req.user.sub)
describe('PUT /api/coaches/:id/availability', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  const AVAILABILITY = [
    { day_of_week: 1, start_time: '09:00', end_time: '18:00' },
    { day_of_week: 6, start_time: '14:00', end_time: '20:00' },
  ];

  it('CU-08: coach updates own availability — 200', async () => {
    qb.first.mockResolvedValueOnce(COACH_PROFILE);
    qb.returning.mockResolvedValueOnce([{ ...COACH_PROFILE, availability: AVAILABILITY }]);

    const res = await request(app)
      .put(`/api/coaches/${COACH_PROFILE_ID}/availability`)
      .set('Cookie', `token=${COACH_TOKEN}`)
      .send({ availability: AVAILABILITY });

    expect(res.status).toBe(200);
    expect(res.body.coach.availability).toHaveLength(2);
  });

  it('CU-08: different user updates coach availability — 403', async () => {
    // profile.user_id (COACH_ID) !== req.user.sub (PLAYER_ID)
    qb.first.mockResolvedValueOnce(COACH_PROFILE);

    const res = await request(app)
      .put(`/api/coaches/${COACH_PROFILE_ID}/availability`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ availability: AVAILABILITY });

    expect(res.status).toBe(403);
  });

  it('CU-08: update availability invalid body — 422', async () => {
    const res = await request(app)
      .put(`/api/coaches/${COACH_PROFILE_ID}/availability`)
      .set('Cookie', `token=${COACH_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-08: update availability without auth — 401', async () => {
    const res = await request(app)
      .put(`/api/coaches/${COACH_PROFILE_ID}/availability`)
      .send({ availability: AVAILABILITY });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/clubs/:id/coaches ────────────────────────────────────────────────
// DB: first() → ORG, select() → [COACH_PROFILE]
describe('GET /api/clubs/:id/coaches', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-08: list coaches of club — 200', async () => {
    qb.first.mockResolvedValueOnce(ORG);
    qb.select.mockResolvedValueOnce([COACH_PROFILE]);

    const res = await request(app)
      .get(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.coaches)).toBe(true);
  });

  it('CU-08: list coaches without auth — 401', async () => {
    const res = await request(app).get(`/api/clubs/${ORG_ID}/coaches`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/clubs/:id/coaches ───────────────────────────────────────────────
// success DB:     first()→ORG, first()→COACH_USER, returning()→COACH_PROFILE
// 403 player:     requireRole blocks before DB
// 403 x-tenant:  first()→ORG (org.id≠userOrgId) → 403
// 404 club:       first()→null → 404
// 404 coach user: first()→ORG, first()→null → 404
// 422:            validation before DB
describe('POST /api/clubs/:id/coaches', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-08: venue_admin adds coach to club — 201', async () => {
    qb.first
      .mockResolvedValueOnce(ORG)
      .mockResolvedValueOnce(COACH_USER);
    qb.returning.mockResolvedValueOnce([{ ...COACH_PROFILE, organization_id: ORG_ID, is_independent: false }]);

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ user_id: COACH_ID });

    expect(res.status).toBe(201);
    expect(res.body.coach).toBeDefined();
  });

  it('CU-08: player adds coach — 403', async () => {
    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ user_id: COACH_ID });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('CU-08: cross-tenant admin adds coach — 403', async () => {
    qb.first.mockResolvedValueOnce(ORG); // org.id = ORG_ID ≠ OTHER_ORG_ID

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${OTHER_ADMIN_TOKEN}`)
      .send({ user_id: COACH_ID });

    expect(res.status).toBe(403);
  });

  it('CU-08: add coach — club not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ user_id: COACH_ID });

    expect(res.status).toBe(404);
  });

  it('CU-08: add coach — coach user not found — 404', async () => {
    qb.first
      .mockResolvedValueOnce(ORG)
      .mockResolvedValueOnce(null); // getCoachUser → no match

    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({ user_id: '00000000-0000-0000-0000-000000000099' });

    expect(res.status).toBe(404);
  });

  it('CU-08: add coach missing user_id — 422', async () => {
    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-08: add coach without auth — 401', async () => {
    const res = await request(app)
      .post(`/api/clubs/${ORG_ID}/coaches`)
      .send({ user_id: COACH_ID });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/coaches/:id/sessions ─────────────────────────────────────────────
// success:    first()→COACH_PROFILE, select()→[SESSION_PAST]
// not found:  first()→null → 404
describe('GET /api/coaches/:id/sessions', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-11: coach sessions — 200 with upcoming/past split', async () => {
    qb.first.mockResolvedValueOnce(COACH_PROFILE);
    qb.select.mockResolvedValueOnce([SESSION_PAST]);

    const res = await request(app)
      .get(`/api/coaches/${COACH_PROFILE_ID}/sessions`)
      .set('Cookie', `token=${COACH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.sessions).toBeDefined();
    expect(Array.isArray(res.body.sessions.past)).toBe(true);
    expect(Array.isArray(res.body.sessions.upcoming)).toBe(true);
    expect(res.body.sessions.past).toHaveLength(1);
    expect(res.body.sessions.past[0].id).toBe(SESSION_PAST.id);
  });

  it('CU-11: coach sessions — coach not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/coaches/${COACH_PROFILE_ID}/sessions`)
      .set('Cookie', `token=${COACH_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-11: coach sessions — without auth — 401', async () => {
    const res = await request(app).get(`/api/coaches/${COACH_PROFILE_ID}/sessions`);
    expect(res.status).toBe(401);
  });
});
