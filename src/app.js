require('dotenv').config();

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
const { coachesRouter, clubCoachesRouter } = require('./features/coaches/coaches.controller');
const bookingsRouter = require('./features/bookings/bookings.controller');
const { penaltiesRouter, adminRouter } = require('./features/penalties/penalties.controller');
const notificationsRouter = require('./features/notifications/notifications.controller');
const adminDashboardRouter = require('./features/admin/admin.controller');
const calendarRouter = require('./features/calendar/calendar.controller');
const managerRouter  = require('./features/manager/manager.controller');
const aiRouter       = require('./features/ai/ai.controller');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
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
app.use('/api/bookings', bookingsRouter);
app.use('/api/penalties', penaltiesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminDashboardRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/manager', managerRouter);
app.use('/api/ai',      aiRouter);

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

app.use((req, res) => {
  res.status(404).json({ status: 404, error: 'Not Found', message: 'Route introuvable.' });
});

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
}

// Back-fill missing slots for existing venues on dev startup (non-fatal)
if (process.env.NODE_ENV === 'development') {
  const { fillMissingSlots } = require('./features/venues/venues.service');
  fillMissingSlots()
    .then((n) => {
      if (n > 0) {
        console.log(JSON.stringify({ level: 'info', msg: `fillMissingSlots: inserted ${n} slots` }));
      }
    })
    .catch(() => {});
}

// In production nginx owns the public port (10000); Express always binds
// to 4000 internally so Render's injected PORT env var is ignored.
const PORT = process.env.NODE_ENV === 'production' ? 4000 : (process.env.PORT || 4000);

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
