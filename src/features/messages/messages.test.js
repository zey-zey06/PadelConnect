process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV   = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

jest.mock('multer', () => {
  const m = () => ({ single: () => (req, res, next) => next() });
  m.diskStorage  = () => ({});
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

jest.mock('./messages.service', () => ({
  getConversations: jest.fn(),
  getMessages:      jest.fn(),
  sendMessage:      jest.fn(),
  markAsRead:       jest.fn(),
  getUnreadCount:   jest.fn(),
}));

const app             = require('../../app');
const { signToken }   = require('../../auth/jwt');
const messagesService = require('./messages.service');

const USER_ID  = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TOKEN    = signToken({ sub: USER_ID, role: 'player', organization_id: null });

const CONVERSATION = {
  partner_id:         OTHER_ID,
  partner_first_name: 'Kofi',
  partner_last_name:  'Mensah',
  last_message:       'Salut !',
  unread_count:       1,
  last_message_at:    new Date().toISOString(),
};

const MESSAGE = {
  id:          'msg-uuid-0001',
  sender_id:   USER_ID,
  receiver_id: OTHER_ID,
  content:     'Salut !',
  read:        false,
  created_at:  new Date().toISOString(),
};

// ── GET /api/messages/conversations ──────────────────────────────────────────
describe('GET /api/messages/conversations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-16: get conversations — 200', async () => {
    messagesService.getConversations.mockResolvedValue([CONVERSATION]);

    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    expect(res.body.conversations[0].partner_id).toBe(OTHER_ID);
  });

  it('CU-16: get conversations — without auth — 401', async () => {
    const res = await request(app).get('/api/messages/conversations');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/messages/unread-count ────────────────────────────────────────────
describe('GET /api/messages/unread-count', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-16: unread-count — 200', async () => {
    messagesService.getUnreadCount.mockResolvedValue(3);

    const res = await request(app)
      .get('/api/messages/unread-count')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it('CU-16: unread-count — without auth — 401', async () => {
    const res = await request(app).get('/api/messages/unread-count');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/messages/:userId ─────────────────────────────────────────────────
describe('GET /api/messages/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-16: get messages thread — 200', async () => {
    messagesService.getMessages.mockResolvedValue([MESSAGE]);

    const res = await request(app)
      .get(`/api/messages/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages[0].content).toBe('Salut !');
  });

  it('CU-16: get messages thread — without auth — 401', async () => {
    const res = await request(app).get(`/api/messages/${OTHER_ID}`);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/messages/:userId ────────────────────────────────────────────────
describe('POST /api/messages/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-16: send message — 201', async () => {
    messagesService.sendMessage.mockResolvedValue({ ...MESSAGE, id: 'msg-new' });

    const res = await request(app)
      .post(`/api/messages/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`)
      .send({ content: 'Salut !' });

    expect(res.status).toBe(201);
    expect(res.body.message.content).toBe('Salut !');
  });

  it('CU-16: send message — without auth — 401', async () => {
    const res = await request(app)
      .post(`/api/messages/${OTHER_ID}`)
      .send({ content: 'Salut !' });
    expect(res.status).toBe(401);
  });

  it('CU-16: send message — empty content — 422', async () => {
    const res = await request(app)
      .post(`/api/messages/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`)
      .send({ content: '' });
    expect(res.status).toBe(422);
  });

  it('CU-16: send message — missing content — 422', async () => {
    const res = await request(app)
      .post(`/api/messages/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('CU-16: send message — content too long (>2000 chars) — 422', async () => {
    const res = await request(app)
      .post(`/api/messages/${OTHER_ID}`)
      .set('Cookie', `token=${TOKEN}`)
      .send({ content: 'a'.repeat(2001) });
    expect(res.status).toBe(422);
  });
});

// ── PATCH /api/messages/:userId/read ─────────────────────────────────────────
describe('PATCH /api/messages/:userId/read', () => {
  beforeEach(() => jest.clearAllMocks());

  it('CU-16: mark as read — 200', async () => {
    messagesService.markAsRead.mockResolvedValue(undefined);

    const res = await request(app)
      .patch(`/api/messages/${OTHER_ID}/read`)
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('CU-16: mark as read — without auth — 401', async () => {
    const res = await request(app).patch(`/api/messages/${OTHER_ID}/read`);
    expect(res.status).toBe(401);
  });
});
