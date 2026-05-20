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
jest.mock('../../emails/confirmation', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../emails/cancellation', () => ({
  sendBookingCancellation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../features/penalties/penalties.repository', () => ({
  getActiveAppBan: jest.fn().mockResolvedValue(null),
  countLateCancelsByUser: jest.fn().mockResolvedValue(0),
  getActiveClubBan: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ id: 'penalty-id' }),
}));

jest.mock('../../db', () => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
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
const SUPER_ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID        = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CLUB_ID        = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SESSION_ID     = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const SUPER_ADMIN_TOKEN = signToken({ sub: SUPER_ADMIN_ID, role: 'super_admin', organization_id: null });
const PLAYER_TOKEN      = signToken({ sub: USER_ID,        role: 'player',      organization_id: null });

const USER = {
  id: USER_ID, email: 'player@test.com', role: 'player',
  status: 'active', organization_id: null, deleted_at: null,
};
const USER_SUSPENDED = { ...USER, status: 'suspended' };

const CLUB = {
  id: CLUB_ID, name: 'Padel CI', slug: 'padel-ci',
  status: 'active', deleted_at: null,
};
const CLUB_INACTIVE = { ...CLUB, status: 'inactive' };

const SESSION = {
  id: SESSION_ID, creator_id: USER_ID, date: '2099-12-31', time: '10:00:00',
  status: 'open', current_players: 1, max_players: 4, deleted_at: null,
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.whereIn.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.join.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
// DB: select()x4 → users[], sessions[], bookings[], clubs[]
describe('GET /api/admin/dashboard', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: dashboard — super_admin — 200 with stats', async () => {
    qb.select
      .mockResolvedValueOnce([{ id: '1' }, { id: '2' }]) // users: 2
      .mockResolvedValueOnce([{ id: '1' }])               // open sessions: 1
      .mockResolvedValueOnce([])                           // bookings: 0
      .mockResolvedValueOnce([{ id: '1' }]);               // clubs: 1

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.total_users).toBe(2);
    expect(res.body.stats.active_sessions).toBe(1);
    expect(res.body.stats.total_bookings).toBe(0);
    expect(res.body.stats.total_clubs).toBe(1);
  });

  it('CU-12: dashboard — non super_admin — 403', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', `token=${PLAYER_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('CU-12: dashboard — without auth — 401', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// DB: select() → [USER]
describe('GET /api/admin/users', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: list users — super_admin — 200', async () => {
    qb.select.mockResolvedValueOnce([USER]);

    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users).toHaveLength(1);
  });

  it('CU-12: list users — non super_admin — 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Cookie', `token=${PLAYER_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('CU-12: list users — without auth — 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/admin/users/:id/status ────────────────────────────────────────
// suspend:  first()→USER, returning()→USER_SUSPENDED, update() (sessions)
// activate: first()→USER_SUSPENDED, returning()→USER (active)
// 404:      first()→null
// 422:      Joi validation
describe('PATCH /api/admin/users/:id/status', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: suspend user — 200, active sessions cancelled', async () => {
    qb.first.mockResolvedValueOnce(USER);
    qb.returning.mockResolvedValueOnce([USER_SUSPENDED]);

    const res = await request(app)
      .patch(`/api/admin/users/${USER_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'suspended' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('suspended');
    // cancelActiveSessionsForUser used whereIn + update — consumed from mock
    expect(qb.whereIn).toHaveBeenCalled();
  });

  it('CU-12: activate user — 200', async () => {
    qb.first.mockResolvedValueOnce(USER_SUSPENDED);
    qb.returning.mockResolvedValueOnce([{ ...USER_SUSPENDED, status: 'active' }]);

    const res = await request(app)
      .patch(`/api/admin/users/${USER_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('active');
    expect(qb.whereIn).not.toHaveBeenCalled(); // no session cancellation
  });

  it('CU-12: update user status — not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/admin/users/${USER_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'suspended' });

    expect(res.status).toBe(404);
  });

  it('CU-12: update user status — invalid status — 422', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${USER_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'deleted' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-12: update user status — non super_admin — 403', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${USER_ID}/status`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ status: 'suspended' });
    expect(res.status).toBe(403);
  });

  it('CU-12: update user status — without auth — 401', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${USER_ID}/status`)
      .send({ status: 'suspended' });
    expect(res.status).toBe(401);
  });
});

// ── GET /api/admin/sessions ───────────────────────────────────────────────────
// DB: select() → [SESSION]
describe('GET /api/admin/sessions', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: list sessions — super_admin — 200', async () => {
    qb.select.mockResolvedValueOnce([SESSION]);

    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions).toHaveLength(1);
  });

  it('CU-12: list sessions — non super_admin — 403', async () => {
    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Cookie', `token=${PLAYER_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('CU-12: list sessions — without auth — 401', async () => {
    const res = await request(app).get('/api/admin/sessions');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/admin/clubs ──────────────────────────────────────────────────────
// DB: select() → [CLUB]
describe('GET /api/admin/clubs', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: list clubs — super_admin — 200', async () => {
    qb.select.mockResolvedValueOnce([CLUB]);

    const res = await request(app)
      .get('/api/admin/clubs')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.clubs)).toBe(true);
    expect(res.body.clubs).toHaveLength(1);
  });

  it('CU-12: list clubs — without auth — 401', async () => {
    const res = await request(app).get('/api/admin/clubs');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/admin/clubs/:id/status ────────────────────────────────────────
// deactivate: first()→CLUB, returning()→CLUB_INACTIVE, whereIn().update() (slots)
// activate:   first()→CLUB_INACTIVE, returning()→CLUB (active)
// 404:        first()→null
// 422:        Joi validation
describe('PATCH /api/admin/clubs/:id/status', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: deactivate club — 200, available slots cancelled', async () => {
    qb.first.mockResolvedValueOnce(CLUB);
    qb.returning.mockResolvedValueOnce([CLUB_INACTIVE]);

    const res = await request(app)
      .patch(`/api/admin/clubs/${CLUB_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.club.status).toBe('inactive');
    expect(qb.whereIn).toHaveBeenCalled(); // slot cancellation
  });

  it('CU-12: activate club — 200', async () => {
    qb.first.mockResolvedValueOnce(CLUB_INACTIVE);
    qb.returning.mockResolvedValueOnce([{ ...CLUB_INACTIVE, status: 'active' }]);

    const res = await request(app)
      .patch(`/api/admin/clubs/${CLUB_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.club.status).toBe('active');
    expect(qb.whereIn).not.toHaveBeenCalled(); // no slot cancellation on activate
  });

  it('CU-12: update club status — not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/admin/clubs/${CLUB_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(404);
  });

  it('CU-12: update club status — invalid status — 422', async () => {
    const res = await request(app)
      .patch(`/api/admin/clubs/${CLUB_ID}/status`)
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ status: 'deleted' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-12: update club status — non super_admin — 403', async () => {
    const res = await request(app)
      .patch(`/api/admin/clubs/${CLUB_ID}/status`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(403);
  });

  it('CU-12: update club status — without auth — 401', async () => {
    const res = await request(app)
      .patch(`/api/admin/clubs/${CLUB_ID}/status`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(401);
  });
});
