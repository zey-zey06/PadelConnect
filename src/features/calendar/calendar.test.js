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

// Prevent penaltiesRepo from interfering with the qb mock queue
// (bookings.service imports it and registers calls on the shared qb)
jest.mock('../penalties/penalties.repository', () => ({
  getActiveAppBan:       jest.fn().mockResolvedValue(null),
  countLateCancelsByUser: jest.fn().mockResolvedValue(0),
  getActiveClubBan:      jest.fn().mockResolvedValue(null),
  create:                jest.fn().mockResolvedValue({ id: 'penalty-id' }),
}));

jest.mock('../../db', () => {
  const qb = {
    where:     jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    orderBy:   jest.fn().mockReturnThis(),
    join:      jest.fn().mockReturnThis(),
    whereIn:   jest.fn().mockReturnThis(),
    select:    jest.fn(),
    first:     jest.fn(),
    insert:    jest.fn().mockReturnThis(),
    update:    jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };
  const mockDb = jest.fn(() => qb);
  mockDb.__qb = qb;
  return mockDb;
});

const app      = require('../../app');
const db       = require('../../db');
const { signToken } = require('../../auth/jwt');

const qb = db.__qb;

// ── Fixtures ──────────────────────────────────────────────────────────────────
const PLAYER_ID    = 'pppppppp-0000-0000-0000-000000000001';
const PLAYER_TOKEN = signToken({ sub: PLAYER_ID, role: 'player', organization_id: null });

const CALENDAR_ROW = {
  session_id:      'ssssssss-0000-0000-0000-000000000001',
  date:            '2026-05-24',
  time:            '10:00:00',
  session_status:  'open',
  current_players: 2,
  max_players:     4,
  booking_id:      'bbbbbbbb-0000-0000-0000-000000000001',
  booking_status:  'confirmed',
  start_time:      '10:00:00',
  end_time:        '11:30:00',
  price:           '5000.00',
  venue_id:        'vvvvvvvv-0000-0000-0000-000000000001',
  venue_name:      'Terrain Principal',
  venue_description: 'Terrain couvert',
};

function resetQb() {
  qb.where.mockReturnThis();
  qb.whereNull.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.join.mockReturnThis();
  qb.whereIn.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.select.mockReset();
  qb.first.mockReset();
  qb.returning.mockReset();
}

// ── GET /api/calendar/me ──────────────────────────────────────────────────────
describe('GET /api/calendar/me', () => {
  beforeEach(() => { jest.clearAllMocks(); resetQb(); });

  it('CU-12: calendar — returns sessions grouped by date — 200', async () => {
    qb.select.mockResolvedValueOnce([CALENDAR_ROW]);

    const res = await request(app)
      .get('/api/calendar/me')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.calendar).toBeDefined();
    expect(res.body.calendar['2026-05-24']).toBeDefined();
    expect(res.body.calendar['2026-05-24']).toHaveLength(1);

    const entry = res.body.calendar['2026-05-24'][0];
    expect(entry.session_id).toBe(CALENDAR_ROW.session_id);
    expect(entry.booking_id).toBe(CALENDAR_ROW.booking_id);
    expect(entry.venue.name).toBe('Terrain Principal');
    expect(entry.slot.start_time).toBe('10:00:00');
  });

  it('CU-12: calendar — multiple sessions same day — grouped correctly — 200', async () => {
    const ROW_2 = {
      ...CALENDAR_ROW,
      session_id: 'ssssssss-0000-0000-0000-000000000002',
      booking_id: 'bbbbbbbb-0000-0000-0000-000000000002',
      time:       '14:00:00',
      start_time: '14:00:00',
      end_time:   '15:30:00',
    };
    qb.select.mockResolvedValueOnce([CALENDAR_ROW, ROW_2]);

    const res = await request(app)
      .get('/api/calendar/me')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.calendar['2026-05-24']).toHaveLength(2);
  });

  it('CU-12: calendar — no upcoming sessions — returns empty object — 200', async () => {
    qb.select.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/calendar/me')
      .set('Cookie', `token=${PLAYER_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.calendar).toEqual({});
  });

  it('CU-12: calendar — without auth — 401', async () => {
    const res = await request(app).get('/api/calendar/me');
    expect(res.status).toBe(401);
  });
});
