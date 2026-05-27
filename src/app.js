require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const authRouter = require('./auth/auth.controller');
const profileRouter = require('./features/profiles/profile.controller');
const sessionsRouter = require('./features/sessions/sessions.controller');
const requestsRouter = require('./features/sessions/requests.controller');
const clubsRouter = require('./features/clubs/clubs.controller');
const { clubVenuesRouter, venueSlotsRouter } = require('./features/venues/venues.controller');
const { coachesRouter, clubCoachesRouter, coachInvitationsRouter, ballPickerInvitationsRouter } = require('./features/coaches/coaches.controller');
const bookingsRouter = require('./features/bookings/bookings.controller');
const { penaltiesRouter, adminRouter } = require('./features/penalties/penalties.controller');
const notificationsRouter = require('./features/notifications/notifications.controller');
const adminDashboardRouter = require('./features/admin/admin.controller');
const calendarRouter = require('./features/calendar/calendar.controller');
const managerRouter  = require('./features/manager/manager.controller');
const aiRouter       = require('./features/ai/ai.controller');
const piaRouter      = require('./features/pia/pia.controller');
const searchRouter   = require('./features/search/search.controller');
const contactRouter       = require('./features/contact/contact.controller');
const messagesRouter      = require('./features/messages/messages.controller');
const subscriptionsRouter = require('./features/subscriptions/subscriptions.controller');
const adminSubsRouter     = require('./features/admin/admin.subscriptions.controller');
const friendshipsRouter   = require('./features/friendships/friendships.controller');

const app = express();

// Static assets served first — no auth, no middleware overhead.
// Must be registered before helmet/cors so /assets/* files are never
// intercepted by the authentication middleware.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
}

// Helmet — disable CSP so Google Fonts / external assets aren't blocked.
// The app serves only its own content; a strict CSP buys little here and
// breaks fonts.googleapis.com in production.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
// Serve legacy disk-stored uploads (only present in dev; Render filesystem is ephemeral).
// New uploads are stored as base64 data-URLs in the DB and don't need this route.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { status: 429, error: 'Too Many Requests', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/sessions', requestsRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/clubs', clubVenuesRouter);
app.use('/api/clubs', clubCoachesRouter);
app.use('/api/venues', venueSlotsRouter);
app.use('/api/coaches', coachesRouter);
app.use('/api/coach-invitations',        coachInvitationsRouter);
app.use('/api/ball-picker-invitations',  ballPickerInvitationsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/penalties', penaltiesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminDashboardRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/manager', managerRouter);
app.use('/api/ai',      aiRouter);
app.use('/api/pia',     piaRouter);
app.use('/api/search', searchRouter);
app.use('/api/contact',       contactRouter);
app.use('/api/messages',      messagesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/admin/subscriptions', adminSubsRouter);
app.use('/api/friends',       friendshipsRouter);

app.get('/healthz', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await db.raw('SELECT 1');
  } catch {
    dbStatus = 'error';
  }
  res.json({
    status: 'ok',
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
  });
});

// Explicit 404 for any /api/* route that wasn't matched above.
// Must come before the SPA fallback so unrecognised API calls get JSON,
// not the React index.html with a 200 status.
app.use('/api', (req, res) => {
  res.status(404).json({ status: 404, error: 'Not Found', message: 'Route introuvable.' });
});

// SPA fallback: any non-API request that wasn't matched by express.static
// (i.e. a client-side route like /sessions or /profile) gets index.html.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.use((req, res) => {
    res.status(404).json({ status: 404, error: 'Not Found', message: 'Route introuvable.' });
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (process.env.NODE_ENV === 'production') {
    res.status(status).json({ status, error: err.name || 'Error', message: err.message });
  } else {
    res.status(status).json({ status, error: err.name || 'Error', message: err.message, stack: err.stack });
  }
});

// Start the daily reminder cron job in non-test environments
if (process.env.NODE_ENV !== 'test') {
  require('./jobs/reminder');

  // Subscription expiry cron — runs once on startup then every 24 h
  const { runCron: runSubscriptionCron } = require('./features/subscriptions/subscriptions.service');
  runSubscriptionCron();
  setInterval(runSubscriptionCron, 24 * 60 * 60 * 1000);
}

// Back-fill missing slots for all venues on startup (non-fatal, skipped in tests)
if (process.env.NODE_ENV !== 'test') {
  const { fillMissingSlots } = require('./features/venues/venues.service');
  fillMissingSlots()
    .then((n) => {
      if (n > 0) {
        console.log(JSON.stringify({ level: 'info', msg: `fillMissingSlots: inserted ${n} slots` }));
      }
    })
    .catch(() => {});
}

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  db.migrate.latest()
    .then(() => {
      console.log(JSON.stringify({ level: 'info', msg: 'Migrations applied successfully' }));
    })
    .catch((err) => {
      console.error(JSON.stringify({ level: 'error', msg: 'Migration failed', error: err.message }));
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(JSON.stringify({ level: 'info', msg: `PadelConnect listening on port ${PORT}`, env: process.env.NODE_ENV }));
      });
    });
}

module.exports = app;
