process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV   = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockResolvedValue({
          response: { text: jest.fn().mockReturnValue('ok') },
        }),
      }),
    }),
  })),
}));
jest.mock('multer', () => {
  const m = () => ({ single: () => (req, res, next) => next() });
  m.diskStorage   = () => ({});
  m.memoryStorage = () => ({});
  return m;
});
jest.mock('../../emails/confirmation', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../emails/cancellation', () => ({
  sendBookingCancellation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../features/penalties/penalties.repository', () => ({
  getActiveAppBan:        jest.fn().mockResolvedValue(null),
  countLateCancelsByUser: jest.fn().mockResolvedValue(0),
  getActiveClubBan:       jest.fn().mockResolvedValue(null),
  create:                 jest.fn().mockResolvedValue({ id: 'penalty-id' }),
}));

jest.mock('../../db', () => {
  const qb = {
    where:     jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereIn:   jest.fn().mockReturnThis(),
    orderBy:   jest.fn().mockReturnThis(),
    join:      jest.fn().mockReturnThis(),
    leftJoin:  jest.fn().mockReturnThis(),
    limit:     jest.fn().mockReturnThis(),
    count:     jest.fn().mockReturnThis(),
    select:    jest.fn(),
    first:     jest.fn(),
    insert:    jest.fn().mockReturnThis(),
    update:    jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };
  const mockDb  = jest.fn(() => qb);
  mockDb.__qb   = qb;
  mockDb.raw    = jest.fn().mockReturnValue({});
  return mockDb;
});

jest.mock('./subscriptions.service', () => ({
  getMySubscription: jest.fn(),
  getHistory:        jest.fn(),
  pay:               jest.fn(),
  getAllSubscriptions: jest.fn(),
  activate:          jest.fn(),
  suspend:           jest.fn(),
  runCron:           jest.fn().mockResolvedValue(undefined),
}));

const app                  = require('../../app');
const { signToken }        = require('../../auth/jwt');
const subscriptionsService = require('./subscriptions.service');

const MANAGER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PLAYER_ID  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ORG_ID     = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const MANAGER_TOKEN = signToken({ sub: MANAGER_ID, role: 'venue_admin',  organization_id: ORG_ID });
const PLAYER_TOKEN  = signToken({ sub: PLAYER_ID,  role: 'player',       organization_id: null });

const SUBSCRIPTION = {
  id:             'sub-uuid-0001',
  organization_id: ORG_ID,
  status:         'active',
  expires_at:     new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  venue_count:    2,
};

// ── GET /api/subscriptions/my ─────────────────────────────────────────────────
describe('GET /api/subscriptions/my', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-12: get my subscription — venue_admin — 200', async () => {
    subscriptionsService.getMySubscription.mockResolvedValue(SUBSCRIPTION);

    const res = await request(app)
      .get('/api/subscriptions/my')
      .set('Cookie', `token=${MANAGER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('active');
  });

  it('CU-12: get my subscription — without auth — 401', async () => {
    const res = await request(app).get('/api/subscriptions/my');
    expect(res.status).toBe(401);
  });

  it('CU-12: get my subscription — player role — 403', async () => {
    const res = await request(app)
      .get('/api/subscriptions/my')
      .set('Cookie', `token=${PLAYER_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

// ── GET /api/subscriptions/history ───────────────────────────────────────────
describe('GET /api/subscriptions/history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-12: get subscription history — venue_admin — 200', async () => {
    subscriptionsService.getHistory.mockResolvedValue([SUBSCRIPTION]);

    const res = await request(app)
      .get('/api/subscriptions/history')
      .set('Cookie', `token=${MANAGER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('CU-12: get subscription history — without auth — 401', async () => {
    const res = await request(app).get('/api/subscriptions/history');
    expect(res.status).toBe(401);
  });

  it('CU-12: get subscription history — player role — 403', async () => {
    const res = await request(app)
      .get('/api/subscriptions/history')
      .set('Cookie', `token=${PLAYER_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

// ── POST /api/subscriptions/pay ───────────────────────────────────────────────
describe('POST /api/subscriptions/pay', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-12: pay subscription — wave — 201', async () => {
    subscriptionsService.pay.mockResolvedValue(SUBSCRIPTION);

    const res = await request(app)
      .post('/api/subscriptions/pay')
      .set('Cookie', `token=${MANAGER_TOKEN}`)
      .send({ payment_method: 'wave' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.subscription.organization_id).toBe(ORG_ID);
  });

  it('CU-12: pay subscription — orange_money — 201', async () => {
    subscriptionsService.pay.mockResolvedValue(SUBSCRIPTION);

    const res = await request(app)
      .post('/api/subscriptions/pay')
      .set('Cookie', `token=${MANAGER_TOKEN}`)
      .send({ payment_method: 'orange_money' });

    expect(res.status).toBe(201);
  });

  it('CU-12: pay subscription — invalid payment_method — 422', async () => {
    const res = await request(app)
      .post('/api/subscriptions/pay')
      .set('Cookie', `token=${MANAGER_TOKEN}`)
      .send({ payment_method: 'bitcoin' });

    expect(res.status).toBe(422);
  });

  it('CU-12: pay subscription — missing payment_method — 422', async () => {
    const res = await request(app)
      .post('/api/subscriptions/pay')
      .set('Cookie', `token=${MANAGER_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('CU-12: pay subscription — without auth — 401', async () => {
    const res = await request(app)
      .post('/api/subscriptions/pay')
      .send({ payment_method: 'wave' });
    expect(res.status).toBe(401);
  });

  it('CU-12: pay subscription — player role — 403', async () => {
    const res = await request(app)
      .post('/api/subscriptions/pay')
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ payment_method: 'wave' });
    expect(res.status).toBe(403);
  });
});
