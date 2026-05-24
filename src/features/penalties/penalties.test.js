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
  m.memoryStorage = () => ({});
  return m;
});
jest.mock('../../emails/confirmation', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../emails/cancellation', () => ({
  sendBookingCancellation: jest.fn().mockResolvedValue(undefined),
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
const USER_ID        = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID  = '22222222-2222-2222-2222-222222222222';
const PENALTY_ID     = '33333333-3333-3333-3333-333333333333';
const ADMIN_USER_ID  = '44444444-4444-4444-4444-444444444444';

const SUPER_ADMIN_TOKEN   = signToken({ sub: ADMIN_USER_ID, role: 'super_admin', organization_id: null });
const PLAYER_TOKEN        = signToken({ sub: USER_ID,       role: 'player',      organization_id: null });
const OTHER_PLAYER_TOKEN  = signToken({ sub: OTHER_USER_ID, role: 'player',      organization_id: null });

const PENALTY = {
  id: PENALTY_ID,
  user_id: USER_ID,
  type: 'late_cancel',
  organization_id: null,
  amount: '5000.00',
  paid: false,
  expires_at: null,
  deleted_at: null,
};
const PENALTY_PAID = { ...PENALTY, paid: true };

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

// ── GET /api/penalties/me ────────────────────────────────────────────────────
describe('GET /api/penalties/me', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-10: get my penalties — 200', async () => {
    qb.select.mockResolvedValueOnce([PENALTY]);

    const res = await request(app)
      .get('/api/penalties/me')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.penalties)).toBe(true);
    expect(res.body.penalties).toHaveLength(1);
    expect(res.body.penalties[0].id).toBe(PENALTY_ID);
  });

  it('CU-10: get my penalties — without auth — 401', async () => {
    const res = await request(app).get('/api/penalties/me');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/penalties/:id/pay ─────────────────────────────────────────────
describe('PATCH /api/penalties/:id/pay', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-10: pay penalty — owner — 200', async () => {
    qb.first.mockResolvedValueOnce(PENALTY);        // getById
    qb.returning.mockResolvedValueOnce([PENALTY_PAID]); // markPaid

    const res = await request(app)
      .patch(`/api/penalties/${PENALTY_ID}/pay`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.penalty.paid).toBe(true);
  });

  it('CU-10: pay penalty — not owner — 403', async () => {
    qb.first.mockResolvedValueOnce(PENALTY); // user_id = USER_ID ≠ OTHER_USER_ID

    const res = await request(app)
      .patch(`/api/penalties/${PENALTY_ID}/pay`)
      .set('Cookie', `token=${OTHER_PLAYER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('CU-10: pay penalty — not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/penalties/${PENALTY_ID}/pay`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-10: pay penalty — without auth — 401', async () => {
    const res = await request(app).patch(`/api/penalties/${PENALTY_ID}/pay`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/admin/bans ─────────────────────────────────────────────────────
describe('POST /api/admin/bans', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-10: create app ban — super_admin — 201', async () => {
    qb.returning.mockResolvedValueOnce([{ ...PENALTY, type: 'app_ban', user_id: OTHER_USER_ID }]);

    const res = await request(app)
      .post('/api/admin/bans')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ user_id: OTHER_USER_ID, reason: 'Repeated violations' });

    expect(res.status).toBe(201);
    expect(res.body.ban).toBeDefined();
    expect(res.body.ban.type).toBe('app_ban');
  });

  it('CU-10: create app ban — non super_admin — 403', async () => {
    const res = await request(app)
      .post('/api/admin/bans')
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ user_id: OTHER_USER_ID, reason: 'Repeated violations' });

    expect(res.status).toBe(403);
  });

  it('CU-10: create app ban — missing user_id — 422', async () => {
    const res = await request(app)
      .post('/api/admin/bans')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ reason: 'Repeated violations' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-10: create app ban — without auth — 401', async () => {
    const res = await request(app)
      .post('/api/admin/bans')
      .send({ user_id: OTHER_USER_ID, reason: 'Repeated violations' });

    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/admin/penalties/config ────────────────────────────────────────
describe('PATCH /api/admin/penalties/config', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-10: update penalties config — super_admin — 200', async () => {
    const res = await request(app)
      .patch('/api/admin/penalties/config')
      .set('Cookie', `token=${SUPER_ADMIN_TOKEN}`)
      .send({ no_show_amount: 3000, late_cancel_amount: 7000 });

    expect(res.status).toBe(200);
    expect(res.body.config.no_show_amount).toBe(3000);
    expect(res.body.config.late_cancel_amount).toBe(7000);
  });

  it('CU-10: update penalties config — non super_admin — 403', async () => {
    const res = await request(app)
      .patch('/api/admin/penalties/config')
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ no_show_amount: 3000 });

    expect(res.status).toBe(403);
  });

  it('CU-10: update penalties config — without auth — 401', async () => {
    const res = await request(app)
      .patch('/api/admin/penalties/config')
      .send({ no_show_amount: 3000 });

    expect(res.status).toBe(401);
  });
});
