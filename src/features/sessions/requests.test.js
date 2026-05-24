process.env.JWT_SECRET = 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-00';
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

const request = require('supertest');

// Expose __mockGenerateContent so individual tests can configure AI responses
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const MockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({ generateContent: mockGenerateContent }),
  }));
  MockGoogleGenerativeAI.__mockGenerateContent = mockGenerateContent;
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

jest.mock('multer', () => {
  const m = () => ({ single: () => (req, res, next) => next() });
  m.diskStorage = () => ({});
  m.memoryStorage = () => ({});
  return m;
});

// Single shared query builder — sequential calls consumed via mockResolvedValueOnce
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
    returning: jest.fn().mockResolvedValue([]),
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

// Two distinct users: CREATOR creates sessions, PLAYER requests to join
const CREATOR_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const PLAYER_ID  = 'bbbbbbbb-0000-0000-0000-000000000002';
const CREATOR_TOKEN = signToken({ sub: CREATOR_ID, role: 'player', organization_id: null });
const PLAYER_TOKEN  = signToken({ sub: PLAYER_ID,  role: 'player', organization_id: null });

const SESSION = {
  id: 'dddddddd-0000-0000-0000-000000000001',
  creator_id: CREATOR_ID,
  date: '2026-06-10',
  time: '10:00:00',
  max_players: 4,
  current_players: 0,
  status: 'open',
  preferences: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SESSION_REQUEST = {
  id: 'eeeeeeee-0000-0000-0000-000000000001',
  session_id: SESSION.id,
  player_id: PLAYER_ID,
  role: 'player',
  status: 'pending',
  ai_score: 75,
  ai_explanation: 'Bonne compatibilité.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const AI_SCORE_RESPONSE = {
  response: {
    text: () => JSON.stringify({ score: 75, explication: 'Bonne compatibilité.' }),
  },
};

const NOTIFICATION = {
  id: 'ffffffff-0000-0000-0000-000000000001',
  user_id: CREATOR_ID,
  type: 'session_request',
  message: `Nouvelle demande pour rejoindre votre session du ${SESSION.date}.`,
  read: false,
  created_at: new Date().toISOString(),
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
// POST /api/sessions/:id/requests
// createRequest DB call order:
//   first()     → sessionsRepo.getById (session)
//   first()     → requestsRepo.findBySessionAndPlayer (dup check)
//   first()     → profileRepo.getByUserId (candidate profile)
//   select()    → requestsRepo.getAcceptedBySession (group profiles)
//   returning() → requestsRepo.create (insert session_request)
//   returning() → notificationsRepo.create (notify session creator)
// ---------------------------------------------------------------------------
describe('POST /api/sessions/:id/requests', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); mockGenerateContent.mockReset(); });

  it('CU-06: create request — 201 with AI score', async () => {
    mockGenerateContent.mockResolvedValue(AI_SCORE_RESPONSE);
    qb.first
      .mockResolvedValueOnce(SESSION)        // session exists
      .mockResolvedValueOnce(null)           // no duplicate
      .mockResolvedValueOnce(null);          // no candidate profile (ok)
    qb.select.mockResolvedValueOnce([]);     // no accepted players yet
    qb.returning.mockResolvedValueOnce([SESSION_REQUEST]);

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(201);
    expect(res.body.sessionRequest).toBeDefined();
    expect(res.body.sessionRequest.ai_score).toBe(75);
  });

  it('CU-06: create request — AI failure returns degraded score, never blocks', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini down'));
    qb.first
      .mockResolvedValueOnce(SESSION)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    qb.select.mockResolvedValueOnce([]);
    qb.returning.mockResolvedValueOnce([{ ...SESSION_REQUEST, ai_score: 50, ai_explanation: 'Compatibilité neutre' }]);

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(201);
    expect(res.body.sessionRequest.ai_score).toBe(50);
  });

  it('CU-06: create request — notification written to DB for session creator', async () => {
    mockGenerateContent.mockResolvedValue(AI_SCORE_RESPONSE);
    qb.first
      .mockResolvedValueOnce(SESSION)   // session exists
      .mockResolvedValueOnce(null)      // no duplicate
      .mockResolvedValueOnce(null);     // no candidate profile
    qb.select.mockResolvedValueOnce([]); // no accepted players yet
    qb.returning
      .mockResolvedValueOnce([SESSION_REQUEST]) // session_request insert
      .mockResolvedValueOnce([NOTIFICATION]);   // notifications insert

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(201);

    // Verify db('notifications') was called — i.e. a row was inserted for the creator
    const notifTableCall = db.mock.calls.find(([table]) => table === 'notifications');
    expect(notifTableCall).toBeDefined();
    // Verify the notification targets the session creator, not the player who requested
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: CREATOR_ID, type: 'session_request' })
    );
  });

  it('CU-06: creator joins own session — 403', async () => {
    qb.first.mockResolvedValueOnce(SESSION); // creator_id === CREATOR_ID

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${CREATOR_TOKEN}`); // CREATOR_ID === session.creator_id

    expect(res.status).toBe(403);
  });

  it('CU-06: duplicate request — 409', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION)
      .mockResolvedValueOnce(SESSION_REQUEST); // existing request found

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(409);
  });

  it('CU-06: session not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-06: create request without auth — 401', async () => {
    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// GET /api/sessions/:id/requests — creator only
// DB call order:
//   first()  → sessionsRepo.getById
//   select() → requestsRepo.getBySession
// ---------------------------------------------------------------------------
describe('GET /api/sessions/:id/requests', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-06: creator lists requests — 200 with requests', async () => {
    qb.first.mockResolvedValueOnce(SESSION);
    qb.select.mockResolvedValueOnce([SESSION_REQUEST]);

    const res = await request(app)
      .get(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.requests[0].ai_score).toBe(75);
  });

  it('CU-06: non-creator lists requests — 403', async () => {
    qb.first.mockResolvedValueOnce(SESSION); // creator_id is CREATOR_ID, token is PLAYER

    const res = await request(app)
      .get(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`); // PLAYER_ID !== creator_id

    expect(res.status).toBe(403);
  });

  it('CU-06: get requests session not found — 404', async () => {
    qb.first.mockResolvedValueOnce(null);

    const res = await request(app)
      .get(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${CREATOR_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('CU-06: get requests without auth — 401', async () => {
    const res = await request(app)
      .get(`/api/sessions/${SESSION.id}/requests`);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/sessions/:id/requests/:requestId
// DB call order (accept, no complete):
//   first()     → sessionsRepo.getById
//   first()     → requestsRepo.getById
//   returning() → requestsRepo.updateStatus
//   returning() → sessionsRepo.updateCurrentPlayers
//
// DB call order (accept, triggers complete, current_players 1→2):
//   first()     → sessionsRepo.getById        (current_players: 1)
//   first()     → requestsRepo.getById
//   returning() → requestsRepo.updateStatus
//   returning() → sessionsRepo.updateCurrentPlayers (returns current_players: 2)
//   returning() → sessionsRepo.updateStatus   (complete)
//
// DB call order (refuse):
//   first()     → sessionsRepo.getById
//   first()     → requestsRepo.getById
//   returning() → requestsRepo.updateStatus
//   (no increment)
// ---------------------------------------------------------------------------
describe('PATCH /api/sessions/:id/requests/:requestId', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-06: creator accepts request — 200, current_players incremented', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION)           // session (current_players: 0)
      .mockResolvedValueOnce(SESSION_REQUEST);  // request belongs to session
    qb.returning
      .mockResolvedValueOnce([{ ...SESSION_REQUEST, status: 'accepted' }])
      .mockResolvedValueOnce([{ ...SESSION, current_players: 1 }]); // updateCurrentPlayers

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.sessionRequest.status).toBe('accepted');
  });

  it('CU-06: accept triggers session complete only when current_players reaches max_players', async () => {
    // max_players: 2, current_players: 1 — accepting this request fills the session
    const sessionWith1Player = { ...SESSION, max_players: 2, current_players: 1 };
    qb.first
      .mockResolvedValueOnce(sessionWith1Player)
      .mockResolvedValueOnce(SESSION_REQUEST);
    qb.returning
      .mockResolvedValueOnce([{ ...SESSION_REQUEST, status: 'accepted' }])
      .mockResolvedValueOnce([{ ...SESSION, max_players: 2, current_players: 2 }])
      .mockResolvedValueOnce([{ ...SESSION, max_players: 2, current_players: 2, status: 'complete' }]);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.sessionRequest.status).toBe('accepted');
  });

  it('CU-06: accept does NOT trigger complete when current_players < max_players', async () => {
    // max_players: 4, current_players: 1 — 2 players is NOT complete
    const sessionWith1Player = { ...SESSION, max_players: 4, current_players: 1 };
    qb.first
      .mockResolvedValueOnce(sessionWith1Player)
      .mockResolvedValueOnce(SESSION_REQUEST);
    qb.returning
      .mockResolvedValueOnce([{ ...SESSION_REQUEST, status: 'accepted' }])
      .mockResolvedValueOnce([{ ...SESSION, max_players: 4, current_players: 2 }]);
    // No third returning — updateStatus should NOT be called

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    // Verify updateStatus (complete) was NOT called: only 3 returning() calls expected
    // (1: updateStatus request, 2: updateCurrentPlayers, 3: player notification)
    // A 4th call would mean sessionsRepo.updateStatus('complete') fired — that's the bug
    expect(qb.returning).toHaveBeenCalledTimes(3);
  });

  it('CU-06: creator refuses request — 200', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION)
      .mockResolvedValueOnce(SESSION_REQUEST);
    qb.returning
      .mockResolvedValueOnce([{ ...SESSION_REQUEST, status: 'refused' }]);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'refused' });

    expect(res.status).toBe(200);
    expect(res.body.sessionRequest.status).toBe('refused');
  });

  it('CU-06: non-creator responds to request — 403', async () => {
    qb.first.mockResolvedValueOnce(SESSION); // creator_id is CREATOR_ID

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(403);
  });

  it('CU-06: request not found — 404', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION)
      .mockResolvedValueOnce(null); // request not found

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(404);
  });

  it('CU-06: invalid response status — 422', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'pending' }); // 'pending' is not a valid response

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-06: accept coach request — does NOT increment current_players, not counted as player', async () => {
    const COACH_ID = 'cccccccc-0000-0000-0000-000000000003';
    const COACH_REQUEST = { ...SESSION_REQUEST, player_id: COACH_ID, role: 'coach' };
    // Session has 1 player, max 2 — accepting a coach must NOT trigger complete
    const sessionWith1Player = { ...SESSION, current_players: 1, max_players: 2 };
    qb.first
      .mockResolvedValueOnce(sessionWith1Player)
      .mockResolvedValueOnce(COACH_REQUEST);
    qb.returning
      .mockResolvedValueOnce([{ ...COACH_REQUEST, status: 'accepted' }]);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    // Only updateStatus(request) + notification — no updateCurrentPlayers, no updateStatus(complete)
    expect(qb.returning).toHaveBeenCalledTimes(2);
  });

  it('CU-06: respond without auth — 401', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${SESSION.id}/requests/${SESSION_REQUEST.id}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/sessions/:id/requests — coach invite (role: 'coach')
// DB call order (creator invites coach):
//   first()     → sessionsRepo.getById
//   first()     → requestsRepo.findBySessionAndPlayer (dup check)
//   returning() → requestsRepo.create (insert session_request role='coach')
//   (notification — fire-and-forget)
// ---------------------------------------------------------------------------
describe('POST /api/sessions/:id/requests — coach invite', () => {
  const COACH_ID = 'eeeeeeee-0000-0000-0000-000000000099';

  beforeEach(() => { jest.clearAllMocks(); resetQb(); mockGenerateContent.mockReset(); });

  it('CU-06: creator invites coach — 201', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION)   // session exists, creator_id === CREATOR_ID
      .mockResolvedValueOnce(null);     // no existing invite
    qb.returning.mockResolvedValueOnce([{
      ...SESSION_REQUEST, player_id: COACH_ID, role: 'coach', ai_score: null,
    }]);

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ role: 'coach', coach_user_id: COACH_ID });

    expect(res.status).toBe(201);
    expect(res.body.sessionRequest).toBeDefined();
  });

  it('CU-06: non-creator invites coach — 403', async () => {
    qb.first.mockResolvedValueOnce(SESSION); // creator_id !== PLAYER_ID

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ role: 'coach', coach_user_id: COACH_ID });

    expect(res.status).toBe(403);
  });

  it('CU-06: duplicate coach invite — 409', async () => {
    qb.first
      .mockResolvedValueOnce(SESSION)
      .mockResolvedValueOnce(SESSION_REQUEST); // existing invite found

    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ role: 'coach', coach_user_id: COACH_ID });

    expect(res.status).toBe(409);
  });

  it('CU-06: invite coach without coach_user_id — 422', async () => {
    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${CREATOR_TOKEN}`)
      .send({ role: 'coach' }); // missing coach_user_id

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('CU-06: player_id in body when role=player — 422', async () => {
    // coach_user_id is forbidden when role is player
    const res = await request(app)
      .post(`/api/sessions/${SESSION.id}/requests`)
      .set('Cookie', `token=${PLAYER_TOKEN}`)
      .send({ role: 'player', coach_user_id: COACH_ID });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });
});
