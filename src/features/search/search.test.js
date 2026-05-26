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
    where:        jest.fn().mockReturnThis(),
    whereNull:    jest.fn().mockReturnThis(),
    whereIn:      jest.fn().mockReturnThis(),
    whereNotIn:   jest.fn().mockReturnThis(),
    whereILike:   jest.fn().mockReturnThis(),
    orWhereILike: jest.fn().mockReturnThis(),
    whereRaw:     jest.fn().mockReturnThis(),
    orderBy:      jest.fn().mockReturnThis(),
    join:         jest.fn().mockReturnThis(),
    leftJoin:     jest.fn().mockReturnThis(),
    limit:        jest.fn().mockReturnThis(),
    count:        jest.fn().mockReturnThis(),
    select:       jest.fn(),
    first:        jest.fn(),
    insert:       jest.fn().mockReturnThis(),
    update:       jest.fn().mockReturnThis(),
    returning:    jest.fn(),
  };
  const mockDb  = jest.fn(() => qb);
  mockDb.__qb   = qb;
  mockDb.raw    = jest.fn().mockReturnValue({});
  return mockDb;
});

const app           = require('../../app');
const db            = require('../../db');
const { signToken } = require('../../auth/jwt');

const qb = db.__qb;

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TOKEN   = signToken({ sub: USER_ID, role: 'player', organization_id: null });

const PLAYER_RESULT = {
  user_id:    USER_ID,
  first_name: 'Kofi',
  last_name:  'Mensah',
  username:   'kofi',
  email:      'kofi@test.com',
  level:      3,
  photo_url:  null,
};

const CLUB_RESULT = {
  id:          'cccccccc-cccc-cccc-cccc-cccccccccccc',
  name:        'Elite Padel Club',
  logo_url:    null,
  venue_count: 2,
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.whereIn.mockReturnThis();
  qb.whereNotIn.mockReturnThis();
  qb.whereILike.mockReturnThis();
  qb.orWhereILike.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.join.mockReturnThis();
  qb.leftJoin.mockReturnThis();
  qb.limit.mockReturnThis();
  qb.count.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ── GET /api/search ───────────────────────────────────────────────────────────
describe('GET /api/search', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-14: search — returns players and clubs — 200', async () => {
    // Promise.all fires two .select() calls: first → players, second → clubs
    qb.select
      .mockResolvedValueOnce([PLAYER_RESULT])
      .mockResolvedValueOnce([CLUB_RESULT]);

    const res = await request(app)
      .get('/api/search?q=kofi')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.players)).toBe(true);
    expect(Array.isArray(res.body.clubs)).toBe(true);
    expect(res.body.players[0].first_name).toBe('Kofi');
    expect(res.body.clubs[0].name).toBe('Elite Padel Club');
  });

  it('CU-14: search — empty results — 200', async () => {
    qb.select
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/search?q=zzz')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.players).toHaveLength(0);
    expect(res.body.clubs).toHaveLength(0);
  });

  it('CU-14: search — query too short (1 char) — 422', async () => {
    const res = await request(app)
      .get('/api/search?q=a')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-14: search — missing query param — 422', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-14: search — without auth — 401', async () => {
    const res = await request(app).get('/api/search?q=kofi');
    expect(res.status).toBe(401);
  });
});
