process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

// Minimal mocks for modules loaded transitively by app.js
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({ generateContent: jest.fn() }),
  })),
}));
jest.mock('multer', () => {
  const m = () => ({ single: () => (req, res, next) => next() });
  m.diskStorage = () => ({});
  return m;
});

jest.mock('../../db', () => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
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

const CREATOR_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_USER_ID = 'cccccccc-0000-0000-0000-000000000099';
const AUTH_TOKEN = signToken({ sub: CREATOR_ID, role: 'player', organization_id: null });

const SESSION = {
  id: 'dddddddd-0000-0000-0000-000000000001',
  creator_id: CREATOR_ID,
  date: '2026-06-01',
  time: '10:00:00',
  end_time: '12:00:00',
  max_players: 4,
  current_players: 1, // creator is automatically player #1
  status: 'open',
  preferences: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.whereRaw.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ---------------------------------------------------------------------------
// POST /api/sessions
// ---------------------------------------------------------------------------
describe('POST /api/sessions', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-05: create session — 201 with session data', async () => {
    qb.returning.mockResolvedValueOnce([SESSION]);

    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ date: '2026-06-01', time: '10:00', end_time: '12:00', max_players: 4 });

    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ creator_id: CREATOR_ID, status: 'open' });
  });

  it('CU-05: create session — creator is automatically player #1 (current_players = 1)', async () => {
    qb.returning.mockResolvedValueOnce([SESSION]);

    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ date: '2026-06-01', time: '10:00', end_time: '12:00', max_players: 4 });

    expect(res.status).toBe(201);
    // Verify the insert included current_players: 1
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ current_players: 1, creator_id: CREATOR_ID })
    );
  });

  it('CU-05: create session without auth — 401', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ date: '2026-06-01', time: '10:00', end_time: '12:00', max_players: 4 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('CU-05: create session missing date — 422', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ time: '10:00', max_players: 4 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-05: create session invalid date format — 422', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ date: '01/06/2026', time: '10:00', max_players: 4 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-05: create session max_players out of range — 422', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ date: '2026-06-01', time: '10:00', max_players: 10 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/sessions
// ---------------------------------------------------------------------------
describe('GET /api/sessions', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-05: list sessions — 200 with array', async () => {
    qb.select.mockResolvedValueOnce([SESSION]);

    const res = await request(app)
      .get('/api/sessions')
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions).toHaveLength(1);
  });

  it('CU-05: list sessions with status filter — 200', async () => {
    qb.select.mockResolvedValueOnce([SESSION]);

    const res = await request(app)
      .get('/api/sessions?status=open')
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });

  it('CU-05: list sessions with date filter — 200', async () => {
    qb.select.mockResolvedValueOnce([SESSION]);

    const res = await request(app)
      .get('/api/sessions?date=2026-06-01')
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
  });

  it('CU-05: list sessions without auth — 401', async () => {
    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// GET /api/sessions/:id
// ---------------------------------------------------------------------------
describe('GET /api/sessions/:id', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-05: get session by id — 200', async () => {
    qb.first.mockResolvedValueOnce(SESSION);

    const res = await request(app)
      .get(`/api/sessions/${SESSION.id}`)
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({ id: SESSION.id });
  });

  it('CU-05: get session not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/sessions/00000000-0000-0000-0000-000000000000')
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-05: get session without auth — 401', async () => {
    const res = await request(app).get(`/api/sessions/${SESSION.id}`);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/sessions/:id/status
// ---------------------------------------------------------------------------
describe('PATCH /api/sessions/:id/status', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-05: creator changes status — 200', async () => {
    qb.first.mockResolvedValueOnce(SESSION);
    qb.returning.mockResolvedValueOnce([{ ...SESSION, status: 'cancelled' }]);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/status`)
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('cancelled');
  });

  it('CU-05: non-creator status change — 403', async () => {
    qb.first.mockResolvedValueOnce({ ...SESSION, creator_id: OTHER_USER_ID });

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/status`)
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(403);
  });

  it('CU-05: status change session not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/status`)
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(404);
  });

  it('CU-05: invalid status value — 422', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/status`)
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-05: status change without auth — 401', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/status`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(401);
  });
});
