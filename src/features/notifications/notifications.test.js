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
// Mock penalties repo so bookings.service app-ban check doesn't touch qb
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
const USER_ID       = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NOTIF_ID      = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const PLAYER_TOKEN       = signToken({ sub: USER_ID,       role: 'player', organization_id: null });
const OTHER_PLAYER_TOKEN = signToken({ sub: OTHER_USER_ID, role: 'player', organization_id: null });

const NOTIFICATION = {
  id: NOTIF_ID,
  user_id: USER_ID,
  type: 'welcome',
  message: 'Bienvenue sur PadelConnect !',
  read: false,
  created_at: new Date().toISOString(),
};
const NOTIFICATION_READ = { ...NOTIFICATION, read: true };

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

// ── GET /api/notifications ────────────────────────────────────────────────────
// DB: where → orderBy → select() → [NOTIFICATION]
describe('GET /api/notifications', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-11: get notifications — 200', async () => {
    qb.select.mockResolvedValueOnce([NOTIFICATION]);

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].id).toBe(NOTIF_ID);
  });

  it('CU-11: get notifications — without auth — 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
// owner 200:    first()→NOTIFICATION (user_id=USER_ID), returning()→NOTIFICATION_READ
// other user:   first()→NOTIFICATION (user_id=USER_ID ≠ OTHER_USER_ID) → 403
// not found:    first()→null → 404
describe('PATCH /api/notifications/:id/read', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-11: mark as read — owner — 200', async () => {
    qb.first.mockResolvedValueOnce(NOTIFICATION);
    qb.returning.mockResolvedValueOnce([NOTIFICATION_READ]);

    const res = await request(app)
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.notification.read).toBe(true);
  });

  it('CU-11: mark as read — wrong user — 403', async () => {
    // NOTIFICATION.user_id = USER_ID ≠ OTHER_USER_ID
    qb.first.mockResolvedValueOnce(NOTIFICATION);

    const res = await request(app)
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Cookie', `token=${OTHER_PLAYER_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('CU-11: mark as read — not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-11: mark as read — without auth — 401', async () => {
    const res = await request(app).patch(`/api/notifications/${NOTIF_ID}/read`);
    expect(res.status).toBe(401);
  });
});
