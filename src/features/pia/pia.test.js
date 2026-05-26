process.env.JWT_SECRET    = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV      = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.GEMINI_API_KEY = 'test-key';

const request = require('supertest');

// ── Mock Google AI with full chat chain ───────────────────────────────────────
const mockSendMessage = jest.fn().mockResolvedValue({
  response: { text: jest.fn().mockReturnValue('Voici votre réponse PIA.') },
});
const mockStartChat   = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
const mockGetModel    = jest.fn().mockReturnValue({ startChat: mockStartChat });

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetModel,
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

// ── Context-enrichment dependencies ──────────────────────────────────────────
jest.mock('../profiles/profile.repository', () => ({
  getByUserId: jest.fn().mockResolvedValue(null),
}));
jest.mock('../calendar/calendar.service', () => ({
  getMyCalendar: jest.fn().mockResolvedValue({}),
}));
jest.mock('../admin/admin.repository', () => ({
  getDashboardStats: jest.fn().mockResolvedValue({
    total_users: 100, active_sessions: 5, total_bookings: 200, total_clubs: 10,
  }),
}));

// ── DB mock ───────────────────────────────────────────────────────────────────
jest.mock('../../db', () => {
  const qb = {
    where:      jest.fn().mockReturnThis(),
    whereNull:  jest.fn().mockReturnThis(),
    whereIn:    jest.fn().mockReturnThis(),
    whereNotIn: jest.fn().mockReturnThis(),
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
const CONV_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const TOKEN   = signToken({ sub: USER_ID, role: 'player', organization_id: null });

const CONV_ROW = {
  id:         CONV_ID,
  user_id:    USER_ID,
  messages:   [],
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.whereIn.mockReturnThis();
  qb.whereNotIn.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.join.mockReturnThis();
  qb.leftJoin.mockReturnThis();
  qb.limit.mockReturnThis();
  qb.count.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ── POST /api/pia/chat ────────────────────────────────────────────────────────
describe('POST /api/pia/chat', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); mockSendMessage.mockResolvedValue({
    response: { text: jest.fn().mockReturnValue('Voici votre réponse PIA.') },
  }); });

  it('CU-17: chat — 200 + AI response', async () => {
    // 1. countUserMessagesThisHour: select([{total:0}])
    qb.select.mockResolvedValueOnce([{ total: 0 }]);
    // 2. getOrCreateConversation (no conv_id): insert().returning([conv])
    qb.returning.mockResolvedValueOnce([CONV_ROW]);
    // 3. fetchContext — sessionsRow (count)
    qb.first.mockResolvedValueOnce({ count: 0 });
    // 4. appendMessages: update() returns qb (non-thenable, resolves immediately)

    const res = await request(app)
      .post('/api/pia/chat')
      .set('Cookie', `token=${TOKEN}`)
      .send({ message: 'Quelles sont mes prochaines sessions ?' });

    expect(res.status).toBe(200);
    expect(typeof res.body.response).toBe('string');
    expect(res.body.conversation_id).toBeDefined();
  });

  it('CU-17: chat — missing message — 422', async () => {
    const res = await request(app)
      .post('/api/pia/chat')
      .set('Cookie', `token=${TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-17: chat — message too long — 422', async () => {
    const res = await request(app)
      .post('/api/pia/chat')
      .set('Cookie', `token=${TOKEN}`)
      .send({ message: 'a'.repeat(2001) });

    expect(res.status).toBe(422);
  });

  it('CU-17: chat — without auth — 401', async () => {
    const res = await request(app)
      .post('/api/pia/chat')
      .send({ message: 'Bonjour' });

    expect(res.status).toBe(401);
  });

  it('CU-17: chat — rate limit exceeded — 429', async () => {
    // countUserMessagesThisHour returns 20 (at limit)
    qb.select.mockResolvedValueOnce([{ total: 20 }]);
    // getRetryAfterMinutes: first() returns oldest conversation row
    qb.first.mockResolvedValueOnce({ created_at: new Date().toISOString() });

    const res = await request(app)
      .post('/api/pia/chat')
      .set('Cookie', `token=${TOKEN}`)
      .send({ message: 'Encore un message' });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
  });
});

// ── GET /api/pia/history ──────────────────────────────────────────────────────
describe('GET /api/pia/history', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-17: get history — 200', async () => {
    qb.first.mockResolvedValueOnce({ ...CONV_ROW, messages: [
      { role: 'user', text: 'Bonjour', ts: new Date().toISOString() },
    ]});

    const res = await request(app)
      .get('/api/pia/history')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('CU-17: get history — empty when no conversation — 200', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/pia/history')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(0);
    expect(res.body.conversation_id).toBeNull();
  });

  it('CU-17: get history — without auth — 401', async () => {
    const res = await request(app).get('/api/pia/history');
    expect(res.status).toBe(401);
  });

  it('CU-17: get history — invalid conversation_id UUID — 422', async () => {
    const res = await request(app)
      .get('/api/pia/history?conversation_id=not-a-uuid')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(422);
  });
});

// ── GET /api/pia/conversations ────────────────────────────────────────────────
describe('GET /api/pia/conversations', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-17: get conversations list — 200', async () => {
    qb.select.mockResolvedValueOnce([{
      ...CONV_ROW,
      messages: [{ role: 'user', text: 'Bonjour', ts: new Date().toISOString() }],
    }]);

    const res = await request(app)
      .get('/api/pia/conversations')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    expect(res.body.conversations[0].id).toBe(CONV_ID);
    expect(res.body.conversations[0].title).toBe('Bonjour');
  });

  it('CU-17: get conversations list — empty — 200', async () => {
    qb.select.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/pia/conversations')
      .set('Cookie', `token=${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(0);
  });

  it('CU-17: get conversations list — without auth — 401', async () => {
    const res = await request(app).get('/api/pia/conversations');
    expect(res.status).toBe(401);
  });
});
