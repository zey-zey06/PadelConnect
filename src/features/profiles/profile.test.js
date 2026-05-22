process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

// Mock Google Gemini SDK — __mockGenerateContent is exposed so tests can configure it
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const MockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({ generateContent: mockGenerateContent }),
  }));
  MockGoogleGenerativeAI.__mockGenerateContent = mockGenerateContent;
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

// Mock multer — reads req.file from a global so individual tests can control it
jest.mock('multer', () => {
  const m = () => ({
    single: () => (req, res, next) => {
      req.file = global.__mockProfileFile;
      next();
    },
  });
  m.diskStorage = () => ({});
  return m;
});

// Mock db (same pattern as auth.test.js)
jest.mock('../../db', () => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
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
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../../db');
const { signToken } = require('../../auth/jwt');

const mockGenerateContent = GoogleGenerativeAI.__mockGenerateContent;
const qb = db.__qb;

const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const AUTH_TOKEN = signToken({ sub: USER_ID, role: 'player', organization_id: null });

const PROFILE = {
  id: 'bbbbbbbb-0000-0000-0000-000000000001',
  user_id: USER_ID,
  level: 5,
  style: 'attaquant',
  strengths: ['smash', 'volée'],
  weaknesses: ['défense'],
  description: 'Joueur offensif.',
  photo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const AI_RESPONSE = {
  response: {
    text: () => JSON.stringify({
      niveau: 5,
      style: 'attaquant',
      points_forts: ['smash', 'volée'],
      points_faibles: ['défense'],
      description_courte: 'Joueur offensif.',
    }),
  },
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.leftJoin.mockReturnThis();
  qb.select.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ---------------------------------------------------------------------------
// POST /api/profile/generate
// ---------------------------------------------------------------------------
describe('POST /api/profile/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
    mockGenerateContent.mockReset();
  });

  it('CU-04: generate success — 200 with AI-generated profile', async () => {
    mockGenerateContent.mockResolvedValue(AI_RESPONSE);
    qb.first.mockResolvedValueOnce(null);
    qb.returning.mockResolvedValueOnce([PROFILE]);

    const res = await request(app)
      .post('/api/profile/generate')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ description: 'Je joue au padel depuis 3 ans, niveau intermédiaire, style offensif.' });

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.level).toBeDefined();
  });

  it('CU-04: generate — AI failure returns degraded profile, never blocks user', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API down'));
    qb.first.mockResolvedValueOnce(null);
    qb.returning.mockResolvedValueOnce([{ ...PROFILE, level: 4, style: 'unknown' }]);

    const res = await request(app)
      .post('/api/profile/generate')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ description: 'Je joue au padel depuis 3 ans, niveau intermédiaire.' });

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
  });

  it('CU-04: generate without auth — 401', async () => {
    const res = await request(app)
      .post('/api/profile/generate')
      .send({ description: 'Je joue au padel depuis 3 ans.' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('CU-04: generate missing description — 422', async () => {
    const res = await request(app)
      .post('/api/profile/generate')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-04: generate description too short — 422', async () => {
    const res = await request(app)
      .post('/api/profile/generate')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ description: 'court' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/profile
// ---------------------------------------------------------------------------
describe('PUT /api/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
  });

  it('CU-04: update existing profile — 200', async () => {
    qb.first.mockResolvedValueOnce(PROFILE);
    qb.returning.mockResolvedValueOnce([{ ...PROFILE, level: 6, style: 'défensif' }]);

    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ level: 6, style: 'défensif' });

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
  });

  it('CU-04: update creates profile if none exists — 200', async () => {
    qb.first.mockResolvedValueOnce(null);
    qb.returning.mockResolvedValueOnce([PROFILE]);

    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ level: 5 });

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
  });

  it('CU-04: update without auth — 401', async () => {
    const res = await request(app)
      .put('/api/profile')
      .send({ level: 5 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('CU-04: update empty body — 422', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-04: update invalid level — 422', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', `token=${AUTH_TOKEN}`)
      .send({ level: 99 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/profile/photo
// ---------------------------------------------------------------------------
describe('POST /api/profile/photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
    global.__mockProfileFile = {
      filename: `${USER_ID}-1234567890.jpg`,
      path: `uploads/profiles/${USER_ID}-1234567890.jpg`,
      mimetype: 'image/jpeg',
      size: 1024,
    };
  });

  it('CU-04: photo upload success — 200 with photo_url', async () => {
    qb.first.mockResolvedValueOnce(null);
    qb.returning.mockResolvedValueOnce([{
      ...PROFILE,
      photo_url: `/uploads/profiles/${USER_ID}-1234567890.jpg`,
    }]);

    const res = await request(app)
      .post('/api/profile/photo')
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.photo_url).toMatch(/\/uploads\/profiles\//);
  });

  it('CU-04: photo without auth — 401', async () => {
    const res = await request(app).post('/api/profile/photo');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('CU-04: photo — no file uploaded — 422', async () => {
    global.__mockProfileFile = undefined;

    const res = await request(app)
      .post('/api/profile/photo')
      .set('Cookie', `token=${AUTH_TOKEN}`);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});
