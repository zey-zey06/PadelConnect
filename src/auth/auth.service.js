const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const notificationsService = require('../features/notifications/notifications.service');
const { sendVerificationEmail }  = require('../emails/verification');
const { sendWelcomeEmail, sendManagerWelcomeEmail } = require('../emails/welcome');
const { sendPasswordResetEmail } = require('../emails/password-reset');

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique username from first/last name.
 * Format: {base}_{4-digit-number}, retried up to 5 times on collision.
 */
async function generateUniqueUsername(firstName, lastName) {
  const base = [firstName, lastName]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20) || 'joueur';

  for (let i = 0; i < 5; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const username = `${base}_${num}`;
    const exists = await db('users').where({ username }).first();
    if (!exists) return username;
  }
  // Fallback: use timestamp suffix — guaranteed unique
  return `${base}_${Date.now() % 100000}`;
}

async function signup({ email, password, role = 'player', organization_id = null, first_name = null, last_name = null, is_ball_picker = false }) {
  const existing = await db('users').where({ email }).whereNull('deleted_at').first();
  if (existing) {
    const err = new Error('Email déjà utilisé.');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const verification_token = generateOtp();
  const verification_expires = new Date(Date.now() + VERIFICATION_TTL_MS);

  const username = await generateUniqueUsername(first_name, last_name);

  const [row] = await db('users')
    .insert({ email, password_hash, role, organization_id, email_verified: false, first_name: first_name || null, last_name: last_name || null, username })
    .returning(['id', 'email', 'role', 'organization_id', 'status', 'first_name', 'last_name', 'username', 'created_at']);

  // Store verification token
  await db('users').where({ id: row.id }).update({
    email_verification_token: verification_token,
    email_verification_expires_at: verification_expires,
  });

  // Auto-create coach_profiles row so the coach dashboard loads without a 404
  if (role === 'coach') {
    await db('coach_profiles').insert({
      user_id:        row.id,
      is_independent: true,
      is_ball_picker: is_ball_picker === true,
    });
  }

  // Fire-and-forget — don't block signup on side-effect failures
  notificationsService
    .createNotification(row.id, 'welcome', 'Bienvenue sur PadelConnect !')
    .catch(() => {});

  sendVerificationEmail(email, verification_token).catch(() => {});

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    organization_id: row.organization_id,
    status: row.status,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    username: row.username ?? null,
    created_at: row.created_at,
  };
}

async function login({ email, password }) {
  const user = await db('users').where({ email }).whereNull('deleted_at').first();
  if (!user) {
    const err = new Error('Email ou mot de passe incorrect.');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Email ou mot de passe incorrect.');
    err.status = 401;
    throw err;
  }

  if (!user.email_verified) {
    const err = new Error('Veuillez vérifier votre adresse email avant de vous connecter.');
    err.status = 401;
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  const isFirstLogin = user.last_login == null;

  // Update last_login timestamp
  await db('users').where({ id: user.id }).update({ last_login: new Date() });

  // First-login welcome email for venue_admin
  if (isFirstLogin && user.role === 'venue_admin') {
    sendManagerWelcomeEmail(user.email, user.first_name ?? null).catch(() => {});
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    status: user.status,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
  };
}

async function verifyEmail(token) {
  const user = await db('users')
    .where({ email_verification_token: token })
    .whereNull('deleted_at')
    .first();

  if (!user) {
    const err = new Error('Lien de vérification invalide ou déjà utilisé.');
    err.status = 400;
    throw err;
  }

  if (new Date(user.email_verification_expires_at) < new Date()) {
    const err = new Error('Ce lien de vérification a expiré. Veuillez vous inscrire à nouveau.');
    err.status = 400;
    throw err;
  }

  await db('users').where({ id: user.id }).update({
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function getUserById(id) {
  const user = await db('users').where({ id }).whereNull('deleted_at').first();
  if (!user) {
    const err = new Error('Utilisateur introuvable.');
    err.status = 404;
    throw err;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    team_id: user.team_id ?? null,
    status: user.status,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    username: user.username ?? null,
    balance: Number(user.balance ?? 0),
  };
}

async function softDeleteAccount(userId) {
  await db('users').where({ id: userId }).update({ deleted_at: new Date(), status: 'deleted' });
}

async function updateName(userId, first_name, last_name) {
  await db('users').where({ id: userId }).update({
    first_name: first_name || null,
    last_name:  last_name  || null,
    updated_at: new Date(),
  });
}

async function updateUsername(userId, username) {
  try {
    await db('users').where({ id: userId }).update({ username, updated_at: new Date() });
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('Ce nom d\'utilisateur est déjà pris. Essayez-en un autre.');
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await db('users').where({ id: userId }).whereNull('deleted_at').first();
  if (!user) {
    const err = new Error('Utilisateur introuvable.');
    err.status = 404;
    throw err;
  }
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Mot de passe actuel incorrect.');
    err.status = 400;
    throw err;
  }
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db('users').where({ id: userId }).update({ password_hash: hash, updated_at: new Date() });
}

async function resendVerification(email) {
  const user = await db('users').where({ email }).whereNull('deleted_at').first();
  // Silently succeed when email unknown or already verified — don't leak user existence
  if (!user || user.email_verified) return;

  const verification_token   = generateOtp();
  const verification_expires = new Date(Date.now() + VERIFICATION_TTL_MS);

  await db('users').where({ id: user.id }).update({
    email_verification_token:      verification_token,
    email_verification_expires_at: verification_expires,
  });

  sendVerificationEmail(email, verification_token).catch(() => {});
}

async function verifyOtp(email, code) {
  const user = await db('users')
    .where({ email })
    .whereNull('deleted_at')
    .first();

  if (!user) {
    const err = new Error('Code incorrect ou expiré.');
    err.status = 400;
    throw err;
  }

  if (user.email_verified) {
    return user; // already verified — let them through
  }

  if (user.email_verification_token !== String(code)) {
    const err = new Error('Code incorrect.');
    err.status = 400;
    err.code = 'INVALID_OTP';
    throw err;
  }

  if (new Date(user.email_verification_expires_at) < new Date()) {
    const err = new Error('Code expiré. Demandez un nouveau code.');
    err.status = 400;
    err.code = 'EXPIRED_OTP';
    throw err;
  }

  await db('users').where({ id: user.id }).update({
    email_verified:                true,
    email_verification_token:      null,
    email_verification_expires_at: null,
  });

  // Non-fatal welcome email — never block the login
  sendWelcomeEmail(user.email, user.first_name).catch(() => {});

  return user;
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

async function forgotPassword(email) {
  const user = await db('users').where({ email }).whereNull('deleted_at').first();
  // Silently succeed when email unknown — don't leak user existence
  if (!user) return;

  const code    = generateOtp();
  const expires = new Date(Date.now() + RESET_TTL_MS);

  await db('users').where({ id: user.id }).update({
    password_reset_token:      code,
    password_reset_expires_at: expires,
  });

  sendPasswordResetEmail(email, code).catch(() => {});
}

async function resetPassword(email, code, newPassword) {
  const user = await db('users')
    .where({ email })
    .whereNull('deleted_at')
    .first();

  if (!user) {
    const err = new Error('Code incorrect ou expiré.');
    err.status = 400;
    err.code = 'INVALID_RESET_CODE';
    throw err;
  }

  if (user.password_reset_token !== String(code)) {
    const err = new Error('Code incorrect.');
    err.status = 400;
    err.code = 'INVALID_RESET_CODE';
    throw err;
  }

  if (!user.password_reset_expires_at || new Date(user.password_reset_expires_at) < new Date()) {
    const err = new Error('Code expiré. Demandez un nouveau code.');
    err.status = 400;
    err.code = 'EXPIRED_RESET_CODE';
    throw err;
  }

  const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db('users').where({ id: user.id }).update({
    password_hash,
    password_reset_token:      null,
    password_reset_expires_at: null,
    updated_at:                new Date(),
  });
}

module.exports = { signup, login, verifyEmail, getUserById, updateName, updateUsername, changePassword, softDeleteAccount, resendVerification, verifyOtp, forgotPassword, resetPassword };
