const { Router } = require('express');
const { signupSchema, loginSchema } = require('./auth.validation');
const { signup, login, verifyEmail, getUserById, updateName, changePassword, softDeleteAccount } = require('./auth.service');
const { signToken } = require('./jwt');
const authenticate = require('../middleware/authenticate');
const notificationsService = require('../features/notifications/notifications.service');
const db = require('../db');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function signupHandler(req, res, next) {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(422).json({
        status: 422,
        error: 'Validation Error',
        message: error.details[0].message,
      });
    }

    const user = await signup(value);
    // Email verification is disabled — accounts are active immediately.
    // Issue a JWT cookie so the frontend can auto-navigate to profile setup.
    const token = signToken({
      sub: user.id,
      role: user.role,
      organization_id: user.organization_id,
    });
    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function loginHandler(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(422).json({
        status: 422,
        error: 'Validation Error',
        message: error.details[0].message,
      });
    }

    const user = await login(value);
    const token = signToken({
      sub: user.id,
      role: user.role,
      organization_id: user.organization_id,
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    return res.json({ user });
  } catch (err) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      return res.status(401).json({
        status: 401,
        error: 'Email Not Verified',
        code: 'EMAIL_NOT_VERIFIED',
        message: err.message,
      });
    }
    next(err);
  }
}

async function verifyEmailHandler(req, res, next) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Token de vérification manquant.',
      });
    }

    const user = await verifyEmail(token.trim());
    return res.json({
      message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.',
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

function logoutHandler(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
  });
  return res.json({ message: 'Déconnecté.' });
}

async function meHandler(req, res, next) {
  try {
    const user = await getUserById(req.user.sub);
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateMeHandler(req, res, next) {
  try {
    const { first_name, last_name } = req.body;
    await updateName(req.user.sub, first_name, last_name);
    const user = await getUserById(req.user.sub);
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function changePasswordHandler(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Champs requis manquants.' });
    }
    if (new_password.length < 8) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
    }
    await changePassword(req.user.sub, current_password, new_password);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.post('/signup', signupHandler);
router.post('/login', loginHandler);
router.get('/verify-email', verifyEmailHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, meHandler);
router.patch('/me', authenticate, updateMeHandler);
router.patch('/password', authenticate, changePasswordHandler);

async function deleteAccountHandler(req, res, next) {
  try {
    const user = await getUserById(req.user.sub);
    await softDeleteAccount(req.user.sub);
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });
    // Notify super_admins of account deletion (fire-and-forget)
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Utilisateur';
    db('users').where({ role: 'super_admin' }).select('id')
      .then((admins) => Promise.allSettled(
        admins.map((a) => notificationsService.createNotification(a.id, 'account_deleted', `${name} a supprimé son compte`))
      ))
      .catch(() => {});
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

router.delete('/me', authenticate, deleteAccountHandler);

module.exports = router;
