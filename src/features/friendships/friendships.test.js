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
    where:      jest.fn().mockReturnThis(),
    whereNull:  jest.fn().mockReturnThis(),
    whereIn:    jest.fn().mockReturnThis(),
    orderBy:    jest.fn().mockReturnThis(),
    join:       jest.fn().mockReturnThis(),
    leftJoin:   jest.fn().mockReturnThis(),
    limit:      jest.fn().mockReturnThis(),
    count:      jest.fn().mockReturnThis(),
    select:     jest.fn(),
    first:      jest.fn(),
    insert:     jest.fn().mockReturnThis(),
    update:     jest.fn().mockReturnThis(),
    returning:  jest.fn(),
    del:        jest.fn().mockResolvedValue(1),
  };
  const mockDb  = jest.fn(() => qb);
  mockDb.__qb   = qb;
  mockDb.raw    = jest.fn().mockReturnValue({});
  return mockDb;
});

jest.mock('./friendships.service', () => ({
  getFriends:          jest.fn(),
  getPendingRequests:  jest.fn(),
  getStatus:           jest.fn(),
  sendRequest:         jest.fn(),
  acceptRequest:       jest.fn(),
  refuseRequest:       jest.fn(),
  unfriend:            jest.fn(),
}));

const app               = require('../../app');
const { signToken }     = require('../../auth/jwt');
const friendshipsService = require('./friendships.service');

const USER_ID  = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TOKEN    = signToken({ sub: USER_ID, role: 'player', organization_id: null });

const FRIEND = {
  id:         OTHER_ID,
  first_name: 'Kofi',
  last_name:  'Mensah',
  username:   'kofi',
};

const FRIENDSHIP = {
  id:           'ff000000-0000-0000-0000-000000000001',
  requester_id: USER_ID,
  addressee_id: OTHER_ID,
  status:       'pending',
  created_at:   new Date().toISOString(),
};

// ── GET /api/friends ──────────────────────────────────────────────────────────
describe('GET /api/friends', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: get friends list — 200', async () => {
    friendshipsService.getFriends.mockResolvedValue([FRIEND]);

    const res = await request(app)
      .get('/api/friends')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.friends)).toBe(true);
    expect(res.body.friends[0].id).toBe(OTHER_ID);
  });

  it('CU-15: get friends list — without auth — 401', async () => {
    const res = await request(app).get('/api/friends');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/friends/user/:userId ─────────────────────────────────────────────
describe('GET /api/friends/user/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: get user friends list — 200', async () => {
    friendshipsService.getFriends.mockResolvedValue([FRIEND]);

    const res = await request(app)
      .get(`/api/friends/user/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.friends)).toBe(true);
  });

  it('CU-15: get user friends list — without auth — 401', async () => {
    const res = await request(app).get(`/api/friends/user/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── GET /api/friends/requests ─────────────────────────────────────────────────
describe('GET /api/friends/requests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: get pending requests — 200', async () => {
    friendshipsService.getPendingRequests.mockResolvedValue([FRIENDSHIP]);

    const res = await request(app)
      .get('/api/friends/requests')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('CU-15: get pending requests — without auth — 401', async () => {
    const res = await request(app).get('/api/friends/requests');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/friends/status/:userId ──────────────────────────────────────────
describe('GET /api/friends/status/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: get friendship status — 200', async () => {
    friendshipsService.getStatus.mockResolvedValue({ status: 'none' });

    const res = await request(app)
      .get(`/api/friends/status/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('none');
  });

  it('CU-15: get friendship status — without auth — 401', async () => {
    const res = await request(app).get(`/api/friends/status/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/friends/request/:userId ────────────────────────────────────────
describe('POST /api/friends/request/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: send friend request — 201', async () => {
    friendshipsService.sendRequest.mockResolvedValue(FRIENDSHIP);

    const res = await request(app)
      .post(`/api/friends/request/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.friendship.requester_id).toBe(USER_ID);
  });

  it('CU-15: send friend request — without auth — 401', async () => {
    const res = await request(app).post(`/api/friends/request/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/friends/accept/:userId ─────────────────────────────────────────
describe('POST /api/friends/accept/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: accept friend request — 200', async () => {
    friendshipsService.acceptRequest.mockResolvedValue({ ...FRIENDSHIP, status: 'accepted' });

    const res = await request(app)
      .post(`/api/friends/accept/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('CU-15: accept friend request — without auth — 401', async () => {
    const res = await request(app).post(`/api/friends/accept/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/friends/refuse/:userId ─────────────────────────────────────────
describe('POST /api/friends/refuse/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: refuse friend request — 200', async () => {
    friendshipsService.refuseRequest.mockResolvedValue({ ...FRIENDSHIP, status: 'refused' });

    const res = await request(app)
      .post(`/api/friends/refuse/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('CU-15: refuse friend request — without auth — 401', async () => {
    const res = await request(app).post(`/api/friends/refuse/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/friends/:userId ───────────────────────────────────────────────
describe('DELETE /api/friends/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-15: unfriend — 200', async () => {
    friendshipsService.unfriend.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/friends/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('CU-15: unfriend — without auth — 401', async () => {
    const res = await request(app).delete(`/api/friends/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});
