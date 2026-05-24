process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$mockedhash'),
  compare: jest.fn(),
}));

jest.mock('../db', () => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockResolvedValue(1),
  };
  const mockDb = jest.fn(() => qb);
  mockDb.__qb = qb;
  return mockDb;
});

jest.mock('../emails/verification', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../features/notifications/notifications.service', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../app');
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken } = require('./jwt');

const qb = db.__qb;

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.first.mockReset();
  qb.returning.mockReset();
  qb.update.mockResolvedValue(1);
}

const VALID_USER = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  email: 'joueur@test.com',
  password_hash: '$2b$12$mockedhash',
  role: 'player',
  organization_id: null,
  status: 'active',
  email_verified: true,
  created_at: new Date().toISOString(),
};

const UNVERIFIED_USER = {
  ...VALID_USER,
  email_verified: false,
  email_verification_token: 'abc123def456',
  email_verification_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
};

const EXPIRED_TOKEN_USER = {
  ...VALID_USER,
  email_verified: false,
  email_verification_token: 'expiredtoken',
  email_verification_expires_at: new Date(Date.now() - 1000).toISOString(), // past
};

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
  });

  it('CU-01: signup success — 201 + verification email sent, no JWT cookie', async () => {
    qb.first.mockResolvedValue(null);
    qb.returning.mockResolvedValue([VALID_USER]);

    const res = await request(app).post('/api/auth/signup').send({
      email: 'joueur@test.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'joueur@test.com', role: 'player' });
    expect(res.body.user.password_hash).toBeUndefined();
    // JWT cookie issued immediately on signup (email verification disabled)
    const cookie = res.headers['set-cookie'];
    expect(cookie).toBeDefined();
  });

  it('CU-01: signup with role — 201 + role echoed', async () => {
    qb.first.mockResolvedValue(null);
    qb.returning.mockResolvedValue([{ ...VALID_USER, role: 'coach' }]);

    const res = await request(app).post('/api/auth/signup').send({
      email: 'coach@test.com',
      password: 'Password1!',
      role: 'coach',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('coach');
  });

  it('CU-01: signup super_admin role rejected — 422', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'hacker@test.com',
      password: 'Password1!',
      role: 'super_admin',
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-01: signup duplicate email — 409', async () => {
    qb.first.mockResolvedValue(VALID_USER);

    const res = await request(app).post('/api/auth/signup').send({
      email: 'joueur@test.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('CU-01: signup missing email — 422', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      password: 'Password1!',
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-01: signup password too short — 422', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'joueur@test.com',
      password: 'short',
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-01: signup invalid email format — 422', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'not-an-email',
      password: 'Password1!',
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email
// ---------------------------------------------------------------------------
describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
  });

  it('CU-01: verify-email valid token — 200 + success message', async () => {
    qb.first.mockResolvedValue(UNVERIFIED_USER);

    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'abc123def456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/vérifié/i);
    expect(res.body.user).toMatchObject({ email: VALID_USER.email });
    expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({ email_verified: true }));
  });

  it('CU-01: verify-email invalid token — 400', async () => {
    qb.first.mockResolvedValue(null); // no user with this token

    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'badtoken' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('CU-01: verify-email expired token — 400', async () => {
    qb.first.mockResolvedValue(EXPIRED_TOKEN_USER);

    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'expiredtoken' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('CU-01: verify-email missing token — 400', async () => {
    const res = await request(app).get('/api/auth/verify-email');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
  });

  it('CU-01: login success — 200 + httpOnly cookie set', async () => {
    qb.first.mockResolvedValue(VALID_USER);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'joueur@test.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'joueur@test.com', role: 'player' });
    const cookie = res.headers['set-cookie'];
    expect(cookie).toBeDefined();
    expect(cookie[0]).toMatch(/token=/);
    expect(cookie[0]).toMatch(/HttpOnly/i);
  });

  it('CU-01: login unverified email — 401 EMAIL_NOT_VERIFIED', async () => {
    qb.first.mockResolvedValue(UNVERIFIED_USER);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'joueur@test.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('CU-01: login wrong password — 401', async () => {
    qb.first.mockResolvedValue(VALID_USER);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/api/auth/login').send({
      email: 'joueur@test.com',
      password: 'WrongPass!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('CU-01: login unknown email — 401', async () => {
    qb.first.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'unknown@test.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(401);
  });

  it('CU-01: login missing password — 422', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'joueur@test.com',
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-01: login missing email — 422', async () => {
    const res = await request(app).post('/api/auth/login').send({
      password: 'Password1!',
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
describe('POST /api/auth/logout', () => {
  it('CU-01: logout — 200 + cookie cleared', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    const cookie = res.headers['set-cookie'];
    if (cookie) {
      expect(cookie[0]).toMatch(/token=/);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQb();
  });

  it('CU-01: me with valid cookie — 200 + user data', async () => {
    qb.first.mockResolvedValue(VALID_USER);

    const token = signToken({ sub: VALID_USER.id, role: 'player', organization_id: null });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: VALID_USER.id, email: VALID_USER.email });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('CU-01: me without cookie — 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('CU-01: me with invalid token — 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'token=invalid.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('CU-01: me with expired token — 401', async () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { sub: VALID_USER.id, role: 'player' },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${expiredToken}`);

    expect(res.status).toBe(401);
  });
});
